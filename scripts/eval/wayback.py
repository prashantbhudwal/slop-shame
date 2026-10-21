#!/usr/bin/env python3
"""Private, evaluation-only LinkedIn Wayback collector (Python stdlib only).

Never use this corpus to fit weights or publish its text. Default invocation first
checks CDX feasibility, then collects at most 800 posts. All local artifacts except
this script stay in the ignored data/eval/raw tree. No raw HTML is written.
"""

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
import unicodedata


ROOT = Path(__file__).resolve().parents[2]
DOWNLOADS = ROOT / "data/eval/raw/downloads/wayback"
OUTPUT = ROOT / "data/eval/raw/normalized/linkedin-wayback.jsonl"
CDX = "https://web.archive.org/cdx/search/cdx"
PATTERNS = (
    "linkedin.com/posts/*",
    "www.linkedin.com/posts/*",
    "linkedin.com/feed/update/urn:li:activity:*",
)
CUTOFF = "2022-11-01"
EXTRACTOR_VERSION = 3


class StopCollection(Exception):
    """A hard stop, including throttling, access failure, or the request cap."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    # Automatic redirects could evade the rate limit or reach live LinkedIn.
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Client:
    def __init__(self, max_requests=1500, timeout=25):
        self.max_requests = max_requests
        self.timeout = timeout
        self.total = 0
        self.counts = Counter()
        self.last_end = 0.0
        self.opener = urllib.request.build_opener(NoRedirect())

    def get(self, url, kind):
        if urllib.parse.urlsplit(url).hostname != "web.archive.org":
            raise StopCollection("Refusing a request outside web.archive.org")
        for attempt in range(3):
            if self.total >= self.max_requests:
                raise StopCollection("Request cap reached")
            time.sleep(max(0, self.last_end + 1.05 - time.monotonic()))
            self.total += 1
            self.counts[kind] += 1
            receipt = {
                "url": url, "kind": kind, "attempt": attempt + 1,
                "requestedAt": datetime.now(timezone.utc).isoformat(),
            }
            error = None
            try:
                req = urllib.request.Request(url, headers={
                    "User-Agent": "SlopShame-PrivateEvaluation/1.0 (sequential archival research)",
                    "Accept": "application/json" if kind == "cdx" else "text/html",
                })
                with self.opener.open(req, timeout=self.timeout) as response:
                    body = response.read(12_000_001)
                    receipt["status"] = response.status
                    receipt["bytes"] = len(body)
                    receipt["sha256"] = hashlib.sha256(body).hexdigest()
                    if len(body) > 12_000_000:
                        raise StopCollection("Response exceeds 12 MB safety limit")
                    lowered = body[:12000].lower()
                    if any(marker in lowered for marker in (
                        b"too many requests", b"rate limit exceeded",
                        b"too many request", b"temporarily blocked",
                    )):
                        raise StopCollection("Archive returned a throttling page")
                    return body
            except urllib.error.HTTPError as exc:
                receipt["status"] = exc.code
                receipt["error"] = str(exc)
                if exc.code in (429, 503):
                    raise StopCollection(f"Archive throttling/unavailable: HTTP {exc.code}") from exc
                if exc.code in (401, 403, 451):
                    raise StopCollection(f"Archive access denied: HTTP {exc.code}") from exc
                if kind == "snapshot" and exc.code in (301, 302, 303, 307, 308, 404, 410):
                    return None
                error = str(exc)
                if exc.code not in (500, 502, 504):
                    raise StopCollection(f"Archive request failed: {error}") from exc
            except (urllib.error.URLError, TimeoutError, socket.timeout) as exc:
                error = str(exc)
                receipt["error"] = error
            finally:
                self.last_end = time.monotonic()
                with (DOWNLOADS / "requests.jsonl").open("a", encoding="utf-8") as handle:
                    handle.write(json.dumps(receipt, ensure_ascii=False) + "\n")
            if attempt < 2:
                print(f"Retrying after {5 * (3 ** attempt)}s: {error}", flush=True)
                time.sleep(5 * (3 ** attempt))
        raise StopCollection(f"Archive unreachable after 3 attempts: {error}")


def cdx_url(pattern, **extra):
    params = {
        "url": pattern, "to": "20221031", "output": "json",
        "filter": "statuscode:200", "collapse": "urlkey",
    }
    params.update(extra)
    return CDX + "?" + urllib.parse.urlencode(params)


def discover(client, summary):
    candidates = {}
    for pattern in PATTERNS:
        count_body = client.get(cdx_url(pattern, showNumPages="true", pageSize="1000"), "cdx")
        try:
            pages = json.loads(count_body)
        except (ValueError, TypeError) as exc:
            raise StopCollection("CDX feasibility response was not JSON") from exc
        summary["feasibility"].append({"pattern": pattern, "pageCountResponse": pages})
        print(json.dumps(summary["feasibility"][-1]), flush=True)
        body = client.get(cdx_url(pattern, fl="timestamp,original", limit="5000"), "cdx")
        try:
            rows = json.loads(body)
        except (ValueError, TypeError) as exc:
            raise StopCollection("CDX listing response was not JSON") from exc
        if not isinstance(rows, list) or (rows and rows[0] != ["timestamp", "original"]):
            raise StopCollection("Unexpected CDX listing schema")
        summary["feasibility"][-1]["listedRows"] = max(0, len(rows) - 1)
        for timestamp, original in rows[1:]:
            parsed = urllib.parse.urlsplit(original)
            if parsed.hostname not in ("linkedin.com", "www.linkedin.com"):
                continue
            if not re.fullmatch(r"\d{14}", timestamp) or timestamp >= "20221101000000":
                continue
            if not (parsed.path.startswith("/posts/") or parsed.path.startswith("/feed/update/urn:li:activity:")):
                continue
            key = re.search(r"(?:activity-|urn:li:activity:)(\d+)", original)
            key = key.group(1) if key else parsed.path.rstrip("/")
            candidates.setdefault(key, {"timestamp": timestamp, "url": original})
    summary["discoveredUniqueUrls"] = len(candidates)
    # Stable mixing avoids fetching only the first author in CDX's URL sort.
    ordered = sorted(candidates.values(), key=lambda item: hashlib.sha256(item["url"].encode()).hexdigest())
    with (DOWNLOADS / "candidates.jsonl").open("w", encoding="utf-8") as handle:
        for item in ordered:
            handle.write(json.dumps(item) + "\n")
    return ordered


class Node:
    def __init__(self, tag="", attrs=()):
        self.tag = tag
        self.attrs = {key: value or "" for key, value in attrs}
        self.children = []


class PageParser(HTMLParser):
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]
        self.nodes = []
        self.parents = {}

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.parents[id(node)] = self.stack[-1]
        self.stack[-1].children.append(node)
        self.nodes.append(node)
        if tag not in self.VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def raw_text(node):
    if isinstance(node, str):
        return node
    return "".join(raw_text(child) for child in node.children)


def descendants(node):
    yield node
    for child in node.children:
        if isinstance(child, Node):
            yield from descendants(child)


def clean_text(text):
    """Normalize horizontal HTML whitespace without merging explicit newlines."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return "\n".join(re.sub(r"[^\S\n]+", " ", line).strip() for line in text.split("\n")).strip()


def rendered_text(node, preserve=False):
    # LinkedIn commentary uses pre-wrap: its literal newlines ARE author breaks.
    # Elsewhere, source indentation is ordinary collapsed HTML whitespace.
    if isinstance(node, str):
        return node if preserve else re.sub(r"\s+", " ", node)
    if node.tag in {"script", "style", "button"}:
        return ""
    if node.tag == "br":
        return "\n"
    body = "".join(rendered_text(child, preserve) for child in node.children)
    if node.tag in {"p", "div", "li", "ul", "ol", "blockquote"}:
        return "\n" + body + "\n"
    return body


def json_records(value):
    if isinstance(value, list):
        for item in value:
            yield from json_records(item)
    elif isinstance(value, dict):
        yield value
        # Do not mistake nested comments, recommendations, or quoted articles
        # for the actual post. @graph is the only structural traversal allowed.
        if "@graph" in value:
            yield from json_records(value["@graph"])


def valid_date(value):
    if not isinstance(value, str):
        return None
    match = re.match(r"^(\d{4}-\d{2}-\d{2})(?:$|[T ])", value)
    if not match:
        return None
    try:
        datetime.strptime(match.group(1), "%Y-%m-%d")
    except ValueError:
        return None
    return value


def extract(html, original):
    page = PageParser()
    page.feed(html)
    # The same HTML contains related posts and comments. Scope DOM extraction
    # to the actual post section; never substitute a recommended post's body.
    primary = next((node for node in page.nodes if "share-update-section" in node.attrs.get("class", "").split()), None)
    if primary is None:
        primary = next((node for node in page.nodes if "main-feed-activity-card" in node.attrs.get("class", "").split()), None)
    scoped = list(descendants(primary)) if primary else []
    records = []
    for node in page.nodes:
        if node.tag == "script" and node.attrs.get("type", "").split(";")[0] == "application/ld+json":
            try:
                records.extend(json_records(json.loads(raw_text(node))))
            except ValueError:
                pass
    post = None
    for record in records:
        types = record.get("@type") or []
        types = [types] if isinstance(types, str) else types
        if set(types) & {"SocialMediaPosting", "DiscussionForumPosting", "Article", "BlogPosting"} and isinstance(record.get("articleBody", record.get("text")), str):
            post = record
            break
    post = post or {}
    author = post.get("author", {})
    if isinstance(author, list):
        author = author[0] if author else {}
    if isinstance(author, str):
        author = {"name": author}
    if not isinstance(author, dict):
        author = {}
    author_url = author.get("url", "")
    author_url = author_url if isinstance(author_url, str) else ""
    author_type = author.get("@type") or []
    author_type = [author_type] if isinstance(author_type, str) else author_type
    if "Organization" in author_type or "/company/" in author_url:
        return None, "company"

    body = post.get("articleBody", post.get("text"))
    method = "jsonld"
    dom_body = None
    commentary_classes = {
        "share-update-card__update-text", "main-feed-activity-card__commentary",
        "feed-shared-update-v2__description", "attributed-text-segment-list__content",
    }
    for node in scoped:
        if commentary_classes & set(node.attrs.get("class", "").split()):
            candidate = clean_text(rendered_text(node, preserve=True))
            if candidate:
                dom_body = candidate
            break
    # Prefer actual commentary DOM over a flattened JSON-LD string only when
    # their words agree; a collapsed/truncated DOM must not replace full text.
    if dom_body and (not body or " ".join(dom_body.split()) == " ".join(body.split())) and (not body or dom_body.count("\n") >= body.count("\n")):
        body = dom_body
        method = "dom"
    if not isinstance(body, str) or not body.strip():
        return None, "no-post-body"
    body = clean_text(body)
    if "\ufffd" in body:
        return None, "encoding-replacement-character"
    if re.search(r"(?:\.\.\.|…)\s*(?:see more|more)\s*$", body, re.I):
        return None, "truncated"
    # Real line breaks in JSON-LD are preserved; never invent paragraph breaks.
    date_raw = post.get("datePublished")
    if date_raw is not None and not valid_date(date_raw):
        return None, "unparseable-post-date"
    post_date = valid_date(date_raw)
    if not post_date:
        for node in scoped:
            if node.tag == "time" and ("post-date" in node.attrs.get("class", "") or node.attrs.get("itemprop") == "datePublished") and node.attrs.get("datetime"):
                post_date = valid_date(node.attrs["datetime"])
                if not post_date:
                    return None, "unparseable-post-date"
                break
    if not post_date:
        for node in page.nodes:
            if node.tag == "meta" and node.attrs.get("property") == "article:published_time":
                post_date = valid_date(node.attrs.get("content"))
                if not post_date:
                    return None, "unparseable-post-date"
                break
    # Actor links provide a stable profile slug and distinguish company pages.
    profile_url = author_url
    for node in scoped:
        classes = set(node.attrs.get("class", "").split())
        if classes & {"main-feed-activity-card__actor-link", "share-update-card__actor-text-link"}:
            href = node.attrs.get("href", "")
            if "/company/" in href:
                return None, "company"
            if "/in/" in href:
                profile_url = href
                break
    slug = re.search(r"/in/([^/?#]+)", profile_url)
    name = author.get("name")
    if slug:
        name = urllib.parse.unquote(slug.group(1)).lower()
    if not isinstance(name, str) or not name.strip():
        # /posts/<profile slug>_<keywords>-activity-ID is the public URL shape.
        path = urllib.parse.urlsplit(original).path
        match = re.match(r"/posts/([^/_]+)_", path)
        name = match.group(1).lower() if match else None
    if not name:
        return None, "no-author"
    return {"text": body, "author": name.strip(), "postDate": post_date, "method": method}, None


JS_WHITESPACE = re.compile("[\\u0009-\\u000d\\u0020\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]+")


def words(text):
    return len([word for word in JS_WHITESPACE.split(text) if word])


def broetry(text):
    """Layout proxy: >=4 paragraphs, >50% have one explicit nonblank line.

    Paragraphs are separated by blank lines. No claim about visual wrapping on
    a particular screen, or whether the post is actually human-written.
    """
    paragraphs = [p for p in re.split(r"\n[ \t]*\n+", text) if p.strip()]
    return len(paragraphs) >= 4 and sum(len(p.strip().splitlines()) == 1 for p in paragraphs) > len(paragraphs) / 2


def author_identity(author):
    # Slugs sometimes change decoration/name while retaining their profile
    # suffix. Conservatively group these aliases for the 30-post ceiling.
    for _ in range(3):
        decoded = urllib.parse.unquote(author)
        if decoded == author:
            break
        author = decoded
    author = unicodedata.normalize("NFKC", author).casefold()
    suffix = re.search(r"-([0-9a-f]{7,})$", author)
    return "profile-suffix:" + suffix.group(1) if suffix else author


def summarize(rows, summary):
    authors = Counter(row["author"] for row in rows)
    years = Counter((row["postDate"] or row["snapshot"].split("/web/")[1][:4])[:4] for row in rows)
    summary.update({
        "posts": len(rows), "perYear": dict(sorted(years.items())),
        "perAuthor": dict(authors.most_common()), "authors": len(authors),
        "maxPostsPerAuthor": max(authors.values(), default=0),
        "atLeast3LineBreaks": sum(row["text"].count("\n") >= 3 for row in rows),
        "broetryLike": sum(broetry(row["text"]) for row in rows),
        "withoutPostDate": sum(row["postDate"] is None for row in rows),
        "broetryDefinition": "at least 4 blank-line-separated paragraphs; more than half contain exactly one explicit nonblank line",
        "extractorVersion": EXTRACTOR_VERSION,
    })


def validate_existing(client, summary):
    """Re-extract saved records after a parser change, inside the SAME cap.

    Even on an archive hard stop, only successfully validated rows are retained.
    No old record is silently grandfathered into a stricter extraction policy.
    """
    if client.total >= client.max_requests:
        raise StopCollection("Request cap reached before revalidation; existing output preserved")
    rows = [json.loads(line) for line in OUTPUT.read_text(encoding="utf-8").splitlines()]
    valid = []
    authors, methods, rejected = Counter(), Counter(), Counter()
    names, seen = {}, set()
    attempted, changed = 0, 0
    try:
        for old in rows:
            replay = old["snapshot"]
            timestamp, original = replay.split("/web/")[1].split("id_/", 1)
            receipt = {"timestamp": timestamp, "url": original, "snapshot": replay, "outcome": "validation-failed", "extractorVersion": EXTRACTOR_VERSION}
            attempted += 1
            try:
                body = client.get(replay, "snapshot")
                if body is None:
                    rejected["unavailable-or-redirect"] += 1
                    continue
                result, reason = extract(body.decode("utf-8", errors="replace"), original)
                del body
                if reason:
                    rejected[reason] += 1
                    receipt["outcome"] = "validation-" + reason
                    continue
                author = names.setdefault(author_identity(result["author"]), result["author"])
                count = words(result["text"])
                fingerprint = unicodedata.normalize("NFKC", result["text"])
                reason = None
                if result["postDate"] and result["postDate"][:10] >= CUTOFF:
                    reason = "post-too-new"
                elif not 30 <= count <= 600:
                    reason = "length"
                elif fingerprint in seen:
                    reason = "duplicate"
                elif authors[author] >= 30:
                    reason = "author-cap"
                if reason:
                    rejected[reason] += 1
                    receipt["outcome"] = "validation-" + reason
                    continue
                row = {**old, "id": "linkedin-wayback-" + hashlib.sha256(result["text"].encode()).hexdigest()[:24], "text": result["text"], "author": author, "words": count, "postDate": result["postDate"]}
                valid.append(row)
                authors[author] += 1
                seen.add(fingerprint)
                methods[result["method"]] += 1
                changed += row["text"] != old["text"]
                receipt.update({"outcome": "validated", "id": row["id"], "previousId": old["id"]})
            finally:
                with (DOWNLOADS / "receipts.jsonl").open("a", encoding="utf-8") as handle:
                    handle.write(json.dumps(receipt) + "\n")
                if attempted % 20 == 0 or attempted == 1:
                    print(f"Revalidated {attempted}/{len(rows)}; kept {len(valid)}; changed texts {changed}; rejected {dict(rejected)}; total requests {client.total}", flush=True)
    finally:
        temporary = OUTPUT.with_suffix(".tmp")
        with temporary.open("w", encoding="utf-8") as handle:
            for row in valid:
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")
        temporary.replace(OUTPUT)
        summarize(valid, summary)
        summary["extractionMethods"] = dict(methods)
        summary["revalidation"] = {"input": len(rows), "attempted": attempted, "kept": len(valid), "changedTexts": changed, "rejected": dict(rejected), "unvalidatedDropped": max(0, len(rows) - attempted)}


def collect(client, candidates, max_posts, summary):
    accepted = []
    if OUTPUT.exists():
        accepted = [json.loads(line) for line in OUTPUT.read_text(encoding="utf-8").splitlines() if line]
    authors = Counter(row["author"] for row in accepted)
    names = {author_identity(row["author"]): row["author"] for row in accepted}
    seen = {unicodedata.normalize("NFKC", row["text"]) for row in accepted}
    rejections = Counter(summary.get("rejections", {}))
    methods = Counter(summary.get("extractionMethods", {}))
    tried = set()
    for line in (DOWNLOADS / "receipts.jsonl").read_text(encoding="utf-8").splitlines():
        receipt = json.loads(line)
        if receipt.get("extractorVersion", 0) >= 2:
            tried.add((receipt["timestamp"], receipt["url"]))
    try:
        with OUTPUT.open("a", encoding="utf-8") as handle:
            for candidate in candidates:
                if len(accepted) >= max_posts:
                    break
                if client.counts["snapshot"] >= 100 and len(accepted) == 0:
                    raise StopCollection("No usable posts in the first 100 replay requests")
                timestamp, original = candidate["timestamp"], candidate["url"]
                if (timestamp, original) in tried:
                    continue
                replay = "https://web.archive.org/web/" + timestamp + "id_/" + urllib.parse.quote(original, safe=":/?=&%+-_.~")
                receipt = {**candidate, "snapshot": replay, "outcome": "failed", "extractorVersion": EXTRACTOR_VERSION}
                try:
                    body = client.get(replay, "snapshot")
                    if body is None:
                        receipt["outcome"] = "unavailable-or-redirect"
                        rejections[receipt["outcome"]] += 1
                        continue
                    html = body.decode("utf-8", errors="replace")
                    result, reason = extract(html, original)
                    del html, body
                    if reason:
                        receipt["outcome"] = reason
                        rejections[reason] += 1
                        continue
                    text = result["text"]
                    author = names.setdefault(author_identity(result["author"]), result["author"])
                    count = words(text)
                    fingerprint = unicodedata.normalize("NFKC", text)
                    reason = None
                    if result["postDate"] and result["postDate"][:10] >= CUTOFF:
                        reason = "post-too-new"
                    elif not 30 <= count <= 600:
                        reason = "length"
                    elif fingerprint in seen:
                        reason = "duplicate"
                    elif authors[author] >= 30:
                        reason = "author-cap"
                    if reason:
                        receipt["outcome"] = reason
                        rejections[reason] += 1
                        continue
                    row = {
                        "id": "linkedin-wayback-" + hashlib.sha256(text.encode()).hexdigest()[:24],
                        "text": text, "label": "human", "source": "linkedin-wayback",
                        "subset": "linkedin", "words": count, "genre": "social-post",
                        "register": "professional-social", "author": author,
                        "postDate": result["postDate"], "snapshot": replay,
                    }
                    handle.write(json.dumps(row, ensure_ascii=False) + "\n")
                    handle.flush()
                    accepted.append(row)
                    authors[author] += 1
                    seen.add(fingerprint)
                    methods[result["method"]] += 1
                    receipt["outcome"] = "accepted"
                    receipt["id"] = row["id"]
                    if len(accepted) % 10 == 0 or len(accepted) == 1:
                        print(f"Accepted {len(accepted)}; requests {client.total}; rejections {dict(rejections)}", flush=True)
                finally:
                    with (DOWNLOADS / "receipts.jsonl").open("a", encoding="utf-8") as receipts:
                        receipts.write(json.dumps(receipt) + "\n")
                    if client.counts["snapshot"] % 20 == 0:
                        print(f"Replay requests {client.counts['snapshot']}; accepted {len(accepted)}; >=3 breaks {sum(row['text'].count(chr(10)) >= 3 for row in accepted)}; rejections {dict(rejections)}", flush=True)
        summary["status"] = "complete" if len(accepted) >= max_posts else "exhausted"
    finally:
        summarize(accepted, summary)
        summary.update({"rejections": dict(rejections), "extractionMethods": dict(methods)})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--probe-only", action="store_true")
    parser.add_argument("--resume", action="store_true", help="Continue the same local run, retaining its request cap")
    parser.add_argument("--audit-one", action="store_true", help="Audit one saved post's card structure; never print its text")
    parser.add_argument("--validate-existing", action="store_true", help="Re-extract saved rows with the current parser, inside the existing cap")
    parser.add_argument("--max-posts", type=int, default=800, choices=range(1, 801), metavar="1..800")
    parser.add_argument("--max-requests", type=int, default=1500, choices=range(1, 1501), metavar="1..1500")
    args = parser.parse_args()
    if (args.audit_one or args.validate_existing) and not args.resume:
        parser.error("--audit-one and --validate-existing require --resume")
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    if not args.resume and (OUTPUT.exists() or (DOWNLOADS / "summary.json").exists()):
        parser.error("Prior output/summary exists; move it aside explicitly before a new run")
    # Receipts are only for replay attempts; requests.jsonl also records CDX and failures.
    (DOWNLOADS / "receipts.jsonl").touch(exist_ok=args.resume)
    summary = {
        "source": "linkedin-wayback", "cutoff": CUTOFF,
        "feasibility": [], "posts": 0, "perYear": {}, "perAuthor": {},
        "atLeast3LineBreaks": 0, "broetryLike": 0,
        "yearBasis": "postDate when available, otherwise snapshot year",
        "status": "started",
    }
    client = Client(args.max_requests)
    if args.resume:
        summary = json.loads((DOWNLOADS / "summary.json").read_text(encoding="utf-8"))
        client.total = summary["requests"]["total"]
        client.counts = Counter({key: value for key, value in summary["requests"].items() if key != "total"})
    summary["status"] = "started"
    summary.pop("stopReason", None)
    try:
        candidate_file = DOWNLOADS / "candidates.jsonl"
        if args.resume and candidate_file.exists():
            candidates = [json.loads(line) for line in candidate_file.read_text(encoding="utf-8").splitlines()]
        else:
            summary["feasibility"] = []
            candidates = discover(client, summary)
        if args.audit_one:
            rows = [json.loads(line) for line in OUTPUT.read_text(encoding="utf-8").splitlines()]
            most_common = Counter(row["author"] for row in rows).most_common(1)[0][0]
            row = next(row for row in rows if row["author"] == most_common)
            replay = row["snapshot"]
            body = client.get(replay, "snapshot")
            page = PageParser()
            page.feed(body.decode("utf-8", errors="replace"))
            diagnostics = []
            for node in page.nodes:
                classes = node.attrs.get("class", "")
                if "update-text" in classes:
                    ancestors = []
                    ancestor = page.parents.get(id(node))
                    for _ in range(5):
                        if ancestor is None:
                            break
                        ancestors.append({"tag": ancestor.tag, "attrs": {k: v for k, v in ancestor.attrs.items() if k in {"class", "data-id", "data-urn", "id", "data-activity-urn"}}})
                        ancestor = page.parents.get(id(ancestor))
                    diagnostics.append({"commentaryClass": classes, "ancestors": ancestors, "empty": not raw_text(node).strip()})
                if "actor" in classes and node.attrs.get("href"):
                    diagnostics.append({"actorClass": classes, "href": node.attrs["href"]})
                if node.tag == "time":
                    diagnostics.append({"timeAttrs": node.attrs})
            summary["cardAudit"] = diagnostics
            summary["status"] = "audited"
            timestamp, original = replay.split("/web/")[1].split("id_/", 1)
            with (DOWNLOADS / "receipts.jsonl").open("a", encoding="utf-8") as receipts:
                receipts.write(json.dumps({"timestamp": timestamp, "url": original, "snapshot": replay, "outcome": "audit"}) + "\n")
            print(json.dumps({"cardAudit": diagnostics}), flush=True)
        elif args.probe_only:
            summary["status"] = "probe-only"
        else:
            if args.validate_existing:
                validate_existing(client, summary)
            collect(client, candidates, args.max_posts, summary)
    except (StopCollection, KeyboardInterrupt) as exc:
        summary["status"] = "stopped"
        summary["stopReason"] = str(exc) or "Interrupted"
    finally:
        summary["requests"] = {"total": client.total, **client.counts}
        (DOWNLOADS / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
        if not args.probe_only:
            OUTPUT.touch(exist_ok=True)
        compact = {key: value for key, value in summary.items() if key not in {"perAuthor", "cardAudit", "layoutInspection"}}
        print(json.dumps(compact, indent=2), flush=True)


if __name__ == "__main__":
    main()
