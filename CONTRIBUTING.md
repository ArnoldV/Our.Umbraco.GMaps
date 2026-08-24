# Contributing

This repo's own local Umbraco sample sites, backoffice client, and design documents live under
`Our.Umbraco.GMaps.UmbracoV17/`, `Our.Umbraco.GMaps.UmbracoV18/`, `Our.Umbraco.GMaps/Client/` and
`Docs/`. See [Docs/multi-version-support.md](Docs/multi-version-support.md) for how one codebase
targets several Umbraco majors.

## Running a sample site

```bash
# Sample site (use the launch profile: it sets Development, which loads user secrets)
dotnet run --project Our.Umbraco.GMaps.UmbracoV18

# Backoffice client assets (separate terminal)
cd Our.Umbraco.GMaps/Client
npm install
npm run watch
```

Log in with the unattended-install credentials in the site's `appsettings.json`. The Google Maps
API key comes from user secrets:

```bash
cd Our.Umbraco.GMaps.UmbracoV18
dotnet user-secrets set "GoogleMaps:ApiKey" "<your key>"
```

## Tests

```bash
dotnet test Our.Umbraco.GMaps.Tests

cd Our.Umbraco.GMaps/Client
npx web-test-runner
```

## Building the package

```bash
./build.sh                # client + every supported major, packed into ./build-out
./build.sh --major 18     # one flavour only
./build.sh --help         # all options
```

## Project conventions

* **Umbraco package standards.** Follow documented Umbraco conventions for the major being
  targeted. Deviating from one requires an explicit, recorded rationale rather than silent
  divergence.
* **Verified assumptions.** Consult the official documentation before implementing against an
  Umbraco or Google Maps API. Assumptions that cannot be avoided are recorded and validated against
  real behaviour — a passing unit test against a fake is not evidence that the real SDK agrees.
* **Backoffice UI consistency.** Backoffice UI uses the Umbraco UI Library with Lit and TypeScript.
  Anything outside UUI/Lit/TypeScript needs explicit justification.
* **Standardised build tooling.** Vite builds all client-side assets. Alternative bundlers need
  documented justification.
* **Minimal, self-documenting code over inline commentary.** Prefer clear naming and structure to
  `//` comments explaining rationale. Public API surfaces still carry `///` XML doc comments in C#
  and `/** */` JSDoc blocks in TypeScript, since those drive tooling.
* **Test at the seam, not through the SDK.** Pure logic lives in `Client/src/core/` and never
  imports from `maps/`, `controllers/`, or Google. Everything that does talk to the SDK goes through
  the `GoogleMapsApi` adapter, so tests run against `FakeMapsApi` without an API key.
