// Opens the shame modal in the shared body-level layer (one at a time).

import { mount, unmount } from 'svelte';
import type { SlopReport } from '../engine/types';
import { acquire, release, useLayerSheets } from '../fx/layer';
import type { PostAuthor } from '../linkedin/types';
import ShameModal from './ShameModal.svelte';
import { modalSheets } from './sheets';

export interface OpenShameOptions {
  postId: string;
  report: SlopReport;
  author: PostAuthor | null;
  slopCount: number;
  reduceMotion: boolean;
  /** Focus returns here on close. */
  opener: HTMLElement | null;
  /** Called once when the modal opens (counts as one shaming). */
  onShamed(): void;
}

let close: (() => void) | null = null;

export function openShame(opts: OpenShameOptions): void {
  closeShame();
  const layer = acquire();
  useLayerSheets(layer, modalSheets());
  const container = document.createElement('div');
  container.className = 'modal-host';
  layer.ui.append(container);
  let app: Record<string, unknown> | null = null;
  const done = () => {
    if (!app) return;
    try { unmount(app); } catch { /* already gone */ }
    app = null;
    container.remove();
    release();
    close = null;
    opts.opener?.focus({ preventScroll: true });
  };
  app = mount(ShameModal, {
    target: container,
    props: {
      postId: opts.postId,
      report: opts.report,
      author: opts.author,
      slopCount: opts.slopCount,
      reduceMotion: opts.reduceMotion,
      onClose: done,
    },
  });
  close = done;
  opts.onShamed();
}

export function closeShame(): void {
  close?.();
}

export function isShameOpen(): boolean {
  return close !== null;
}
