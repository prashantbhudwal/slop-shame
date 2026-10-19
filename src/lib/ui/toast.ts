// Fallback undo toast, used only when a post can't host an in-place tombstone
// (e.g. its root is display: contents). Lives in the shared FX layer.

import { acquire, release, useLayerSheets } from '../fx/layer';
import { modalSheets } from './sheets';

export function showUndoToast(text: string, ms: number, onUndo: () => void): () => void {
  const layer = acquire();
  useLayerSheets(layer, modalSheets());
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.style.setProperty('--ms', `${ms}ms`);
  const label = document.createElement('span');
  label.textContent = `💥 ${text}`;
  const undo = document.createElement('button');
  undo.className = 'undo';
  undo.textContent = 'Undo';
  const timer = document.createElement('span');
  timer.className = 'timer';
  el.append(label, undo, timer);
  layer.ui.append(el);

  let done = false;
  const dismiss = () => {
    if (done) return;
    done = true;
    window.clearTimeout(t);
    el.remove();
    release();
  };
  undo.addEventListener('click', (e) => {
    e.stopPropagation();
    dismiss();
    onUndo();
  });
  const t = window.setTimeout(dismiss, ms);
  return dismiss;
}
