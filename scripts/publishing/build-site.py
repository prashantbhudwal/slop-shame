#!/usr/bin/env python3
"""Build the small GitHub Pages site using only Python's standard library."""
from html import escape
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / 'publishing/site'
SITE.mkdir(parents=True, exist_ok=True)
(SITE / 'assets').mkdir(exist_ok=True)
for source, target in [('public/assets/mascot/sloppy.webp', 'sloppy.webp'), ('public/icon/128.png', 'icon.png')]:
    shutil.copyfile(ROOT / source, SITE / 'assets' / target)

CSS = '''*{box-sizing:border-box}body{margin:0;background:#fafaf5;color:#1b1f3b;font:17px/1.65 system-ui,sans-serif}header,main,footer{max-width:800px;margin:auto;padding:24px}header{display:flex;align-items:center;justify-content:space-between;gap:24px;border-bottom:1px solid #d9dccf}header a{font-weight:700}nav{display:flex;gap:20px;flex-wrap:wrap}a{color:#294d13;text-underline-offset:4px}a:focus-visible{outline:3px solid #294d13;outline-offset:5px}h1{font-size:clamp(2.2rem,7vw,3.8rem);line-height:1.06;letter-spacing:-.045em;margin:24px 0}h2{font-size:1.35rem;line-height:1.3;margin:36px 0 12px}p,ul{margin:16px 0}.hero{display:flex;gap:24px;align-items:center;padding:24px 0}.hero img{width:180px;height:180px;object-fit:contain}.eyebrow{font-size:.85rem;font-weight:750;text-transform:uppercase;letter-spacing:.12em;color:#4c5e38}.note{padding:16px 20px;background:#edf3df;border-left:4px solid #598b26}footer{font-size:.85rem;border-top:1px solid #d9dccf;color:#54576a}code{font-size:.9em;overflow-wrap:anywhere}li{margin:9px 0}@media(max-width:560px){header{align-items:flex-start;flex-direction:column;gap:12px}.hero{flex-direction:column-reverse;align-items:flex-start}.hero img{width:120px;height:120px}header,main,footer{padding:20px}}'''
(SITE / 'style.css').write_text(CSS + '\n')

def page(title, description, body):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)} · Slop Shame</title><meta name="description" content="{escape(description, quote=True)}"><link rel="icon" href="assets/icon.png"><link rel="stylesheet" href="style.css"></head>
<body><header><a href="./" aria-label="Slop Shame home">Slop Shame</a><nav aria-label="Main navigation"><a href="privacy.html">Privacy</a><a href="support.html">Support</a></nav></header><main>{body}</main><footer>Independent project by Prashant Bhudwal. Not affiliated with LinkedIn or Google. <a href="privacy.html">Privacy policy</a></footer></body></html>\n'''

home = '''<div class="hero"><div><p class="eyebrow">For the LinkedIn home feed</p><h1>A little less slop.<br>A little more fun.</h1><p>Slop Shame gives feed posts a 0–100 Slop Index based on familiar AI-style writing patterns.</p></div><img src="assets/sloppy.webp" width="180" height="180" alt="Sloppy, the green Slop Shame mascot"></div>
<p class="note"><strong>In development.</strong> Chrome Web Store availability will be linked here after release.</p>
<h2>Read the signals. Decide for yourself.</h2><p>Local scoring highlights writing patterns and explains the score. Destroy adds a burst of drama as you hide an ordinary post from your view. Eligible posts can become satirical cards, generated from bundled templates.</p>
<p>A score is a heuristic, not proof of AI authorship. Human writing can score highly, and AI writing can score low.</p>
<h2>Your feed stays on your device.</h2><p>Post text and scores are processed locally, without an AI service or developer backend. Local author rankings stay in your browser. Author photos can load from LinkedIn when cards are viewed or exported; see the <a href="privacy.html">privacy policy</a> for details.</p>
<h2>Share thoughtfully.</h2><p>Card exports start with initials and pixelated photos. Quotes and other context can still identify a person. Nothing is posted automatically.</p>
<p><a href="support.html">Questions, bugs, or privacy concerns →</a></p>'''
(SITE / 'index.html').write_text(page('Home', 'Local writing-pattern scores and satirical cards for your LinkedIn home feed. Currently in development.', home))

support = '''<h1>Support</h1><p>Slop Shame is currently in development. For questions, bugs, feature requests, or privacy concerns, <a href="https://github.com/prashantbhudwal/slop-shame/issues">open a GitHub issue</a>.</p>
<p>Issues are public. Please leave out private feed text, account details, and identifiable screenshots. Include your browser version, extension version, and steps to reproduce a bug.</p>
<h2>Reporting a security problem</h2><p>Use <a href="https://github.com/prashantbhudwal/slop-shame/security/advisories/new">GitHub private vulnerability reporting</a>. Do not post exploit details in a public issue.</p>
<h2>How do scores work?</h2><p>The extension matches bundled writing-pattern rules locally. A Slop Index describes those signals; it cannot establish who wrote a post or which tools they used.</p>
<h2>How do I remove local data?</h2><p>The current development version has no user-facing clear control. Uninstalling removes browser-managed extension data. Copied text and downloaded images must be deleted separately. Read the <a href="privacy.html">privacy policy</a> for retention details.</p>
<h2>Does it act on my LinkedIn account?</h2><p>Destroy hides a post in your own view. Cards are copied or downloaded only when you choose. It does not automatically publish, message, or delete the original post.</p>'''
(SITE / 'support.html').write_text(page('Support', 'Help, bug reports, security reporting, and privacy questions for Slop Shame.', support))

# Deliberately small Markdown subset for our plain-language policy. Escape HTML first.
def inline(text):
    text = escape(text)
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    text = re.sub(r'\[([^\]]+)\]\((https://[^\s)]+)\)', r'<a href="\2">\1</a>', text)
    return text

def markdown(text):
    blocks, paragraph, items = [], [], []
    def flush():
        if paragraph:
            blocks.append('<p>' + inline(' '.join(paragraph)) + '</p>')
            paragraph.clear()
        if items:
            blocks.append('<ul>' + ''.join('<li>' + inline(x) + '</li>' for x in items) + '</ul>')
            items.clear()
    for line in text.splitlines():
        if not line.strip():
            flush()
        elif line.startswith('# '):
            flush(); blocks.append('<h1>' + inline(line[2:]) + '</h1>')
        elif line.startswith('## '):
            flush(); blocks.append('<h2>' + inline(line[3:]) + '</h2>')
        elif line.startswith('- '):
            if paragraph: flush()
            items.append(line[2:])
        else:
            if items: flush()
            paragraph.append(line.strip('_') if line.startswith('_Last updated:') else line)
    flush()
    return '\n'.join(blocks)

(SITE / 'privacy.html').write_text(page('Privacy policy', 'How Slop Shame processes LinkedIn feed content, stores local data, and handles card exports.', markdown((ROOT / 'PRIVACY.md').read_text())))
(SITE / '.nojekyll').touch()
print(f'Built {SITE}')
