# Property mapping between the map and sibling properties — design

Resolves [#20](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/20) and
[#178](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/178).

## Summary

Let a Single Marker property exchange address data with other properties on the
same content node (or the same block).

Two directions, independently switchable:

- **Inbound (Properties → Map).** The editor fills in `address`, `city`,
  `postcode` … the map geocodes them and drops the pin. This is #20.
- **Outbound (Map → Properties).** The editor picks a place on the map and the
  resolved components are written back into the mapped properties. This is #178.

The feature is off by default and entirely client-side. Existing datatypes are
unchanged.

## Requirements

1. A datatype can declare a mapping between map address fields and property
   aliases on the containing content.
2. Mapping works at document level **and** inside Block List / Block Grid / RTE
   blocks, scoped to the block's own element properties.
3. Mapping degrades gracefully when a nominated alias does not exist on the
   content type — no crash, no phantom property, and the misconfiguration is
   visible to the editor.
4. Geocoding requests are not fired per keystroke (they are billed).
5. Opening a document must never move a hand-placed pin, and must never mark the
   document dirty on load.

## Decisions

### Where the sibling data comes from

`UMB_PROPERTY_DATASET_CONTEXT`, which exposes exactly the two calls needed:

```ts
propertyValueByAlias<T>(alias: string): Promise<Observable<T | undefined> | undefined>;
setPropertyValue(alias: string, value: unknown): void;
```

Scoping is automatic — the *nearest* dataset context wins:

| Map property lives in | Context resolved | Siblings visible |
|---|---|---|
| Document / media workspace | `UmbInvariantWorkspacePropertyDatasetContext` / variant equivalent | node properties, correct culture |
| Block List / Grid / RTE / Single block | `UmbElementPropertyDatasetContext` | that block's element properties |

This closes Ronald's 2020 investigation on #20 ("what data is available… within
Nested Content and Block List") with no per-container code. The
`EditorModelEventManager` workaround he suggested does not exist in v14+ and is
not needed.

Reaching **out** of a block to the parent document is explicitly out of scope:
consuming `UMB_CONTENT_WORKSPACE_CONTEXT` from inside a block resolves to the
outer document, which would silently validate block aliases against the wrong
content type.

### Validating an alias exists

`getProperties()` is **not** a usable allow-list: it merges the variant-id map
with `_dataOwner.values` and drops entries that have no stored value, so an
empty `city` may legitimately be absent.

`propertyVariantId(alias)` is the reliable probe. Its backing map is built from
`structure.contentTypeProperties`, so it returns `undefined` if and only if the
alias is not on the content type — and it works identically at document level
and inside a block. It is optional on the base interface; when absent (e.g. a
plain `UmbPropertyDatasetContextBase`) validation is skipped permissively.

Unknown aliases are dropped from the mapping and surfaced as a warning under the
search box.

### Config shape

One config key, `propertyMapping`, edited by a new custom config editor UI
(`GMaps.PropertyEditorUi.PropertyMapping`), following the `SnazzyMaps`
precedent of storing an object:

```ts
{
  mode: 'off' | 'inbound' | 'outbound' | 'both',
  autoLookup: boolean,
  mappings: Array<{ field: AddressFieldKey; alias: string }>
}
```

Aliases are free text — a datatype config editor has no knowledge of which
document types consume the datatype.

Bundling mode, `autoLookup` and the rows into one editor (rather than three
stock config properties) keeps the UI coherent: the direction selector governs
which of the other controls are meaningful.

**No C# change is required.** `SingleMapPropertyValueConverter` reads config as
`Dictionary<string, object>` and `Models/Configuration/Config.cs` is not
consumed by it. If `Config.cs` ever gains this key it must be decorated for both
`System.Text.Json` and Newtonsoft — that is the lesson of
[#174](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/174).

### Mappable fields

The keys of `AddressBase`, plus coordinates:

`full_address`, `friendlyName`, `streetNumber`, `street`, `postalcode`, `city`,
`state`, `country`, `lat`, `lng`, `coordinates` (a `"lat,lng"` string, for sites
that keep a single text property).

`lat`/`lng` are written as **numbers** so numeric/decimal properties receive a
usable value; a textstring target will string-ify on save.

### Inbound behaviour

1. If `coordinates`, or both `lat` and `lng`, are mapped and parse to a valid
   location → place the pin directly. No forward-geocode, so no API charge.
2. Otherwise compose a query. `full_address` alone if mapped and non-empty;
   else `"<streetNumber> <street>, <city>, <state>, <postalcode>, <country>"`
   from whichever parts are mapped.
3. Forward-geocode, place the pin, and fill the address from the result.

**Never on load.** Every `propertyValueByAlias` observable emits its current
value immediately. The controller debounces 800 ms, records the first settled
query as a baseline **without acting on it**, and only triggers on a subsequent
change. Opening an existing node therefore cannot move a hand-placed pin or
dirty the document.

`autoLookup: false` (the default) suppresses the automatic trigger entirely; a
**Look up from address fields** button is rendered whenever inbound is enabled
and always performs the lookup on demand.

### Outbound behaviour

Fired explicitly from the five address-changing paths — `gmp-select`, `dragend`,
`#applyCoordinateSearch`, `#onFriendlyNameInput`, `resetView` — and **not** from
`setValue()`, which also runs on zoom/pan and during map construction. This is
what keeps load from dirtying the document.

Each write is compare-before-write against the last known value, so a pan or a
pin drag that leaves the address text unchanged writes only `lat`/`lng`.

Writes are skipped when the dataset or the property is read-only.

### Loop guard

Outbound writes `city`; the inbound observer on `city` would fire and
re-geocode, which would write `city` again. Two layers stop this:

1. A `#suppressInbound` flag held across the synchronous write.
2. After writing, the baseline query is recomputed from the newly written values,
   so the debounced inbound evaluation compares equal and does nothing.

Compare-before-write alone would terminate the loop, but only after one wasted
geocode call.

### Self-reference

`UMB_PROPERTY_CONTEXT.alias` is observed so a mapping row pointing at the map's
own alias is rejected.

### Reporting geocoding failures

The promise form of `geocoder.geocode()` **rejects on every non-OK status,
including `ZERO_RESULTS`**, so a single `catch` cannot tell "that address does
not exist" from "this key may not use the Geocoding API". Collapsing them sent
editors hunting for a typo when the real fix was in the Cloud console — the
Geocoding API is a separate API from Maps JavaScript and Places, so a key that
renders the map happily can still be refused for lookups.

`#runGeocode` therefore passes the callback form purely to capture the exact
status (the rejection only carries it inside a message), falling back to
scanning the message when the callback never ran. `describeGeocoderStatus` maps
the status to a message and a severity: `ZERO_RESULTS` is an `info` notice,
everything else is an `error` and is additionally logged to the console with the
raw status.

Key-level rejection (invalid key, billing off, referrer not allowed) never
reaches a promise at all — the Maps JS API's only hook is a global
`gm_authFailure`. `src/google-maps-auth.ts` installs that global once, chains to
any pre-existing handler, and fans out to listeners, since several editors can
share a page. That failure is sticky: `#setNotice` refuses to clear or overwrite
it, because a geocode that happens to succeed does not mean the map works.

Notices render above the map with the search controls, not below it, since
configuration problems are persistent and actionable.

## Architecture

| File | Role |
|---|---|
| `src/types.ts` | `AddressFieldKey`, `PropertyMappingRow`, `PropertyMappingValue`, labels |
| `src/single-marker/property-mapping/property-mapping.controller.ts` | dataset consumption, alias probing, inbound observation + debounce, outbound compare-and-write, loop guard |
| `src/single-marker/property-mapping/property-mapping-config.element.ts` | datatype config UI |
| `src/single-marker/property-mapping/manifest.ts` | registers the config UI |
| `src/single-marker/single-marker-editor.element.ts` | owns geocoding and the marker; delegates all dataset work to the controller |
| `src/single-marker/manifest.ts` | adds the `propertyMapping` config property |

The controller knows nothing about Google Maps; the element knows nothing about
the dataset. The seam is two calls: the controller asks the element to apply a
lookup, the element asks the controller to write an address back.

## Out of scope

- Reaching from a block to the parent document's properties.
- Mapping on the (not yet ported) multi-marker editor.
- Server-side prefill.
- Clearing the mapped properties when the *Clear Marker* property action clears
  the map. That action goes through `propertyContext.clearValue()`, which does
  not route through any of the outbound paths; hooking the `value` setter's
  clear branch instead would also fire for a brand-new node that has no value
  yet, and could wipe properties prefilled from a content template.
