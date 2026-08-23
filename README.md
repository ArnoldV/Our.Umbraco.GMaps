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
