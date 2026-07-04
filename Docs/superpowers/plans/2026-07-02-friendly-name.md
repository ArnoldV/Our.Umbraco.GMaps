# Friendly Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional, editable "friendly name" (human label such as "Head Office") to the single-marker Google Maps property editor, auto-filled from the selected Google place and exposed to templates.

**Architecture:** The value is stored on the existing `Address` model (`address.friendlyName`). A datatype toggle (`enableFriendlyName`, default off) gates an editor text input. On place selection the input is prefilled from `place.displayName` only when a non-empty display name exists. The value round-trips through the existing `setValue()`/converter path and is surfaced to Razor (`@Model.Address.FriendlyName`) and UFM (`{gmp:friendlyName}`).

**Tech Stack:** Lit + TypeScript (Umbraco backoffice client, Vite build), C# (.NET 10, Umbraco 17 property value converter), Google Maps JS API.

## Global Constraints

- Field name is exactly `friendlyName` (JSON `address.friendlyName`, Razor `FriendlyName`, UFM member field `friendlyName`). Copy verbatim.
- The datatype setting alias is exactly `enableFriendlyName`, type `Umb.PropertyEditorUi.Toggle`, **default off** (not added to `defaultData`).
- When the setting is off: no input rendered, no auto-fill, and any pre-existing stored `friendlyName` must round-trip untouched.
- Auto-fill overwrites the current value **only when `place.displayName` is a non-empty string**; otherwise leave the existing value untouched.
- **No test project exists and git is not used in this repo workflow.** Verification is via `npm run build` (runs `tsc && vite build`), `dotnet build`, and manual checks in the `Our.Umbraco.GMaps.UmbracoV18` site. There are no `git commit` steps.
- **Manual-verification reminder:** the plain `dotnet run` host bakes the static-web-asset manifest at startup and Vite emits content-hashed chunk filenames, so after any client `npm run build` you must **rebuild + restart** the UmbracoV17 host before the browser serves the new chunk.

---

### Task 1: Persist and expose `FriendlyName` on the C# Address model

**Files:**
- Modify: `Our.Umbraco.GMaps/Models/Address.cs`

**Interfaces:**
- Consumes: nothing.
- Produces: `Our.Umbraco.GMaps.Models.Address.FriendlyName` (`string?`), serialised as JSON `friendlyName`. Consumed by templates (`@Model.Address.FriendlyName`) and, indirectly, by the converter which already deserialises the value JSON into `Map`.

- [ ] **Step 1: Add the `FriendlyName` property**

In `Our.Umbraco.GMaps/Models/Address.cs`, add the property immediately after the `FullAddress` property (keep the existing attribute pattern):

```csharp
    [DataMember(Name = "friendlyName")]
    [JsonProperty("friendlyName")]
    [JsonPropertyName("friendlyName")]
    public string? FriendlyName { get; set; }
```

- [ ] **Step 2: Build the C# project to verify it compiles**

Run: `dotnet build Our.Umbraco.GMaps/Our.Umbraco.GMaps.csproj`
Expected: `Build succeeded` with 0 errors.

- [ ] **Step 3: Confirm round-trip deserialisation manually**

Because there is no unit-test project, verify by inspection that the attributes match the file's other properties (all three of `DataMember`/`JsonProperty`/`JsonPropertyName` present with name `friendlyName`). This ensures a stored value like `{"address":{"friendlyName":"Head Office", ...}}` deserialises into `Address.FriendlyName` and re-serialises with the same key.

---

### Task 2: Add the `friendlyName` client type and the datatype setting

**Files:**
- Modify: `Our.Umbraco.GMaps/Client/src/types.ts`
- Modify: `Our.Umbraco.GMaps/Client/src/single-marker/manifest.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `AddressBase.friendlyName?: string` (via `Address extends AddressBase`), used by the editor's `setValue()` and by the UFM element.
  - Datatype config value `enableFriendlyName: boolean`, read in the editor via `config.getValueByAlias<boolean>('enableFriendlyName')`.

- [ ] **Step 1: Add `friendlyName` to the `AddressBase` interface**

In `Our.Umbraco.GMaps/Client/src/types.ts`, add the field to `AddressBase` (after `full_address`):

```typescript
export interface AddressBase {
  full_address?: string;
  friendlyName?: string;
  streetNumber?: string;
  street?: string;
  postalcode?: string;
  city?: string;
  state?: string;
  country?: string;
}
```

- [ ] **Step 2: Add the `enableFriendlyName` toggle to the property editor settings**

In `Our.Umbraco.GMaps/Client/src/single-marker/manifest.ts`, add a new object to `meta.settings.properties`, immediately after the existing `hideMap` entry:

```typescript
                    {
                        alias: "enableFriendlyName",
                        label: "Enable friendly name",
                        description: "Adds an editable, human-friendly label for the location (e.g. 'Head Office'), auto-filled from the selected place.",
                        propertyEditorUiAlias: "Umb.PropertyEditorUi.Toggle"
                    },
```

Do **not** add an entry to `defaultData` (default off).

- [ ] **Step 3: Build the client to verify types compile**

Run: `cd Our.Umbraco.GMaps/Client && npm run build`
Expected: build completes, no TS errors.

---

### Task 3: Editor input, auto-fill, and persistence

**Files:**
- Modify: `Our.Umbraco.GMaps/Client/src/single-marker/single-marker-editor.element.ts`

**Interfaces:**
- Consumes: `AddressBase.friendlyName` (Task 2); `enableFriendlyName` config value (Task 2).
- Produces: writes `address.friendlyName` into the property value via `setValue()`.

- [ ] **Step 1: Add state for the friendly name and the enable flag**

In `single-marker-editor.element.ts`, add fields near the other `@state()`/private fields (e.g. after `_address`). Add:

```typescript
  @state()
  private _friendlyName?: string;

  private _enableFriendlyName: boolean = false;
```

- [ ] **Step 2: Read the setting in the `config` setter**

In the `set config(...)` method, alongside the other `getValueByAlias` reads (e.g. after the `_hideMap` line), add:

```typescript
    this._enableFriendlyName = config?.getValueByAlias<boolean>('enableFriendlyName') || false;
```

- [ ] **Step 3: Seed the friendly name from the stored value**

In `#initialize()`, in the block that seeds `_address`/`_location` from `this.value?.address`, add a line so a saved value is preserved on load. Change:

```typescript
    if (this.value?.address) {
      const { coordinates, ...rest } = this.value.address;
      this._address ??= rest;
      this._location ??= coordinates;
    }
```

to:

```typescript
    if (this.value?.address) {
      const { coordinates, ...rest } = this.value.address;
      this._address ??= rest;
      this._location ??= coordinates;
      this._friendlyName ??= this.value.address.friendlyName;
    }
```

- [ ] **Step 4: Include the friendly name in `setValue()`**

In `setValue()`, add `friendlyName` to the constructed `address` object so it is written to the value. Change the `address` block to:

```typescript
      address: {
        ...this._address,
        friendlyName: this._friendlyName,
        coordinates: {
          lat: this._location?.lat ?? this._defaultLocation?.lat,
          lng: this._location?.lng ?? this._defaultLocation?.lng
        }
      },
```

- [ ] **Step 5: Auto-fill from `place.displayName` on place selection**

In the `placeAutocomplete.addEventListener('gmp-select', ...)` handler, after the existing `if (!place.location) return;` guard, add:

```typescript
      if (this._enableFriendlyName && place.displayName) {
        this._friendlyName = place.displayName;
      }
```

(Placed before `updateMarkerAddress`/`setValue` run, so the new name is persisted with the selection. `place.displayName` is already requested in `fetchFields`.)

- [ ] **Step 6: Add the input handler**

Add a private method (e.g. after `dragend()`):

```typescript
  #onFriendlyNameInput(e: Event) {
    const target = e.target as HTMLInputElement | null;
    this._friendlyName = target?.value ?? '';
    this.setValue();
  }
```

- [ ] **Step 7: Render the input when the setting is on**

In `render()`, inside the `<div class='search'>`, add the input above the `place-autocomplete-container` so it only shows when enabled:

```typescript
            <div class='search'>
                ${this.value?.address.full_address ? html`
                  <div class='saved-address'>${this.value.address.full_address}</div>
                ` : nothing}
                ${this._enableFriendlyName ? html`
                  <uui-input
                    label='Location name'
                    placeholder='Location name'
                    .value=${this._friendlyName ?? ''}
                    @input=${(e: Event) => this.#onFriendlyNameInput(e)}>
                  </uui-input>
                ` : nothing}
                <div id='place-autocomplete-container'></div>
            </div>
```

- [ ] **Step 8: Build the client**

Run: `cd Our.Umbraco.GMaps/Client && npm run build`
Expected: build completes, no TS errors.

- [ ] **Step 9: Manual verification in the UmbracoV17 site**

Rebuild + restart the `Our.Umbraco.GMaps.UmbracoV18` host (see Global Constraints), then in the backoffice:
- On a datatype **without** the setting: no "Location name" input appears; behaviour unchanged.
- Enable **Enable friendly name** on the datatype. On the content editor:
  - The "Location name" input appears.
  - Selecting a **named** place (e.g. "Buckingham Palace") fills the input with the place name.
  - Selecting a place with no display name (e.g. typing a bare coordinate, or a street-address-only result) leaves the current name untouched.
  - Editing the input and saving persists the value (reload the node; value remains).
  - Dragging/zooming the marker or coordinate-searching preserves the typed name.

---

### Task 4: Render the friendly name in UFM

**Files:**
- Modify: `Our.Umbraco.GMaps/Client/src/ufm/elements/gmap-value.element.ts`

**Interfaces:**
- Consumes: `Map.address.friendlyName` (Task 2 type; Task 3 writes it).
- Produces: `{gmp:friendlyName}` renders the stored friendly name in UFM contexts (e.g. block-list labels).

- [ ] **Step 1: Handle the `friendlyName` member field**

In `gmap-value.element.ts`, in the `observeBlockData` callback, extend the `memberField` branching. Change:

```typescript
                    if (this.memberField === 'address') {
                        this._value = rawValue.address.full_address
                    } else if (this.memberField === 'coordinates') {
                        this._value = `${rawValue.address.coordinates?.lat}, ${rawValue.address.coordinates?.lng}`
                    } else {
						this._value = undefined;
					}
```

to:

```typescript
                    if (this.memberField === 'address') {
                        this._value = rawValue.address.full_address
                    } else if (this.memberField === 'friendlyName') {
                        this._value = rawValue.address.friendlyName
                    } else if (this.memberField === 'coordinates') {
                        this._value = `${rawValue.address.coordinates?.lat}, ${rawValue.address.coordinates?.lng}`
                    } else {
						this._value = undefined;
					}
```

- [ ] **Step 2: Build the client**

Run: `cd Our.Umbraco.GMaps/Client && npm run build`
Expected: build completes, no TS errors.

- [ ] **Step 3: Manual verification**

Rebuild + restart the host. On a block/content that uses the `gmp` UFM component, confirm `{gmp:friendlyName}` renders the stored value (and is empty when none is set). Confirm `@Model.Address.FriendlyName` is available in a Razor template (from Task 1).

---

### Task 5: Confirm the PropertyValueConverter surfaces `FriendlyName`

**Files:**
- Modify: `Our.Umbraco.GMaps/PropertyValueConverter/SingleMapPropertyValueConverter.cs` (comment only)

**Interfaces:**
- Consumes: `Address.FriendlyName` (Task 1); `LegacyAddress : Address` inherits it.
- Produces: nothing new — confirms `@Model.Address.FriendlyName` is populated for both modern and legacy stored values.

**Why no functional change is required:**
- Modern values: `JsonSerializer.Deserialize<Map>(interString)` populates `Map.Address.FriendlyName` automatically because `Address.FriendlyName` carries `[JsonPropertyName("friendlyName")]`.
- Legacy values (`latlng` present): the converter builds `model.Address = intermediate.Address`, where `intermediate` is a `LegacyMap` whose `Address` is a `LegacyAddress : Address`. `FriendlyName` is inherited and carried over intact (null for legacy data, which never had the field).
- Neither branch remaps fields individually, so nothing drops the value.

- [ ] **Step 1: Add a clarifying comment at the modern deserialisation site**

In `SingleMapPropertyValueConverter.cs`, in the `else` branch of `ConvertIntermediateToObject`, annotate the deserialisation line:

```csharp
            else
            {
                // Address.FriendlyName ([JsonPropertyName("friendlyName")]) is populated
                // automatically here; no explicit mapping needed.
                model = JsonSerializer.Deserialize<Map>(interString);
            }
```

- [ ] **Step 2: Build the C# project**

Run: `dotnet build Our.Umbraco.GMaps/Our.Umbraco.GMaps.csproj`
Expected: `Build succeeded` with 0 errors.

- [ ] **Step 3: Manual verification of both paths in the UmbracoV17 site**

Rebuild + restart the host, then:
- Save a node via the editor (Task 3) with a friendly name, and confirm a Razor template renders `@Model.Address.FriendlyName` with that value.
- Confirm a pre-existing node with no friendly name renders an empty/null `FriendlyName` without error (covers both a modern value missing the field and, if available, a legacy `latlng` value).

---

## Self-Review

**Spec coverage:**
- Optional datatype setting (gate) → Task 2 Step 2. ✓
- Editable input, gated by setting → Task 3 Steps 2, 7, 6. ✓
- Auto-fill from `displayName`, only when non-empty → Task 3 Step 5. ✓
- Preserve manual value across drag/zoom/coordinate-search → Task 3 (no code touches `_friendlyName` on those paths); verified Task 3 Step 9. ✓
- Storage (`address.friendlyName`) → Task 1 (C#), Task 2 Step 1 (type), Task 3 Steps 3–4 (write/round-trip). ✓
- Off ⇒ preserve existing stored value untouched → Task 3 Step 3 seeds `_friendlyName` from the loaded value regardless of the flag, and Step 4 writes it back. ✓
- Rendering: Razor → Task 1, converter confirmed in Task 5; UFM → Task 4. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step shows the actual code. ✓

**Type consistency:** `friendlyName` (client) / `FriendlyName` (C#) / `_friendlyName` (state) / `enableFriendlyName` (setting alias & `_enableFriendlyName` field) used consistently across tasks. `#onFriendlyNameInput` defined and referenced in Task 3. ✓

**Note on TDD:** This repo has no test project or JS test harness. The plan verifies via build + manual checks rather than automated tests, consistent with the existing codebase. Adding an xUnit project for `Address` (de)serialisation and/or a Vitest setup for `parseCoordinates`/editor logic is a worthwhile but separate piece of work.
