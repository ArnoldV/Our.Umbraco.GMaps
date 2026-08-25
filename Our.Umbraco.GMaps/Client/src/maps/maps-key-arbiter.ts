import type { ApiKeySource } from '../core/api-key-notices.js';
import { bootstrapMaps, teardownMaps } from './maps-bootstrap.js';

/**
 * Decides the one API key a page loads Google Maps under.
 *
 * The Maps JavaScript API is a single global keyed once per page, so several
 * map properties on one document cannot each have their own key. Rather than
 * let whichever editor initialises first impose its key - and rather than let a
 * second editor tear the API down under the first, which breaks both - every
 * editor offers its key here and the best one wins:
 *
 *   a key set on a datatype beats the appsettings fallback,
 *   and within a rank the first offer wins.
 *
 * Datatype keys are offered synchronously as soon as an editor is handed its
 * configuration, before any settings are fetched, so they are all registered
 * before the first map needs the API. An editor that does not get its own key
 * can see so from `activeKey` and say why rather than draw a broken map.
 */
export class MapsKeyArbiter {
  #candidates = new Map<ApiKeySource, string>();
  #activeKey?: string;
  #loading?: Promise<string>;
  #load: (key: string) => Promise<void>;
  #teardown: () => void;

  constructor(
    options: { load?: (key: string) => Promise<void>; teardown?: () => void } = {},
  ) {
    this.#load = options.load ?? bootstrapMaps;
    this.#teardown = options.teardown ?? teardownMaps;
  }

  /** The key the page loaded, once it has. */
  get activeKey(): string | undefined {
    return this.#activeKey;
  }

  /** Puts a key forward. Ignored once the API has been loaded - it is too late. */
  offer(key: string, source: ApiKeySource): void {
    if (!key) return;
    if (this.#loading) return;
    if (this.#candidates.has(source)) return;
    this.#candidates.set(source, key);
  }

  /** Loads the API under the best key offered, resolving with the key used. */
  load(): Promise<string> {
    if (this.#loading) return this.#loading;

    const key = this.#candidates.get('datatype') ?? this.#candidates.get('appsettings');
    if (!key) return Promise.reject(new Error('No Google Maps API key was offered.'));

    return (this.#loading = this.#loadKey(key));
  }

  /**
   * Deliberately replaces the key in use, tearing the loaded API down first.
   *
   * Only safe where a single map owns the page - the datatype configuration
   * screen - because the teardown takes every other map on the page with it.
   */
  reload(key: string): Promise<string> {
    this.#teardown();
    this.#activeKey = undefined;
    this.#candidates.clear();
    this.#candidates.set('datatype', key);
    return (this.#loading = this.#loadKey(key));
  }

  async #loadKey(key: string): Promise<string> {
    await this.#load(key);
    this.#activeKey = key;
    return key;
  }
}

/** The page's arbiter. Editors share it; tests build their own. */
export const mapsKeys = new MapsKeyArbiter();
