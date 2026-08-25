# Troubleshooting

The property editor reports problems as a notice above the map rather than leaving you with
Google's grey error panel. This page explains each notice and what fixes it.

Anything reported as an error is also logged to the browser console with the raw status and error
object, which is worth checking before anything else.

## API key problems

Three separate things can be wrong with a key, and they have three different fixes.

### "No Google Maps API key is configured"

> No Google Maps API key is configured. Enter one in the Google API Key field above, or set
> `GoogleMaps:ApiKey` in appsettings.json (or user secrets) to use one key across the site.

Nothing to fix but the obvious: no key was found on the Data Type or in configuration.

If you *did* set `GoogleMaps:ApiKey` and still see this, check that it is being loaded — the usual
cause is running the site without the Development environment, so user secrets are never read.

### "Google Maps rejected the API key…"

> Google Maps rejected the API key configured on this datatype. Check that the key is valid, that
> billing is enabled, and that the site is allowed by the key's HTTP referrer restrictions.

The Maps JavaScript API refused the key outright, reported via `gm_authFailure`. The message names
**which** key was refused — the Data Type's own, or the site-wide one from `GoogleMaps:ApiKey` —
because the fix is in a different place for each.

Three things to check, in order:

1. The key is valid and has the **Maps JavaScript API** enabled
2. Billing is enabled on the Google Cloud project. Maps will not render without it
3. The site is allowed by the key's HTTP referrer restrictions — including the hostname the
   *backoffice* is served from, which is easy to forget when it differs from the public site

See Google's [error message reference](https://developers.google.com/maps/documentation/javascript/error-messages)
for the code shown in the browser console.

### "This page already loaded Google Maps with a different API key"

> This page already loaded Google Maps with a different API key. The Maps API allows only one API
> key per page, so this map cannot use its own. Give every map property on this page the same key,
> or set one key in `GoogleMaps:ApiKey` and let them all share it.

The Google Maps JavaScript API is keyed **once per page**, so a document with several map properties
cannot give each one its own key.

Every map on the page offers its key, and the best one wins: a key set on a Data Type beats the
`GoogleMaps:ApiKey` fallback, and within a rank the first offer wins. The maps that lose say so
rather than drawing a broken map. Nothing is wrong with the losing key — it was simply never tried.

The fix is to stop the page needing two keys: either give every map Data Type used on that Document
Type the same key, or — simpler — clear the **Google API Key** field on all of them and set one key
in `GoogleMaps:ApiKey`.

## Geocoding errors

Geocoding is what turns a typed address or coordinate pair into a location. It runs when an editor
types coordinates into the search box, when the pin is dropped and its address is looked up, and
when the property mapping **Look up from address fields** button is used.

| Message | Cause | Fix |
| --- | --- | --- |
| Google refused the geocoding request… | `REQUEST_DENIED`. The **Geocoding API** is not enabled for the key, or the key's HTTP referrer restrictions exclude this site | Enable the Geocoding API for the project and allow the site on the key |
| The Google API key is over its geocoding quota… | `OVER_QUERY_LIMIT` | Check quota and billing for the key in the Google Cloud console |
| No location found for "…" | `ZERO_RESULTS`. Google genuinely has no match for that address | Check the address. This one is informational, not an error |
| Google rejected the geocoding request… as invalid | `INVALID_REQUEST` | Usually an empty or malformed address. Check what the mapped properties actually contain |
| Could not reach the Google geocoding service | `UNKNOWN_ERROR`, or a network failure | Transient. Try again |
| Geocoding failed (…) | Any other status | Check the browser console for the error Google reported |

> The **Geocoding API** is a separate API from the Maps JavaScript API and the Places API. A key that
> renders the map happily can still be refused for geocoding. If the map draws but lookups fail,
> this is almost always why.

If the search box suggests no addresses at all, it is the **Places API (New)** that is missing from
the key rather than Geocoding.

## Property mapping

### A warning about an unknown alias

Property mapping pairs a map field with the **alias** of another property. Aliases are typed rather
than picked, because a Data Type does not know which Document Types will end up using it — so a typo,
or a Data Type reused on a Document Type that has no such property, is only detectable at the point
the property is rendered.

An alias that does not exist is ignored, and the property shows a warning naming it:

> Property mapping ignores "…" — no property with that alias exists here.

Either correct the alias on the Data Type, or accept the warning if the Data Type is deliberately
shared across Document Types that do not all have the property.

Mapping the map property to its own alias gets its own warning, because a map cannot map to itself:

> Property mapping ignores "…" — a map cannot map to itself.

### The pin does not move when I edit the address fields

Lookups deliberately never run when a document is opened, so an existing hand-placed pin is never
moved and opening a document never marks it dirty.

Use the **Look up from address fields** button, or switch on **Look up automatically** on the Data
Type. Automatic lookup is off by default because it consumes Geocoding API quota on every edit.

### Nothing is written back to my properties

Check the **Direction** on the Data Type: writing out needs *Map → Properties* or *Both directions*.

Values are only written when they actually differ, so panning or zooming does not touch them, and
dragging the pin updates only the coordinates. Clearing the map with the *Clear Marker* property
action does not clear the mapped properties.

If latitude and longitude land in a text property as `51.5074` and `-0.1278` and you wanted them
together, map **Coordinates (lat,lng)** instead of the two separate fields.

## Multi marker

### "This property is misconfigured: the minimum number of markers is greater than the maximum"

Both limits are being ignored, because no number of markers could satisfy them. Fix **Minimum
markers** and **Maximum markers** on the Data Type. `0` or empty in the maximum means unlimited.

### "This marker's colour is no longer in the palette"

The marker's stored hex value is not one of the swatches currently defined under **Marker colours**
on the Data Type. The marker keeps its colour, but `ColorLabel` comes back `null` on the front-end,
so anything grouping by label will drop it into whatever fallback bucket you wrote.

Either add the colour back to the palette, or pick a current one for the marker.

Renaming a swatch is safe — only the hex value is stored, and the label is resolved against the
current palette on every read, so renaming updates every document at once.

### The colour control is missing from the marker drawer

**Marker colours** is empty on the Data Type. The control is hidden rather than shown with no
choices.

## Front-end rendering

### The map renders in the backoffice but not on my site

The package draws the map in the backoffice only — rendering on your website is up to your
templates. See [Rendering & Styling Maps on the front end](Rendering-&-Styling-Maps-on-the-front-end.md).

### `MapConfig.ApiKey` is empty on the front end

`ApiKey` is resolved on read: the Data Type's **Google API Key** field, falling back to
`GoogleMaps:ApiKey`. If both are empty you get nothing.

Note that for a **Single Marker** Data Type an `apikey` entry saved as an empty string overrides the
site-wide key rather than falling back to it. If `GoogleMaps:ApiKey` is set but `MapConfig.ApiKey`
comes back empty, that is the cause — clearing and re-saving the Data Type, or setting the key on
the Data Type explicitly, resolves it.

### The stored style JSON does nothing

`MapConfig.Style` is a JSON **string**. It has to be `JSON.parse`d before being passed as the map's
`styles` option.

Also check that you are not passing a `mapId`: cloud-based map styling and the `styles` option are
mutually exclusive, and a `mapId` wins.

### The map is centred somewhere unexpected

The centre point is stored separately from the pin, on purpose — that is how an editor frames a pin
off to one side. `MapConfig.CenterCoordinates` is empty when the editor never panned the map, so
fall back to the pin's coordinates (single) or `fitBounds` over the markers (multi).

If maps saved by an older version of the package are centred on the Data Type's default location
rather than where they were left, that was a bug fixed in 17.3.0 / 18.2.0: any save that did not pan
the map silently discarded the centre. Documents already saved that way are not repaired
automatically and need setting again.

### Coordinates render as `51,5074, -0,1278`

Something is formatting the doubles under the site's current culture. Use
`Location.ToString()`, which formats invariantly, rather than concatenating `Latitude` and
`Longitude` yourself.

## Upgrading

### "The JSON value could not be converted to System.Int32"

A value written by a 2.x release stored a null zoom level. This took the whole document down on
read ([#197](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/197)).

Fixed in 17.3.0 / 18.2.0: a package migration repairs stored values in place on upgrade, and reading
tolerates the old shape for values a migration cannot reach, such as those nested inside block
editors. If you are seeing this, upgrade.

### Umbraco 8-era maps lost their map type

Values written by GMaps 1.x on Umbraco 8 stored coordinates as `"lat, lng"` strings and prefixed the
map type with `google.maps.maptypeid.`. Coordinates survived the upgrade but the map type did not
([#165](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/165)).

Fixed in 17.3.0 / 18.2.0 by the same migration. It only rewrites values that need it, so it is safe
to run over content that is already correct.

### `Our.Umbraco.GMaps.Core` cannot be found

As of version 5 there is no separate Core package. Replace every reference to
`Our.Umbraco.GMaps.Core` with `Our.Umbraco.GMaps`.

### `MapConfig.Zoom` no longer compiles

As of version 2.1.0 it is an `int` rather than a `string`.

## Still stuck?

* Google's [Maps JavaScript API error messages](https://developers.google.com/maps/documentation/javascript/error-messages)
* [Open an issue](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues) — the browser console output
  and the Data Type configuration are the two most useful things to include
