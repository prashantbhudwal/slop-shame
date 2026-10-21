import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { closeDatabase } from '../../../src/lib/store/db';
import { exportData, getAuthor, getAuthorPosts } from '../../../src/lib/store/query';
import { importSnapshot, recordSightings } from '../../../src/lib/store/repository';
import { parseExport, validateSighting } from '../../../src/lib/store/validation';
import { sighting } from './helpers';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('IDBKeyRange', IDBKeyRange);
  vi.stubGlobal('location', { protocol: 'chrome-extension:' });
});
afterEach(async () => { await closeDatabase(); vi.unstubAllGlobals(); });
async function snapshot() {
  await recordSightings([sighting()]);
  return JSON.parse(await (await exportData()).text());
}

it('rejects oversized identity strings before replacing current data', async () => {
  const s = await snapshot();
  s.authors[0].name = 'x'.repeat(1024 * 1024);
  await expect(importSnapshot(JSON.stringify(s))).rejects.toThrow();
  expect((await getAuthor('in/alice'))!.name).toBe('in/alice');
  for (const field of ['id', 'name', 'headline', 'profileUrl', 'avatarUrl']) {
    expect(() => validateSighting({ ...sighting(), author: { ...sighting().author, [field]: 'x'.repeat(1024 * 1024) } })).toThrow();
  }
});

it('truncates every imported snippet including archived worst posts to 200 characters', async () => {
  const s = await snapshot();
  s.authors[0].worstPost.snippet = 'w'.repeat(1000);
  s.authors[0].archivedWorstPost = { ...s.authors[0].worstPost, snippet: 'a'.repeat(1000) };
  s.posts[0].snippet = 'p'.repeat(1000);
  await importSnapshot(JSON.stringify(s));
  expect((await getAuthor('in/alice'))!.worstPost!.snippet).toHaveLength(200);
  expect((await getAuthorPosts('in/alice', 1))[0]!.snippet).toHaveLength(200);
  expect(parseExport(JSON.stringify(s)).authors[0]!.archivedWorstPost!.snippet).toHaveLength(200);
});

it('requires literal enum strings for sightings and imports', async () => {
  expect(() => validateSighting({ ...sighting(), tierId: ['slopocalypse'] })).toThrow();
  expect(() => validateSighting({ ...sighting(), author: { ...sighting().author, kind: ['person'] } })).toThrow();
  const s = await snapshot();
  s.authors[0].kind = ['person'];
  expect(() => parseExport(JSON.stringify(s))).toThrow();
  s.authors[0].kind = 'person'; s.posts[0].tierId = ['slopocalypse'];
  expect(() => parseExport(JSON.stringify(s))).toThrow();
});

it('bounds JSON length before parsing and rejects excessive record counts', async () => {
  const json = ' '.repeat(32 * 1024 * 1024);
  const parse = vi.spyOn(JSON, 'parse');
  expect(() => parseExport(json)).toThrow();
  expect(parse.mock.calls.length).toBe(0);
  parse.mockRestore();
  const s = await snapshot();
  s.posts = Array(20_001).fill(null);
  expect(() => parseExport(JSON.stringify(s))).toThrow(/limit|many|large/i);
});
