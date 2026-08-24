# Multi-marker map property editor — design

Resolves [#27](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/27).

## Summary

Add a second property editor, **Google Maps Multi Marker**, that stores many pins
against one shared map configuration. The existing Single Marker editor keeps its
alias, its stored shape and its property value converter contract; only its
internals change.

Getting there also does what the issue thread has been asking for since 2020
without ever doing: it separates the map logic from the Google SDK so both editors
can share it, and puts the shared logic under test. The package currently has no
automated tests at all.

The work is phased so that phases 0–2 ship no user-visible change and phase 3
closes the issue.

## Requirements

1. A datatype can hold between *min* and *max* markers on a single map, with one
   shared zoom, centre point and map type.
2. Each marker carries an address, a friendly name, an optional description, and
   an optional colour drawn from a palette configured on the datatype.
3. Markers are reorderable, and the order is stored so a front-end legend can
   match the map.
4. The map stays visible while a marker's details are edited.
5. Existing Single Marker datatypes, stored values and PVC consumers are
   unaffected.
6. Opening a document must not move an editor's chosen framing, and must not mark
   the document dirty on load.
7. The shared map logic is covered by tests that need no Google API key.

## Decisions

### A separate editor, over extending the Single editor

Ronald's two options on the issue were a separate editor, or min/max on the
existing one with a new value type and a data migration. We take the separate
editor: the value shape and PVC return type of `Our.Umbraco.GMaps.Single` are a
published contract, and there is no version of "extend it" that does not break
somebody's Razor.

Duplicating the map logic across two editors is the obvious cost of that choice,
so the map logic is extracted into a shared core rather than copied.

### Layering: `core/` may not import `maps/`

Three layers, with the Google SDK reachable only from the bottom one:

```
Client/src/
  core/                      zero Google imports; plain values in, plain values out
    address.ts               composeAddress() from Google-shaped components
    coordinates.ts           parse / format / validate Location
    geocode-status.ts        geocoder status -> editor-facing message
    marker-collection.ts     markers[], selection, add/remove/reorder/update, limits
    value.ts                 (de)serialise both editors' values, including legacy shapes
  maps/                      the seam
    maps-api.ts              interface GoogleMapsApi
    google-maps-api.ts       real implementation
    fake-maps-api.ts         test double
  controllers/               imperative glue, thin by construction
    map-surface.controller.ts    map lifecycle, centre/zoom, ctrl-drag, auth failure
    geocoding.controller.ts      forward/reverse geocode + notices
    marker-sync.controller.ts    reconcile core state -> AdvancedMarkerElements
  single-marker/             existing element, refactored to compose the above
  multi-marker/              new element, drawer modal, manifest, actions
```

The one rule that makes the layering hold: **`core/` never imports from `maps/` or
`controllers/`.** A lint-visible import boundary, not a convention.

The rule earns its keep because the defects this editor has actually shipped are
all `core/` logic: stale `_address` spreads, `friendlyName` overwritten by a
destructure, `"Paris, France"` parsing to `NaN` coordinates, and derived state
surviving a cleared value. None of those needed a map to reproduce; all of them
needed an API key to *notice*.

`GoogleMapsApi` is deliberately narrow — the SDK surface the package actually
uses, no more: load libraries, create map, create marker, create autocomplete,
geocode.

### Stored value

```json
{
  "markers": [
    {
      "key": "8f3c1d2e-…",
      "coordinates": { "lat": -37.8340, "lng": 144.9260 },
      "full_address": "88 Dock Rd, Port Melbourne VIC 3207",
      "friendlyName": "Warehouse",
      "streetNumber": "88",
      "street": "Dock Rd",
      "city": "Port Melbourne",
      "state": "VIC",
      "postalcode": "3207",
      "country": "Australia",
      "description": "Deliveries 7am–3pm, gate 4",
      "color": "#2d7ef7"
    }
  ],
  "mapconfig": {
    "zoom": 12,
    "centerCoordinates": { "lat": -37.8136, "lng": 144.9631 },
    "maptype": "roadmap"
  }
}
```

**Marker fields are flat, not nested under `address`.** Server-side that is
`Marker : Address` plus `Description` and `Color`, which reuses every existing
address member.

**`key` is a client-generated GUID.** Reorder and drawer-editing both need stable
identity. Index-based identity breaks the moment a chip is dragged while the
drawer is open, and it makes Lit's `repeat()` correct rather than accidental.

**`color` stores the hex value only, never the label.** The PVC resolves the
label from the datatype's *current* palette at render time, so renaming a swatch
does not leave stale labels across a thousand documents. A colour later removed
from the palette resolves to a null label, and the editor flags the marker.

`mapconfig` reuses the existing `MapConfig` model unchanged.

The matching TypeScript types (`Marker`, `MultiMap`) join the existing shared
`types.ts` alongside `Map` and `Address`, rather than moving into `core/` —
`core/` holds behaviour, not the value contract both layers depend on.

### Server-side surface

| File | Purpose |
|---|---|
| `Models/Marker.cs` | `Marker : Address` + `Key`, `Description`, `Color`, and `ColorLabel` (resolved at render, not stored) |
| `Models/MultiMap.cs` | `IEnumerable<Marker> Markers` + `MapConfig MapConfig` |
| `PropertyEditors/GMapsMultiDataEditor.cs` | alias `Our.Umbraco.GMaps.Multi`, UI alias `GMaps.PropertyEditorUi.MultiMap` |
| `PropertyValueConverter/MultiMapPropertyValueConverter.cs` | returns `MultiMap`; resolves API key, map style and colour labels from datatype config |

The Multi PVC also reads a legacy single-map JSON (`{address, mapconfig}`) as a
one-marker list. That is cheap, and it is what makes switching an existing
datatype's editor over to Multi survivable rather than data-destroying.

No `#if UMBRACO_17` divergence is expected: the new types touch only
`Umbraco.Cms.Core`, which is identical across the two supported majors.

### Datatype configuration

| Alias | UI | Notes |
|---|---|---|
| `apikey`, `location`, `zoom`, `maptype`, `mapstyle`, `hideMap` | as the Single editor | unchanged semantics |
| `minNumber` | `Umb.PropertyEditorUi.Integer` | mirrors core's Multi URL Picker naming |
| `maxNumber` | `Umb.PropertyEditorUi.Integer` | 0 or empty means unlimited |
| `markerColors` | `Umb.PropertyEditorUi.ColorSwatchesEditor` | `{label, value}[]`; an empty palette hides the colour control entirely |
| `enableDescription` | `Umb.PropertyEditorUi.Toggle` | off by default |

`Umb.PropertyEditorUi.ColorSwatchesEditor` is the same swatch editor core's Color
Picker datatype uses for its items, so the palette gets a familiar UI for free and
the label travels with the value — the front-end can ask for "the Retail pins"
rather than "the `#2d7ef7` pins".

Two deliberate omissions:

- **No `propertyMapping`.** Property mapping is one address exchanged with one set
  of sibling properties; it has no coherent meaning for *n* pins. It stays
  single-only.
- **No `enableFriendlyName` toggle.** Friendly name is always on for multi,
  because the chip under the map needs a label. It falls back to `full_address`,
  then to formatted coordinates.

### Editor layout: map first, details in a pull-out drawer

The map is the primary surface and stays visible. Under it sits a row of
reorderable chips, one per marker. Clicking a pin or a chip slides Umbraco's
`sidebar` modal in from the right with that marker's details.

This was chosen over a stacked list (which pushes the map off screen once there
are more than a handful of pins) and over a side-by-side list (which leaves both
panes narrow, badly so inside a Block List or a split-view workspace). It is also
a deliberate correction of the 2020 PR on this issue, whose dialog-per-marker
approach drew the complaint that "all the markers [are] not showing at once — it
switched only after you click on edit".

| Action | Result |
|---|---|
| Search a place, or paste coordinates and press Enter | Adds a marker there and selects it |
| Click empty map | Adds a marker there |
| Click a pin, or a chip | Opens the drawer for that marker |
| Drag a pin | Moves it, and reverse-geocodes to refresh its address |
| Drag chips | Reorders |
| ✕ on a chip, or Remove in the drawer | Deletes the marker |
| "Fit to markers" | Sets centre and zoom from the bounds of all markers |

Click-to-add is free because ctrl+drag already owns panning — the existing
editor cancels any drag without the modifier held.

The drawer is an `UmbModalToken` over the `sidebar` modal type. It takes a marker
snapshot in and returns an edited marker on submit; Cancel discards, so a
mistyped name can be backed out without undoing the whole document.

On first load with markers present and no stored centre, the map fits to the
bounds of the markers. Otherwise the stored centre and zoom win, so opening a
document never moves a framing an editor chose.

### Validation

`UmbFormControlMixin`, matching core's Multi URL Picker, with min and max enforced
in the element.

This cannot be delegated to Umbraco's `mandatory` flag. The value preset seeds
`{ markers: [], mapconfig: {…} }` so the map can open at the configured centre
before anything is placed — a non-null value, which a mandatory check passes
happily even though the map has zero markers. Past max, the add affordances
disable rather than silently ignoring input.

A datatype configured with `minNumber` greater than `maxNumber` is a
misconfiguration, not a validation failure for the editor to resolve: the element
logs a console warning naming the property and treats the limits as unlimited,
which is how core's Multi URL Picker handles the same mistake.

### Property actions, preset and UFM

- **Clear all markers** — the shape of the existing clear action, scoped to
  `GMaps.PropertyEditorUi.MultiMap`.
- **Reset view** — restores the initial value, mirroring `resetView()`.
- **Value preset** — reuses the Single preset's resolution order for the default
  centre (datatype `location`, then appsettings `GoogleMaps/DefaultLocation`, then
  `DEFAULT_LOCATION`), with an empty marker list.
- **UFM** — extend the existing `gmp` component rather than register a second
  alias: detect the value shape, and add `count`, `names` and `first` fields for
  multi values.

Extending `gmp` also fixes a live crash. `gmap-value.element.ts` reads
`rawValue.address.full_address` with no guard, so a block whose map property has
no value throws today.

### Testing

`@open-wc/testing` with `@web/test-runner` on Playwright Chromium, using the
import-map configuration Umbraco extensions require (`dist-cms/packages/…`, not
`dist/packages`). One toolchain for both tiers — the `core/` tests need no
browser, but running them in the same runner beats maintaining a second framework
for a package this size.

`FakeGoogleMapsApi` implements the adapter interface, records calls, and lets a
test script geocoder outcomes, including `REQUEST_DENIED`, `ZERO_RESULTS` and
`OVER_QUERY_LIMIT` — the first time that error-handling code will have been
exercised at all. No test loads the Google SDK or needs an API key, so CI stays
hermetic.

**`core/`, exhaustive and fast:** coordinate parsing (`"Paris, France"` yields
`undefined`, out-of-range values rejected, invariant formatting); address
composition; every geocoder status mapped to a severity and message; marker
collection add, remove, reorder, update and select, with max enforcement and key
stability; and construction and reading of both editors' stored values.

Two claims made in earlier drafts of this section were wrong, and the tests pin
what the code actually does instead:

- **There is no `postal_town` over `locality` precedence.** Both map to `city`
  and the *last* matching component wins. Only `types[0]` is consulted at all,
  so a component typed `['political', 'locality']` is silently dropped.
- **Legacy `latlng` data is not a `core/` concern.** It is handled server-side in
  `SingleMapPropertyValueConverter`, and legacy single-to-multi reading likewise
  belongs to the new Multi PVC. Neither reaches the client.

Value round-trip stability gets its own tests: load-then-serialise must produce an
identical value. That is the property that stops documents loading dirty, and it
is not something a manual pass reliably catches.

**Elements and controllers, behavioural:** search adds a marker; click-empty-map
adds; past max the add affordances disable; chip reorder writes the new order;
drawer submit applies and cancel discards; the clear action empties.

`npm test` joins the CI workflow.

## Phasing

The order is the risk control.

| Phase | Content | Gate |
|---|---|---|
| 0 | Test infrastructure, plus characterisation tests written against the Single editor exactly as it is today | No behaviour change |
| 1 | Extract `core/`; the Single editor imports it | Phase 0 suite green |
| 2 | `maps/` adapter and `controllers/`; the Single editor composes them | Phase 0 suite green |
| 3 | Multi editor: models, data editor, PVC, element, drawer, manifest, actions, UFM, preset | New tests green |
| 4 | Docs, changelog, uSync fixtures in both demo sites, package version | `./build.sh` clean for 17 and 18 |

Phase 0 is what makes phase 2 a refactor rather than a rewrite. Restructuring
1123 lines of working editor with no tests to catch regressions is the largest
risk in this design; characterisation tests pin the current behaviour first, so
phase 2 either keeps them green or says exactly what it broke.

Phases 0–2 ship no user-visible change and can merge independently of the feature.
Phase 3 is where #27 closes.

Each phase is its own commit or PR, verified by `npm test`, `./build.sh` for both
package flavours, and a manual pass in the V18 demo site.

## Out of scope

- Custom marker icons or media-picker icons. Colour covers the categorisation
  case; icons pull media resolution into the PVC and the front-end.
- Property mapping on the multi editor.
- Migrating existing Single datatypes to Multi. The Multi PVC reading a legacy
  single value makes a manual switch safe; an automatic migration is not wanted,
  because switching editor is a content-modelling decision.
- Clustering, heatmaps, or any front-end rendering component. The PVC exposes the
  data; rendering stays the implementor's choice, documented with an example.

## Side findings

Neither is in scope; both are recorded because the work touches the code involved.

1. **The README overstates the current editor.** It lists "Click on exact location
   on map to place marker", but the single-marker element registers no `click`
   listener on the map — only `dragend`, `zoom_changed`, `center_changed`, `idle`,
   `dragstart` and `drag`. Either the feature was lost in the v4/v5 rewrite or the
   README is stale. Phase 3 adds click-to-add to the *multi* editor; whether to
   restore it on the single editor is a separate call.
2. **`gmap-value.element.ts` can throw on a valueless block property**, as
   described above. Phase 3 fixes it as a side effect of extending the component.

3. **Saving a document silently overwrites the stored map centre with the
   configured default.** Found while doing the phase 2 manual verification, and
   confirmed pre-existing: `_center` is initialised from the datatype `location`
   or the appsettings `GoogleMaps:DefaultLocation`, and is *never* seeded from
   `value.mapconfig.centerCoordinates`. It is only corrected if the editor
   happens to pan the map, because that is the one path that fires
   `center_changed`. So any save that does not involve panning — changing zoom,
   editing the friendly name, or saving another property entirely — writes the
   default location over whatever centre was stored.

   Reproduced on the `Test 2` fixture: `centerCoordinates` went from
   `-28.17320815850539, 153.54253394999998` (a real map centre near the pin) to
   `-28.801741748251406, 153.3623987189193` (the appsettings default) after a
   save that only changed zoom.

   The assignment sites for `_center` are identical before and after the phase 2
   refactor, so this is not a regression. The fix is a one-line seed in
   `#initialize` from `readSingleMapValue(...).center`, but it changes stored
   data on the next save of every affected document, so it wants its own commit
   and release note rather than being smuggled into a refactor.
