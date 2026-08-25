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

* 17.3.0 / 18.2.0: New **Google Maps Multi Marker** property editor — many pins on one shared map, with per-marker friendly name, description and a datatype-configured colour palette, drag-to-reorder, and minimum/maximum marker counts. Resolves [#27](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/27)
* 17.3.0 / 18.2.0: Fixed — saving a document no longer overwrites the map's stored centre point with the configured default location. Previously any save that did not pan the map (a zoom change, a friendly-name edit, or saving an unrelated property) silently discarded the centre. Documents already saved with the wrong centre are not repaired automatically and need setting again
* 17.3.0 / 18.2.0: Property mapping — a map can read its location from, and write its resolved address back to, other properties on the same content item or block
* 17.3.0 / 18.2.0: The datatype's **Default Location** is now picked on a map, with a search box, and the zoom you leave it at becomes the datatype's default zoom
* 17.3.0 / 18.2.0: Maps now say what is wrong with a key instead of showing Google's grey error panel: no key configured, the key Google refused, or a key this page cannot use because the Maps API allows only one key per page
* 17.3.0 / 18.2.0: Fixed — a datatype whose **Google API Key** field was filled in and then cleared no longer blanks out the site-wide `GoogleMaps:ApiKey` on the front end. An empty field is not a key, and now falls back like any other missing value. Both property value converters resolve the key through one helper so they cannot drift apart again
* 17.3.0 / 18.2.0: Fixed — values saved by older versions of the package no longer break the site: a stored null zoom threw on read ([#197](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/197)) and Umbraco 8 values lost their map type ([#165](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/165)). A migration repairs stored values in place
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
* Exchange address data with other properties on the same content item or block, in either direction
* **Multi Marker editor** — many pins on one map, each with its own friendly name, description and colour
* Marker colours come from a palette you define on the data type, and the label travels through to the front-end
* Minimum and maximum marker counts, enforced in the editor
* Umbraco Formatted Markdown components

## Install

* Enable the following Google Maps API on <https://console.cloud.google.com/home/dashboard>
  * Maps Javascript API
  * Geocoding API
  * Place API

The **Geocoding API** is a separate API from Maps JavaScript and Places. A key that renders the map
happily can still be refused for address lookups; the property editor reports the reason Google gave
above the map. See
[Troubleshooting](https://github.com/ArnoldV/Our.Umbraco.GMaps/blob/develop/Docs/Troubleshooting.md).

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
same block. Configure it with the **Property mapping** setting on the Data Type, choosing a
direction — *Properties → Map* geocodes the mapped fields and moves the pin, *Map → Properties*
writes the picked place's components back out — then adding a row per field, pairing a map field
with a property alias.

Mapped coordinates are used directly with no geocoding request. Automatic lookup is off by default
(it consumes Geocoding API quota); editors get an explicit *Look up from address fields* button.
Opening a document never moves an existing pin or marks the document dirty, and values are only
written when they actually differ.

See the
[full documentation](https://github.com/ArnoldV/Our.Umbraco.GMaps/blob/develop/Docs/Home.md)
for the detail.

## Multi Marker

**Google Maps Multi Marker** is a separate property editor holding many pins on one shared map, each
with its own friendly name, description and colour from a palette defined on the data type. Pins are
numbered by their position in the list, drag to reorder, and the colour's *label* travels through to
the front-end so templates can group markers by what a colour means.

The value comes back as a `MultiMap` — a `List<Marker>` plus the shared `MapConfig`. Switching an
existing Single Marker property over does not lose the pin: the Multi converter reads a stored
single-map value as a one-marker list.

See [Accessing & Working with Map Data](https://github.com/ArnoldV/Our.Umbraco.GMaps/blob/develop/Docs/Accessing-&-Working-with-Map-Data.md).

## Special thanks

Special thanks to [ronaldbarendse](https://github.com/ronaldbarendse) for contributing to this project #h5yr!

Special thanks to [prjseal](https://github.com/prjseal) for the Visual Studio project setup and included demo-site #h5yr!

Special thanks to [robertjf](https://github.com/robertjf) for contributing to this project and setting up the Release Workflow #h5yr!

Special thanks to [arknu](https://github.com/arknu) for migrating to Umbraco 15 #h5yr!

[Google maps icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/google-maps)<a href="https://www.flaticon.com/free-icons/google-maps" title="google maps icons">Google maps icons created by Freepik - Flaticon</a>
