# Multi-Marker Shared Core Implementation Plan (Phases 0–2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the package its first test suite, then extract the Single Marker editor's map logic into a tested, Google-free core plus a thin SDK adapter — so the Multi Marker editor can be built on shared code rather than a copy.

**Architecture:** Three layers. `core/` holds plain-value logic and imports nothing from Google. `maps/` is a narrow adapter interface over the Google SDK with a real implementation and a fake. `controllers/` is thin imperative glue between them. Characterisation tests are written against the Single editor *before* anything moves, so the refactor is verifiable rather than hopeful.

**Tech Stack:** TypeScript, Lit 3, Umbraco 18 backoffice (`@umbraco-cms/backoffice`), Vite, `@open-wc/testing` + `@web/test-runner` on Playwright Chromium.

**Spec:** [`Docs/superpowers/specs/2026-08-24-multi-marker-design.md`](../specs/2026-08-24-multi-marker-design.md)

## Scope of this plan

The spec defines five phases. **This plan covers phases 0–2 only.**

Phases 3–4 (the Multi Marker editor itself, plus docs and fixtures) get a
second plan, written once phase 2 has settled the controller API. Planning them
now would mean writing tasks against imagined method signatures — the exact
failure the "no references to types not defined in any task" rule exists to
prevent.

Phases 0–2 produce working, shippable software on their own: the Single Marker
editor, behaving identically, with a test suite and a decomposed internal
structure. Nothing user-visible changes.

`core/marker-collection.ts` is deliberately **not** built here despite being
listed in the spec's `core/` layout. Nothing consumes it until phase 3, and
untested dead code in a plan about adding tests would be self-defeating.

## Global Constraints

- All work happens in `Our.Umbraco.GMaps/Client/`. Paths below are relative to it unless stated.
- **`core/` must never import from `maps/` or `controllers/`, or from any Google package.** This is the load-bearing rule of the design.
- The Single Marker editor's public contract does not change: editor alias `Our.Umbraco.GMaps.Single`, UI alias `GMaps.PropertyEditorUi.SingleMap`, stored value shape `{ address, mapconfig }`, and the `resetView()` method the reset property action calls.
- `tsconfig.json` has `strict`, `noUnusedLocals`, `noUnusedParameters` and `noFallthroughCasesInSwitch` on. Unused imports or variables in tests will fail `npm run build`.
- `tsconfig.json` has `"include": ["src"]`, so `*.test.ts` files under `src/` are type-checked by `tsc`. They are not bundled: `vite.config.ts` builds only from the `src/bundle.manifests.ts` entry.
- The client bundle is shared by the Umbraco 17 and 18 package flavours. No conditional client code.
- Node `>=24.13.0`, npm `>=11` (enforced by `package.json` `engines`).
- Commit after every task. Branch is `feature/27-multi-marker-editor`.

## File structure

**Created by this plan:**

| File | Responsibility |
|---|---|
| `web-test-runner.config.mjs` | Test runner config |
| `src/single-marker/single-marker-editor.characterisation.test.ts` | Pins current editor behaviour before the refactor |
| `src/core/coordinates.ts` + `.test.ts` | Parse, format and validate `Location` |
| `src/core/address.ts` + `.test.ts` | Compose an `Address` from Google address components |
| `src/core/geocode-status.ts` + `.test.ts` | Geocoder status → editor-facing notice |
| `src/core/value.ts` + `.test.ts` | Build and read the Single editor's stored value |
| `src/maps/maps-api.ts` | The `GoogleMapsApi` interface — the SDK seam |
| `src/maps/google-maps-api.ts` | Real implementation |
| `src/maps/fake-maps-api.ts` | Test double |
| `src/controllers/geocoding.controller.ts` + `.test.ts` | Forward/reverse geocode, producing addresses and notices |
| `src/controllers/map-surface.controller.ts` + `.test.ts` | Map lifecycle, centre/zoom tracking, ctrl-drag panning |

**Modified:**

| File | Change |
|---|---|
| `package.json` | Test dependencies and scripts |
| `src/single-marker/single-marker-editor.element.ts` | Delegates to `core/`, then composes controllers |
| `../../.github/workflows/build.yml` | Runs the suite in CI |

---

## Task 1: Test harness, and the first characterisation tests

Setup is folded in here rather than standing alone: a harness with nothing to run isn't independently reviewable, and the coordinate helpers are the smallest real deliverable that proves the harness works end to end.

**Files:**
- Modify: `package.json`
- Create: `web-test-runner.config.mjs`
- Create: `src/single-marker/single-marker-editor.characterisation.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test`; the characterisation test file that Tasks 2–4 append to and Tasks 6–13 must keep green.

**Two traps this task exists to get right.** Both will waste an afternoon if discovered later:

1. `@googlemaps/js-api-loader` reads `process.env.NODE_ENV` **at module scope**. The editor imports it, so any test importing the editor throws `ReferenceError: process is not defined` in a browser unless esbuild replaces it. `vite.config.ts` already carries the same workaround for the production build — read the comment there.
2. Do **not** add `@web/dev-server-import-maps`. The common Umbraco recipe hand-maintains an import map to `dist-cms/…`, but `@umbraco-cms/backoffice` declares real `exports` for all 143 subpaths (`./external/lit`, `./element-api`, `./property`, …), so `nodeResolve` resolves them natively. A hand-written map here is a maintenance liability that silently goes stale.

- [ ] **Step 1: Install the test dependencies**

Versions are deliberately unpinned — resolve current ones and commit the lockfile.

```bash
cd Our.Umbraco.GMaps/Client
npm install --save-dev @open-wc/testing @web/test-runner @web/test-runner-playwright \
                      @web/dev-server-esbuild @types/mocha
npx playwright install chromium
```

Current majors resolve well above the versions the common Umbraco recipe names
(`@web/test-runner` 1.x, `@open-wc/testing` 5.x, `@web/dev-server-esbuild` 2.x).
The `esbuildPlugin` options used in Step 3 — `ts`, `target`, `tsconfig`,
`define` — are all still supported in 2.x.

- [ ] **Step 1b: Declare the Mocha globals for `tsc`**

`tsconfig.json` pins `"types": ["@umbraco-cms/backoffice/extension-types"]`,
which switches off automatic `@types` discovery — so `describe`, `it` and
`beforeEach` are undeclared and `npm run build` fails with TS2593 even though
`npm test` passes. Add `"mocha"` to that array:

```json
    "types": [
            "@umbraco-cms/backoffice/extension-types",
            "mocha"
        ]
```

- [ ] **Step 2: Add the test scripts to `package.json`**

In the `"scripts"` block, alongside the existing entries:

```json
    "test": "web-test-runner",
    "test:watch": "web-test-runner --watch"
```

- [ ] **Step 3: Create the runner config**

Create `web-test-runner.config.mjs`:

```js
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  rootDir: '.',
  files: ['./src/**/*.test.ts'],
  // @umbraco-cms/backoffice declares real `exports` for every subpath, so no
  // import-maps plugin is needed - nodeResolve finds dist-cms on its own.
  nodeResolve: {
    browser: true,
    preferBuiltins: false,
  },
  browsers: [playwrightLauncher({ product: 'chromium' })],
  plugins: [
    esbuildPlugin({
      ts: true,
      target: 'es2022',
      // Reads experimentalDecorators / useDefineForClassFields, which Lit needs.
      tsconfig: './tsconfig.json',
      // @googlemaps/js-api-loader reads process.env.NODE_ENV at module scope and
      // the editor imports it, so without this every test importing the editor
      // dies with "process is not defined". Same workaround as vite.config.ts.
      define: {
        'process.env.NODE_ENV': '"development"',
      },
    }),
  ],
  testFramework: {
    config: { timeout: '5000' },
  },
};
```

- [ ] **Step 4: Write the failing characterisation tests**

Create `src/single-marker/single-marker-editor.characterisation.test.ts`:

```ts
import { expect } from '@open-wc/testing';
import GmapsSingleMarkerElement from './single-marker-editor.element.js';
import { DEFAULT_LOCATION } from '../types.js';

/**
 * Characterisation tests: these pin the editor's behaviour EXACTLY as it is
 * today, correct or not, so the phase 1/2 refactor can be verified. Where the
 * pinned behaviour is arguably wrong, the test says so - but it still asserts
 * what the code does. Changing any of it is a separate, deliberate decision.
 *
 * The element is constructed directly rather than via fixture(): Lit does not
 * render until connected, so no map is created and no API key is needed.
 */
describe('single-marker editor: coordinate helpers (characterisation)', () => {
  let editor: GmapsSingleMarkerElement;

  beforeEach(() => {
    editor = new GmapsSingleMarkerElement();
  });

  describe('getAsNumber', () => {
    it('returns undefined for undefined', () => {
      expect(editor.getAsNumber(undefined)).to.equal(undefined);
    });

    it('returns a number unchanged', () => {
      expect(editor.getAsNumber(52.379189)).to.equal(52.379189);
    });

    it('invokes a function value', () => {
      expect(editor.getAsNumber(() => 4.899431)).to.equal(4.899431);
    });

    it('parses a string, trimming whitespace', () => {
      expect(editor.getAsNumber('  4.899431 ')).to.equal(4.899431);
    });

    it('yields NaN - not undefined - for non-numeric text', () => {
      expect(editor.getAsNumber('Paris')).to.be.NaN;
    });
  });

  describe('parseCoordinates', () => {
    it('parses a lat,lng pair', () => {
      expect(editor.parseCoordinates('52.379189, 4.899431', false)).to.deep.equal({
        lat: 52.379189,
        lng: 4.899431,
      });
    });

    it('parses negative coordinates', () => {
      expect(editor.parseCoordinates('-37.8136,144.9631', false)).to.deep.equal({
        lat: -37.8136,
        lng: 144.9631,
      });
    });

    it('rejects text that merely contains a comma', () => {
      expect(editor.parseCoordinates('Paris, France', false)).to.equal(undefined);
    });

    it('rejects a latitude outside -90..90', () => {
      expect(editor.parseCoordinates('91, 0', false)).to.equal(undefined);
    });

    it('rejects a longitude outside -180..180', () => {
      expect(editor.parseCoordinates('0, 181', false)).to.equal(undefined);
    });

    it('rejects three parts', () => {
      expect(editor.parseCoordinates('1,2,3', false)).to.equal(undefined);
    });

    it('rejects undefined', () => {
      expect(editor.parseCoordinates(undefined, false)).to.equal(undefined);
    });

    it('falls back to the default location when asked to', () => {
      expect(editor.parseCoordinates('Paris, France')).to.deep.equal(DEFAULT_LOCATION);
    });
  });

  describe('formatCoordinates', () => {
    it('joins lat and lng with a comma and no space', () => {
      expect(editor.formatCoordinates({ lat: -37.8136, lng: 144.9631 })).to.equal(
        '-37.8136,144.9631',
      );
    });

    it('returns undefined when given no coordinates', () => {
      // The signature says Location, but the body guards for falsy and the
      // callers rely on the undefined return.
      expect(editor.formatCoordinates(undefined as never)).to.equal(undefined);
    });
  });
});
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test`

Expected: all tests pass. These characterise code that already exists, so a
failure here means the harness is wrong, not the editor. If you see
`process is not defined`, the esbuild `define` in Step 3 is missing or
misspelled.

- [ ] **Step 6: Confirm the production build still works**

Run: `npm run build`

Expected: succeeds. This proves `tsc` accepts the new test file under
`"include": ["src"]` and that Vite has not bundled it.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json web-test-runner.config.mjs \
        src/single-marker/single-marker-editor.characterisation.test.ts
git commit -m "test: add web-test-runner harness and coordinate characterisation tests"
```

---

## Task 2: Characterise address composition

`getAddressObject` has two behaviours that are surprising enough that the refactor could easily "fix" them by accident. Both get pinned.

**Files:**
- Modify: `src/single-marker/single-marker-editor.characterisation.test.ts`

**Interfaces:**
- Consumes: `GmapsSingleMarkerElement` from Task 1's test file.
- Produces: nothing new; extends the safety net.

- [ ] **Step 1: Write the failing tests**

Append to `src/single-marker/single-marker-editor.characterisation.test.ts`:

```ts
describe('single-marker editor: getAddressObject (characterisation)', () => {
  let editor: GmapsSingleMarkerElement;

  beforeEach(() => {
    editor = new GmapsSingleMarkerElement();
  });

  // google.maps.places.AddressComponent is an interface with more members than
  // the composer reads, so tests build the minimum and cast.
  const component = (types: string[], longText: string | null) =>
    ({ longText, shortText: longText, types }) as never;

  it('returns undefined when given no components', () => {
    expect(editor.getAddressObject(undefined)).to.equal(undefined);
    expect(editor.getAddressObject(null)).to.equal(undefined);
  });

  it('composes a full address from the usual components', () => {
    const result = editor.getAddressObject([
      component(['street_number'], '88'),
      component(['route'], 'Dock Rd'),
      component(['locality'], 'Port Melbourne'),
      component(['administrative_area_level_1'], 'Victoria'),
      component(['postal_code'], '3207'),
      component(['country'], 'Australia'),
    ]);

    expect(result).to.deep.equal({
      // Never populated by this function - the caller merges formattedAddress in.
      full_address: '',
      streetNumber: '88',
      street: 'Dock Rd',
      postalcode: '3207',
      state: 'Victoria',
      city: 'Port Melbourne',
      country: 'Australia',
    });
  });

  it('only consults types[0], ignoring a matching type later in the array', () => {
    // Google routinely returns ['locality', 'political']; the reverse shape is
    // silently dropped. Pinned as-is.
    const result = editor.getAddressObject([component(['political', 'locality'], 'Nowhere')]);

    expect(result?.city).to.equal('');
  });

  it('lets the last matching component win, with no precedence between them', () => {
    // The spec originally described postal_town as taking precedence over
    // locality. It does not: both map to `city` and the later one overwrites.
    const localityFirst = editor.getAddressObject([
      component(['locality'], 'Locality'),
      component(['postal_town'], 'Postal Town'),
    ]);
    expect(localityFirst?.city).to.equal('Postal Town');

    const postalTownFirst = editor.getAddressObject([
      component(['postal_town'], 'Postal Town'),
      component(['locality'], 'Locality'),
    ]);
    expect(postalTownFirst?.city).to.equal('Locality');
  });

  it('substitutes an empty string for a null longText', () => {
    const result = editor.getAddressObject([component(['country'], null)]);

    expect(result?.country).to.equal('');
  });

  it('ignores component types it does not recognise', () => {
    const result = editor.getAddressObject([component(['plus_code'], 'ignored')]);

    expect(result).to.deep.equal({
      full_address: '',
      streetNumber: '',
      street: '',
      postalcode: '',
      state: '',
      city: '',
      country: '',
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test`

Expected: all pass. If the "last matching component wins" test fails, re-read
`getAddressObject` before changing the test — the assertion documents real
behaviour, and a failure means the source differs from what this plan assumed.

- [ ] **Step 3: Commit**

```bash
git add src/single-marker/single-marker-editor.characterisation.test.ts
git commit -m "test: characterise getAddressObject component mapping"
```

---

## Task 3: Characterise geocoder status reporting

These two functions are module-private today. Exporting them is not a behaviour change, and it is the smallest step that makes the package's least-exercised code testable.

**Files:**
- Modify: `src/single-marker/single-marker-editor.element.ts` (add `export` to two declarations)
- Modify: `src/single-marker/single-marker-editor.characterisation.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export function describeGeocoderStatus(status: string | undefined, subject: string): { severity: 'info' | 'error'; message: string }` and `export function statusFromError(error: unknown): string | undefined`, both from `src/single-marker/single-marker-editor.element.ts`. Task 8 moves them to `core/geocode-status.ts`.

- [ ] **Step 1: Write the failing tests**

Append to `src/single-marker/single-marker-editor.characterisation.test.ts`, and add the two names to the existing import at the top of the file:

```ts
import GmapsSingleMarkerElement, {
  describeGeocoderStatus,
  statusFromError,
} from './single-marker-editor.element.js';
```

```ts
describe('single-marker editor: geocoder status reporting (characterisation)', () => {
  it('treats ZERO_RESULTS as information, not an error', () => {
    const notice = describeGeocoderStatus('ZERO_RESULTS', '"Nowhere"');

    expect(notice.severity).to.equal('info');
    expect(notice.message).to.equal('No location found for "Nowhere".');
  });

  it('explains REQUEST_DENIED as a key/API configuration problem', () => {
    const notice = describeGeocoderStatus('REQUEST_DENIED', '"anywhere"');

    expect(notice.severity).to.equal('error');
    expect(notice.message).to.contain('Geocoding API');
  });

  it('explains OVER_QUERY_LIMIT as a quota problem', () => {
    const notice = describeGeocoderStatus('OVER_QUERY_LIMIT', '"anywhere"');

    expect(notice.severity).to.equal('error');
    expect(notice.message).to.contain('quota');
  });

  it('names the subject when Google rejects the request as invalid', () => {
    const notice = describeGeocoderStatus('INVALID_REQUEST', '"anywhere"');

    expect(notice.severity).to.equal('error');
    expect(notice.message).to.contain('"anywhere"');
  });

  it('reports ERROR and UNKNOWN_ERROR as a connectivity problem', () => {
    for (const status of ['ERROR', 'UNKNOWN_ERROR']) {
      const notice = describeGeocoderStatus(status, '"anywhere"');

      expect(notice.severity).to.equal('error');
      expect(notice.message).to.contain('Could not reach');
    }
  });

  it('includes an unrecognised status in the fallback message', () => {
    const notice = describeGeocoderStatus('SOMETHING_NEW', '"anywhere"');

    expect(notice.severity).to.equal('error');
    expect(notice.message).to.contain('(SOMETHING_NEW)');
  });

  it('omits the parenthetical when there is no status at all', () => {
    const notice = describeGeocoderStatus(undefined, '"anywhere"');

    expect(notice.severity).to.equal('error');
    expect(notice.message).to.not.contain('(');
  });

  it('recovers a status from an Error message', () => {
    expect(statusFromError(new Error('Geocoding failed: REQUEST_DENIED'))).to.equal(
      'REQUEST_DENIED',
    );
  });

  it('prefers UNKNOWN_ERROR over the ERROR substring it contains', () => {
    expect(statusFromError(new Error('UNKNOWN_ERROR'))).to.equal('UNKNOWN_ERROR');
  });

  it('returns undefined when no known status appears', () => {
    expect(statusFromError(new Error('something else went wrong'))).to.equal(undefined);
    expect(statusFromError(undefined)).to.equal(undefined);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL — the import of `describeGeocoderStatus` and `statusFromError`
cannot resolve, because neither is exported yet.

- [ ] **Step 3: Export the two functions**

In `src/single-marker/single-marker-editor.element.ts`, add `export` to both
declarations. Nothing else changes:

```ts
export function describeGeocoderStatus(status: string | undefined, subject: string): EditorNotice {
```

```ts
export function statusFromError(error: unknown): string | undefined {
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/single-marker/single-marker-editor.element.ts \
        src/single-marker/single-marker-editor.characterisation.test.ts
git commit -m "test: characterise geocoder status reporting"
```

---

## Task 4: Characterise value construction and clearing

This is the highest-value task in phase 0. `setValue()` and the `value` setter are where every reported "document loads dirty" and "friendly name reverts" bug has lived, and they contain an inconsistency the refactor must not silently alter.

**Files:**
- Modify: `src/single-marker/single-marker-editor.characterisation.test.ts`

**Interfaces:**
- Consumes: `GmapsSingleMarkerElement`.
- Produces: nothing new.

- [ ] **Step 1: Write the failing tests**

Append to `src/single-marker/single-marker-editor.characterisation.test.ts`. Add `Address`, `Location` and `Map` to the existing `../types.js` import.

```ts
/** The private state setValue() reads. Assigning it directly is how these
 *  tests reach behaviour that otherwise only a live map can produce. */
interface EditorInternals {
  _address?: Address;
  _friendlyName?: string;
  _location?: Location;
  _center?: Location;
  _zoomLevel: number;
  _defaultLocation: Location;
  _autoCompleteSearchValue?: string;
  setValue(): void;
}

describe('single-marker editor: setValue (characterisation)', () => {
  let editor: GmapsSingleMarkerElement;
  let internals: EditorInternals;

  beforeEach(() => {
    editor = new GmapsSingleMarkerElement();
    internals = editor as unknown as EditorInternals;
  });

  it('lets the live friendly name override a stale one inside _address', () => {
    internals._address = { friendlyName: 'Stale', city: 'Melbourne' };
    internals._friendlyName = 'Live';
    internals._location = { lat: 1, lng: 2 };

    internals.setValue();

    expect(editor.value?.address.friendlyName).to.equal('Live');
    expect(editor.value?.address.city).to.equal('Melbourne');
  });

  it('clears the friendly name when the live one is undefined', () => {
    internals._address = { friendlyName: 'Stale' };

    internals.setValue();

    expect(editor.value?.address.friendlyName).to.equal(undefined);
  });

  it('falls back to _defaultLocation for the pin coordinates', () => {
    internals._defaultLocation = { lat: 10, lng: 20 };
    internals._location = undefined;

    internals.setValue();

    expect(editor.value?.address.coordinates).to.deep.equal({ lat: 10, lng: 20 });
  });

  it('falls back to the hardcoded DEFAULT_LOCATION for the centre, NOT _defaultLocation', () => {
    // Inconsistent with the pin fallback above: a datatype-configured default
    // location does not reach mapconfig.centerCoordinates. Pinned deliberately -
    // fixing it is a behaviour change and out of scope for phases 0-2.
    internals._defaultLocation = { lat: 10, lng: 20 };
    internals._center = undefined;

    internals.setValue();

    expect(editor.value?.mapconfig.centerCoordinates).to.deep.equal(DEFAULT_LOCATION);
  });

  it('carries zoom, maptype and centre into mapconfig', () => {
    internals._zoomLevel = 12;
    internals._center = { lat: 3, lng: 4 };

    internals.setValue();

    expect(editor.value?.mapconfig.zoom).to.equal(12);
    expect(editor.value?.mapconfig.maptype).to.equal('roadmap');
    expect(editor.value?.mapconfig.centerCoordinates).to.deep.equal({ lat: 3, lng: 4 });
  });

  it('dispatches a change event', () => {
    let changes = 0;
    editor.addEventListener('change', () => { changes++; });

    internals.setValue();

    expect(changes).to.equal(1);
  });
});

describe('single-marker editor: clearing the value (characterisation)', () => {
  it('drops every piece of derived search state', () => {
    const editor = new GmapsSingleMarkerElement();
    const internals = editor as unknown as EditorInternals;

    editor.value = {
      address: { friendlyName: 'Head Office', city: 'Melbourne', coordinates: { lat: 1, lng: 2 } },
      mapconfig: { zoom: 12 },
    } as Map;
    internals._address = { city: 'Melbourne' };
    internals._friendlyName = 'Head Office';
    internals._location = { lat: 1, lng: 2 };
    internals._autoCompleteSearchValue = '12 Collins St';

    editor.value = undefined;

    expect(internals._address).to.equal(undefined);
    expect(internals._friendlyName).to.equal(undefined);
    expect(internals._location).to.equal(undefined);
    expect(internals._autoCompleteSearchValue).to.equal(undefined);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test`

Expected: all pass. If the `DEFAULT_LOCATION` centre-fallback test fails,
someone has already changed `setValue()` — stop and reconcile with the spec
before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/single-marker/single-marker-editor.characterisation.test.ts
git commit -m "test: characterise setValue and value clearing"
```

---

## Task 5: Run the suite in CI

**Files:**
- Modify: `.github/workflows/build.yml`

**Interfaces:**
- Consumes: the `npm test` script from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the test step**

In `.github/workflows/build.yml`, insert this immediately **before** the
`Build and pack` step. The build matrix runs twice (Umbraco 17 and 18) but the
client bundle is shared, so the suite runs once:

```yaml
    # The backoffice client bundle is shared by both flavours, so test it once.
    - name: Test backoffice client
      if: matrix.umbraco-major == '18'
      working-directory: ${{ env.CLIENT_PROJECT }}
      run: |
        npm ci
        npx playwright install --with-deps chromium
        npm test
```

- [ ] **Step 2: Verify the workflow parses**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/build.yml')); print('valid')"`

Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: run the backoffice client test suite"
```

---

## Task 6: Extract `core/coordinates.ts`

Phase 1 begins. Each extraction task keeps the editor's existing public methods as thin delegating wrappers, so the Task 1–4 characterisation suite keeps passing and keeps proving the move was faithful.

**Files:**
- Create: `src/core/coordinates.ts`
- Create: `src/core/coordinates.test.ts`
- Modify: `src/single-marker/single-marker-editor.element.ts`

**Interfaces:**
- Consumes: `Location` from `src/types.ts`.
- Produces, all from `src/core/coordinates.ts`:
  - `toNumber(value: string | number | (() => number) | undefined): number | undefined`
  - `parseCoordinates(latLng: string | undefined): Location | undefined`
  - `formatCoordinates(coordinates: Location | undefined): string | undefined`

Note the deliberate signature change: `parseCoordinates` loses its
`fallbackToDefault` parameter. A pure function has no business knowing the
element's default location; the caller applies the fallback.

- [ ] **Step 1: Write the failing tests**

Create `src/core/coordinates.test.ts`:

```ts
import { expect } from '@open-wc/testing';
import { formatCoordinates, parseCoordinates, toNumber } from './coordinates.js';

describe('core/coordinates', () => {
  describe('toNumber', () => {
    it('returns undefined for undefined', () => {
      expect(toNumber(undefined)).to.equal(undefined);
    });

    it('returns a number unchanged', () => {
      expect(toNumber(52.379189)).to.equal(52.379189);
    });

    it('invokes a function value', () => {
      expect(toNumber(() => 4.899431)).to.equal(4.899431);
    });

    it('parses a string, trimming whitespace', () => {
      expect(toNumber('  4.899431 ')).to.equal(4.899431);
    });

    it('yields NaN for non-numeric text', () => {
      expect(toNumber('Paris')).to.be.NaN;
    });
  });

  describe('parseCoordinates', () => {
    it('parses a lat,lng pair', () => {
      expect(parseCoordinates('52.379189, 4.899431')).to.deep.equal({
        lat: 52.379189,
        lng: 4.899431,
      });
    });

    it('parses negative coordinates', () => {
      expect(parseCoordinates('-37.8136,144.9631')).to.deep.equal({
        lat: -37.8136,
        lng: 144.9631,
      });
    });

    it('accepts the boundary values', () => {
      expect(parseCoordinates('-90,-180')).to.deep.equal({ lat: -90, lng: -180 });
      expect(parseCoordinates('90,180')).to.deep.equal({ lat: 90, lng: 180 });
    });

    it('rejects text that merely contains a comma', () => {
      expect(parseCoordinates('Paris, France')).to.equal(undefined);
    });

    it('rejects out-of-range values', () => {
      expect(parseCoordinates('91, 0')).to.equal(undefined);
      expect(parseCoordinates('0, 181')).to.equal(undefined);
    });

    it('rejects the wrong number of parts', () => {
      expect(parseCoordinates('1,2,3')).to.equal(undefined);
      expect(parseCoordinates('1')).to.equal(undefined);
    });

    it('rejects empty input', () => {
      expect(parseCoordinates(undefined)).to.equal(undefined);
      expect(parseCoordinates('')).to.equal(undefined);
    });
  });

  describe('formatCoordinates', () => {
    it('joins lat and lng with a comma and no space', () => {
      expect(formatCoordinates({ lat: -37.8136, lng: 144.9631 })).to.equal('-37.8136,144.9631');
    });

    it('returns undefined for no coordinates', () => {
      expect(formatCoordinates(undefined)).to.equal(undefined);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL — `./coordinates.js` does not exist.

- [ ] **Step 3: Create the module**

Create `src/core/coordinates.ts`:

```ts
import type { Location } from '../types.js';

/**
 * Coerce the several shapes a coordinate arrives in - a number, a numeric
 * string, or one of the Google SDK's lat()/lng() accessors - to a number.
 * Non-numeric text yields NaN, matching parseFloat.
 */
export function toNumber(value: string | number | (() => number) | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'function') return value();
  return parseFloat(value.trim());
}

/**
 * Parse a "lat,lng" string. Both parts must be valid numbers in range,
 * otherwise text like "Paris, France" would parse to NaN and be accepted as a
 * broken location.
 */
export function parseCoordinates(latLng: string | undefined): Location | undefined {
  if (!latLng) return undefined;

  const parts = latLng.split(',');
  if (parts.length !== 2) return undefined;

  const lat = toNumber(parts[0]);
  const lng = toNumber(parts[1]);

  if (lat === undefined || lng === undefined) return undefined;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return undefined;
  if (lat < -90 || lat > 90) return undefined;
  if (lng < -180 || lng > 180) return undefined;

  return { lat, lng };
}

export function formatCoordinates(coordinates: Location | undefined): string | undefined {
  if (!coordinates) return undefined;
  return `${coordinates.lat},${coordinates.lng}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Delegate from the editor**

In `src/single-marker/single-marker-editor.element.ts`:

Add the import:

```ts
import { formatCoordinates, parseCoordinates, toNumber } from '../core/coordinates.js';
```

Replace the bodies of the three methods, keeping their signatures so the
characterisation tests and the reset action still work:

```ts
  getAsNumber(value: string | number | (() => number) | undefined): number | undefined {
    return toNumber(value);
  }

  parseCoordinates(latLng: string | undefined, fallbackToDefault = true) {
    const parsed = parseCoordinates(latLng);
    if (parsed) return parsed;
    return fallbackToDefault ? this._defaultLocation : undefined;
  }

  formatCoordinates(coordinates: Location) {
    return formatCoordinates(coordinates);
  }
```

- [ ] **Step 6: Run the whole suite**

Run: `npm test`

Expected: PASS, including every Task 1 characterisation test. That is the
proof the extraction was faithful.

- [ ] **Step 7: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/core/coordinates.ts src/core/coordinates.test.ts \
        src/single-marker/single-marker-editor.element.ts
git commit -m "refactor: extract coordinate helpers into core/"
```

---

## Task 7: Extract `core/address.ts`

**Files:**
- Create: `src/core/address.ts`
- Create: `src/core/address.test.ts`
- Modify: `src/single-marker/single-marker-editor.element.ts`

**Interfaces:**
- Consumes: `Address`, `AddressBase`, `AddressComponents`, `typedKeys` from `src/types.ts`.
- Produces, from `src/core/address.ts`:
  - `composeAddress(components: GoogleAddressComponent[] | null | undefined): Address | undefined`
  - `export interface GoogleAddressComponent { longText: string | null; shortText?: string | null; types: string[] }`

`GoogleAddressComponent` is declared locally rather than importing Google's
type, because `core/` may not depend on the SDK. It is structurally what both
`google.maps.places.AddressComponent` and the adapted
`long_name`/`short_name` geocoder components satisfy — which is why the
editor already adapts one to the other before calling in.

- [ ] **Step 1: Write the failing tests**

Create `src/core/address.test.ts`:

```ts
import { expect } from '@open-wc/testing';
import { composeAddress } from './address.js';
import type { GoogleAddressComponent } from './address.js';

const component = (types: string[], longText: string | null): GoogleAddressComponent => ({
  longText,
  shortText: longText,
  types,
});

const EMPTY = {
  full_address: '',
  streetNumber: '',
  street: '',
  postalcode: '',
  state: '',
  city: '',
  country: '',
};

describe('core/address', () => {
  it('returns undefined when given no components', () => {
    expect(composeAddress(undefined)).to.equal(undefined);
    expect(composeAddress(null)).to.equal(undefined);
  });

  it('returns empty strings when given an empty list', () => {
    expect(composeAddress([])).to.deep.equal(EMPTY);
  });

  it('composes a full address', () => {
    expect(
      composeAddress([
        component(['street_number'], '88'),
        component(['route'], 'Dock Rd'),
        component(['locality'], 'Port Melbourne'),
        component(['administrative_area_level_1'], 'Victoria'),
        component(['postal_code'], '3207'),
        component(['country'], 'Australia'),
      ]),
    ).to.deep.equal({
      full_address: '',
      streetNumber: '88',
      street: 'Dock Rd',
      postalcode: '3207',
      state: 'Victoria',
      city: 'Port Melbourne',
      country: 'Australia',
    });
  });

  it('maps street_address as well as route to street', () => {
    expect(composeAddress([component(['street_address'], '88 Dock Rd')])?.street).to.equal(
      '88 Dock Rd',
    );
  });

  it('maps every administrative_area_level to state, last one winning', () => {
    expect(
      composeAddress([
        component(['administrative_area_level_1'], 'Victoria'),
        component(['administrative_area_level_2'], 'Port Phillip'),
      ])?.state,
    ).to.equal('Port Phillip');
  });

  it('maps sublocality levels to city', () => {
    expect(composeAddress([component(['sublocality_level_1'], 'Docklands')])?.city).to.equal(
      'Docklands',
    );
  });

  it('only consults types[0]', () => {
    expect(composeAddress([component(['political', 'locality'], 'Nowhere')])?.city).to.equal('');
  });

  it('lets the last matching component win, with no precedence', () => {
    expect(
      composeAddress([
        component(['locality'], 'Locality'),
        component(['postal_town'], 'Postal Town'),
      ])?.city,
    ).to.equal('Postal Town');

    expect(
      composeAddress([
        component(['postal_town'], 'Postal Town'),
        component(['locality'], 'Locality'),
      ])?.city,
    ).to.equal('Locality');
  });

  it('substitutes an empty string for a null longText', () => {
    expect(composeAddress([component(['country'], null)])?.country).to.equal('');
  });

  it('ignores unrecognised component types', () => {
    expect(composeAddress([component(['plus_code'], 'ignored')])).to.deep.equal(EMPTY);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL — `./address.js` does not exist.

- [ ] **Step 3: Create the module**

Create `src/core/address.ts`. This is a faithful move of `getAddressObject`,
including the last-wins behaviour the tests pin:

```ts
import type { Address, AddressBase, AddressComponents } from '../types.js';
import { typedKeys } from '../types.js';

/**
 * The subset of a Google address component this package reads. Declared here
 * rather than imported so core/ stays free of the Maps SDK; both
 * google.maps.places.AddressComponent and the adapted geocoder components
 * satisfy it structurally.
 */
export interface GoogleAddressComponent {
  longText: string | null;
  shortText?: string | null;
  types: string[];
}

/** Which Google component types feed which address field. */
const COMPONENT_MAP: AddressComponents = {
  streetNumber: ['street_number'],
  street: ['street_address', 'route'],
  state: [
    'administrative_area_level_1',
    'administrative_area_level_2',
    'administrative_area_level_3',
    'administrative_area_level_4',
    'administrative_area_level_5',
  ],
  city: [
    'postal_town',
    'locality',
    'sublocality',
    'sublocality_level_1',
    'sublocality_level_2',
    'sublocality_level_3',
    'sublocality_level_4',
    'sublocality_level_5',
  ],
  postalcode: ['postal_code'],
  country: ['country'],
};

/**
 * Compose an address from Google's components.
 *
 * Two behaviours are inherited deliberately and are covered by tests: only
 * `types[0]` is consulted, and when several components map to the same field
 * the last one wins - there is no precedence between, say, postal_town and
 * locality. `full_address` is never populated here; the caller merges in the
 * formatted address.
 */
export function composeAddress(
  components: GoogleAddressComponent[] | null | undefined,
): Address | undefined {
  if (!components) return undefined;

  const address: AddressBase = {
    full_address: '',
    streetNumber: '',
    street: '',
    postalcode: '',
    state: '',
    city: '',
    country: '',
  };

  for (const component of components) {
    for (const field of typedKeys(COMPONENT_MAP)) {
      if (COMPONENT_MAP[field]?.includes(component.types[0])) {
        address[field] = component.longText ?? '';
      }
    }
  }

  return address;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Delegate from the editor**

In `src/single-marker/single-marker-editor.element.ts`, add:

```ts
import { composeAddress } from '../core/address.js';
```

and replace the whole body of `getAddressObject` (the ~60-line version with the
inline `ShouldBeComponent` map and its comments — all of it moved to
`core/address.ts`) with:

```ts
  getAddressObject(
    address_components: google.maps.places.AddressComponent[] | null | undefined,
  ): Address | undefined {
    return composeAddress(address_components);
  }
```

Then remove the now-unused `AddressBase`, `AddressComponents` and `typedKeys`
imports from the element — `noUnusedLocals` will fail the build otherwise.

- [ ] **Step 6: Run the whole suite**

Run: `npm test`

Expected: PASS, including Task 2's characterisation tests.

- [ ] **Step 7: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/core/address.ts src/core/address.test.ts \
        src/single-marker/single-marker-editor.element.ts
git commit -m "refactor: extract address composition into core/"
```

---

## Task 8: Extract `core/geocode-status.ts`

**Files:**
- Create: `src/core/geocode-status.ts`
- Create: `src/core/geocode-status.test.ts`
- Modify: `src/single-marker/single-marker-editor.element.ts`
- Modify: `src/single-marker/single-marker-editor.characterisation.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces, from `src/core/geocode-status.ts`:
  - `export type NoticeSeverity = 'info' | 'error'`
  - `export interface EditorNotice { severity: NoticeSeverity; message: string }`
  - `describeGeocoderStatus(status: string | undefined, subject: string): EditorNotice`
  - `statusFromError(error: unknown): string | undefined`

- [ ] **Step 1: Write the failing tests**

Create `src/core/geocode-status.test.ts`. This is Task 3's suite, re-pointed at
the new module — copied rather than imported, because Task 3's file is a
characterisation suite that gets deleted at the end of this task:

```ts
import { expect } from '@open-wc/testing';
import { describeGeocoderStatus, statusFromError } from './geocode-status.js';

describe('core/geocode-status', () => {
  it('treats ZERO_RESULTS as information, not an error', () => {
    const notice = describeGeocoderStatus('ZERO_RESULTS', '"Nowhere"');

    expect(notice.severity).to.equal('info');
    expect(notice.message).to.equal('No location found for "Nowhere".');
  });

  it('explains REQUEST_DENIED as a key/API configuration problem', () => {
    const notice = describeGeocoderStatus('REQUEST_DENIED', '"anywhere"');

    expect(notice.severity).to.equal('error');
    expect(notice.message).to.contain('Geocoding API');
  });

  it('explains OVER_QUERY_LIMIT as a quota problem', () => {
    const notice = describeGeocoderStatus('OVER_QUERY_LIMIT', '"anywhere"');

    expect(notice.severity).to.equal('error');
    expect(notice.message).to.contain('quota');
  });

  it('names the subject when Google rejects the request as invalid', () => {
    expect(describeGeocoderStatus('INVALID_REQUEST', '"anywhere"').message).to.contain(
      '"anywhere"',
    );
  });

  it('reports ERROR and UNKNOWN_ERROR as a connectivity problem', () => {
    for (const status of ['ERROR', 'UNKNOWN_ERROR']) {
      expect(describeGeocoderStatus(status, '"anywhere"').message).to.contain('Could not reach');
    }
  });

  it('includes an unrecognised status in the fallback message', () => {
    expect(describeGeocoderStatus('SOMETHING_NEW', '"anywhere"').message).to.contain(
      '(SOMETHING_NEW)',
    );
  });

  it('omits the parenthetical when there is no status at all', () => {
    expect(describeGeocoderStatus(undefined, '"anywhere"').message).to.not.contain('(');
  });

  it('recovers a status from an Error message', () => {
    expect(statusFromError(new Error('Geocoding failed: REQUEST_DENIED'))).to.equal(
      'REQUEST_DENIED',
    );
  });

  it('prefers UNKNOWN_ERROR over the ERROR substring it contains', () => {
    expect(statusFromError(new Error('UNKNOWN_ERROR'))).to.equal('UNKNOWN_ERROR');
  });

  it('returns undefined when no known status appears', () => {
    expect(statusFromError(new Error('something else went wrong'))).to.equal(undefined);
    expect(statusFromError(undefined)).to.equal(undefined);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL — `./geocode-status.js` does not exist.

- [ ] **Step 3: Create the module**

Create `src/core/geocode-status.ts`. This is a verbatim move out of the element,
with the doc comments kept because they explain *why* each status is worded the
way it is:

```ts
export type NoticeSeverity = 'info' | 'error';

export interface EditorNotice {
  severity: NoticeSeverity;
  message: string;
}

/**
 * Turns a geocoder status into something an editor can act on.
 *
 * Only ZERO_RESULTS actually means "that address doesn't exist". The rest are
 * configuration or quota problems on the Google API key, and reporting them as
 * "no location found" sends people looking for a typo in their address instead
 * of at their Cloud console - REQUEST_DENIED in particular is what you get when
 * the Geocoding API simply is not enabled for the key.
 */
export function describeGeocoderStatus(
  status: string | undefined,
  subject: string,
): EditorNotice {
  switch (status) {
    case 'ZERO_RESULTS':
      return { severity: 'info', message: `No location found for ${subject}.` };
    case 'REQUEST_DENIED':
      return {
        severity: 'error',
        message:
          "Google refused the geocoding request. The Geocoding API is most likely not enabled for this API key, or the key's HTTP referrer restrictions exclude this site.",
      };
    case 'OVER_QUERY_LIMIT':
      return {
        severity: 'error',
        message:
          'The Google API key is over its geocoding quota. Check the quota and billing status of the key in the Google Cloud console.',
      };
    case 'INVALID_REQUEST':
      return {
        severity: 'error',
        message: `Google rejected the geocoding request for ${subject} as invalid.`,
      };
    case 'ERROR':
    case 'UNKNOWN_ERROR':
      return {
        severity: 'error',
        message:
          'Could not reach the Google geocoding service. Check your connection and try again.',
      };
    default:
      return {
        severity: 'error',
        message: `Geocoding failed${status ? ` (${status})` : ''}. Check the browser console for the error Google reported.`,
      };
  }
}

/**
 * Order matters: UNKNOWN_ERROR must be tested before ERROR, which it contains
 * as a substring.
 */
const GEOCODER_STATUSES = [
  'ZERO_RESULTS',
  'REQUEST_DENIED',
  'OVER_QUERY_LIMIT',
  'INVALID_REQUEST',
  'UNKNOWN_ERROR',
  'ERROR',
];

/** Fallback for when the status callback never ran: the rejection carries it in its message. */
export function statusFromError(error: unknown): string | undefined {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return GEOCODER_STATUSES.find((status) => message.includes(status));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Point the editor at the module**

In `src/single-marker/single-marker-editor.element.ts`:

```ts
import { describeGeocoderStatus, statusFromError } from '../core/geocode-status.js';
import type { EditorNotice } from '../core/geocode-status.js';
```

Delete the moved declarations. The `export` keywords added in Task 3 go with
them — the element no longer re-exports these.

- [ ] **Step 6: Retire the superseded characterisation tests**

Delete the whole `describe('single-marker editor: geocoder status reporting (characterisation)')`
block from `src/single-marker/single-marker-editor.characterisation.test.ts`,
and remove `describeGeocoderStatus` and `statusFromError` from that file's
import — it must import only the default export again. `core/geocode-status.test.ts`
now covers this ground, and leaving the old block would fail to compile.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 8: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/core/geocode-status.ts src/core/geocode-status.test.ts \
        src/single-marker/single-marker-editor.element.ts \
        src/single-marker/single-marker-editor.characterisation.test.ts
git commit -m "refactor: extract geocoder status reporting into core/"
```

---

## Task 9: Extract `core/value.ts`

The last of phase 1, and the one that matters most for the Multi editor: this is where the "load then serialise produces an identical value" property gets a home and a test.

**Files:**
- Create: `src/core/value.ts`
- Create: `src/core/value.test.ts`
- Modify: `src/single-marker/single-marker-editor.element.ts`

**Interfaces:**
- Consumes: `Address`, `Location`, `Map`, `MapType`, `DEFAULT_LOCATION` from `src/types.ts`.
- Produces, from `src/core/value.ts`:
  - `export interface SingleMapValueInput { address?: Address; friendlyName?: string; location?: Location; center?: Location; zoom: number; maptype: MapType; defaultLocation: Location }`
  - `buildSingleMapValue(input: SingleMapValueInput): Map`
  - `readSingleMapValue(value: Map | undefined): { address?: Address; friendlyName?: string; location?: Location; center?: Location }`

`buildSingleMapValue` reproduces `setValue()`'s current semantics exactly,
including the centre falling back to `DEFAULT_LOCATION` while the pin falls
back to `defaultLocation`. Task 4 pinned that inconsistency; this task
preserves it. Changing it belongs to a later, deliberate commit.

- [ ] **Step 1: Write the failing tests**

Create `src/core/value.test.ts`:

```ts
import { expect } from '@open-wc/testing';
import { buildSingleMapValue, readSingleMapValue } from './value.js';
import { DEFAULT_LOCATION } from '../types.js';
import type { Map } from '../types.js';

const base = {
  zoom: 17,
  maptype: 'roadmap' as const,
  defaultLocation: DEFAULT_LOCATION,
};

describe('core/value', () => {
  describe('buildSingleMapValue', () => {
    it('lets the live friendly name override one inside address', () => {
      const value = buildSingleMapValue({
        ...base,
        address: { friendlyName: 'Stale', city: 'Melbourne' },
        friendlyName: 'Live',
        location: { lat: 1, lng: 2 },
      });

      expect(value.address.friendlyName).to.equal('Live');
      expect(value.address.city).to.equal('Melbourne');
    });

    it('clears the friendly name when there is no live one', () => {
      const value = buildSingleMapValue({ ...base, address: { friendlyName: 'Stale' } });

      expect(value.address.friendlyName).to.equal(undefined);
    });

    it('falls back to the supplied default location for the pin', () => {
      const value = buildSingleMapValue({ ...base, defaultLocation: { lat: 10, lng: 20 } });

      expect(value.address.coordinates).to.deep.equal({ lat: 10, lng: 20 });
    });

    it('falls back to the hardcoded DEFAULT_LOCATION for the centre', () => {
      // Preserved inconsistency - see the module doc comment.
      const value = buildSingleMapValue({ ...base, defaultLocation: { lat: 10, lng: 20 } });

      expect(value.mapconfig.centerCoordinates).to.deep.equal(DEFAULT_LOCATION);
    });

    it('carries zoom, maptype and centre', () => {
      const value = buildSingleMapValue({
        ...base,
        zoom: 12,
        maptype: 'satellite',
        center: { lat: 3, lng: 4 },
      });

      expect(value.mapconfig.zoom).to.equal(12);
      expect(value.mapconfig.maptype).to.equal('satellite');
      expect(value.mapconfig.centerCoordinates).to.deep.equal({ lat: 3, lng: 4 });
    });
  });

  describe('readSingleMapValue', () => {
    it('returns empty state for no value', () => {
      expect(readSingleMapValue(undefined)).to.deep.equal({});
    });

    it('splits coordinates out of the address', () => {
      const read = readSingleMapValue({
        address: { city: 'Melbourne', friendlyName: 'HQ', coordinates: { lat: 1, lng: 2 } },
        mapconfig: { zoom: 12, centerCoordinates: { lat: 3, lng: 4 } },
      } as Map);

      expect(read.address).to.deep.equal({ city: 'Melbourne', friendlyName: 'HQ' });
      expect(read.location).to.deep.equal({ lat: 1, lng: 2 });
      expect(read.center).to.deep.equal({ lat: 3, lng: 4 });
      expect(read.friendlyName).to.equal('HQ');
    });
  });

  describe('round trip', () => {
    it('read-then-build reproduces the value, so loading cannot mark a document dirty', () => {
      const stored: Map = {
        address: {
          city: 'Port Melbourne',
          country: 'Australia',
          full_address: '88 Dock Rd, Port Melbourne VIC 3207',
          friendlyName: 'Warehouse',
          postalcode: '3207',
          state: 'Victoria',
          street: 'Dock Rd',
          streetNumber: '88',
          coordinates: { lat: -37.834, lng: 144.926 },
        },
        mapconfig: {
          zoom: 12,
          maptype: 'roadmap',
          centerCoordinates: { lat: -37.8136, lng: 144.9631 },
        },
      };

      const read = readSingleMapValue(stored);
      const rebuilt = buildSingleMapValue({
        ...base,
        address: read.address,
        friendlyName: read.friendlyName,
        location: read.location,
        center: read.center,
        zoom: stored.mapconfig.zoom as number,
        maptype: 'roadmap',
      });

      expect(rebuilt).to.deep.equal(stored);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL — `./value.js` does not exist.

- [ ] **Step 3: Create the module**

Create `src/core/value.ts`:

```ts
import { DEFAULT_LOCATION } from '../types.js';
import type { Address, Location, Map, MapType } from '../types.js';

export interface SingleMapValueInput {
  address?: Address;
  friendlyName?: string;
  location?: Location;
  center?: Location;
  zoom: number;
  maptype: MapType;
  defaultLocation: Location;
}

/**
 * Build the Single editor's stored value.
 *
 * Note the asymmetry, inherited from the original setValue() and covered by
 * tests: the pin falls back to the caller's `defaultLocation`, but the map
 * centre falls back to the hardcoded DEFAULT_LOCATION, so a datatype-configured
 * default never reaches mapconfig.centerCoordinates. Preserved deliberately -
 * changing it is a behaviour change, not a refactor.
 */
export function buildSingleMapValue(input: SingleMapValueInput): Map {
  return {
    address: {
      ...input.address,
      // Must stay after the spread: `address` can carry a stale friendlyName,
      // and the live one wins.
      friendlyName: input.friendlyName,
      coordinates: {
        lat: input.location?.lat ?? input.defaultLocation.lat,
        lng: input.location?.lng ?? input.defaultLocation.lng,
      },
    },
    mapconfig: {
      zoom: input.zoom,
      maptype: input.maptype,
      centerCoordinates: input.center ?? DEFAULT_LOCATION,
    },
  };
}

/** Split a stored value back into the pieces the editor holds as state. */
export function readSingleMapValue(value: Map | undefined): {
  address?: Address;
  friendlyName?: string;
  location?: Location;
  center?: Location;
} {
  if (!value) return {};

  const { coordinates, ...address } = value.address ?? {};

  return {
    address,
    friendlyName: value.address?.friendlyName,
    location: coordinates,
    center: value.mapconfig?.centerCoordinates,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS. If the round-trip test fails, do not adjust the test — it
encodes the dirty-document property, and a failure means `buildSingleMapValue`
and `readSingleMapValue` disagree.

- [ ] **Step 5: Delegate from the editor**

In `src/single-marker/single-marker-editor.element.ts`, add:

```ts
import { buildSingleMapValue } from '../core/value.js';
```

and replace the body of `setValue()`:

```ts
  setValue() {
    if (this.#clearValue) return;

    this.value = buildSingleMapValue({
      address: this._address,
      friendlyName: this._friendlyName,
      location: this._location,
      center: this._center,
      zoom: this._zoomLevel,
      maptype: this._mapType,
      defaultLocation: this._defaultLocation,
    });

    this.dispatchEvent(new UmbChangeEvent());
  }
```

Leave `#initialize()`'s inline value-reading alone for now; Task 13 moves it to
`readSingleMapValue`.

- [ ] **Step 6: Run the whole suite**

Run: `npm test`

Expected: PASS, including Task 4's `setValue` characterisation tests.

- [ ] **Step 7: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/core/value.ts src/core/value.test.ts \
        src/single-marker/single-marker-editor.element.ts
git commit -m "refactor: extract single map value construction into core/"
```

---

## Task 10: The `GoogleMapsApi` seam

Phase 2 begins. This task adds the interface, the real implementation and the fake, but changes no behaviour — nothing consumes it until Task 11.

**Files:**
- Create: `src/maps/maps-api.ts`
- Create: `src/maps/google-maps-api.ts`
- Create: `src/maps/fake-maps-api.ts`

**Interfaces:**
- Consumes: `@googlemaps/js-api-loader`.
- Produces, from `src/maps/maps-api.ts`:
  - `export interface GeocodeOutcome { results?: google.maps.GeocoderResult[]; status?: string; error?: unknown }`
  - `export interface GoogleMapsApi` with `configure(key: string): void`, `createMap(container, options): Promise<google.maps.Map>`, `createMarker(options): Promise<google.maps.marker.AdvancedMarkerElement>`, `createAutocomplete(): Promise<google.maps.places.PlaceAutocompleteElement>`, `geocode(request): Promise<GeocodeOutcome>`
- Also produces `GoogleMapsApiImpl` (from `google-maps-api.ts`) and `FakeMapsApi` (from `fake-maps-api.ts`).

The key design point: **`geocode` resolves with an outcome and never rejects.**
The current code fights the SDK's promise API, which rejects even on
`ZERO_RESULTS` and hides the status in a message it then string-matches. Moving
that mess behind the adapter is most of why this seam pays for itself.

- [ ] **Step 1: Create the interface**

Create `src/maps/maps-api.ts`:

```ts
/// <reference types='@types/google.maps' />

/**
 * The result of a geocode. Deliberately never a rejection: the SDK's promise
 * API rejects on ZERO_RESULTS too, so a rejection carries no information on its
 * own and the real status is only available via the callback.
 */
export interface GeocodeOutcome {
  results?: google.maps.GeocoderResult[];
  status?: string;
  error?: unknown;
}

/**
 * Every Google Maps SDK call this package makes. Kept deliberately narrow:
 * anything above this interface is testable with FakeMapsApi and needs no
 * API key.
 */
export interface GoogleMapsApi {
  configure(key: string): void;
  createMap(container: HTMLElement, options: google.maps.MapOptions): Promise<google.maps.Map>;
  createMarker(
    options: google.maps.marker.AdvancedMarkerElementOptions,
  ): Promise<google.maps.marker.AdvancedMarkerElement>;
  createAutocomplete(): Promise<google.maps.places.PlaceAutocompleteElement>;
  geocode(request: google.maps.GeocoderRequest): Promise<GeocodeOutcome>;
}
```

- [ ] **Step 2: Create the real implementation**

Create `src/maps/google-maps-api.ts`, moving the SDK calls out of the element:

```ts
/// <reference types='@types/google.maps' />
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import type { GeocodeOutcome, GoogleMapsApi } from './maps-api.js';

export class GoogleMapsApiImpl implements GoogleMapsApi {
  #geocoder?: google.maps.Geocoder;

  configure(key: string): void {
    // setOptions no-ops after the first call, so this is safe per element.
    setOptions({ key, v: 'weekly' });
  }

  async createMap(
    container: HTMLElement,
    options: google.maps.MapOptions,
  ): Promise<google.maps.Map> {
    const { Map } = await importLibrary('maps');
    return new Map(container, options);
  }

  async createMarker(
    options: google.maps.marker.AdvancedMarkerElementOptions,
  ): Promise<google.maps.marker.AdvancedMarkerElement> {
    const { AdvancedMarkerElement } = await importLibrary('marker');
    return new AdvancedMarkerElement(options);
  }

  async createAutocomplete(): Promise<google.maps.places.PlaceAutocompleteElement> {
    await importLibrary('places');
    return new google.maps.places.PlaceAutocompleteElement({});
  }

  async geocode(request: google.maps.GeocoderRequest): Promise<GeocodeOutcome> {
    if (!this.#geocoder) {
      const { Geocoder } = await importLibrary('geocoding');
      this.#geocoder = new Geocoder();
    }

    // The callback is the only way to see the exact status: the promise rejects
    // with a message that would otherwise have to be parsed, and it rejects on
    // ZERO_RESULTS as well as on real failures.
    let status: string | undefined;
    try {
      const { results } = await this.#geocoder.geocode(request, (_results, reported) => {
        status = reported;
      });
      return { results, status: status ?? 'OK' };
    } catch (error) {
      return { status, error };
    }
  }
}
```

- [ ] **Step 3: Create the fake**

Create `src/maps/fake-maps-api.ts`:

```ts
/// <reference types='@types/google.maps' />
import type { GeocodeOutcome, GoogleMapsApi } from './maps-api.js';

type Listener = (event?: unknown) => void;

/** A google.maps.Map stand-in that records what was asked of it. */
export class FakeMap {
  center: google.maps.LatLngLiteral;
  zoom: number;
  readonly listeners = new Map<string, Listener[]>();
  readonly fitBoundsCalls: unknown[] = [];

  constructor(center: google.maps.LatLngLiteral, zoom: number) {
    this.center = center;
    this.zoom = zoom;
  }

  addListener(event: string, handler: Listener) {
    const existing = this.listeners.get(event) ?? [];
    existing.push(handler);
    this.listeners.set(event, existing);
    return { remove: () => {} };
  }

  /** Fire a listener the way the SDK would. */
  emit(event: string, payload?: unknown) {
    for (const handler of this.listeners.get(event) ?? []) handler(payload);
  }

  setCenter(center: google.maps.LatLngLiteral) {
    this.center = center;
  }

  getCenter() {
    return { lat: () => this.center.lat, lng: () => this.center.lng };
  }

  setZoom(zoom: number) {
    this.zoom = zoom;
  }

  getZoom() {
    return this.zoom;
  }

  getBounds() {
    return undefined;
  }

  fitBounds(bounds: unknown) {
    this.fitBoundsCalls.push(bounds);
  }
}

/** A GoogleMapsApi that never touches the network. */
export class FakeMapsApi implements GoogleMapsApi {
  configuredKey?: string;
  lastMap?: FakeMap;
  readonly geocodeRequests: google.maps.GeocoderRequest[] = [];

  /** Outcomes are consumed in order; the last one repeats once exhausted. */
  #outcomes: GeocodeOutcome[] = [{ results: [], status: 'ZERO_RESULTS' }];

  queueGeocodeOutcomes(...outcomes: GeocodeOutcome[]) {
    this.#outcomes = outcomes;
  }

  configure(key: string): void {
    this.configuredKey = key;
  }

  async createMap(
    _container: HTMLElement,
    options: google.maps.MapOptions,
  ): Promise<google.maps.Map> {
    this.lastMap = new FakeMap(
      (options.center as google.maps.LatLngLiteral) ?? { lat: 0, lng: 0 },
      options.zoom ?? 0,
    );
    return this.lastMap as unknown as google.maps.Map;
  }

  async createMarker(
    options: google.maps.marker.AdvancedMarkerElementOptions,
  ): Promise<google.maps.marker.AdvancedMarkerElement> {
    return {
      position: options.position ?? null,
      addListener: () => ({ remove: () => {} }),
    } as unknown as google.maps.marker.AdvancedMarkerElement;
  }

  async createAutocomplete(): Promise<google.maps.places.PlaceAutocompleteElement> {
    return document.createElement('div') as unknown as google.maps.places.PlaceAutocompleteElement;
  }

  async geocode(request: google.maps.GeocoderRequest): Promise<GeocodeOutcome> {
    this.geocodeRequests.push(request);
    return this.#outcomes.length > 1
      ? (this.#outcomes.shift() as GeocodeOutcome)
      : this.#outcomes[0];
  }
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npm run build`

Expected: succeeds. No tests yet — Task 11 is the first consumer.

- [ ] **Step 5: Commit**

```bash
git add src/maps/
git commit -m "feat: add GoogleMapsApi adapter, real implementation and fake"
```

---

## Task 11: `GeocodingController`

**Files:**
- Create: `src/controllers/geocoding.controller.ts`
- Create: `src/controllers/geocoding.controller.test.ts`

**Interfaces:**
- Consumes: `GoogleMapsApi`, `GeocodeOutcome` (Task 10); `composeAddress` (Task 7); `describeGeocoderStatus`, `statusFromError`, `EditorNotice` (Task 8); `formatCoordinates` (Task 6).
- Produces, from `src/controllers/geocoding.controller.ts`:
  - `export interface GeocodeResult { location: Location; address: Address }`
  - `export class GeocodingController` with `constructor(api: GoogleMapsApi)`, `forward(query: string): Promise<{ result?: GeocodeResult; notice?: EditorNotice }>`, `reverse(coordinates: Location): Promise<{ result?: GeocodeResult; notice?: EditorNotice }>`

Returning the notice alongside the result — rather than reaching into the
element to set it — is what keeps this class testable and reusable by both
editors.

- [ ] **Step 1: Write the failing tests**

Create `src/controllers/geocoding.controller.test.ts`:

```ts
/// <reference types='@types/google.maps' />
import { expect } from '@open-wc/testing';
import { GeocodingController } from './geocoding.controller.js';
import { FakeMapsApi } from '../maps/fake-maps-api.js';

/** A minimal GeocoderResult; the controller reads only these members. */
const geocoderResult = (formatted: string, lat: number, lng: number) =>
  ({
    formatted_address: formatted,
    geometry: { location: { lat: () => lat, lng: () => lng } },
    address_components: [
      { long_name: 'Port Melbourne', short_name: 'Port Melbourne', types: ['locality'] },
      { long_name: 'Australia', short_name: 'AU', types: ['country'] },
    ],
  }) as unknown as google.maps.GeocoderResult;

describe('controllers/GeocodingController', () => {
  let api: FakeMapsApi;
  let controller: GeocodingController;

  beforeEach(() => {
    api = new FakeMapsApi();
    controller = new GeocodingController(api);
  });

  describe('forward', () => {
    it('returns the location and a composed address', async () => {
      api.queueGeocodeOutcomes({
        results: [geocoderResult('88 Dock Rd, Port Melbourne VIC 3207', -37.834, 144.926)],
        status: 'OK',
      });

      const { result, notice } = await controller.forward('88 Dock Rd');

      expect(notice).to.equal(undefined);
      expect(result?.location).to.deep.equal({ lat: -37.834, lng: 144.926 });
      expect(result?.address.full_address).to.equal('88 Dock Rd, Port Melbourne VIC 3207');
      expect(result?.address.city).to.equal('Port Melbourne');
      expect(result?.address.country).to.equal('Australia');
      expect(result?.address.coordinates).to.deep.equal({ lat: -37.834, lng: 144.926 });
    });

    it('passes the query through as an address request', async () => {
      api.queueGeocodeOutcomes({ results: [geocoderResult('x', 0, 0)], status: 'OK' });

      await controller.forward('88 Dock Rd');

      expect(api.geocodeRequests[0]).to.deep.equal({ address: '88 Dock Rd' });
    });

    it('reports ZERO_RESULTS as information naming the query', async () => {
      api.queueGeocodeOutcomes({ status: 'ZERO_RESULTS' });

      const { result, notice } = await controller.forward('Nowhere');

      expect(result).to.equal(undefined);
      expect(notice?.severity).to.equal('info');
      expect(notice?.message).to.contain('"Nowhere"');
    });

    it('reports REQUEST_DENIED as an error about the API key', async () => {
      api.queueGeocodeOutcomes({ status: 'REQUEST_DENIED' });

      const { notice } = await controller.forward('anywhere');

      expect(notice?.severity).to.equal('error');
      expect(notice?.message).to.contain('Geocoding API');
    });

    it('recovers the status from the error when none was reported', async () => {
      api.queueGeocodeOutcomes({ error: new Error('OVER_QUERY_LIMIT') });

      const { notice } = await controller.forward('anywhere');

      expect(notice?.severity).to.equal('error');
      expect(notice?.message).to.contain('quota');
    });

    it('reports an empty result list as not found', async () => {
      api.queueGeocodeOutcomes({ results: [], status: 'OK' });

      const { result, notice } = await controller.forward('anywhere');

      expect(result).to.equal(undefined);
      expect(notice?.severity).to.equal('info');
    });
  });

  describe('reverse', () => {
    it('requests the location and composes the address', async () => {
      api.queueGeocodeOutcomes({
        results: [geocoderResult('88 Dock Rd, Port Melbourne VIC 3207', -37.834, 144.926)],
        status: 'OK',
      });

      const { result } = await controller.reverse({ lat: -37.834, lng: 144.926 });

      expect(api.geocodeRequests[0]).to.deep.equal({
        location: { lat: -37.834, lng: 144.926 },
      });
      expect(result?.address.full_address).to.equal('88 Dock Rd, Port Melbourne VIC 3207');
    });

    it('keeps the requested coordinates authoritative over the geocoded ones', async () => {
      api.queueGeocodeOutcomes({
        results: [geocoderResult('somewhere else', 1, 2)],
        status: 'OK',
      });

      const { result } = await controller.reverse({ lat: -37.834, lng: 144.926 });

      expect(result?.location).to.deep.equal({ lat: -37.834, lng: 144.926 });
      expect(result?.address.coordinates).to.deep.equal({ lat: -37.834, lng: 144.926 });
    });

    it('names the coordinates in a failure notice', async () => {
      api.queueGeocodeOutcomes({ status: 'ZERO_RESULTS' });

      const { notice } = await controller.reverse({ lat: -37.834, lng: 144.926 });

      expect(notice?.message).to.contain('-37.834,144.926');
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL — `./geocoding.controller.js` does not exist.

- [ ] **Step 3: Create the controller**

Create `src/controllers/geocoding.controller.ts`:

```ts
/// <reference types='@types/google.maps' />
import { composeAddress } from '../core/address.js';
import type { GoogleAddressComponent } from '../core/address.js';
import { formatCoordinates } from '../core/coordinates.js';
import { describeGeocoderStatus, statusFromError } from '../core/geocode-status.js';
import type { EditorNotice } from '../core/geocode-status.js';
import type { GeocodeOutcome, GoogleMapsApi } from '../maps/maps-api.js';
import type { Address, Location } from '../types.js';

export interface GeocodeResult {
  location: Location;
  address: Address;
}

/** Geocoder components use long_name/short_name; core/address wants the Places shape. */
function adaptComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined,
): GoogleAddressComponent[] | undefined {
  return components?.map((component) => ({
    longText: component.long_name,
    shortText: component.short_name,
    types: component.types,
  }));
}

export class GeocodingController {
  #api: GoogleMapsApi;

  constructor(api: GoogleMapsApi) {
    this.#api = api;
  }

  /** Address text to coordinates. */
  async forward(query: string): Promise<{ result?: GeocodeResult; notice?: EditorNotice }> {
    const outcome = await this.#api.geocode({ address: query });
    const result = this.#firstResult(outcome);
    if (!result) return { notice: this.#notice(outcome, `"${query}"`) };

    const location: Location = {
      lat: result.geometry.location.lat(),
      lng: result.geometry.location.lng(),
    };

    return { result: this.#compose(result, location) };
  }

  /**
   * Coordinates to address. The supplied coordinates stay authoritative - the
   * geocoder's own are a snapped approximation, and a failed lookup must not
   * move a pin the editor placed.
   */
  async reverse(
    coordinates: Location,
  ): Promise<{ result?: GeocodeResult; notice?: EditorNotice }> {
    const outcome = await this.#api.geocode({ location: coordinates });
    const result = this.#firstResult(outcome);
    if (!result) {
      const subject = formatCoordinates(coordinates) ?? 'those coordinates';
      return { notice: this.#notice(outcome, subject) };
    }

    return { result: this.#compose(result, coordinates) };
  }

  #firstResult(outcome: GeocodeOutcome): google.maps.GeocoderResult | undefined {
    return outcome.results?.[0];
  }

  #notice(outcome: GeocodeOutcome, subject: string): EditorNotice {
    const status = outcome.status ?? statusFromError(outcome.error);
    const notice = describeGeocoderStatus(
      status === 'OK' ? 'ZERO_RESULTS' : status,
      subject,
    );
    if (notice.severity === 'error') {
      console.error('[Our.Umbraco.GMaps] Geocoding failed', outcome);
    }
    return notice;
  }

  #compose(result: google.maps.GeocoderResult, location: Location): GeocodeResult {
    const composed = composeAddress(adaptComponents(result.address_components));
    return {
      location,
      address: { ...composed, full_address: result.formatted_address, coordinates: location },
    };
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/controllers/geocoding.controller.ts src/controllers/geocoding.controller.test.ts
git commit -m "feat: add GeocodingController over the maps adapter"
```

---

## Task 12: `MapSurfaceController`

**Files:**
- Create: `src/controllers/map-surface.controller.ts`
- Create: `src/controllers/map-surface.controller.test.ts`

**Interfaces:**
- Consumes: `GoogleMapsApi` (Task 10); `Location`, `MapType` from `src/types.ts`.
- Produces, from `src/controllers/map-surface.controller.ts`:
  - `export interface MapSurfaceOptions { center: Location; zoom: number; maptype: MapType; onCenterChanged(center: Location): void; onZoomChanged(zoom: number): void; onCtrlHintNeeded(): void }`
  - `export class MapSurfaceController` with `constructor(api: GoogleMapsApi)`, `create(container: HTMLElement, options: MapSurfaceOptions): Promise<google.maps.Map>`, `setCenter(center: Location): void`, `setZoom(zoom: number): void`, `destroy(): void`

`onCtrlHintNeeded` is a callback rather than DOM manipulation so the
controller never reaches into the element's shadow root — the element owns its
overlay and decides how to show the hint.

- [ ] **Step 1: Write the failing tests**

Create `src/controllers/map-surface.controller.test.ts`:

```ts
import { expect } from '@open-wc/testing';
import { MapSurfaceController } from './map-surface.controller.js';
import { FakeMapsApi } from '../maps/fake-maps-api.js';
import type { FakeMap } from '../maps/fake-maps-api.js';
import type { Location } from '../types.js';

describe('controllers/MapSurfaceController', () => {
  let api: FakeMapsApi;
  let controller: MapSurfaceController;
  let centers: Location[];
  let zooms: number[];
  let hints: number;
  let map: FakeMap;

  const options = () => ({
    center: { lat: -37.8136, lng: 144.9631 },
    zoom: 12,
    maptype: 'roadmap' as const,
    onCenterChanged: (center: Location) => { centers.push(center); },
    onZoomChanged: (zoom: number) => { zooms.push(zoom); },
    onCtrlHintNeeded: () => { hints++; },
  });

  beforeEach(async () => {
    api = new FakeMapsApi();
    controller = new MapSurfaceController(api);
    centers = [];
    zooms = [];
    hints = 0;
    await controller.create(document.createElement('div'), options());
    map = api.lastMap as FakeMap;
  });

  afterEach(() => {
    controller.destroy();
  });

  it('creates the map at the requested centre, zoom and type', async () => {
    expect(map.center).to.deep.equal({ lat: -37.8136, lng: 144.9631 });
    expect(map.zoom).to.equal(12);
  });

  it('reports centre changes as plain coordinates', () => {
    map.setCenter({ lat: 1, lng: 2 });
    map.emit('center_changed');

    expect(centers).to.deep.equal([{ lat: 1, lng: 2 }]);
  });

  it('reports zoom changes', () => {
    map.setZoom(15);
    map.emit('zoom_changed');

    expect(zooms).to.deep.equal([15]);
  });

  it('snaps back and asks for the hint when dragged without a modifier', () => {
    map.emit('dragstart');
    map.setCenter({ lat: 99, lng: 99 });
    map.emit('drag');

    expect(map.center).to.deep.equal({ lat: -37.8136, lng: 144.9631 });
    expect(hints).to.equal(1);
  });

  it('allows the drag while ctrl is held', () => {
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
    map.emit('dragstart');
    map.setCenter({ lat: 99, lng: 99 });
    map.emit('drag');

    expect(map.center).to.deep.equal({ lat: 99, lng: 99 });
    expect(hints).to.equal(0);

    globalThis.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
  });

  it('allows the drag while meta is held', () => {
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta' }));
    map.emit('dragstart');
    map.setCenter({ lat: 42, lng: 42 });
    map.emit('drag');

    expect(map.center).to.deep.equal({ lat: 42, lng: 42 });

    globalThis.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta' }));
  });

  it('stops listening for modifier keys once destroyed', () => {
    controller.destroy();
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));

    map.emit('dragstart');
    map.setCenter({ lat: 99, lng: 99 });
    map.emit('drag');

    // The listener is gone, so ctrl is not observed and the drag is refused.
    expect(map.center).to.deep.equal({ lat: -37.8136, lng: 144.9631 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL — `./map-surface.controller.js` does not exist.

- [ ] **Step 3: Create the controller**

Create `src/controllers/map-surface.controller.ts`:

```ts
/// <reference types='@types/google.maps' />
import type { GoogleMapsApi } from '../maps/maps-api.js';
import type { Location, MapType } from '../types.js';

export interface MapSurfaceOptions {
  center: Location;
  zoom: number;
  maptype: MapType;
  onCenterChanged(center: Location): void;
  onZoomChanged(zoom: number): void;
  /** The map refused a drag; the host should show its "use ctrl + drag" hint. */
  onCtrlHintNeeded(): void;
}

/** Shared by every map this package creates; see the Google Cloud console. */
const MAP_ID = '4504f8b37365c3d0';

/**
 * Owns the map surface: creation, centre and zoom tracking, and the
 * ctrl-to-pan behaviour that stops the map swallowing page scroll.
 *
 * Deliberately knows nothing about markers or addresses, and never touches the
 * host's DOM beyond the container it is given.
 */
export class MapSurfaceController {
  #api: GoogleMapsApi;
  #map?: google.maps.Map;
  #modifierHeld = false;
  #lastCenter?: google.maps.LatLngLiteral;
  #onKeyDown?: (event: KeyboardEvent) => void;
  #onKeyUp?: (event: KeyboardEvent) => void;

  constructor(api: GoogleMapsApi) {
    this.#api = api;
  }

  get map(): google.maps.Map | undefined {
    return this.#map;
  }

  async create(container: HTMLElement, options: MapSurfaceOptions): Promise<google.maps.Map> {
    const map = await this.#api.createMap(container, {
      center: options.center,
      zoom: options.zoom,
      mapTypeId: options.maptype.toString().toLowerCase(),
      mapId: MAP_ID,
      gestureHandling: 'cooperative',
    });

    map.addListener('center_changed', () => {
      const center = map.getCenter();
      if (center) options.onCenterChanged({ lat: center.lat(), lng: center.lng() });
    });

    map.addListener('zoom_changed', () => {
      const zoom = map.getZoom();
      if (zoom !== undefined) options.onZoomChanged(zoom);
    });

    this.#trackModifierKeys();

    map.addListener('dragstart', () => {
      const center = map.getCenter();
      this.#lastCenter = center ? { lat: center.lat(), lng: center.lng() } : undefined;
    });

    map.addListener('drag', () => {
      if (this.#modifierHeld || !this.#lastCenter) return;
      map.setCenter(this.#lastCenter);
      options.onCtrlHintNeeded();
    });

    this.#map = map;
    return map;
  }

  setCenter(center: Location) {
    this.#map?.setCenter(center);
  }

  setZoom(zoom: number) {
    this.#map?.setZoom(zoom);
  }

  destroy() {
    if (this.#onKeyDown) globalThis.removeEventListener('keydown', this.#onKeyDown);
    if (this.#onKeyUp) globalThis.removeEventListener('keyup', this.#onKeyUp);
    this.#onKeyDown = undefined;
    this.#onKeyUp = undefined;
    this.#modifierHeld = false;
  }

  #trackModifierKeys() {
    this.#onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Control' || event.key === 'Meta') this.#modifierHeld = true;
    };
    this.#onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Control' || event.key === 'Meta') this.#modifierHeld = false;
    };
    globalThis.addEventListener('keydown', this.#onKeyDown);
    globalThis.addEventListener('keyup', this.#onKeyUp);
  }
}
```

Note one behaviour change from the original, and it is a fix rather than a
regression: the old code added `keydown`/`keyup` listeners to `globalThis` and
never removed them, leaking one pair per editor instance. `destroy()` closes
that, and the last test pins it.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/controllers/map-surface.controller.ts src/controllers/map-surface.controller.test.ts
git commit -m "feat: add MapSurfaceController over the maps adapter"
```

---

## Task 13: Compose the Single editor from the controllers

The payoff task, and the risky one. The Task 1–4 characterisation suite is the acceptance criterion: it must pass unchanged.

**Files:**
- Modify: `src/single-marker/single-marker-editor.element.ts`

**Interfaces:**
- Consumes: everything produced by Tasks 6–12.
- Produces: no new public surface. `resetView()` and the element's `value`/`config` properties keep their current signatures.

- [ ] **Step 1: Replace the map bootstrap with `MapSurfaceController`**

In `#initialize()`, delete the `setOptions({...})` call, the
`importLibrary('maps')` / `importLibrary('marker')` / `importLibrary('places')`
/ `importLibrary('geocoding')` calls, the `new Map(...)` construction, and the
`zoom_changed` and `center_changed` listeners. Replace with:

```ts
    this.#api.configure(this._apiKey!);

    const map = await this.#mapSurface.create(this.shadowRoot?.getElementById('map') as HTMLElement, {
      center: {
        lat: this.value?.mapconfig.centerCoordinates?.lat ?? this.value?.address.coordinates?.lat ?? 0,
        lng: this.value?.mapconfig.centerCoordinates?.lng ?? this.value?.address.coordinates?.lng ?? 0,
      },
      zoom: this.getAsNumber(this.value.mapconfig.zoom) ?? this._zoomLevel,
      maptype: this._mapType,
      onCenterChanged: (center) => {
        this._center = center;
        this.setValue();
      },
      onZoomChanged: (zoom) => {
        this._zoomLevel = zoom;
        this.setValue();
      },
      onCtrlHintNeeded: () => this.#showCtrlHint(),
    });
```

Add these imports:

```ts
import { GoogleMapsApiImpl } from '../maps/google-maps-api.js';
import type { GoogleMapsApi } from '../maps/maps-api.js';
import { MapSurfaceController } from '../controllers/map-surface.controller.js';
import { GeocodingController } from '../controllers/geocoding.controller.js';
```

and these fields. They are field initialisers, not constructor assignments, and
the declaration order matters — `#api` must come first, because the two
controllers read it during their own initialisation:

```ts
  #api: GoogleMapsApi = new GoogleMapsApiImpl();
  #mapSurface = new MapSurfaceController(this.#api);
  #geocoding = new GeocodingController(this.#api);
```

Also delete the now-unused `setOptions` / `importLibrary` import from
`@googlemaps/js-api-loader` — the adapter owns it now, and `noUnusedLocals`
will fail the build otherwise.

- [ ] **Step 2: Reduce `#setupCtrlInteractions` to the overlay only**

The controller now owns the key tracking, the `dragstart`/`drag` listeners and
the snap-back. What remains is the element's own overlay, so replace the whole
method with:

```ts
  #ctrlHintTimeout?: number;

  /** The controller decides *when* the hint is needed; the element owns how it looks. */
  #showCtrlHint() {
    const overlay = this.shadowRoot?.getElementById('ctrlScrollOverlay');
    if (!overlay) return;

    overlay.classList.add('visible');
    globalThis.clearTimeout(this.#ctrlHintTimeout);
    this.#ctrlHintTimeout = globalThis.setTimeout(() => {
      overlay.classList.remove('visible');
    }, 2000);
  }
```

Delete the `this.#setupCtrlInteractions(map)` call.

- [ ] **Step 3: Route geocoding through `GeocodingController`**

Delete `#runGeocode` and `#forwardGeocode` entirely, along with the `#geocoder`
field. Replace their call sites:

In `#applyInboundLookup`:

```ts
    this._lookupPending = true;
    const { result, notice } = await this.#geocoding.forward(request.query);
    this._lookupPending = false;
    this.#setNotice(notice);
    if (!result) return;
```

In `#applyCoordinateSearch`, replace the `#runGeocode({ location: coords }, …)`
block and the component adaptation that follows it:

```ts
    const { result, notice } = await this.#geocoding.reverse(coords);
    this.#setNotice(notice);
    const address: Address = result?.address ?? { coordinates: coords };
```

- [ ] **Step 4: Create the marker and autocomplete through the adapter**

Replace `new AdvancedMarkerElement({...})` with:

```ts
    this.marker = await this.#api.createMarker({
      map,
      position: {
        lat: this.value?.address.coordinates?.lat ?? 0,
        lng: this.value?.address.coordinates?.lng ?? 0,
      },
      gmpDraggable: true,
    });
```

and `new google.maps.places.PlaceAutocompleteElement({})` with
`await this.#api.createAutocomplete()`.

- [ ] **Step 5: Read the stored value through `core/value`**

In `#initialize()`, replace the inline destructure that seeds `_address`,
`_location` and `_friendlyName` with:

```ts
    const stored = readSingleMapValue(this.value);
    this._address ??= stored.address;
    this._location ??= stored.location;
    this._friendlyName ??= stored.friendlyName;
```

Add `readSingleMapValue` to the `../core/value.js` import.

- [ ] **Step 6: Release the controller on disconnect**

In `disconnectedCallback`, alongside the existing auth-failure disposal:

```ts
    this.#mapSurface.destroy();
    globalThis.clearTimeout(this.#ctrlHintTimeout);
```

- [ ] **Step 7: Run the whole suite**

Run: `npm test`

Expected: PASS — every characterisation test from Tasks 1–4, unchanged. **This
is the gate for the entire refactor.** If any characterisation test fails, the
refactor changed behaviour: fix the code, not the test.

- [ ] **Step 8: Verify the build**

Run: `npm run build`

Expected: succeeds, with no unused imports left behind.

- [ ] **Step 9: Manual verification in the demo site**

Run from the repo root:

```bash
./build.sh --major 18
dotnet run --project Our.Umbraco.GMaps.UmbracoV18
```

With a real API key configured, open a document using the
`TestOurUmbracoGMapsSinglePropertyEditorUI` datatype and confirm by hand:
search selects a place and moves the pin; typing `-37.8136,144.9631` and
pressing Enter places the pin; dragging the pin updates the address; dragging
the map without ctrl snaps back and shows the hint; ctrl+drag pans; zoom
persists after save and reload; the Clear and Reset property actions work; and
opening the document does **not** immediately mark it dirty.

The automated suite cannot cover this — it uses `FakeMapsApi` and never loads
the SDK — so this pass is what proves the real adapter is wired correctly.

- [ ] **Step 10: Commit**

```bash
git add src/single-marker/single-marker-editor.element.ts
git commit -m "refactor: compose the single marker editor from shared controllers"
```

---

## Definition of done for phases 0–2

- `npm test` passes; the characterisation suite from Tasks 1–4 is green and unmodified since Task 4 (except the block Task 8 deliberately retired).
- `npm run build` passes.
- `./build.sh --major 17` and `./build.sh --major 18` both pass.
- The manual pass in Task 13 Step 9 is clean.
- No file in `src/core/` imports from `src/maps/`, `src/controllers/`, or any Google package. Verify with a check scoped to import statements — matching bare `google.maps` anywhere would flag the doc comments in `core/address.ts` that legitimately *name* the Google type they mirror:

```bash
grep -rnE "^\s*(import|export).*(from '\.\./(maps|controllers)|googlemaps|@types/google)" src/core/*.ts \
  && echo VIOLATION || echo clean
```

The only imports `core/` should have are from `../types.js`.

## Follow-on work, not in this plan

- **Phases 3–4** — the Multi Marker editor, its models, PVC, drawer modal, property actions, UFM changes, docs and uSync fixtures. A second plan, written once this plan's controller API exists in code.
- **`core/marker-collection.ts`** — belongs to phase 3, where it has a consumer.
- **Two preserved inconsistencies** that Tasks 4 and 9 pin rather than fix, each a deliberate behaviour change if we ever want them: the map centre falling back to `DEFAULT_LOCATION` instead of the configured default location, and `composeAddress` having no precedence between `postal_town` and `locality`.
- **The README's click-to-place claim** — tracked separately, see the spec's side findings.
