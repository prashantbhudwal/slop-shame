import { slotRoom } from '../../lib/linkedin';

export interface FitHost {
  host: HTMLElement;
  shadow: ShadowRoot;
  fits: readonly string[];
}

interface Measurement extends FitHost {
  slot: string;
  wrap: HTMLElement;
  widths: number[];
}

/** Cache intrinsic variant widths; slot geometry is the only resize measurement. */
export class HostFitter {
  private measurements = new WeakMap<HTMLElement, Measurement>();

  invalidate(host?: HTMLElement): void {
    if (host) this.measurements.delete(host);
    else this.measurements = new WeakMap();
  }

  fit(hosts: FitHost[]): void {
    const pending: Measurement[] = [];
    const ready: Measurement[] = [];
    for (const item of hosts) {
      const slot = item.host.getAttribute('data-slot');
      if (!slot) continue;
      let measured = this.measurements.get(item.host);
      if (!measured || measured.slot !== slot || measured.shadow !== item.shadow) {
        const wrap = item.shadow.querySelector<HTMLElement>('.wrap');
        if (!wrap) continue;
        measured = { ...item, slot, wrap, widths: [] };
        pending.push(measured);
      }
      ready.push(measured);
    }
    // Match the original fitter's slot measurement with the smallest UI in place.
    // Every phase writes all hosts before reading any layout.
    for (const m of ready) setFit(m.host, m.fits[m.fits.length - 1]!);
    const rooms = ready.map((m) => slotRoom(m.host));
    const variants = Math.max(0, ...pending.map((m) => m.fits.length));
    for (let i = 0; i < variants; i++) {
      for (const m of pending) if (m.fits[i]) setFit(m.host, m.fits[i]!);
      for (const m of pending) {
        if (!m.fits[i]) continue;
        const style = getComputedStyle(m.wrap);
        m.widths[i] = m.wrap.getBoundingClientRect().width + parseFloat(style.marginLeft) + parseFloat(style.marginRight);
      }
    }
    // Selection is unchanged: largest fitting variant, smallest when none fit.
    const selected = ready.map((m, i) => {
      const room = rooms[i];
      const fit = room == null ? undefined : m.fits.find((_, j) => m.widths[j]! <= room);
      return fit ?? m.fits[m.fits.length - 1]!;
    });
    for (let i = 0; i < ready.length; i++) setFit(ready[i]!.host, selected[i]!);
    for (const m of pending) this.measurements.set(m.host, m);
  }
}

function setFit(host: HTMLElement, fit: string): void {
  if (host.getAttribute('data-fit') !== fit) host.setAttribute('data-fit', fit);
}
