// A tiny synthesized KA-SLOP: crackle, boom, squelch. WebAudio only, no audio
// files. Off by default (settings.sound). The context is closed when idle.

let ac: AudioContext | null = null;
let closeTimer: number | undefined;

function context(): AudioContext | null {
  try {
    ac ??= new AudioContext();
    if (ac.state === 'suspended') void ac.resume();
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      void ac?.close();
      ac = null;
    }, 4000);
    return ac;
  } catch {
    return null;
  }
}

function noise(a: AudioContext, seconds: number): AudioBuffer {
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * seconds), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** Schedule the eruption sound; `delay` is the time until the boom, in seconds. */
export function playKaslop(delay = 0.17, volume = 0.5): void {
  const a = context();
  if (!a) return;
  const t0 = a.currentTime + 0.01;
  const boom = t0 + delay;
  const out = a.createGain();
  out.gain.value = volume;
  out.connect(a.destination);

  // Crackle: a few tiny ticks while the cracks spread.
  for (let i = 0; i < 4; i++) {
    const at = t0 + (delay * i) / 4;
    const src = a.createBufferSource();
    src.buffer = noise(a, 0.03);
    const hp = a.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    const g = a.createGain();
    g.gain.setValueAtTime(0.25, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.03);
    src.connect(hp).connect(g).connect(out);
    src.start(at);
  }

  // Boom: low sine dropping in pitch.
  const osc = a.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, boom);
  osc.frequency.exponentialRampToValueAtTime(38, boom + 0.45);
  const og = a.createGain();
  og.gain.setValueAtTime(0.0001, boom);
  og.gain.exponentialRampToValueAtTime(1, boom + 0.01);
  og.gain.exponentialRampToValueAtTime(0.001, boom + 0.55);
  osc.connect(og).connect(out);
  osc.start(boom);
  osc.stop(boom + 0.6);

  // Blast: filtered noise with a closing lowpass.
  const blast = a.createBufferSource();
  blast.buffer = noise(a, 0.8);
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2400, boom);
  lp.frequency.exponentialRampToValueAtTime(140, boom + 0.7);
  const bg = a.createGain();
  bg.gain.setValueAtTime(0.0001, boom);
  bg.gain.exponentialRampToValueAtTime(0.8, boom + 0.008);
  bg.gain.exponentialRampToValueAtTime(0.001, boom + 0.75);
  blast.connect(lp).connect(bg).connect(out);
  blast.start(boom);

  // Squelch: a wet bandpass sweep right after.
  const sq = a.createBufferSource();
  sq.buffer = noise(a, 0.25);
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 6;
  bp.frequency.setValueAtTime(900, boom + 0.06);
  bp.frequency.exponentialRampToValueAtTime(220, boom + 0.28);
  const sg = a.createGain();
  sg.gain.setValueAtTime(0.0001, boom + 0.06);
  sg.gain.exponentialRampToValueAtTime(0.6, boom + 0.08);
  sg.gain.exponentialRampToValueAtTime(0.001, boom + 0.3);
  sq.connect(bp).connect(sg).connect(out);
  sq.start(boom + 0.06);
}

/** Gentle "poof" for reduced motion. */
export function playPoof(volume = 0.35): void {
  const a = context();
  if (!a) return;
  const t = a.currentTime + 0.01;
  const src = a.createBufferSource();
  src.buffer = noise(a, 0.35);
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(200, t + 0.3);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volume, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
  src.connect(lp).connect(g).connect(a.destination);
  src.start(t);
}
