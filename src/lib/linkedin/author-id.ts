// LinkedIn profile and company slugs are case-insensitive, and the same slug
// arrives percent-encoded from one link and plain from another (or from the
// address bar). Everything that keys data by PostAuthor.id uses this one form,
// so one person never splits into several Hall of Slop records.

/** "in/Jos%C3%A9-Diaz" and "in/josé-diaz" are the same author: "in/josé-diaz". */
export function canonicalAuthorId(id: string): string {
  let plain = id;
  try { plain = decodeURIComponent(id); } catch { /* malformed escape: compare as written */ }
  return plain.toLowerCase();
}
