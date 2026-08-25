# Change log

Notable changes to Our.Umbraco.GMaps. See [Breaking changes](#breaking-changes) at the foot of the
page for what to watch for when upgrading across a major.

Since Umbraco 17, one package flavour is built per supported Umbraco major from the same commit, so
a change usually lands in two versions at once — `17.x.y` and `18.x.y`. Both are listed against each
entry. See [Supporting Umbraco 17 and Umbraco 18](https://github.com/ArnoldV/Our.Umbraco.GMaps/wiki/Multi-Version-Support).

> This page is mirrored at [Change log](https://github.com/ArnoldV/Our.Umbraco.GMaps/wiki/Change-Log) in the wiki, which is
> where the rest of the documentation lives. Update both when adding an entry.

## 17.3.1 / 18.2.1 — unreleased

* Fixed — a datatype whose **Google API Key** field was filled in and then cleared no longer blanks
  out the site-wide `GoogleMaps:ApiKey` on the front end. An empty field is not a key, and now falls
  back like any other missing value. Both property value converters resolve the key through one
  helper so they cannot drift apart again

## 17.3.0 / 18.2.0

* New **Google Maps Multi Marker** property editor — many pins on one shared map, with per-marker
  friendly name, description and a datatype-configured colour palette, drag-to-reorder, and
  minimum/maximum marker counts. Resolves
  [#27](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/27)
* Property mapping — a map can read its location from, and write its resolved address back to, other
  properties on the same content item or block. Geocoding failures now report the actual cause
  instead of "no location found"
* The datatype's **Default Location** is now picked on a map, with a search box, and the zoom you
  leave it at becomes the datatype's default zoom
* Maps now say what is wrong with a key instead of showing Google's grey error panel: no key
  configured, the key Google refused, or a key this page cannot use because the Maps API allows only
  one key per page
* Fixed — an API key set on a datatype is no longer ignored when `GoogleMaps:ApiKey` is also
  configured, and a key corrected in the datatype configuration now takes effect without reloading
  the backoffice
* Fixed — saving a document no longer overwrites the map's stored centre point with the configured
  default location. Previously any save that did not pan the map (a zoom change, a friendly-name
  edit, or saving an unrelated property) silently discarded the centre. Documents already saved with
  the wrong centre are not repaired automatically and need setting again
* Fixed — values saved by older versions of the package no longer break the site. A stored
  `"zoom": null` threw "The JSON value could not be converted to System.Int32" and took the whole
  document down ([#197](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/197)), and Umbraco 8
  values kept their coordinates but lost their map type
  ([#165](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/165)). A migration repairs the stored
  values in place, and reading tolerates the old shapes for values a migration cannot reach, such as
  those nested inside block editors

## 17.2.1 / 18.1.1

* Fixed — the pre-4.0 `customstyle` flag is read again, so map styles configured before that release
  are no longer dropped ([#264](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/264))

## 18.0.0

* Umbraco 18 support. Umbraco 17 and 18 are now built from the same branch, one package flavour each
  (`17.x` / `18.x`)

## 17.0.1

* Now using the new Google Places API
* Adds UFM components for rendering the address and coordinates in block element labels

## 17.0.0

* Umbraco 17 support. The release version is aligned to the Umbraco major from here on

## 5.0.0

* Rebuilt to target the Umbraco 16 Management APIs. The uUI framework is now an RCL

> See [Breaking changes](#breaking-changes).

## 4.0.0

* Rebuilt with Umbraco's uUI, targeting Umbraco 15+

## 3.0.0

* Dropped support for Umbraco 8 and 9, allowing the codebase to be cleaned up
* Now a Razor Class Library

## 2.1.3

* Better support for installation on Umbraco 11

## 2.1.0

* `MapConfig.Zoom` is now an `int` as it should be (was a `string`)

> See [Breaking changes](#breaking-changes).

## 2.0.7

* The map can be re-centred via editor actions
* A set of coordinates can now be typed directly into the search box

## Breaking changes

### Version 5.0.0 — no more `Our.Umbraco.GMaps.Core`

The `Our.Umbraco.GMaps.Core` package no longer exists. Replace every reference to
`Our.Umbraco.GMaps.Core` with `Our.Umbraco.GMaps`.

### Version 2.1.0 — `MapConfig.Zoom` is an `int`

It was a `string`. Code that assigned or compared it as a string needs updating.

## Supported Umbraco versions

| Umbraco | Package version |
| ------- | --------------- |
| 18      | `18.x`          |
| 17      | `17.x`          |
| 14 - 16 | `5.x`           |
| 10 - 13 | `3.0.5`         |
