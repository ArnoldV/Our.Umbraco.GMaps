# Friendly name for map locations — design

## Summary

Add an optional, editable "friendly name" (a human-friendly label such as
"Head Office" or "Buckingham Palace") to the single-marker Google Maps property
editor. The value auto-fills from the selected Google place's `displayName` but
can be edited freely by the content editor. It is available to templates
alongside the existing address details, so a site can render the friendly name
*in addition to or instead of* the full/partial address.

The feature is gated behind an optional datatype setting so existing datatypes
are unchanged.

Migrating from the Terratype Google Maps package, this label was a useful
capability worth carrying forward.

## Requirements

1. A friendly name is available for a map location, in addition to or instead of
   the full/partial address details.
2. The friendly name auto-fills from the selected Google place but remains
   editable.
3. The feature is an optional item in the property (datatype) settings; when the
   setting is off, behaviour is identical to today.
4. The value is stored with the map value and exposed to templates.

## Decisions

- **Source:** auto-fill from Google's `place.displayName` on place selection,
  editable thereafter.
- **Field name:** `friendlyName`.
  - JSON: `address.friendlyName`
  - Razor: `@Model.Address.FriendlyName`
  - UFM: `{gmp:friendlyName}`
- **Model placement:** on the existing `Address` model (Option A), alongside
  `full_address`, `city`, `coordinates`, etc. Rejected alternatives: top-level on
  `Map` (fragments location data, inconsistent template API); transient/not
  persisted (loses the value and can't be edited).

## Design

### 1. Datatype setting (gate)

Add a toggle to the property editor settings in
`Client/src/single-marker/manifest.ts`:

- `alias`: `enableFriendlyName`
- `label`: "Enable friendly name"
- `description`: "Adds an editable, human-friendly label for the location
  (e.g. 'Head Office'), auto-filled from the selected place."
- `propertyEditorUiAlias`: `Umb.PropertyEditorUi.Toggle`
- Default: **off** (not added to `defaultData`; absent/false means disabled).

The editor reads this via the config collection (as with `hideMap` etc.):
`config?.getValueByAlias<boolean>('enableFriendlyName') || false`.

### 2. Editor UI and behaviour

In `Client/src/single-marker/single-marker-editor.element.ts`:

- When the setting is on, render a `uui-input` labelled "Location name" in the
  `.search` area, above the place-autocomplete container. When off, it is not
  rendered.
- Bind its value to the editor's friendly-name state.
- **Auto-fill:** in the `gmp-select` handler, after fetching fields, set the
  friendly-name state to `place.displayName` (already requested in
  `fetchFields`) **only when a non-empty `displayName` is actually available**.
  When present it overwrites the current value, because selecting a named place
  denotes a new location. When the selected place has no `displayName` (e.g. a
  bare street-address geocode or plus_code result), the existing friendly name is
  left untouched. `displayName` is added to the state via the existing
  `updateMarkerAddress`/value path.
- **Manual edit:** an `input`/`change` handler on the `uui-input` updates the
  state and calls `setValue()` so the edit persists.
- **Preserved across interactions:** map drag, zoom, pan, and coordinate search
  do not modify the friendly name (they don't set it), so a manual value
  survives those interactions. Coordinate search has no `displayName`, so it
  leaves the friendly name untouched.
- When the setting is off: the input is not rendered, no auto-fill occurs, and
  any previously stored `friendlyName` is preserved untouched in the JSON
  (the editor round-trips whatever it loaded).

### 3. Storage

- Add `friendlyName?: string` to the `Address` interface in
  `Client/src/types.ts`.
- Track it in editor state (e.g. as part of `_address`) and include it in
  `setValue()` so it is written to the value JSON.
- Add a `FriendlyName` property to `Models/Address.cs` with
  `[JsonProperty("friendlyName")]` / `[JsonPropertyName("friendlyName")]` /
  `[DataMember(Name = "friendlyName")]`, matching the file's existing pattern.

### 4. Rendering

- Extend the UFM `gmp` component element
  (`Client/src/ufm/elements/gmap-value.element.ts`) to handle a `friendlyName`
  member field, returning `rawValue.address.friendlyName`. Enables
  `{gmp:friendlyName}` in block-list labels and other UFM contexts.
- Razor access requires no functional converter change: the
  `SingleMapPropertyValueConverter` deserialises the modern value into `Map` (the
  `[JsonPropertyName("friendlyName")]` attribute populates `Address.FriendlyName`
  automatically), and the legacy path assigns the whole `LegacyAddress : Address`
  (which inherits `FriendlyName`) to `model.Address`. Both paths carry the value
  intact, so `@Model.Address.FriendlyName` works once the C# property exists. A
  clarifying comment is added at the deserialisation site.

## Out of scope

- No separate "mode" to collect the friendly name *instead of* the address; the
  friendly name is purely additive and templates decide which field(s) to render.
- No changes to legacy-data migration beyond the value round-tripping (legacy
  values simply have no `friendlyName`).

## Testing

- Unit: `Address` (de)serialisation round-trips `friendlyName` (present and
  absent).
- Manual/E2E in the UmbracoV17 test site:
  - Setting off (default): editor shows no name input; existing behaviour intact.
  - Setting on: selecting a place auto-fills the name; editing it persists on
    save; drag/zoom/coordinate-search preserve a manual value; selecting a named
    place overwrites it, while selecting a place with no `displayName` leaves it
    untouched.
  - Template: `@Model.Address.FriendlyName` and `{gmp:friendlyName}` render the
    stored value.

## Affected files

- `Client/src/single-marker/manifest.ts` — new setting.
- `Client/src/single-marker/single-marker-editor.element.ts` — input, auto-fill,
  persistence, gating.
- `Client/src/types.ts` — `Address.friendlyName`.
- `Client/src/ufm/elements/gmap-value.element.ts` — `friendlyName` member field.
- `Models/Address.cs` — `FriendlyName` property.
- `PropertyValueConverter/SingleMapPropertyValueConverter.cs` — clarifying
  comment only (value flows automatically; no functional change).
