import type { SettingsMessage } from '../settings/messages';
import type { PageMessage } from './model';
import type { StoreMessage } from './types';

export interface StoreErrorReply {
  type: 'store/error';
  error: string;
  retryable: boolean;
}

export class StoreRequestError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = 'StoreRequestError';
  }
}

/** Errors use data envelopes so callback-style Chromium listeners work too. */
export async function requestStore<T>(message: StoreMessage | PageMessage | SettingsMessage): Promise<T> {
  const reply: unknown = await browser.runtime.sendMessage(message);
  if (reply && typeof reply === 'object' && 'type' in reply && reply.type === 'store/error') {
    const error = reply as StoreErrorReply;
    throw new StoreRequestError(error.error, error.retryable);
  }
  return reply as T;
}
