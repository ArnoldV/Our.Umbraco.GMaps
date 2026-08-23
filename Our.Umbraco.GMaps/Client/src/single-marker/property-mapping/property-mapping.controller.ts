import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UMB_PROPERTY_CONTEXT, UMB_PROPERTY_DATASET_CONTEXT } from '@umbraco-cms/backoffice/property';
import type { Address, AddressFieldKey, Location, PropertyMappingMode, PropertyMappingRow, PropertyMappingValue } from '../../types.js';

/** Geocoding is billed per request, so source edits are batched, not per keystroke. */
const INBOUND_DEBOUNCE_MS = 800;

export interface GMapsInboundLookupRequest {
  /** Free-text address to forward geocode. Ignored when `coordinates` is set. */
  query?: string;
  /** Coordinates read straight from mapped properties; no geocoding needed. */
  coordinates?: Location;
}

export interface GMapsPropertyMappingArgs {
  /** Asks the host to move the pin. The host owns geocoding; this controller does not. */
  onInboundLookup: (request: GMapsInboundLookupRequest) => void | Promise<void>;
  /**
   * Fires when anything the host renders from this controller changes: the
   * warnings, or a mapped source value (which governs whether a lookup is
   * currently possible).
   */
  onChange?: () => void;
}

/**
 * Exchanges address data between the map property and other properties on the
 * same content node - or, inside a Block List/Grid/RTE block, the same block.
 *
 * The scoping is handled entirely by UMB_PROPERTY_DATASET_CONTEXT: the nearest
 * dataset wins, so a map inside a block sees that block's element properties and
 * a map on a document sees the document's properties for the current variant.
 * No container-specific code is needed.
 *
 * This controller deliberately knows nothing about Google Maps. It reads and
 * writes the dataset and tells the host when to look something up.
 */
export class GMapsPropertyMappingController extends UmbControllerBase {
  #args: GMapsPropertyMappingArgs;
  #dataset?: typeof UMB_PROPERTY_DATASET_CONTEXT.TYPE;

  #config: PropertyMappingValue = {};
  #ownAlias?: string;
  #isReadOnly = false;

  /** Last known value per mapped alias; the basis for compare-before-write. */
  #values = new Map<string, unknown>();
  /** alias -> exists on the content type. Absent means "not probed", treated as usable. */
  #knownAliases = new Map<string, boolean>();
  #warnings: string[] = [];

  #observedAliases: string[] = [];
  #generation = 0;

  /** Signature of the source data we last acted on (or settled at, on load). */
  #baseline?: string;
  #settled = false;
  #suppressInbound = false;
  #debounce?: number;

  constructor(host: UmbControllerHost, args: GMapsPropertyMappingArgs) {
    super(host, 'GMapsPropertyMappingController');
    this.#args = args;

    this.consumeContext(UMB_PROPERTY_CONTEXT, (context) => {
      this.observe(context?.alias, (alias) => {
        this.#ownAlias = alias;
        this.#refreshObservers();
      }, '_gmapsMappingOwnAlias');
      this.observe(context?.isReadOnly, (readOnly) => {
        this.#isReadOnly = readOnly ?? false;
      }, '_gmapsMappingReadOnly');
    });

    this.consumeContext(UMB_PROPERTY_DATASET_CONTEXT, (context) => {
      this.#dataset = context;
      this.#refreshObservers();
    });
  }

  // #region public surface

  setConfig(value: PropertyMappingValue | undefined) {
    const next = value ?? {};
    // The host pushes `config` on every update cycle. Rebuilding the observers
    // on an unchanged config would also reset the inbound baseline, which would
    // let a stale source value trigger a lookup.
    if (JSON.stringify(next) === JSON.stringify(this.#config)) return;
    this.#config = next;
    this.#refreshObservers();
  }

  get mode(): PropertyMappingMode {
    return this.#config.mode ?? 'off';
  }

  get inboundEnabled(): boolean {
    return this.mode === 'inbound' || this.mode === 'both';
  }

  get outboundEnabled(): boolean {
    return this.mode === 'outbound' || this.mode === 'both';
  }

  /** Misconfigured aliases, for display under the search box. */
  get warnings(): ReadonlyArray<string> {
    return this.#warnings;
  }

  /** True when inbound is on and the mapped properties currently hold something to look up. */
  get canLookup(): boolean {
    if (!this.inboundEnabled || this.#isReadOnly) return false;
    const request = this.#composeRequest();
    return !!(request.coordinates || request.query);
  }

  /**
   * Performs an inbound lookup on demand (the "Look up from address fields"
   * button), regardless of the autoLookup setting.
   */
  async requestLookup(): Promise<void> {
    if (!this.inboundEnabled || this.#isReadOnly) return;
    const request = this.#composeRequest();
    if (!request.coordinates && !request.query) return;
    this.#settled = true;
    this.#baseline = this.#signature(request);
    await this.#args.onInboundLookup(request);
  }

  /**
   * Writes the resolved address back out to the mapped properties.
   *
   * Called only from the paths that actually change the address - never from
   * `setValue()`, which also runs on zoom/pan and during map construction. That
   * is what stops merely opening a document from marking it dirty.
   */
  writeBack(address: Address | undefined) {
    if (!this.outboundEnabled || !address) return;
    const dataset = this.#dataset;
    if (!dataset || this.#isReadOnly || dataset.getReadOnly()) return;

    this.#suppressInbound = true;
    globalThis.clearTimeout(this.#debounce);
    try {
      for (const row of this.#rows()) {
        const alias = row.alias.trim();
        if (!this.#isAliasUsable(alias)) continue;
        const next = outboundValue(row.field, address);
        if (next === undefined) continue;
        // Compare-before-write: a pan or a pin drag leaves the address text
        // untouched, so only lat/lng should actually be written.
        if (valuesEqual(this.#values.get(alias), next)) continue;
        dataset.setPropertyValue(alias, next);
        this.#values.set(alias, next);
      }
      // Re-baseline against what we just wrote. The inbound observers are about
      // to report those same values; without this they would read as a change
      // and cost a redundant geocode before the compare-before-write above
      // settled the loop.
      this.#settled = true;
      this.#baseline = this.#signature(this.#composeRequest());
    } finally {
      this.#suppressInbound = false;
    }
  }

  override destroy(): void {
    globalThis.clearTimeout(this.#debounce);
    super.destroy();
  }

  // #endregion

  // #region observers

  #rows(): PropertyMappingRow[] {
    return (this.#config.mappings ?? []).filter((row) => row?.alias?.trim());
  }

  #isAliasUsable(alias: string): boolean {
    if (!alias || alias === this.#ownAlias) return false;
    // Absent from the map means the alias was never probed (the dataset does not
    // implement propertyVariantId); stay permissive rather than silently drop it.
    return this.#knownAliases.get(alias) !== false;
  }

  #refreshObservers() {
    void this.#buildObservers(++this.#generation);
  }

  async #buildObservers(generation: number) {
    for (const alias of this.#observedAliases) {
      this.removeUmbControllerByAlias(`_gmapsMapValue_${alias}`);
      this.removeUmbControllerByAlias(`_gmapsMapProbe_${alias}`);
    }
    this.#observedAliases = [];
    this.#values.clear();
    this.#knownAliases.clear();
    this.#settled = false;
    this.#baseline = undefined;
    this.#updateWarnings();

    const dataset = this.#dataset;
    if (!dataset || this.mode === 'off') return;

    // Every mapped alias is observed regardless of direction: inbound needs the
    // values to compose a query, outbound needs them to compare before writing.
    const aliases = [...new Set(this.#rows().map((row) => row.alias.trim()))];

    for (const alias of aliases) {
      if (generation !== this.#generation) return;
      if (alias === this.#ownAlias) continue;
      this.#observedAliases.push(alias);

      // `getProperties()` is not a usable allow-list - it drops properties that
      // hold no value, so an empty `city` would look like it does not exist.
      // `propertyVariantId` is backed by the content type structure, so it
      // returns undefined only when the alias genuinely is not on the type, and
      // it resolves against the block's element type when we are inside a block.
      if (dataset.propertyVariantId) {
        const variantId = await dataset.propertyVariantId(alias);
        if (generation !== this.#generation) return;
        this.observe(variantId, (id) => {
          this.#knownAliases.set(alias, id !== undefined);
          this.#updateWarnings();
        }, `_gmapsMapProbe_${alias}`);
      }

      const value = await dataset.propertyValueByAlias(alias);
      if (generation !== this.#generation) return;
      this.observe(value, (current) => {
        this.#values.set(alias, current);
        this.#args.onChange?.();
        this.#scheduleEvaluate();
      }, `_gmapsMapValue_${alias}`);
    }

    this.#scheduleEvaluate();
  }

  #updateWarnings() {
    const warnings: string[] = [];
    if (this.mode !== 'off') {
      for (const alias of new Set(this.#rows().map((row) => row.alias.trim()))) {
        if (alias === this.#ownAlias) {
          warnings.push(`Property mapping ignores "${alias}" - a map cannot map to itself.`);
        } else if (this.#knownAliases.get(alias) === false) {
          warnings.push(`Property mapping ignores "${alias}" - no property with that alias exists here.`);
        }
      }
    }
    const changed = warnings.length !== this.#warnings.length
      || warnings.some((warning, index) => warning !== this.#warnings[index]);
    this.#warnings = warnings;
    if (changed) this.#args.onChange?.();
  }

  #scheduleEvaluate() {
    if (this.#suppressInbound) return;
    globalThis.clearTimeout(this.#debounce);
    this.#debounce = globalThis.setTimeout(() => this.#evaluate(), INBOUND_DEBOUNCE_MS);
  }

  #evaluate() {
    const request = this.#composeRequest();
    const signature = this.#signature(request);

    if (!this.#settled) {
      // First settle after load. Record the baseline but do not act on it: every
      // propertyValueByAlias observable emits its current value immediately, and
      // acting here would move a hand-placed pin just by opening the document.
      this.#settled = true;
      this.#baseline = signature;
      return;
    }

    if (signature === this.#baseline) return;
    this.#baseline = signature;

    if (!this.inboundEnabled || !this.#config.autoLookup || this.#isReadOnly) return;
    if (!request.coordinates && !request.query) return;
    void this.#args.onInboundLookup(request);
  }

  // #endregion

  // #region composition

  #sourceValue(field: AddressFieldKey): unknown {
    const row = this.#rows().find((candidate) => candidate.field === field && this.#isAliasUsable(candidate.alias.trim()));
    return row ? this.#values.get(row.alias.trim()) : undefined;
  }

  #composeRequest(): GMapsInboundLookupRequest {
    return {
      coordinates: this.#composeCoordinates(),
      query: this.#composeQuery(),
    };
  }

  /** Coordinates held in properties are authoritative and cost no geocoding. */
  #composeCoordinates(): Location | undefined {
    const paired = parseLocation(text(this.#sourceValue('coordinates')));
    if (paired) return paired;

    const lat = toNumber(this.#sourceValue('lat'));
    const lng = toNumber(this.#sourceValue('lng'));
    if (lat === undefined || lng === undefined) return undefined;
    return inRange(lat, lng) ? { lat, lng } : undefined;
  }

  #composeQuery(): string | undefined {
    const full = text(this.#sourceValue('full_address'));
    if (full) return full;

    const streetLine = [text(this.#sourceValue('streetNumber')), text(this.#sourceValue('street'))]
      .filter(Boolean)
      .join(' ');

    const parts = [
      streetLine,
      text(this.#sourceValue('city')),
      text(this.#sourceValue('state')),
      text(this.#sourceValue('postalcode')),
      text(this.#sourceValue('country')),
    ].filter((part) => !!part);

    return parts.length ? parts.join(', ') : undefined;
  }

  #signature(request: GMapsInboundLookupRequest): string {
    return JSON.stringify([request.coordinates ?? null, request.query ?? null]);
  }

  // #endregion
}

function outboundValue(field: AddressFieldKey, address: Address): unknown {
  const coordinates = address.coordinates;
  switch (field) {
    case 'lat':
      return coordinates?.lat;
    case 'lng':
      return coordinates?.lng;
    case 'coordinates':
      return coordinates ? `${coordinates.lat},${coordinates.lng}` : undefined;
    default:
      // Empty string rather than undefined, so clearing a component on the map
      // clears the mapped property instead of leaving a stale value behind.
      return address[field] ?? '';
  }
}

/**
 * Treats "empty" spellings as equal and compares across types, so a numeric
 * latitude written by us matches the string a textstring property hands back.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  const left = a === null || a === undefined ? '' : String(a);
  const right = b === null || b === undefined ? '' : String(b);
  return left === right;
}

/** Only primitives are usable as address text; anything else is another editor's model. */
function text(value: unknown): string | undefined {
  if (value === null || value === undefined || typeof value === 'object') return undefined;
  const result = String(value).trim();
  return result.length ? result : undefined;
}

function toNumber(value: unknown): number | undefined {
  const source = text(value);
  if (source === undefined) return undefined;
  const parsed = Number.parseFloat(source);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function inRange(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function parseLocation(value: string | undefined): Location | undefined {
  if (!value) return undefined;
  const parts = value.split(',');
  if (parts.length !== 2) return undefined;
  const lat = toNumber(parts[0]);
  const lng = toNumber(parts[1]);
  if (lat === undefined || lng === undefined) return undefined;
  return inRange(lat, lng) ? { lat, lng } : undefined;
}
