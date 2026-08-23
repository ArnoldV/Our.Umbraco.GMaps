# Supporting Umbraco 17 and Umbraco 18 from one codebase

`Our.Umbraco.GMaps` ships one NuGet flavour per supported Umbraco major, both built from the same
commit on the same branch. There is no `dev/v17` branch to cherry-pick into: every fix and feature
reaches both majors as soon as it is merged.

| Umbraco | Package versions | Umbraco dependency |
| ------- | ---------------- | ------------------ |
| 17      | `17.x.y`         | `[17.0.0,18.0.0)`  |
| 18      | `18.x.y`         | `[18.0.1,19.0.0)`  |

The bounded upper bound matters: it stops NuGet offering an `18.x` package to an Umbraco 17 site
and vice versa.

## How the flavours are selected

Umbraco 17 and 18 both run on `net10.0`, so this cannot be a `TargetFrameworks` dimension. It also
cannot be an MSBuild property on a single project, because **a project path has exactly one
`obj/project.assets.json`** — one project cannot restore two different dependency graphs. NuGet
honours only `SetTargetFramework` among the per-`ProjectReference` dimensions; both
`AdditionalProperties` and `SetPlatform` are ignored during restore.

So each major gets its own project file, and everything they share lives in a props file:

| File | Contents |
| ---- | -------- |
| `Our.Umbraco.GMaps/Our.Umbraco.GMaps.props` | everything common: TFM, assembly and package identity, package metadata, item groups |
| `Our.Umbraco.GMaps/Our.Umbraco.GMaps.csproj` | Umbraco 18: dependency range, version, description, `UMBRACO_18` |
| `Our.Umbraco.GMaps/Our.Umbraco.GMaps.V17.csproj` | Umbraco 17: dependency range, version, description, `UMBRACO_17` |

Both project files sit in the **same directory**, and that is not a matter of taste. Static web
asset discovery is hardcoded to `ContentRoot="$(MSBuildProjectDirectory)\wwwroot\"` with
`RelativePathPattern="wwwroot/**"`, so a project in its own folder with linked source would ship no
`App_Plugins` assets. Sharing the directory means both projects glob the real source and the real
`wwwroot` naturally.

The cost of sharing a directory is that `obj/` and `bin/` would collide, so
`Our.Umbraco.GMaps/Directory.Build.props` gives each project its own — set there rather than in the
project files because the SDK defaults those paths before the project body is evaluated — and
excludes `obj/**;bin/**` from the default globs so neither project picks up the other's generated
sources.

Both projects produce the same `AssemblyName` and `PackageId`; only the version stream differs.

## Building

[`build.proj`](../build.proj) holds the build logic — client bundle, then build and pack each
flavour into `build-out/`. [`build.sh`](../build.sh) and [`build.ps1`](../build.ps1) are thin
wrappers that translate friendly flags into its properties, so there is one implementation to
change rather than one per platform. CI calls `build.sh`.

```bash
./build.sh                      # client + every supported major
./build.sh --major 17           # one flavour
./build.sh --sites              # also build the demo site for each major
./build.sh --help               # all options
```

```powershell
./build.ps1                     # the same, on Windows
./build.ps1 -Major 17 -Sites
```

Either wrapper passes unrecognised arguments through to MSBuild, and `build.proj` can be driven
directly:

```bash
dotnet msbuild build.proj -p:UmbracoMajors=17 -p:BuildSites=true
dotnet msbuild build.proj -t:Help          # the full property list
```

`build.proj`'s `PackageFlavour` item list is the single place that maps a major to its project file
and demo site. Building a flavour by hand is just its project file:

```bash
dotnet pack Our.Umbraco.GMaps/Our.Umbraco.GMaps.V17.csproj -c Release
```

The node and npm versions the client needs are declared once, in `Client/package.json`'s `engines`
block, and enforced by npm itself via `Client/.npmrc` (`engine-strict=true`) — not re-checked in
the build scripts.

## The only version-conditional code

`Composing/Composer.cs` — registering the package's Management API OpenAPI document is the single
place the two majors diverge. Umbraco 17 describes the Management API with Swashbuckle
(`IConfigureOptions<SwaggerGenOptions>`); Umbraco 18 replaced it with `Microsoft.AspNetCore.OpenApi`
and `builder.AddBackOfficeOpenApiDocument(...)`. The two Swashbuckle support classes in
`Configuration/` are wrapped whole in `#if UMBRACO_17`.

Everything else — property editor, value converter, migrations, controller, configuration — compiles
unchanged against both. **Keep it that way**: if a change needs a second `#if`, prefer an approach
that works on both majors.

## The client bundle is built once

The backoffice bundle serves both majors. Every `@umbraco-cms/backoffice/*` entry point it imports
exists in 17 and 18, and `@umbraco/*` is externalised in `vite.config.ts`, so the bundle resolves
against whichever backoffice it is installed into. Do not fork the client. If a change needs an API
that only exists in 18, feature-detect at runtime rather than shipping two bundles.

## Demo sites

Two demo sites, one per major, both in `Our.Umbraco.GMaps.slnx`. Each references the package
project file for its own Umbraco version, so it needs no properties and no separate solution —
open the solution and run either one:

| Demo site | References |
| --------- | ---------- |
| `Our.Umbraco.GMaps.UmbracoV17` | `Our.Umbraco.GMaps.V17.csproj` |
| `Our.Umbraco.GMaps.UmbracoV18` | `Our.Umbraco.GMaps.csproj` |

```bash
dotnet run --project Our.Umbraco.GMaps.UmbracoV17
dotnet run --project Our.Umbraco.GMaps.UmbracoV18
```

## Adding the next major

1. Copy `Our.Umbraco.GMaps.csproj` to `Our.Umbraco.GMaps.V<old>.csproj` if the current default is
   becoming the older flavour, then point the default project at the new major's dependency range,
   version, description and `UMBRACO_<n>` symbol.
2. Add a `PackageFlavour` row to `build.proj` mapping the major to its project file and demo site.
3. Add the major to the `umbraco-major` matrix in both workflows.
4. Add a demo site for it, referencing the matching project file.

Dropping a major is the same list in reverse: remove its project file, its `PackageFlavour` row,
its matrix entry and its demo site. Neither wrapper script needs touching either way.
