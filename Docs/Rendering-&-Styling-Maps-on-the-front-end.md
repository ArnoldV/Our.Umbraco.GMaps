# Rendering & Styling Maps on the front end

The package draws the map in the **backoffice**. On your website you own the rendering, and the
stored value gives you everything you need to reproduce what the editor set up: the pin (or pins),
the centre, the zoom, the map type and the style.

This page shows one way to do it. Nothing here is prescriptive — if you would rather render a static
image, a list of addresses, or hand the value to your own JavaScript, the same values apply.

Read [Accessing & Working with Map Data](Accessing-&-Working-with-Map-Data.md) first for what the
models contain.

## Before you start

**Your front-end key is public.** `MapConfig.ApiKey` ends up in your page's HTML, where anyone can
read it. Restrict it by HTTP referrer in the Google Cloud console, and give it only the APIs your
site actually needs — usually just the Maps JavaScript API. The Geocoding and Places APIs are used
by the backoffice editor, not by a rendered map.

**One key per page still applies.** The Maps JavaScript API is keyed once per page. If a page
renders several maps, load the API once and share it, as the partial below does.

**Only load Maps when there is a map to draw.** The API is a large download. Render the script tag
from inside the `@if` that checks the property has a value.

## Rendering a single map

A partial that renders one `Map`:

```csharp
@* Views/Partials/GMap.cshtml *@
@using Our.Umbraco.GMaps.Models
@model Map

@if (Model is null || Model.Address.Coordinates.IsEmpty)
{
    return;
}

@{
    var elementId = $"gmap-{Guid.NewGuid():N}";

    // The enum names are PascalCase; Google wants lowercase ids, and a styled map is a
    // roadmap with a style applied.
    var mapTypeId = Model.MapConfig.MapType switch
    {
        MapType.Satellite => "satellite",
        MapType.Hybrid => "hybrid",
        MapType.Terrain => "terrain",
        _ => "roadmap",
    };

    var centre = Model.MapConfig.CenterCoordinates.IsEmpty
        ? Model.Address.Coordinates
        : Model.MapConfig.CenterCoordinates;

    var options = new
    {
        elementId,
        centre = new { lat = centre.Latitude, lng = centre.Longitude },
        pin = new { lat = Model.Address.Coordinates.Latitude, lng = Model.Address.Coordinates.Longitude },
        title = Model.Address.FriendlyName ?? Model.Address.FullAddress,
        zoom = Model.MapConfig.Zoom,
        mapTypeId,
        styles = Model.MapConfig.Style,   // raw JSON string, or null
    };
}

<div id="@elementId" class="gmap" style="height:400px"></div>

<script type="application/json" class="gmap-options">@Html.Raw(Json.Serialize(options))</script>
```

Note what the centre falls back to: an editor who never panned the map leaves `CenterCoordinates`
empty, and centring on the pin is the sensible answer. The centre is deliberately allowed to differ
from the pin — that is how an editor puts the pin off to one side of the frame.

`Style` is a raw JSON **string** as SnazzyMaps and the Google style editor produce it. Pass it
straight through and `JSON.parse` it on the client; do not try to model it in C#.

## Loading the Maps API once

```html
<script>
window.initGMaps = function () {
    document.querySelectorAll('script.gmap-options').forEach(function (node) {
        var options = JSON.parse(node.textContent);
        var element = document.getElementById(options.elementId);
        if (!element) return;

        var map = new google.maps.Map(element, {
            center: options.centre,
            zoom: options.zoom,
            mapTypeId: options.mapTypeId,
            styles: options.styles ? JSON.parse(options.styles) : undefined
        });

        new google.maps.Marker({
            position: options.pin,
            map: map,
            title: options.title || undefined
        });
    });
};
</script>

<script async
        src="https://maps.googleapis.com/maps/api/js?key=@Model.MapConfig.ApiKey&callback=initGMaps">
</script>
```

> `google.maps.Marker` is deprecated in favour of `AdvancedMarkerElement`, but advanced markers need
> a **Map ID** and a Map ID's cloud-based styling is mutually exclusive with the `styles` option.
> If you use the stored SnazzyMaps or custom style JSON, stay on `Marker`. If you would rather style
> your maps in the Google Cloud console, use `AdvancedMarkerElement` with a `mapId` and ignore
> `MapConfig.Style`.

## Rendering a multi map

The markers share one `MapConfig`, so there is one map and many pins.

```csharp
@* Views/Partials/GMultiMap.cshtml *@
@using Our.Umbraco.GMaps.Models
@model MultiMap

@if (Model is null || Model.Markers.Count == 0)
{
    return;
}

@{
    var elementId = $"gmap-{Guid.NewGuid():N}";

    var options = new
    {
        elementId,
        zoom = Model.MapConfig.Zoom,
        centre = new
        {
            lat = Model.MapConfig.CenterCoordinates.Latitude,
            lng = Model.MapConfig.CenterCoordinates.Longitude,
        },
        // An editor who never panned the map left no centre; fit to the pins instead.
        fitToMarkers = Model.MapConfig.CenterCoordinates.IsEmpty,
        markers = Model.Markers.Select((marker, index) => new
        {
            key = marker.Key,
            label = (index + 1).ToString(),
            title = marker.FriendlyName ?? marker.FullAddress,
            description = marker.Description,
            colour = CssColour(marker.Color),
            colourLabel = marker.ColorLabel,
            position = new { lat = marker.Coordinates.Latitude, lng = marker.Coordinates.Longitude },
        }),
        styles = Model.MapConfig.Style,
    };
}

<div id="@elementId" class="gmap" style="height:500px"></div>
<script type="application/json" class="gmultimap-options">@Html.Raw(Json.Serialize(options))</script>

@functions {
    // The stored hex may or may not carry a leading #.
    static string CssColour(string? stored) =>
        string.IsNullOrWhiteSpace(stored) ? "#ea4335"
        : stored.StartsWith('#') ? stored
        : $"#{stored}";
}
```

Colouring the pins, and numbering them so they match the backoffice:

```javascript
function pinIcon(colour, label) {
    return {
        path: 'M12 0C7 0 3 4 3 9c0 6.6 9 15 9 15s9-8.4 9-15c0-5-4-9-9-9z',
        fillColor: colour,
        fillOpacity: 1,
        strokeColor: 'rgba(0,0,0,.35)',
        strokeWeight: 1,
        scale: 1.6,
        anchor: new google.maps.Point(12, 24),
        labelOrigin: new google.maps.Point(12, 9)
    };
}

var bounds = new google.maps.LatLngBounds();
var infoWindow = new google.maps.InfoWindow();

options.markers.forEach(function (item) {
    var marker = new google.maps.Marker({
        position: item.position,
        map: map,
        title: item.title || undefined,
        icon: pinIcon(item.colour, item.label),
        label: { text: item.label, color: '#fff', fontSize: '12px' }
    });

    marker.addListener('click', function () {
        infoWindow.setContent('<strong>' + item.title + '</strong>' +
            (item.description ? '<p>' + item.description + '</p>' : ''));
        infoWindow.open(map, marker);
    });

    bounds.extend(item.position);
});

if (options.fitToMarkers) {
    map.fitBounds(bounds);
}
```

### A legend that matches the map

`Markers` comes back in the order the editor arranged it, and `ColorLabel` carries the *meaning* of
each colour, so the legend is plain Razor:

```csharp
<ol class="map-legend">
    @foreach (var marker in Model.Markers)
    {
        <li>
            <span class="swatch" style="background:@CssColour(marker.Color)"></span>
            <strong>@(marker.FriendlyName ?? marker.FullAddress)</strong>
            @if (marker.ColorLabel is not null)
            {
                <span class="tag">@marker.ColorLabel</span>
            }
        </li>
    }
</ol>
```

Group the legend by `ColorLabel` when the colours mean categories:

```csharp
@foreach (var group in Model.Markers.GroupBy(marker => marker.ColorLabel ?? "Other"))
{
    <h3>@group.Key</h3>
    <ul>
        @foreach (var marker in group)
        {
            <li>@(marker.FriendlyName ?? marker.FullAddress)</li>
        }
    </ul>
}
```

## Styling

### SnazzyMaps and custom styles

Whichever the editor chose on the Data Type, `MapConfig.Style` holds the resulting style JSON as a
string — the SnazzyMaps style's JSON if one was selected, otherwise the custom JSON typed into the
Data Type. It is resolved from the Data Type on every read, so changing the style updates every
document at once, with no republish.

Pass it as the map's `styles` option:

```javascript
styles: options.styles ? JSON.parse(options.styles) : undefined
```

`MapType` is `StyledMap` when the editor picked **Styled**. Google has no `styled_map` map type id,
so render it as `roadmap` and let the `styles` option do the work — which is what the `switch` in
the partial above does.

### Without JavaScript

The stored value is enough for a static map image, which costs one Static Maps API request and no
client-side JavaScript:

```csharp
@{
    var pin = Model.Address.Coordinates;
    var src = $"https://maps.googleapis.com/maps/api/staticmap" +
              $"?center={pin}&zoom={Model.MapConfig.Zoom}&size=600x400" +
              $"&markers=color:red%7C{pin}&key={Model.MapConfig.ApiKey}";
}

<img src="@src" alt="Map of @Model.Address.FullAddress" width="600" height="400" loading="lazy" />
```

`Location.ToString()` formats invariantly, so this is safe on a site running under a culture that
uses a comma as the decimal separator.

The Static Maps API is a **separate** API and must be enabled for the key. It is a different key
restriction model too (IP rather than referrer), so this usually wants its own key rather than the
one from `MapConfig.ApiKey`.

### No map at all

Plenty of pages want the address and a link, not an embedded map. `Location.ToString()` produces
exactly what Google Maps' URL scheme expects:

```csharp
<a href="https://www.google.com/maps/search/?api=1&amp;query=@Model.Address.Coordinates">
    @Model.Address.FullAddress
</a>

<a href="https://www.google.com/maps/dir/?api=1&amp;destination=@Model.Address.Coordinates">
    Directions
</a>
```

This costs nothing, needs no API key, and is often the better answer on mobile — the links open the
Google Maps app.

## Structured data

The address components make a clean `schema.org` `Place`, which is worth emitting whether or not you
draw a map:

```csharp
@{
    // A dictionary rather than an anonymous type, because "@context" and "@type" are not
    // legal C# member names.
    var place = new Dictionary<string, object?>
    {
        ["@context"] = "https://schema.org",
        ["@type"] = "Place",
        ["name"] = Model.Address.FriendlyName,
        ["address"] = new Dictionary<string, object?>
        {
            ["@type"] = "PostalAddress",
            ["streetAddress"] = $"{Model.Address.StreetNumber} {Model.Address.Street}".Trim(),
            ["addressLocality"] = Model.Address.City,
            ["addressRegion"] = Model.Address.State,
            ["postalCode"] = Model.Address.PostalCode,
            ["addressCountry"] = Model.Address.Country,
        },
        ["geo"] = new Dictionary<string, object?>
        {
            ["@type"] = "GeoCoordinates",
            ["latitude"] = Model.Address.Coordinates.Latitude,
            ["longitude"] = Model.Address.Coordinates.Longitude,
        },
    };
}

<script type="application/ld+json">@Html.Raw(Json.Serialize(place))</script>
```

## Demo sites

Both demo sites in the repository render every field of both models, which is the quickest way to
see what a value actually contains:

| View | Shows |
| ---- | ----- |
| `Our.Umbraco.GMaps.UmbracoV18/Views/Test.cshtml` | Every `Map` member, plus maps inside blocks |
| `Our.Umbraco.GMaps.UmbracoV18/Views/MultiMapTests.cshtml` | Every `MultiMap` and `Marker` member, including colours and keys |

Run one with:

```bash
dotnet run --project Our.Umbraco.GMaps.UmbracoV18
```

The backoffice login for both demo sites comes from `Umbraco:CMS:Unattended` in each site's
`appsettings.json`. See [CONTRIBUTING.md](../CONTRIBUTING.md) for the rest of the local setup.
