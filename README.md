# Our.Umbraco.GMaps - Google Maps for Umbraco

![Our.Umbraco.GMaps Logo](https://raw.githubusercontent.com/ArnoldV/Our.Umbraco.GMaps/master/icon.png)

Google Maps with autocomplete property editor for Umbraco including property value converter.

[![Our.Umbraco.GMaps - CI](https://github.com/ArnoldV/Our.Umbraco.GMaps/actions/workflows/build.yml/badge.svg)](https://github.com/ArnoldV/Our.Umbraco.GMaps/actions/workflows/build.yml)
[![Our.Umbraco.GMaps - Release](https://github.com/ArnoldV/Our.Umbraco.GMaps/actions/workflows/release.yml/badge.svg)](https://github.com/ArnoldV/Our.Umbraco.GMaps/actions/workflows/release.yml)

| Package | NuGet |
| ------- | ----- |
| Our.Umbraco.GMaps | [![NuGet](https://img.shields.io/nuget/v/Our.Umbraco.GMaps)](https://www.nuget.org/packages/Our.Umbraco.GMaps) [![NuGet downloads](https://img.shields.io/nuget/dt/Our.Umbraco.GMaps.svg)](https://www.nuget.org/packages/Our.Umbraco.GMaps) |

## Supported Umbraco versions

| Umbraco | Package version |
| ------- | --------------- |
| 18      | `18.x`          |
| 17      | `17.x`          |
| 14 - 16 | `5.x`           |
| 10 - 13 | `3.0.5`         |

Umbraco 17 and 18 are both supported from the same branch, with one package flavour each. To build
everything — the backoffice client bundle and both package flavours — run `./build.sh` (or
`./build.ps1` on Windows) from the repo root. See
[Supporting Umbraco 17 and Umbraco 18](Docs/multi-version-support.md) for the detail.

## Change Log Summary

* Unreleased: Fixed — saving a document no longer overwrites the map's stored centre point with the configured default location. Previously any save that did not pan the map (a zoom change, a friendly-name edit, or saving an unrelated property) silently discarded the centre. Documents already saved with the wrong centre are not repaired automatically and need setting again
* Unreleased: Property mapping — a map can read its location from, and write its resolved address back to, other properties on the same content item or block. Geocoding failures now report the actual cause instead of "no location found"
* 18.0.0: Umbraco 18 support. Umbraco 17 and 18 are now built from the same branch, one package flavour each (`17.x` / `18.x`)
* 17.0.1: Now using new Google Places API, and includes ufm components for Block Elements
* 17.0.0: Umbraco 17 release - release version aligned to Umbraco
* 5.0.0: Rebuilt to target Umbraco 16 Management Apis and uUI framework now an RCL (See breaking changes below)
* 4.0.0: Rebuilt with Umbraco's uUI targetting Umbraco 15+
* 3.0.0: Removed support for Umbraco 8 & 9, allowing us to cleanup the codebase.  *Now a Razor Class Library.*
* 2.1.3: Better support for installation on Umbraco 11.
* 2.1.0: Breaking change - `MapConfig.Zoom` is now an `int` as it should be (was a `string`).
* 2.0.7: Added ability to re-center the map via Editor Actions and can now directly input a set of coordinates.

## Breaking Changes

* As of version 5, the Our.Umbraco.GMaps.Core package is no longer, and any references to `Our.Umbraco.GMaps.Core` should be replaced with just `Our.Umbraco.GMaps`.

## Features

* Search for address using autocomplete and place marker
* Enter coordinates in place marker
* Click on exact location on map to place marker
* Drag marker around
* Set default location & zoomlevel on Data Type settings
* Zoomlevel is saved on the property to use the same zoomlevel on your website
* Centerpoint is saved on the property to use the same centerpoint on your website different than the marker.
* MapType is saved on the property to use the same maptype on your website
* Use your SnazzyMaps API key to set mapstyles
* Exchange address data with other properties on the same content item or block, in either direction
* Umbraco Formatted Markdown components

## Install

Use NuGet to install Our.Umbraco.GMaps:  

```powershell
Install-Package Our.Umbraco.GMaps
```

* Enable the following Google Maps API on <https://console.cloud.google.com/home/dashboard>
  * Maps Javascript API
  * Geocoding API
  * Place API

Note that the **Geocoding API** is a separate API from Maps JavaScript and Places. A key that
renders the map happily can still be refused for address lookups, which is what coordinate entry
and the property mapping *Look up* button use. The property editor reports the reason Google gave
above the map — see [Troubleshooting](Docs/Troubleshooting.md).

## Configuration

You can configure the API Key along with other settings directly in AppSettings as per below:

Add the following to your appsettings.json file or equivalent settings provider (Azure KeyVault, Environment, etc.):

```json
  "GoogleMaps": {
    "ApiKey": "",
    "DefaultLocation": "",
    "ZoomLevel": 17
  }
```

These settings can be overridden by configuring the relevant properties of the Data Type prevalues.

## Property Mapping

A map property can exchange address data with other properties on the same content item — or, when
the map sits inside a Block List, Block Grid or rich text block, with the other properties on that
same block. It is off by default.

Configure it with the **Property mapping** setting on the Data Type, choosing a direction:

| Direction | Behaviour |
| --------- | --------- |
| Off | Default. The map ignores other properties entirely. |
| Properties → Map | The mapped properties are geocoded and the pin follows them. |
| Map → Properties | Picking a place, or dragging the pin, writes the resolved components back out. |
| Both directions | Both of the above. |

Then add a row per field you want to exchange, choosing the map field and typing the **alias** of
the property it pairs with. Aliases are typed rather than picked, because a Data Type does not know
which Document Types will end up using it. Any alias that does not exist on the content is ignored,
and a warning is shown on the property itself.

Mappable fields are `Full address`, `Friendly name`, `Street number`, `Street`, `Postal code`,
`City`, `State / region`, `Country`, `Latitude`, `Longitude`, and `Coordinates` (both values in a
single text property as `lat,lng`).

### Properties → Map

If `Coordinates`, or both `Latitude` and `Longitude`, are mapped and hold a valid location, the pin
is placed directly and no geocoding request is made. Otherwise the mapped text fields are combined
into one address and geocoded; `Full address`, when mapped and non-empty, is used on its own.

Lookups never run when a document is opened, so an existing hand-placed pin is never moved and
opening a document never marks it dirty. Editors get a **Look up from address fields** button on the
property. **Look up automatically** additionally geocodes whenever a mapped property changes — that
consumes Geocoding API quota, so it is off by default.

### Map → Properties

Values are written when the editor picks a place, drags the pin, enters coordinates, edits the
friendly name, or resets the view. A value is only written when it actually differs, so panning or
zooming the map does not mark the document dirty, and dragging the pin updates only the coordinates.

`Latitude` and `Longitude` are written as numbers, so they suit a numeric property. To keep both in
one text property, map `Coordinates` instead.

Data flowing in never immediately flows back out, so **Both directions** cannot loop.

> Clearing the map with the *Clear Marker* property action does not clear the mapped properties.

See [Installing & Configuring](Docs/Installing-&-Configuring.md) for the full detail.

## Umbraco Formatted Markdown Components

Release 17.0.1 includes ufm components for rendering the Address and Coordinates in Block Data types:

* Friendly Name: `{gmp: singleMap.friendlyName}`
* Address: `{gmp: singleMap.address}`
* Coordinates: `{gmp: singleMap.coordinates}`

## Demo site Umbraco Backoffice Login Details

Username: admin@admin.com  
Password: *Password123*
  
## Special thanks and big #H5YR

Special thanks to:

* [ronaldbarendse](https://github.com/ronaldbarendse) for all his contributions to this project
* [prjseal](https://github.com/prjseal) for the Visual Studio project setup and included demo-site
* [robertjf](https://github.com/robertjf) for making the Umbraco 9 version a reality, and continuously accepting and testing PR's and setting up release automation #h5yr
* [arknu](https://github.com/arknu) for migrating to Umbraco 15

[Google maps icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/google-maps)
