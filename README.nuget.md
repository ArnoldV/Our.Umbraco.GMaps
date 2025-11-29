# Our.Umbraco.GMaps - Google Maps for Umbraco

![Our.Umbraco.GMaps Logo](https://raw.githubusercontent.com/ArnoldV/Our.Umbraco.GMaps/master/icon.png)

Google Maps with autocomplete property editor for Umbraco including property value converter.

* ***For Umbraco 10 to 13, use version 3.0.5***

## Change Log

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
