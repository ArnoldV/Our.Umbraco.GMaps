import type { AuthFailureSource } from '../google-maps-auth.js';

/**
 * Stands in for the global `gm_authFailure` hook, so a test can reject the API
 * key without latching the real module-level flag for every test after it.
 */
export class FakeAuthFailure {
  #listeners: Array<() => void> = [];

  readonly subscribe: AuthFailureSource = (listener) => {
    this.#listeners.push(listener);
    return () => {
      this.#listeners = this.#listeners.filter((registered) => registered !== listener);
    };
  };

  /** Google rejected the key. */
  fail() {
    for (const listener of [...this.#listeners]) listener();
  }

  get listenerCount() {
    return this.#listeners.length;
  }
}
