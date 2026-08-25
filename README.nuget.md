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

## Change log

Every notable change, grouped by release, with the breaking changes to watch for when upgrading:
**[Change log](https://github.com/ArnoldV/Our.Umbraco.GMaps/blob/develop/Docs/Change-Log.md)**.

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
[Troubleshooting](https://github.com/ArnoldV/Our.Umbraco.GMaps/wiki/Troubleshooting).

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
[full documentation](https://github.com/ArnoldV/Our.Umbraco.GMaps/wiki)
for the detail.

## Multi Marker

**Google Maps Multi Marker** is a separate property editor holding many pins on one shared map, each
with its own friendly name, description and colour from a palette defined on the data type. Pins are
numbered by their position in the list, drag to reorder, and the colour's *label* travels through to
the front-end so templates can group markers by what a colour means.

The value comes back as a `MultiMap` — a `List<Marker>` plus the shared `MapConfig`. Switching an
existing Single Marker property over does not lose the pin: the Multi converter reads a stored
single-map value as a one-marker list.

See [Accessing & Working with Map Data](https://github.com/ArnoldV/Our.Umbraco.GMaps/wiki/Accessing-&-Working-with-Map-Data).

## Special thanks

Special thanks to [ronaldbarendse](https://github.com/ronaldbarendse) for contributing to this project #h5yr!

Special thanks to [prjseal](https://github.com/prjseal) for the Visual Studio project setup and included demo-site #h5yr!

Special thanks to [robertjf](https://github.com/robertjf) for contributing to this project and setting up the Release Workflow #h5yr!

Special thanks to [arknu](https://github.com/arknu) for migrating to Umbraco 15 #h5yr!

[Google maps icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/google-maps)<a href="https://www.flaticon.com/free-icons/google-maps" title="google maps icons">Google maps icons created by Freepik - Flaticon</a>
