# Our.Umbraco.GMaps - Google Maps for Umbraco

![Our.Umbraco.GMaps Logo](https://raw.githubusercontent.com/ArnoldV/Our.Umbraco.GMaps/master/icon.png)

Google Maps with autocomplete property editor for Umbraco including property value converter.

## Supported Umbraco versions

| Umbraco | Package version |
| ------- | --------------- |
| 18      | `18.x`          |
| 17      | `17.x`          |
| 14 - 16 | `5.x`           |
| 10 - 13 | `3.0.5`         |

Umbraco 17 and 18 are maintained in parallel, so fixes and features reach both.

## Change Log

Major highlights only. See the [full change log](https://github.com/ArnoldV/Our.Umbraco.GMaps#change-log-summary)
for the detail.

* 18.0.0: Umbraco 18 support, alongside the 17.x releases
* 17.0.0: Umbraco 17 support, with the new Google Places API and UFM components for Block Elements. Release version aligned to Umbraco
* 5.0.0: Rebuilt to target Umbraco 16 Management APIs; the uUI framework is now an RCL (see breaking changes below)
* 4.0.0: Rebuilt with Umbraco's uUI, targeting Umbraco 15+
* 3.0.0: Dropped Umbraco 8 & 9 and cleaned up the codebase. *Now a Razor Class Library.*

## Breaking Changes

* As of version 5, the Our.Umbraco.GMaps.Core package is no longer, and any references to `Our.Umbraco.GMaps.Core` should be replaced with just `Our.Umbraco.GMaps`.
* As of version 2.1.0, `MapConfig.Zoom` is an `int` as it should be (was a `string`).

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

## Install

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

## Special thanks

Special thanks to [ronaldbarendse](https://github.com/ronaldbarendse) for contributing to this project #h5yr!

Special thanks to [prjseal](https://github.com/prjseal) for the Visual Studio project setup and included demo-site #h5yr!

Special thanks to [robertjf](https://github.com/robertjf) for contributing to this project and setting up the Release Workflow #h5yr!

Special thanks to [arknu](https://github.com/arknu) for migrating to Umbraco 15 #h5yr!

[Google maps icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/google-maps)<a href="https://www.flaticon.com/free-icons/google-maps" title="google maps icons">Google maps icons created by Freepik - Flaticon</a>
