# Accessing & Working with Map Data

The package ships property value converters for both editors, so a map property comes back as a
strongly-typed model rather than a JSON string. Everything lives in the
`Our.Umbraco.GMaps.Models` namespace.

| Property editor | Value type |
| --------------- | ---------- |
| Google Maps Single Marker | `Map` |
| Google Maps Multi Marker | `MultiMap` |

Both converters cache at `PropertyCacheLevel.Element`, so a map inside a block behaves like any
other block property.

## The models

### `Map` — one location

```csharp
public class Map
{
    public Address Address { get; set; }
    public MapConfig MapConfig { get; set; }
}
```

### `MultiMap` — many locations

```csharp
public class MultiMap
{
    public List<Marker> Markers { get; set; }
    public MapConfig MapConfig { get; set; }
}
```

`MapConfig` — zoom, centre point and map type — is shared by every marker, because it describes the
map rather than any one pin.

### `Address`

```csharp
public class Address
{
    public Location Coordinates { get; set; }   // never null
    public string? FullAddress { get; set; }
    public string? FriendlyName { get; set; }
    public string? StreetNumber { get; set; }
    public string? Street { get; set; }
    public string? PostalCode { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
}
```

`FriendlyName` is only populated when **Enable friendly name** is switched on for the Data Type.

Which of the component fields are filled in depends entirely on what Google returned for the place.
A rural address may have no `StreetNumber`; some countries return no `State`. Only `Coordinates` is
guaranteed to be there once a pin has been placed.

### `Marker` — one pin on a multi-marker map

```csharp
public class Marker : Address
{
    public string? Key { get; set; }          // stable identity, survives reordering
    public string? Description { get; set; }
    public string? Color { get; set; }        // hex value from the data type palette
    public string? ColorLabel { get; set; }   // resolved from the *current* palette; not stored
}
```

`Marker` inherits `Address`, so every address member above is available directly on a marker — there
is no nested `Address` property to step through.

`Description` is only populated when **Enable description** is switched on for the Data Type.

`Key` is a stable, client-generated identity that is independent of list position. Use it as the
key when you need to correlate a marker across renders (a legend, a JavaScript payload, an
`id` attribute) — position changes when markers are reordered, `Key` does not. A marker stored
before keys existed is assigned one when the value is read.

### `Location`

```csharp
public class Location
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public bool IsEmpty { get; }                       // both values are 0
    public override string ToString();                 // "51.5074, -0.1278", always invariant
    public static Location Parse(string? latLng);      // "51.5074,-0.1278" -> Location
}
```

`ToString()` formats invariantly, so a Danish or German site does not emit `51,5074, -0,1278` into
JavaScript. Use it rather than string-concatenating the two doubles yourself.

`IsEmpty` is the check for "no pin was ever placed" — 0,0 is in the Atlantic and is never a real
answer in practice.

### `MapConfig`

```csharp
public class MapConfig
{
    public string? ApiKey { get; set; }
    public int Zoom { get; set; }
    public Location CenterCoordinates { get; set; }   // never null
    public string? Style { get; set; }                // map style JSON, or null
    public MapType? MapType { get; set; }
}
```

| Member | Where it comes from |
| ------ | ------------------- |
| `ApiKey` | The Data Type's **Google API Key**, falling back to `GoogleMaps:ApiKey`. Resolved when the value is read, so it is never stale |
| `Zoom` | Saved with the property. A value saved without one falls back to `GoogleMaps:ZoomLevel`, then to `17` |
| `CenterCoordinates` | Saved with the property. The map's centre, which is deliberately allowed to differ from the pin |
| `Style` | The selected SnazzyMaps style's JSON, or the custom map style JSON, resolved from the Data Type when the value is read |
| `MapType` | `Roadmap`, `Satellite`, `Hybrid`, `Terrain` or `StyledMap` |

`ApiKey` and `Style` are **not** stored on the property — they are resolved from configuration on
every read. Changing the key or the style on the Data Type therefore updates every document at once.

> `MapConfig.ApiKey` is the key your front-end needs to render the map. Bear in mind it will appear
> in your page's HTML, so restrict it by HTTP referrer in the Google Cloud console.

## Reading a single map

With ModelsBuilder:

```csharp
@{
    var map = Model.Location;   // a Map, or null when nothing was ever set
}
```

Without:

```csharp
@{
    var map = Model.Value<Map>("location");
}
```

An empty property returns `null`, so guard before use:

```csharp
@if (map is not null && !map.Address.Coordinates.IsEmpty)
{
    <address>
        @if (!string.IsNullOrWhiteSpace(map.Address.FriendlyName))
        {
            <strong>@map.Address.FriendlyName</strong><br />
        }
        @map.Address.FullAddress
    </address>

    <p>
        <a href="https://www.google.com/maps/search/?api=1&amp;query=@map.Address.Coordinates">
            Open in Google Maps
        </a>
    </p>
}
```

Building the address from the components rather than using `FullAddress` — note that each one may
be empty:

```csharp
@{
    var parts = new[]
    {
        $"{map.Address.StreetNumber} {map.Address.Street}".Trim(),
        map.Address.City,
        map.Address.State,
        map.Address.PostalCode,
        map.Address.Country,
    }.Where(part => !string.IsNullOrWhiteSpace(part));
}

<address>@Html.Raw(string.Join("<br />", parts.Select(Html.Encode)))</address>
```

## Reading a multi map

```csharp
@{
    var map = Model.Value<MultiMap>("locations");
}

@if (map is not null && map.Markers.Count > 0)
{
    <ol class="locations">
        @foreach (var marker in map.Markers)
        {
            <li>
                <strong>@(marker.FriendlyName ?? marker.FullAddress)</strong>
                @if (!string.IsNullOrWhiteSpace(marker.Description))
                {
                    <p>@marker.Description</p>
                }
                <span class="coords">@marker.Coordinates</span>
            </li>
        }
    </ol>
}
```

The stored marker order is preserved, so a numbered legend rendered from `map.Markers` matches the
order arranged in the backoffice — and the numbers on the pins in the editor.

`MultiMap.Markers` is never null, so `map.Markers.Count` is safe once `map` itself is non-null.

## Marker colours

Only the hex value is stored against a marker. `ColorLabel` is resolved against the Data Type's
**current** palette when the value is read, so renaming a swatch updates every document at once and
cannot leave stale labels behind.

| Situation | `Color` | `ColorLabel` |
| --------- | ------- | ------------ |
| Colour picked from the palette | the hex value | the swatch's label |
| Swatch renamed on the Data Type | unchanged | the new label |
| Colour later removed from the palette | unchanged | `null` |
| No palette configured, or no colour picked | `null` | `null` |

Because the label travels with the value, group by **meaning** rather than appearance:

```csharp
@foreach (var group in map.Markers.GroupBy(marker => marker.ColorLabel ?? "Other"))
{
    <h3>@group.Key</h3>
    <ul>
        @foreach (var marker in group)
        {
            <li>@marker.FriendlyName</li>
        }
    </ul>
}
```

The stored hex value may or may not carry a leading `#`, depending on how the swatch was defined.
Normalise it before putting it into CSS:

```csharp
@functions {
    string CssColour(string? stored) =>
        string.IsNullOrWhiteSpace(stored) ? "transparent"
        : stored.StartsWith('#') ? stored
        : $"#{stored}";
}

<span class="swatch" style="background:@CssColour(marker.Color)"></span>
```

## Maps inside blocks

A map inside a Block List, Block Grid or rich text block is read exactly like any other block
property:

```csharp
@* Views/Partials/blocklist/Components/locationBlock.cshtml *@
@inherits UmbracoViewPage<BlockListItem<LocationBlock>>
@{
    var map = Model.Content.Value<Map>("map");
}
```

## Iterating every map property on a document

Useful for a debug view, or for a template that does not know its Document Type up front:

```csharp
@{
    var maps = Model.Properties
        .Select(property => new { property.Alias, Map = property.GetValue() as MultiMap })
        .Where(entry => entry.Map is not null);
}
```

## UFM components

The package registers a UFM component under the `gmp` alias, for block labels in the backoffice.
The syntax is `{gmp: propertyAlias.field}`.

| Field | Returns |
| ----- | ------- |
| `friendlyName` | The friendly name of the first (or only) marker |
| `address` | The full address of the first (or only) marker |
| `coordinates` | The first marker's coordinates, as `lat, lng` |
| `count` | The number of markers |
| `names` | Every marker's name (friendly name, falling back to full address), comma separated |
| `first` | The full address of the first marker — the same as `address` |

Every field works against both editors: a single map is treated as a one-marker list, so `count`
returns `1` for a filled-in single map and `0` for an empty one.

```
{gmp: singleMap.friendlyName} — {gmp: singleMap.address}
{gmp: locations.count} locations: {gmp: locations.names}
```

A block whose map property was never filled in renders as empty rather than failing.

## Legacy values

Values written by much older versions of the package are read transparently:

* Umbraco 8-era values stored coordinates and the map centre as `"lat, lng"` strings, and prefixed
  the map type with `google.maps.maptypeid.`
* Some 2.x values stored a null zoom level, which the current `int` cannot represent

A package migration repairs stored values in place on upgrade, and the converters tolerate the old
shapes for values a migration cannot reach — such as those nested inside block editors. Neither
requires anything of your templates.

A stored single-map value read through the **Multi Marker** converter comes back as a one-marker
`MultiMap`, which is what makes switching a property from Single to Multi non-destructive. It is
rewritten in the multi shape the next time an editor saves the document.
