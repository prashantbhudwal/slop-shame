// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../../src/lib/linkedin', () => ({ slotRoom: vi.fn() }));
import { slotRoom } from '../../../src/lib/linkedin';
import { HostFitter, type FitHost } from '../../../src/entrypoints/linkedin.content/host-fitting';

function chip(events: string[], fits: readonly string[] = ['full', 'score', 'icon']): FitHost {
  const host = document.createElement('div');
  host.setAttribute('data-slot', 'bar');
  const shadow = host.attachShadow({ mode: 'closed' });
  const wrap = document.createElement('div');
  wrap.className = 'wrap';
  wrap.style.marginLeft = '4px';
  wrap.style.marginRight = '0px';
  shadow.append(wrap);
  document.body.append(host);
  const set = host.setAttribute.bind(host);
  vi.spyOn(host, 'setAttribute').mockImplementation((k, v) => { events.push(`write:${v}`); set(k, v); });
  vi.spyOn(wrap, 'getBoundingClientRect').mockImplementation(() => {
    events.push('width');
    return { width: [150, 60, 30][fits.indexOf(host.getAttribute('data-fit')!)] } as DOMRect;
  });
  return { host, shadow, fits };
}
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe('host fitting', () => {
  it('selects the same largest fitting variant including margins and no-room fallback', () => {
    const fitter = new HostFitter();
    const h = chip([]);
    for (const [room, expected] of [[154, 'full'], [153, 'score'], [64, 'score'], [63, 'icon'], [0, 'icon'], [null, 'icon']] as const) {
      vi.mocked(slotRoom).mockReturnValue(room);
      fitter.fit([h]);
      expect(h.host.getAttribute('data-fit')).toBe(expected);
    }
    expect(h.shadow.querySelector('.wrap')!.getBoundingClientRect).toHaveBeenCalledTimes(3);
  });
  it('caches variant widths: 100 cached hosts resize with zero width/style reads and at most 200 writes', () => {
    const events: string[] = [];
    const hosts = Array.from({ length: 100 }, () => chip(events));
    const fitter = new HostFitter();
    vi.mocked(slotRoom).mockReturnValue(180);
    fitter.fit(hosts);
    events.length = 0;
    const styles = vi.spyOn(globalThis, 'getComputedStyle');
    vi.mocked(slotRoom).mockReturnValue(80);
    fitter.fit(hosts);
    expect(events.filter(e => e === 'width')).toHaveLength(0);
    expect(styles).not.toHaveBeenCalled();
    expect(events.filter(e => e.startsWith('write'))).toHaveLength(200);
    expect(hosts.every(h => h.host.getAttribute('data-fit') === 'score')).toBe(true);
  });
  it('batches every read phase before final writes across hosts', () => {
    const events: string[] = [];
    const hosts = Array.from({ length: 3 }, () => chip(events));
    vi.mocked(slotRoom).mockImplementation(() => { events.push('room'); return 80; });
    new HostFitter().fit(hosts);
    expect(events).toEqual([
      ...Array(3).fill('write:icon'), ...Array(3).fill('room'),
      ...Array(3).fill('write:full'), ...Array(3).fill('width'),
      ...Array(3).fill('write:score'), ...Array(3).fill('width'),
      ...Array(3).fill('write:icon'), ...Array(3).fill('width'),
      ...Array(3).fill('write:score'),
    ]);
  });
  it('remeasures after theme invalidation, content changes, or a slot move', () => {
    const fitter = new HostFitter();
    const h = chip([]);
    vi.mocked(slotRoom).mockReturnValue(80);
    fitter.fit([h]);
    fitter.invalidate(); // theme
    fitter.fit([h]);
    fitter.invalidate(h.host); // new score/tier or remount
    fitter.fit([h]);
    h.host.setAttribute('data-slot', 'name');
    fitter.fit([h]);
    expect(h.shadow.querySelector('.wrap')!.getBoundingClientRect).toHaveBeenCalledTimes(12);
  });
});
