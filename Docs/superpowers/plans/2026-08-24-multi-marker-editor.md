# Multi Marker Editor Implementation Plan (Phases 3–4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `Google Maps Multi Marker` — a second property editor holding many pins on one shared map — closing [#27](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/27).

**Architecture:** A new editor alongside the existing one, built on the `core/` + `maps/` + `controllers/` layers extracted in phases 0–2. The map is the primary surface; marker details are edited in Umbraco's `sidebar` modal so the map stays visible. All marker-list logic is pure functions in `core/` and unit tested; the element is a thin view over them.

**Tech Stack:** TypeScript, Lit 3, Umbraco 18 backoffice, Vite, `@open-wc/testing` + `@web/test-runner` (Playwright Chromium), .NET 10, xUnit.

**Spec:** [`Docs/superpowers/specs/2026-08-24-multi-marker-design.md`](../specs/2026-08-24-multi-marker-design.md)

**Predecessor:** [`2026-08-24-multi-marker-shared-core.md`](2026-08-24-multi-marker-shared-core.md) (phases 0–2, complete). This plan consumes its output and must not regress its 91 tests.

## Global Constraints

- Client work is in `Our.Umbraco.GMaps/Client/`; server work in `Our.Umbraco.GMaps/`. Paths are relative to those roots as marked.
- **`core/` must never import from `maps/`, `controllers/`, or any Google package.** Verify with:
  `grep -rnE "^\s*(import|export).*(from '\.\./(maps|controllers)|googlemaps|@types/google)" src/core/*.ts && echo VIOLATION || echo clean`
- **The Single Marker editor is not to be touched.** Its alias `Our.Umbraco.GMaps.Single`, UI alias `GMaps.PropertyEditorUi.SingleMap`, value shape and PVC return type are a published contract. The only shared files this plan edits are `types.ts`, `core/value.ts`, `bundle.manifests.ts` and the UFM component — all additively.
- New editor aliases, exactly: schema `Our.Umbraco.GMaps.Multi`, UI `GMaps.PropertyEditorUi.MultiMap`, modal `GMaps.Modal.MarkerDrawer`, element tag `gmaps-multi-marker`.
- Config aliases, exactly: `apikey`, `location`, `zoom`, `maptype`, `mapstyle`, `hideMap`, `minNumber`, `maxNumber`, `markerColors`, `enableDescription`. **No `propertyMapping`, no `enableFriendlyName`** — friendly name is always on for multi.
- `maxNumber` of `0` or empty means unlimited. `minNumber > maxNumber` logs a console warning naming the property and treats both as unlimited.
- `markerColors` is edited with `Umb.PropertyEditorUi.ColorSwatchesEditor` and yields `Array<{ label: string; value: string }>`. An empty palette hides the colour control entirely.
- **`color` stores the hex value only.** The PVC resolves `ColorLabel` from the datatype's current palette at render time.
- Existing C# models carry all three of `[DataMember]`, Newtonsoft `[JsonProperty]` and `System.Text.Json` `[JsonPropertyName]`. New models follow that convention exactly — see `Models/Address.cs`.
- The client bundle is shared by the Umbraco 17 and 18 flavours. No conditional client code.
- `tsconfig.json` has `strict`, `noUnusedLocals`, `noUnusedParameters`. Unused imports fail `npm run build`.
- **The editor element file is CRLF.** So are most files under `Client/src`. If you edit with a script, preserve line endings — a silent LF conversion makes the whole file read as changed. Check with `grep -c $'\r' <file>`.
- Commit after every task. Branch `feature/27-multi-marker-editor`.

## File structure

**Client — created:**

| File | Responsibility |
|---|---|
| `src/core/marker-collection.ts` + `.test.ts` | Pure list transforms: add, remove, update, move, limits |
| `src/multi-marker/marker-drawer/marker-drawer.token.ts` | Modal token + its data/value contract |
| `src/multi-marker/marker-drawer/marker-drawer.element.ts` | The sidebar drawer UI |
| `src/multi-marker/marker-drawer/marker-drawer.element.test.ts` | Drawer submit/cancel behaviour |
| `src/multi-marker/multi-marker-editor.element.ts` | Map-first editor: map, pins, chips, search |
| `src/multi-marker/multi-marker-editor.element.test.ts` | Editor behaviour over `FakeMapsApi` |
| `src/multi-marker/multi-marker-property-value-preset.ts` | Seeds an empty marker list + default centre |
| `src/multi-marker/manifest.ts` | Editor UI, preset, modal and action manifests |
| `src/multi-marker/actions/clear/clear-markers-property-action.api.ts` | Clear all markers |
| `src/multi-marker/actions/reset/reset-property-action.api.ts` | Reset the map view to the loaded value |

**Client — modified (additively):**

| File | Change |
|---|---|
| `src/types.ts` | `Marker`, `MultiMap`, `MarkerColor`; export the existing `MapConfig` |
| `src/core/value.ts` + `.test.ts` | `buildMultiMapValue`, `readMultiMapValue` (incl. legacy single) |
| `src/bundle.manifests.ts` | Register the multi-marker manifests |
| `src/ufm/elements/gmap-value.element.ts` | Handle multi values; fix the valueless-block crash |

**Server — created:**

| File | Responsibility |
|---|---|
| `Models/Marker.cs` | `Marker : Address` + `Key`, `Description`, `Color`, `ColorLabel` |
| `Models/MultiMap.cs` | `IEnumerable<Marker> Markers` + `MapConfig MapConfig` |
| `PropertyEditors/GMapsMultiDataEditor.cs` | The data editor |
| `PropertyValueConverter/MultiMapPropertyValueConverter.cs` | Returns `MultiMap`; resolves key, style and colour labels |
| `../Our.Umbraco.GMaps.Tests/` | xUnit project covering the new PVC |

---

## Task 1: `Marker` and `MultiMap` models, with a test project

The repo has no .NET tests. The Multi PVC branches on legacy data, datatype config and colour palettes, which is exactly the kind of logic that rots silently — so the project arrives with the models rather than after them.

**Files:**
- Create: `Our.Umbraco.GMaps/Models/Marker.cs`
- Create: `Our.Umbraco.GMaps/Models/MultiMap.cs`
- Create: `Our.Umbraco.GMaps.Tests/Our.Umbraco.GMaps.Tests.csproj`
- Create: `Our.Umbraco.GMaps.Tests/Models/MultiMapSerialisationTests.cs`
- Modify: `Our.Umbraco.GMaps.slnx`

**Interfaces:**
- Consumes: `Address`, `MapConfig` from `Our.Umbraco.GMaps.Models`.
- Produces:
  - `Our.Umbraco.GMaps.Models.Marker : Address` with `string? Key`, `string? Description`, `string? Color`, `string? ColorLabel`
  - `Our.Umbraco.GMaps.Models.MultiMap` with `List<Marker> Markers` and `MapConfig MapConfig`

- [ ] **Step 1: Create the test project**

```bash
cd /Users/gandalf/Source/GitHub/Our.Umbraco.GMaps
dotnet new xunit -o Our.Umbraco.GMaps.Tests -f net10.0
dotnet add Our.Umbraco.GMaps.Tests reference Our.Umbraco.GMaps/Our.Umbraco.GMaps.csproj
```

Then add it to `Our.Umbraco.GMaps.slnx` inside the `/Package/` folder element:

```xml
    <Project Path="Our.Umbraco.GMaps.Tests/Our.Umbraco.GMaps.Tests.csproj" />
```

- [ ] **Step 2: Write the failing test**

Create `Our.Umbraco.GMaps.Tests/Models/MultiMapSerialisationTests.cs`:

```csharp
using System.Text.Json;
using Our.Umbraco.GMaps.Models;

namespace Our.Umbraco.GMaps.Tests.Models;

public class MultiMapSerialisationTests
{
    // The backoffice writes camel/snake-cased JSON; the models must round-trip it
    // byte-for-byte or documents load dirty.
    private const string StoredJson = """
    {
      "markers": [
        {
          "key": "8f3c1d2e-0000-4000-8000-000000000001",
          "coordinates": { "lat": -37.834, "lng": 144.926 },
          "full_address": "88 Dock Rd, Port Melbourne VIC 3207",
          "friendlyName": "Warehouse",
          "streetNumber": "88",
          "street": "Dock Rd",
          "city": "Port Melbourne",
          "state": "Victoria",
          "postalcode": "3207",
          "country": "Australia",
          "description": "Deliveries 7am-3pm, gate 4",
          "color": "#2d7ef7"
        }
      ],
      "mapconfig": {
        "zoom": 12,
        "maptype": "roadmap",
        "centerCoordinates": { "lat": -37.8136, "lng": 144.9631 }
      }
    }
    """;

    [Fact]
    public void Deserialises_a_stored_multi_map()
    {
        var model = JsonSerializer.Deserialize<MultiMap>(StoredJson);

        Assert.NotNull(model);
        var marker = Assert.Single(model!.Markers);
        Assert.Equal("8f3c1d2e-0000-4000-8000-000000000001", marker.Key);
        Assert.Equal("Warehouse", marker.FriendlyName);
        Assert.Equal("88 Dock Rd, Port Melbourne VIC 3207", marker.FullAddress);
        Assert.Equal("Port Melbourne", marker.City);
        Assert.Equal("Deliveries 7am-3pm, gate 4", marker.Description);
        Assert.Equal("#2d7ef7", marker.Color);
        Assert.Equal(-37.834, marker.Coordinates.Latitude, 6);
        Assert.Equal(12, model.MapConfig.Zoom);
        Assert.Equal(MapType.Roadmap, model.MapConfig.MapType);
    }

    [Fact]
    public void Marker_fields_are_flat_not_nested_under_address()
    {
        // The design stores marker fields flat: Marker inherits Address rather
        // than owning one. A nested shape would silently deserialise to nulls.
        var json = JsonSerializer.Serialize(new Marker { City = "Melbourne" });

        Assert.Contains("\"city\":\"Melbourne\"", json);
        Assert.DoesNotContain("\"address\"", json);
    }

    [Fact]
    public void ColorLabel_is_resolved_not_stored()
    {
        // The palette can be renamed, so only the hex value is persisted; the
        // label is attached by the PVC at render time.
        var json = JsonSerializer.Serialize(new Marker { Color = "#2d7ef7", ColorLabel = "Logistics" });

        Assert.Contains("#2d7ef7", json);
        Assert.DoesNotContain("Logistics", json);
    }

    [Fact]
    public void An_empty_multi_map_has_an_empty_marker_list_not_null()
    {
        var model = JsonSerializer.Deserialize<MultiMap>("""{"mapconfig":{"zoom":12}}""");

        Assert.NotNull(model);
        Assert.Empty(model!.Markers);
    }
}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `dotnet test Our.Umbraco.GMaps.Tests`
Expected: FAIL — `Marker` and `MultiMap` do not exist.

- [ ] **Step 4: Create the models**

Create `Our.Umbraco.GMaps/Models/Marker.cs`:

```csharp
using Newtonsoft.Json;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models;

/// <summary>
/// One pin on a multi-marker map. Inherits <see cref="Address"/> so the stored
/// JSON stays flat and every existing address member is reused.
/// </summary>
public class Marker : Address
{
    /// <summary>
    /// Stable client-generated identity. Reordering and drawer editing both need
    /// it; index-based identity breaks as soon as a marker moves.
    /// </summary>
    [DataMember(Name = "key")]
    [JsonProperty("key")]
    [JsonPropertyName("key")]
    public string? Key { get; set; }

    [DataMember(Name = "description")]
    [JsonProperty("description")]
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>The hex value from the datatype's palette. The label is not stored.</summary>
    [DataMember(Name = "color")]
    [JsonProperty("color")]
    [JsonPropertyName("color")]
    public string? Color { get; set; }

    /// <summary>
    /// Resolved from the datatype's *current* palette by the property value
    /// converter, so renaming a swatch does not leave stale labels in content.
    /// Null when the colour is no longer in the palette.
    /// </summary>
    [System.Text.Json.Serialization.JsonIgnore]
    [Newtonsoft.Json.JsonIgnore]
    [IgnoreDataMember]
    public string? ColorLabel { get; set; }
}
```

Create `Our.Umbraco.GMaps/Models/MultiMap.cs`:

```csharp
using Newtonsoft.Json;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models;

/// <summary>
/// Many markers sharing one map configuration. Zoom, centre point and map type
/// belong to the map, not to each pin.
/// </summary>
public class MultiMap
{
    [DataMember(Name = "markers")]
    [JsonProperty("markers")]
    [JsonPropertyName("markers")]
    public List<Marker> Markers { get; set; } = [];

    [DataMember(Name = "mapconfig")]
    [JsonProperty("mapconfig")]
    [JsonPropertyName("mapconfig")]
    public MapConfig MapConfig { get; set; } = new MapConfig();
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `dotnet test Our.Umbraco.GMaps.Tests`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add Our.Umbraco.GMaps/Models/Marker.cs Our.Umbraco.GMaps/Models/MultiMap.cs \
        Our.Umbraco.GMaps.Tests/ Our.Umbraco.GMaps.slnx
git commit -m "feat: add Marker and MultiMap models with a test project"
```

---

## Task 2: The Multi data editor and property value converter

**Files:**
- Create: `Our.Umbraco.GMaps/PropertyEditors/GMapsMultiDataEditor.cs`
- Create: `Our.Umbraco.GMaps/PropertyValueConverter/MultiMapPropertyValueConverter.cs`
- Create: `Our.Umbraco.GMaps.Tests/PropertyValueConverter/MultiMapPropertyValueConverterTests.cs`

**Interfaces:**
- Consumes: `Marker`, `MultiMap` (Task 1); `GoogleMaps` options, `MapStyle` — see `PropertyValueConverter/SingleMapPropertyValueConverter.cs` for the established shape of both.
- Produces:
  - `GMapsMultiDataEditor` with `internal const string EditorAlias = "Our.Umbraco.GMaps.Multi"` and `internal const string UiEditorAlias = "GMaps.PropertyEditorUi.MultiMap"`
  - `MultiMapPropertyValueConverter` returning `MultiMap`

- [ ] **Step 1: Write the failing tests**

Create `Our.Umbraco.GMaps.Tests/PropertyValueConverter/MultiMapPropertyValueConverterTests.cs`:

```csharp
using Microsoft.Extensions.Options;
using Moq;
using Our.Umbraco.GMaps.Configuration;
using Our.Umbraco.GMaps.Models;
using Our.Umbraco.GMaps.PropertyValueConverter;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.PublishedContent;

namespace Our.Umbraco.GMaps.Tests.PropertyValueConverter;

public class MultiMapPropertyValueConverterTests
{
    private static MultiMapPropertyValueConverter CreateSut(string? apiKey = "from-appsettings")
    {
        var monitor = new Mock<IOptionsMonitor<GoogleMaps>>();
        monitor.Setup(m => m.CurrentValue).Returns(new GoogleMaps { ApiKey = apiKey });
        return new MultiMapPropertyValueConverter(monitor.Object);
    }

    /// <summary>
    /// The converter reads datatype config through IPublishedPropertyType. Only
    /// the configuration is exercised here, so a stub returning a dictionary is
    /// enough.
    /// </summary>
    private static IPublishedPropertyType PropertyTypeWith(Dictionary<string, object>? config)
    {
        // Verified against Umbraco.Cms.Core 18.1.1:
        //   PublishedDataType(int id, string editorAlias, string editorUiAlias, Lazy<object> configSource)
        var dataType = new PublishedDataType(
            1,
            "Our.Umbraco.GMaps.Multi",
            "GMaps.PropertyEditorUi.MultiMap",
            new Lazy<object?>(() => config));
        var propertyType = new Mock<IPublishedPropertyType>();
        propertyType.Setup(p => p.DataType).Returns(dataType);
        propertyType.Setup(p => p.EditorAlias).Returns("Our.Umbraco.GMaps.Multi");
        return propertyType.Object;
    }

    private static MultiMap? Convert(string? stored, Dictionary<string, object>? config = null, string? apiKey = "from-appsettings")
        => CreateSut(apiKey).ConvertIntermediateToObject(
            null!, PropertyTypeWith(config), PropertyCacheLevel.Element, stored, false) as MultiMap;

    [Fact]
    public void Returns_null_for_empty_stored_values()
    {
        Assert.Null(Convert(null));
        Assert.Null(Convert(""));
        Assert.Null(Convert("   "));
    }

    [Fact]
    public void Reads_a_multi_map_value()
    {
        var model = Convert("""
        {"markers":[{"key":"a","friendlyName":"HQ","coordinates":{"lat":1,"lng":2}}],
         "mapconfig":{"zoom":12,"maptype":"roadmap"}}
        """);

        Assert.NotNull(model);
        var marker = Assert.Single(model!.Markers);
        Assert.Equal("HQ", marker.FriendlyName);
        Assert.Equal(12, model.MapConfig.Zoom);
    }

    [Fact]
    public void Reads_a_legacy_single_map_value_as_one_marker()
    {
        // Switching an existing datatype from Single to Multi must not lose the pin.
        var model = Convert("""
        {"address":{"friendlyName":"HQ","full_address":"12 Collins St","coordinates":{"lat":1,"lng":2}},
         "mapconfig":{"zoom":15,"maptype":"roadmap"}}
        """);

        Assert.NotNull(model);
        var marker = Assert.Single(model!.Markers);
        Assert.Equal("HQ", marker.FriendlyName);
        Assert.Equal("12 Collins St", marker.FullAddress);
        Assert.Equal(1, marker.Coordinates.Latitude, 6);
        Assert.Equal(15, model.MapConfig.Zoom);
    }

    [Fact]
    public void Gives_every_marker_a_key_even_when_the_stored_value_has_none()
    {
        // Legacy values and hand-written content have no keys; the front end
        // still needs stable identity.
        var model = Convert("""{"markers":[{"friendlyName":"HQ"},{"friendlyName":"Depot"}]}""");

        Assert.NotNull(model);
        Assert.All(model!.Markers, m => Assert.False(string.IsNullOrWhiteSpace(m.Key)));
        Assert.Equal(2, model.Markers.Select(m => m.Key).Distinct().Count());
    }

    [Fact]
    public void Takes_the_api_key_from_appsettings_when_the_datatype_has_none()
    {
        var model = Convert("""{"markers":[]}""");

        Assert.Equal("from-appsettings", model!.MapConfig.ApiKey);
    }

    [Fact]
    public void Lets_the_datatype_api_key_win_over_appsettings()
    {
        var model = Convert("""{"markers":[]}""",
            new Dictionary<string, object> { ["apikey"] = "from-datatype" });

        Assert.Equal("from-datatype", model!.MapConfig.ApiKey);
    }

    [Fact]
    public void Resolves_colour_labels_from_the_current_palette()
    {
        var model = Convert("""{"markers":[{"key":"a","color":"#2d7ef7"}]}""",
            new Dictionary<string, object>
            {
                ["markerColors"] = """[{"label":"Logistics","value":"#2d7ef7"},{"label":"Retail","value":"#d64545"}]"""
            });

        Assert.Equal("Logistics", Assert.Single(model!.Markers).ColorLabel);
    }

    [Fact]
    public void Leaves_the_label_null_when_the_colour_left_the_palette()
    {
        var model = Convert("""{"markers":[{"key":"a","color":"#123456"}]}""",
            new Dictionary<string, object>
            {
                ["markerColors"] = """[{"label":"Logistics","value":"#2d7ef7"}]"""
            });

        var marker = Assert.Single(model!.Markers);
        Assert.Equal("#123456", marker.Color);
        Assert.Null(marker.ColorLabel);
    }

    [Fact]
    public void Matches_palette_colours_case_insensitively()
    {
        var model = Convert("""{"markers":[{"key":"a","color":"#2D7EF7"}]}""",
            new Dictionary<string, object>
            {
                ["markerColors"] = """[{"label":"Logistics","value":"#2d7ef7"}]"""
            });

        Assert.Equal("Logistics", Assert.Single(model!.Markers).ColorLabel);
    }

    [Fact]
    public void Survives_malformed_palette_configuration()
    {
        // A hand-edited or half-migrated datatype must not take the site down.
        var model = Convert("""{"markers":[{"key":"a","color":"#2d7ef7"}]}""",
            new Dictionary<string, object> { ["markerColors"] = "not json" });

        Assert.NotNull(model);
        Assert.Null(Assert.Single(model!.Markers).ColorLabel);
    }
}
```

- [ ] **Step 2: Add the mocking package**

```bash
cd /Users/gandalf/Source/GitHub/Our.Umbraco.GMaps
dotnet add Our.Umbraco.GMaps.Tests package Moq
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `dotnet test Our.Umbraco.GMaps.Tests`
Expected: FAIL — `MultiMapPropertyValueConverter` does not exist.

- [ ] **Step 4: Create the data editor**

Create `Our.Umbraco.GMaps/PropertyEditors/GMapsMultiDataEditor.cs`:

```csharp
using Umbraco.Cms.Core.PropertyEditors;

namespace Our.Umbraco.GMaps.PropertyEditors;

[DataEditor(
    EditorAlias,
    ValueType = ValueTypes.Json,
    ValueEditorIsReusable = true)]
public class GMapsMultiDataEditor(IDataValueEditorFactory dataValueEditorFactory) : DataEditor(dataValueEditorFactory)
{
    internal const string EditorAlias = "Our.Umbraco.GMaps.Multi";
    internal const string UiEditorAlias = "GMaps.PropertyEditorUi.MultiMap";
}
```

- [ ] **Step 5: Create the converter**

Create `Our.Umbraco.GMaps/PropertyValueConverter/MultiMapPropertyValueConverter.cs`:

```csharp
using Microsoft.Extensions.Options;
using Our.Umbraco.GMaps.Configuration;
using Our.Umbraco.GMaps.Models;
using Our.Umbraco.GMaps.Models.Configuration;
using System.Text.Json;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;

namespace Our.Umbraco.GMaps.PropertyValueConverter;

public class MultiMapPropertyValueConverter : PropertyValueConverterBase
{
    private GoogleMaps googleMapsConfig;

    public MultiMapPropertyValueConverter(IOptionsMonitor<GoogleMaps> googleMapsConfig)
    {
        this.googleMapsConfig = googleMapsConfig.CurrentValue;
        googleMapsConfig.OnChange(config => this.googleMapsConfig = config);
    }

    public override bool IsConverter(IPublishedPropertyType propertyType)
        => propertyType.EditorAlias.Equals(PropertyEditors.GMapsMultiDataEditor.EditorAlias);

    public override Type GetPropertyValueType(IPublishedPropertyType propertyType) => typeof(MultiMap);

    public override PropertyCacheLevel GetPropertyCacheLevel(IPublishedPropertyType propertyType)
        => PropertyCacheLevel.Element;

    public override object? ConvertIntermediateToObject(
        IPublishedElement owner,
        IPublishedPropertyType propertyType,
        PropertyCacheLevel referenceCacheLevel,
        object? inter,
        bool preview)
    {
        var interString = inter?.ToString();
        if (string.IsNullOrWhiteSpace(interString))
        {
            return default;
        }

        var model = Deserialize(interString);
        if (model is null)
        {
            return default;
        }

        // Legacy values and hand-authored content carry no keys, but the front
        // end still needs stable identity per marker.
        foreach (var marker in model.Markers.Where(m => string.IsNullOrWhiteSpace(m.Key)))
        {
            marker.Key = Guid.NewGuid().ToString();
        }

        model.MapConfig.ApiKey = googleMapsConfig.ApiKey;

        var config = propertyType.DataType.ConfigurationAs<Dictionary<string, object>>();
        if (config is not null)
        {
            ApplyConfiguration(model, config);
        }

        return model;
    }

    /// <summary>
    /// Reads either the multi shape or a legacy single-map value. Reading the
    /// legacy shape is what makes switching an existing datatype over to Multi
    /// survivable rather than data-destroying.
    /// </summary>
    private static MultiMap? Deserialize(string interString)
    {
        // A single-map value has "address" at the root and no "markers".
        var looksSingle = interString.Contains("\"address\"", StringComparison.OrdinalIgnoreCase)
            && !interString.Contains("\"markers\"", StringComparison.OrdinalIgnoreCase);

        if (looksSingle)
        {
            var single = JsonSerializer.Deserialize<Map>(interString);
            if (single is null)
            {
                return null;
            }

            return new MultiMap
            {
                Markers =
                [
                    new Marker
                    {
                        Key = Guid.NewGuid().ToString(),
                        Coordinates = single.Address.Coordinates,
                        FullAddress = single.Address.FullAddress,
                        FriendlyName = single.Address.FriendlyName,
                        StreetNumber = single.Address.StreetNumber,
                        Street = single.Address.Street,
                        PostalCode = single.Address.PostalCode,
                        City = single.Address.City,
                        State = single.Address.State,
                        Country = single.Address.Country,
                    }
                ],
                MapConfig = single.MapConfig,
            };
        }

        return JsonSerializer.Deserialize<MultiMap>(interString);
    }

    private static void ApplyConfiguration(MultiMap model, Dictionary<string, object> config)
    {
        if (config.TryGetValue("apikey", out var apiKey) && apiKey is not null)
        {
            var key = apiKey.ToString();
            if (!string.IsNullOrWhiteSpace(key))
            {
                model.MapConfig.ApiKey = key;
            }
        }

        if (config.TryGetValue("mapstyle", out var mapStyle) && mapStyle is not null)
        {
            var style = TryDeserialize<MapStyle>(mapStyle.ToString());
            model.MapConfig.Style = !string.IsNullOrWhiteSpace(style?.Selectedstyle?.Json)
                ? style.Selectedstyle.Json
                : style?.Customstyle;
        }

        if (config.TryGetValue("markerColors", out var palette) && palette is not null)
        {
            ApplyColourLabels(model, TryDeserialize<List<MarkerColor>>(palette.ToString()));
        }
    }

    /// <summary>
    /// Attach the label for each marker's colour from the datatype's *current*
    /// palette. Only the hex value is stored, so renaming a swatch cannot leave
    /// stale labels across content; a colour dropped from the palette simply
    /// resolves to no label.
    /// </summary>
    private static void ApplyColourLabels(MultiMap model, List<MarkerColor>? palette)
    {
        if (palette is null || palette.Count == 0)
        {
            return;
        }

        foreach (var marker in model.Markers.Where(m => !string.IsNullOrWhiteSpace(m.Color)))
        {
            marker.ColorLabel = palette
                .FirstOrDefault(p => string.Equals(p.Value, marker.Color, StringComparison.OrdinalIgnoreCase))
                ?.Label;
        }
    }

    /// <summary>
    /// Datatype configuration is editable by hand and survives package upgrades,
    /// so malformed JSON must degrade rather than throw during rendering.
    /// </summary>
    private static T? TryDeserialize<T>(string? json) where T : class
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<T>(json);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
```

- [ ] **Step 6: Add the palette model**

Create `Our.Umbraco.GMaps/Models/Configuration/MarkerColor.cs`:

```csharp
using Newtonsoft.Json;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models.Configuration;

/// <summary>
/// One swatch from the datatype's marker palette. Matches the shape
/// Umb.PropertyEditorUi.ColorSwatchesEditor produces.
/// </summary>
public class MarkerColor
{
    [DataMember(Name = "label")]
    [JsonProperty("label")]
    [JsonPropertyName("label")]
    public string? Label { get; set; }

    [DataMember(Name = "value")]
    [JsonProperty("value")]
    [JsonPropertyName("value")]
    public string? Value { get; set; }
}
```

Add `using Our.Umbraco.GMaps.Models.Configuration;` to the converter if it is not already resolving `MarkerColor`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `dotnet test Our.Umbraco.GMaps.Tests`
Expected: PASS, 14 tests.

- [ ] **Step 8: Verify both package flavours still build**

Run: `./build.sh --major 18 && ./build.sh --major 17`
Expected: `Build succeeded`, 0 errors, for both.

- [ ] **Step 9: Commit**

```bash
git add Our.Umbraco.GMaps/PropertyEditors/GMapsMultiDataEditor.cs \
        Our.Umbraco.GMaps/PropertyValueConverter/MultiMapPropertyValueConverter.cs \
        Our.Umbraco.GMaps/Models/Configuration/MarkerColor.cs \
        Our.Umbraco.GMaps.Tests/
git commit -m "feat: add the Multi Marker data editor and property value converter"
```

---

## Task 3: TypeScript types for markers

Small, but it is the contract every later client task is written against, so it lands on its own.

**Files:**
- Modify: `src/types.ts`

**Interfaces:**
- Produces, from `src/types.ts`:
  - `export interface MarkerColor { label: string; value: string }`
  - `export interface Marker extends AddressBase { key: string; coordinates?: Location; description?: string; color?: string }`
  - `export interface MultiMap { markers: Marker[]; mapconfig: MapConfig }`
  - `MapConfig` becomes exported (it is currently module-private)

- [ ] **Step 1: Add the types**

In `src/types.ts`, change the existing `MapConfig` declaration from `interface MapConfig {` to `export interface MapConfig {` — `MultiMap` needs it and nothing else changes.

Then append:

```ts
/** One swatch from the datatype's palette, matching UmbSwatchDetails. */
export interface MarkerColor {
  label: string;
  value: string;
}

/**
 * One pin on a multi-marker map. Fields are flat rather than nested under an
 * `address`, mirroring `Marker : Address` on the server.
 */
export interface Marker extends AddressBase {
  /** Stable identity for reordering and drawer editing. Never an array index. */
  key: string;
  coordinates?: Location;
  description?: string;
  /** Hex value from the datatype palette. The label is resolved server-side. */
  color?: string;
}

/** Many markers sharing one map configuration. */
export interface MultiMap {
  markers: Marker[];
  mapconfig: MapConfig;
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add Marker, MultiMap and MarkerColor types"
```

---

## Task 4: `core/marker-collection.ts`

Pure list transforms. Immutable — every function returns a new array, so Lit re-renders naturally and nothing can mutate the value in place behind the element's back.

**Files:**
- Create: `src/core/marker-collection.ts`
- Create: `src/core/marker-collection.test.ts`

**Interfaces:**
- Consumes: `Marker` from `src/types.ts` (Task 3).
- Produces, from `src/core/marker-collection.ts`:
  - `newMarkerKey(): string`
  - `addMarker(markers: Marker[], marker: Omit<Marker, 'key'> & { key?: string }, max?: number): Marker[]`
  - `removeMarker(markers: Marker[], key: string): Marker[]`
  - `updateMarker(markers: Marker[], key: string, patch: Partial<Omit<Marker, 'key'>>): Marker[]`
  - `moveMarker(markers: Marker[], fromIndex: number, toIndex: number): Marker[]`
  - `reorderMarkers(markers: Marker[], keys: string[]): Marker[]`
  - `canAddMarker(markers: Marker[], max?: number): boolean`
  - `markerLimitsAreSane(min?: number, max?: number): boolean`

- [ ] **Step 1: Write the failing tests**

Create `src/core/marker-collection.test.ts`:

```ts
import { expect } from '@open-wc/testing';
import {
  addMarker,
  canAddMarker,
  markerLimitsAreSane,
  moveMarker,
  newMarkerKey,
  removeMarker,
  reorderMarkers,
  updateMarker,
} from './marker-collection.js';
import type { Marker } from '../types.js';

const marker = (key: string, friendlyName?: string): Marker => ({ key, friendlyName });

describe('core/marker-collection', () => {
  describe('newMarkerKey', () => {
    it('produces distinct keys', () => {
      const keys = new Set(Array.from({ length: 50 }, () => newMarkerKey()));

      expect(keys.size).to.equal(50);
    });

    it('produces non-empty strings', () => {
      expect(newMarkerKey()).to.be.a('string').with.length.greaterThan(0);
    });
  });

  describe('addMarker', () => {
    it('appends and assigns a key', () => {
      const result = addMarker([], { friendlyName: 'HQ' });

      expect(result).to.have.length(1);
      expect(result[0].friendlyName).to.equal('HQ');
      expect(result[0].key).to.be.a('string').with.length.greaterThan(0);
    });

    it('keeps a key that was supplied', () => {
      expect(addMarker([], { key: 'given', friendlyName: 'HQ' })[0].key).to.equal('given');
    });

    it('does not mutate the input array', () => {
      const original: Marker[] = [marker('a')];
      addMarker(original, { friendlyName: 'HQ' });

      expect(original).to.have.length(1);
    });

    it('refuses to exceed max', () => {
      const full = [marker('a'), marker('b')];

      expect(addMarker(full, { friendlyName: 'HQ' }, 2)).to.deep.equal(full);
    });

    it('treats max 0 as unlimited', () => {
      expect(addMarker([marker('a')], { friendlyName: 'HQ' }, 0)).to.have.length(2);
    });

    it('treats an absent max as unlimited', () => {
      expect(addMarker([marker('a')], { friendlyName: 'HQ' })).to.have.length(2);
    });
  });

  describe('removeMarker', () => {
    it('removes by key', () => {
      const result = removeMarker([marker('a'), marker('b')], 'a');

      expect(result.map((m) => m.key)).to.deep.equal(['b']);
    });

    it('ignores an unknown key', () => {
      const markers = [marker('a')];

      expect(removeMarker(markers, 'nope')).to.deep.equal(markers);
    });
  });

  describe('updateMarker', () => {
    it('patches only the named marker', () => {
      const result = updateMarker([marker('a', 'HQ'), marker('b', 'Depot')], 'b', {
        friendlyName: 'Warehouse',
        description: 'Gate 4',
      });

      expect(result[0].friendlyName).to.equal('HQ');
      expect(result[1].friendlyName).to.equal('Warehouse');
      expect(result[1].description).to.equal('Gate 4');
    });

    it('cannot change the key', () => {
      // `key` is excluded from the patch type, but a caller casting around that
      // must still not be able to break identity.
      const result = updateMarker([marker('a')], 'a', { key: 'hacked' } as never);

      expect(result[0].key).to.equal('a');
    });

    it('ignores an unknown key', () => {
      const markers = [marker('a')];

      expect(updateMarker(markers, 'nope', { friendlyName: 'X' })).to.deep.equal(markers);
    });

    it('does not mutate the input', () => {
      const markers = [marker('a', 'HQ')];
      updateMarker(markers, 'a', { friendlyName: 'Changed' });

      expect(markers[0].friendlyName).to.equal('HQ');
    });
  });

  describe('moveMarker', () => {
    it('moves forwards', () => {
      const result = moveMarker([marker('a'), marker('b'), marker('c')], 0, 2);

      expect(result.map((m) => m.key)).to.deep.equal(['b', 'c', 'a']);
    });

    it('moves backwards', () => {
      const result = moveMarker([marker('a'), marker('b'), marker('c')], 2, 0);

      expect(result.map((m) => m.key)).to.deep.equal(['c', 'a', 'b']);
    });

    it('ignores out-of-range indices', () => {
      const markers = [marker('a'), marker('b')];

      expect(moveMarker(markers, 5, 0)).to.deep.equal(markers);
      expect(moveMarker(markers, 0, 5)).to.deep.equal(markers);
      expect(moveMarker(markers, -1, 0)).to.deep.equal(markers);
    });

    it('is a no-op when the indices match', () => {
      const markers = [marker('a'), marker('b')];

      expect(moveMarker(markers, 1, 1)).to.deep.equal(markers);
    });
  });

  describe('reorderMarkers', () => {
    it('reorders to match the key order', () => {
      const result = reorderMarkers([marker('a'), marker('b'), marker('c')], ['c', 'a', 'b']);

      expect(result.map((m) => m.key)).to.deep.equal(['c', 'a', 'b']);
    });

    it('keeps markers the key list omits, in their original order, at the end', () => {
      // A sorter can report a partial list; dropping the rest would delete data.
      const result = reorderMarkers([marker('a'), marker('b'), marker('c')], ['c']);

      expect(result.map((m) => m.key)).to.deep.equal(['c', 'a', 'b']);
    });

    it('ignores keys that match no marker', () => {
      const result = reorderMarkers([marker('a'), marker('b')], ['ghost', 'b', 'a']);

      expect(result.map((m) => m.key)).to.deep.equal(['b', 'a']);
    });
  });

  describe('canAddMarker', () => {
    it('allows when below max', () => {
      expect(canAddMarker([marker('a')], 2)).to.equal(true);
    });

    it('refuses at max', () => {
      expect(canAddMarker([marker('a'), marker('b')], 2)).to.equal(false);
    });

    it('allows when max is 0, undefined, or negative', () => {
      expect(canAddMarker([marker('a')], 0)).to.equal(true);
      expect(canAddMarker([marker('a')], undefined)).to.equal(true);
      expect(canAddMarker([marker('a')], -1)).to.equal(true);
    });
  });

  describe('markerLimitsAreSane', () => {
    it('accepts a min below the max', () => {
      expect(markerLimitsAreSane(1, 5)).to.equal(true);
    });

    it('accepts equal bounds', () => {
      expect(markerLimitsAreSane(3, 3)).to.equal(true);
    });

    it('accepts an unlimited max', () => {
      expect(markerLimitsAreSane(3, 0)).to.equal(true);
      expect(markerLimitsAreSane(3, undefined)).to.equal(true);
    });

    it('rejects a min above the max', () => {
      expect(markerLimitsAreSane(5, 2)).to.equal(false);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `./marker-collection.js` does not exist.

- [ ] **Step 3: Create the module**

Create `src/core/marker-collection.ts`:

```ts
import type { Marker } from '../types.js';

/**
 * A max of 0, undefined or negative all mean "no limit" - the datatype config
 * uses 0 for unlimited, matching how core's Multi URL Picker reads maxNumber.
 */
function isUnlimited(max: number | undefined): boolean {
  return max === undefined || max <= 0;
}

/** Stable identity for a new marker. */
export function newMarkerKey(): string {
  return crypto.randomUUID();
}

export function canAddMarker(markers: Marker[], max?: number): boolean {
  return isUnlimited(max) || markers.length < (max as number);
}

/**
 * Append a marker, assigning a key when the caller did not supply one.
 * Returns the original array unchanged when the collection is already at max,
 * so callers can treat "refused" and "no change" identically.
 */
export function addMarker(
  markers: Marker[],
  marker: Omit<Marker, 'key'> & { key?: string },
  max?: number,
): Marker[] {
  if (!canAddMarker(markers, max)) return markers;
  return [...markers, { ...marker, key: marker.key ?? newMarkerKey() }];
}

export function removeMarker(markers: Marker[], key: string): Marker[] {
  const next = markers.filter((m) => m.key !== key);
  return next.length === markers.length ? markers : next;
}

/**
 * Patch one marker. `key` is stripped from the patch even if a caller casts
 * around the type, because identity outliving an edit is what makes reorder and
 * drawer editing safe.
 */
export function updateMarker(
  markers: Marker[],
  key: string,
  patch: Partial<Omit<Marker, 'key'>>,
): Marker[] {
  if (!markers.some((m) => m.key === key)) return markers;

  const { key: _ignored, ...safe } = patch as Partial<Marker>;
  return markers.map((m) => (m.key === key ? { ...m, ...safe, key: m.key } : m));
}

export function moveMarker(markers: Marker[], fromIndex: number, toIndex: number): Marker[] {
  const last = markers.length - 1;
  if (fromIndex < 0 || toIndex < 0 || fromIndex > last || toIndex > last) return markers;
  if (fromIndex === toIndex) return markers;

  const next = [...markers];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/**
 * Reorder to match a list of keys. Keys naming no marker are ignored, and
 * markers the list omits keep their relative order at the end - a sorter can
 * report a partial list, and dropping the remainder would delete content.
 */
export function reorderMarkers(markers: Marker[], keys: string[]): Marker[] {
  const byKey = new Map(markers.map((m) => [m.key, m]));
  const ordered: Marker[] = [];

  for (const key of keys) {
    const found = byKey.get(key);
    if (found) {
      ordered.push(found);
      byKey.delete(key);
    }
  }

  return [...ordered, ...markers.filter((m) => byKey.has(m.key))];
}

/**
 * Whether the configured bounds make sense. A datatype with min greater than
 * max is a misconfiguration for the editor to report, not a validation failure
 * for the content editor to resolve.
 */
export function markerLimitsAreSane(min?: number, max?: number): boolean {
  if (min === undefined || isUnlimited(max)) return true;
  return min <= (max as number);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Verify the core layering rule**

Run:
```bash
grep -rnE "^\s*(import|export).*(from '\.\./(maps|controllers)|googlemaps|@types/google)" src/core/*.ts \
  && echo VIOLATION || echo clean
```
Expected: `clean`

- [ ] **Step 6: Commit**

```bash
git add src/core/marker-collection.ts src/core/marker-collection.test.ts
git commit -m "feat: add pure marker collection transforms to core/"
```

---

## Task 5: Multi map value construction in `core/value.ts`

**Files:**
- Modify: `src/core/value.ts`
- Modify: `src/core/value.test.ts`

**Interfaces:**
- Consumes: `Marker`, `MultiMap`, `MapType`, `Location`, `DEFAULT_LOCATION` from `src/types.ts`; `newMarkerKey` from `src/core/marker-collection.ts` (Task 4).
- Produces, from `src/core/value.ts`:
  - `export interface MultiMapValueInput { markers: Marker[]; zoom: number; maptype: MapType; center?: Location; defaultLocation: Location }`
  - `buildMultiMapValue(input: MultiMapValueInput): MultiMap`
  - `readMultiMapValue(value: MultiMap | Map | undefined): { markers: Marker[]; center?: Location; zoom?: number }`

`readMultiMapValue` accepts a legacy single value so an existing datatype switched to Multi keeps its pin, mirroring what the server-side PVC does.

- [ ] **Step 1: Write the failing tests**

Append to `src/core/value.test.ts`, and extend the import on line 2 to
`import { buildMultiMapValue, buildSingleMapValue, readMultiMapValue, readSingleMapValue, resolveInitialCenter } from './value.js';`
and the type import to `import type { Map, Marker, MultiMap } from '../types.js';`:

```ts
describe('core/value: multi map', () => {
  const multiBase = {
    zoom: 12,
    maptype: 'roadmap' as const,
    defaultLocation: DEFAULT_LOCATION,
  };

  const marker = (key: string, friendlyName: string): Marker => ({
    key,
    friendlyName,
    coordinates: { lat: 1, lng: 2 },
  });

  describe('buildMultiMapValue', () => {
    it('carries the markers in order', () => {
      const value = buildMultiMapValue({
        ...multiBase,
        markers: [marker('a', 'HQ'), marker('b', 'Depot')],
      });

      expect(value.markers.map((m) => m.friendlyName)).to.deep.equal(['HQ', 'Depot']);
    });

    it('carries zoom, maptype and centre', () => {
      const value = buildMultiMapValue({
        ...multiBase,
        markers: [],
        center: { lat: 3, lng: 4 },
        maptype: 'satellite',
      });

      expect(value.mapconfig.zoom).to.equal(12);
      expect(value.mapconfig.maptype).to.equal('satellite');
      expect(value.mapconfig.centerCoordinates).to.deep.equal({ lat: 3, lng: 4 });
    });

    it('falls back to the supplied default location for the centre', () => {
      // Unlike the single editor, whose centre fallback is the hardcoded
      // DEFAULT_LOCATION, multi honours the caller's default.
      const value = buildMultiMapValue({
        ...multiBase,
        markers: [],
        defaultLocation: { lat: 10, lng: 20 },
      });

      expect(value.mapconfig.centerCoordinates).to.deep.equal({ lat: 10, lng: 20 });
    });

    it('produces an empty marker list rather than omitting the property', () => {
      expect(buildMultiMapValue({ ...multiBase, markers: [] }).markers).to.deep.equal([]);
    });
  });

  describe('readMultiMapValue', () => {
    it('returns an empty list for no value', () => {
      expect(readMultiMapValue(undefined)).to.deep.equal({ markers: [] });
    });

    it('reads markers and centre', () => {
      const read = readMultiMapValue({
        markers: [marker('a', 'HQ')],
        mapconfig: { zoom: 12, centerCoordinates: { lat: 3, lng: 4 } },
      } as MultiMap);

      expect(read.markers).to.have.length(1);
      expect(read.center).to.deep.equal({ lat: 3, lng: 4 });
      expect(read.zoom).to.equal(12);
    });

    it('reads a legacy single-map value as one marker', () => {
      const read = readMultiMapValue({
        address: {
          friendlyName: 'HQ',
          full_address: '12 Collins St',
          city: 'Melbourne',
          coordinates: { lat: 1, lng: 2 },
        },
        mapconfig: { zoom: 15, centerCoordinates: { lat: 3, lng: 4 } },
      } as Map);

      expect(read.markers).to.have.length(1);
      expect(read.markers[0].friendlyName).to.equal('HQ');
      expect(read.markers[0].full_address).to.equal('12 Collins St');
      expect(read.markers[0].city).to.equal('Melbourne');
      expect(read.markers[0].coordinates).to.deep.equal({ lat: 1, lng: 2 });
      expect(read.markers[0].key).to.be.a('string').with.length.greaterThan(0);
      expect(read.zoom).to.equal(15);
    });

    it('gives keyless stored markers a key', () => {
      const read = readMultiMapValue({
        markers: [{ friendlyName: 'HQ' } as Marker],
        mapconfig: { zoom: 12 },
      } as MultiMap);

      expect(read.markers[0].key).to.be.a('string').with.length.greaterThan(0);
    });

    it('round-trips: read then build reproduces the value', () => {
      const stored: MultiMap = {
        markers: [
          {
            key: '8f3c',
            friendlyName: 'Warehouse',
            full_address: '88 Dock Rd',
            description: 'Gate 4',
            color: '#2d7ef7',
            coordinates: { lat: -37.834, lng: 144.926 },
          },
        ],
        mapconfig: {
          zoom: 12,
          maptype: 'roadmap',
          centerCoordinates: { lat: -37.8136, lng: 144.9631 },
        },
      };

      const read = readMultiMapValue(stored);
      const rebuilt = buildMultiMapValue({
        ...multiBase,
        markers: read.markers,
        center: read.center,
        zoom: read.zoom as number,
      });

      expect(rebuilt).to.deep.equal(stored);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `buildMultiMapValue` is not exported.

- [ ] **Step 3: Add the functions**

Append to `src/core/value.ts`, and add `Marker`, `MultiMap` to its type import plus `import { newMarkerKey } from './marker-collection.js';`:

```ts
export interface MultiMapValueInput {
  markers: Marker[];
  zoom: number;
  maptype: MapType;
  center?: Location;
  defaultLocation: Location;
}

/**
 * Build the Multi editor's stored value.
 *
 * Note this deliberately does NOT reproduce the single editor's centre
 * asymmetry: the centre falls back to the caller's `defaultLocation`, not to
 * the hardcoded DEFAULT_LOCATION. There is no back-compatibility reason to
 * carry that bug into a new editor.
 */
export function buildMultiMapValue(input: MultiMapValueInput): MultiMap {
  return {
    markers: input.markers,
    mapconfig: {
      zoom: input.zoom,
      maptype: input.maptype,
      centerCoordinates: input.center ?? input.defaultLocation,
    },
  };
}

/** A stored value in the legacy single-map shape: one address, no marker list. */
function isLegacySingleValue(value: MultiMap | Map): value is Map {
  return 'address' in value && !('markers' in value);
}

/**
 * Split a stored value into the pieces the multi editor holds as state.
 *
 * Accepts a legacy single-map value and reads it as a one-marker list, which is
 * what makes switching an existing datatype over to Multi survivable. Mirrors
 * MultiMapPropertyValueConverter.Deserialize server-side.
 */
export function readMultiMapValue(value: MultiMap | Map | undefined): {
  markers: Marker[];
  center?: Location;
  zoom?: number;
} {
  if (!value) return { markers: [] };

  if (isLegacySingleValue(value)) {
    const { coordinates, ...rest } = value.address ?? {};
    return {
      markers: [{ ...rest, key: newMarkerKey(), coordinates }],
      center: value.mapconfig?.centerCoordinates,
      zoom: value.mapconfig?.zoom as number | undefined,
    };
  }

  return {
    // Legacy and hand-authored content can lack keys; identity is required.
    markers: (value.markers ?? []).map((m) => (m.key ? m : { ...m, key: newMarkerKey() })),
    center: value.mapconfig?.centerCoordinates,
    zoom: value.mapconfig?.zoom as number | undefined,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. If the round-trip test fails, do not adjust the test — it is the property that stops documents loading dirty.

- [ ] **Step 5: Commit**

```bash
git add src/core/value.ts src/core/value.test.ts
git commit -m "feat: add multi map value construction and legacy single reading"
```

---

## Task 6: The marker drawer modal

**Files:**
- Create: `src/multi-marker/marker-drawer/marker-drawer.token.ts`
- Create: `src/multi-marker/marker-drawer/marker-drawer.element.ts`
- Create: `src/multi-marker/marker-drawer/marker-drawer.element.test.ts`

**Interfaces:**
- Consumes: `Marker`, `MarkerColor` from `src/types.ts` (Task 3).
- Produces:
  - From `marker-drawer.token.ts`: `export interface GMapsMarkerDrawerData { marker: Marker; palette: MarkerColor[]; enableDescription: boolean }`, `export type GMapsMarkerDrawerValue = Marker`, and `export const GMAPS_MARKER_DRAWER_MODAL: UmbModalToken<GMapsMarkerDrawerData, GMapsMarkerDrawerValue>` with alias `GMaps.Modal.MarkerDrawer`
  - From `marker-drawer.element.ts`: default-exported `GMapsMarkerDrawerElement`, custom element `gmaps-marker-drawer`

- [ ] **Step 1: Create the token**

Create `src/multi-marker/marker-drawer/marker-drawer.token.ts`:

```ts
import { UmbModalToken } from '@umbraco-cms/backoffice/modal';
import type { Marker, MarkerColor } from '../../types.js';

export interface GMapsMarkerDrawerData {
  marker: Marker;
  /** The datatype's palette. Empty means the colour control is hidden. */
  palette: MarkerColor[];
  enableDescription: boolean;
}

export type GMapsMarkerDrawerValue = Marker;

/**
 * Edits one marker in a right-hand sidebar so the map stays visible - the whole
 * reason this is a drawer rather than a dialog.
 */
export const GMAPS_MARKER_DRAWER_MODAL = new UmbModalToken<
  GMapsMarkerDrawerData,
  GMapsMarkerDrawerValue
>('GMaps.Modal.MarkerDrawer', {
  modal: {
    type: 'sidebar',
    size: 'small',
  },
});
```

- [ ] **Step 2: Write the failing tests**

Create `src/multi-marker/marker-drawer/marker-drawer.element.test.ts`:

```ts
import { expect, fixture, html } from '@open-wc/testing';
import './marker-drawer.element.js';
import type GMapsMarkerDrawerElement from './marker-drawer.element.js';
import type { Marker, MarkerColor } from '../../types.js';

const MARKER: Marker = {
  key: 'a',
  friendlyName: 'Warehouse',
  description: 'Gate 4',
  color: '#2d7ef7',
  full_address: '88 Dock Rd, Port Melbourne VIC 3207',
  coordinates: { lat: -37.834, lng: 144.926 },
};

const PALETTE: MarkerColor[] = [
  { label: 'Logistics', value: '#2d7ef7' },
  { label: 'Retail', value: '#d64545' },
];

async function drawer(data: Partial<{ marker: Marker; palette: MarkerColor[]; enableDescription: boolean }> = {}) {
  const el = await fixture<GMapsMarkerDrawerElement>(html`<gmaps-marker-drawer></gmaps-marker-drawer>`);
  el.data = {
    marker: data.marker ?? MARKER,
    palette: data.palette ?? PALETTE,
    enableDescription: data.enableDescription ?? true,
  };
  await el.updateComplete;
  return el;
}

describe('multi-marker/marker-drawer', () => {
  it('shows the marker address and coordinates', async () => {
    const el = await drawer();
    const text = el.shadowRoot!.textContent ?? '';

    expect(text).to.contain('88 Dock Rd');
    expect(text).to.contain('-37.834');
  });

  it('seeds the value from the supplied marker', async () => {
    const el = await drawer();

    expect(el.value.friendlyName).to.equal('Warehouse');
    expect(el.value.key).to.equal('a');
  });

  it('renders one swatch per palette entry', async () => {
    const el = await drawer();

    expect(el.shadowRoot!.querySelectorAll('.swatch')).to.have.length(2);
  });

  it('hides the colour control when the palette is empty', async () => {
    const el = await drawer({ palette: [] });

    expect(el.shadowRoot!.querySelector('.colours')).to.equal(null);
  });

  it('hides the description field when the datatype disables it', async () => {
    const el = await drawer({ enableDescription: false });

    expect(el.shadowRoot!.querySelector('#description')).to.equal(null);
  });

  it('flags a colour that is no longer in the palette', async () => {
    const el = await drawer({ marker: { ...MARKER, color: '#123456' } });

    expect(el.shadowRoot!.textContent).to.contain('no longer in the palette');
  });

  it('updates the value when the friendly name changes', async () => {
    const el = await drawer();
    const input = el.shadowRoot!.querySelector('#friendlyName') as HTMLInputElement;
    input.value = 'Renamed';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect(el.value.friendlyName).to.equal('Renamed');
  });

  it('selecting a swatch sets the colour', async () => {
    const el = await drawer();
    const swatches = el.shadowRoot!.querySelectorAll<HTMLElement>('.swatch');
    swatches[1].click();
    await el.updateComplete;

    expect(el.value.color).to.equal('#d64545');
  });

  it('re-clicking the selected swatch clears the colour', async () => {
    const el = await drawer();
    const swatches = el.shadowRoot!.querySelectorAll<HTMLElement>('.swatch');
    swatches[0].click(); // already #2d7ef7
    await el.updateComplete;

    expect(el.value.color).to.equal(undefined);
  });

  it('never changes the marker key', async () => {
    const el = await drawer();
    const input = el.shadowRoot!.querySelector('#friendlyName') as HTMLInputElement;
    input.value = 'Renamed';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect(el.value.key).to.equal('a');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `./marker-drawer.element.js` does not exist.

- [ ] **Step 4: Create the drawer element**

Create `src/multi-marker/marker-drawer/marker-drawer.element.ts`:

```ts
import { css, customElement, html, nothing, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbModalBaseElement } from '@umbraco-cms/backoffice/modal';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import type { GMapsMarkerDrawerData, GMapsMarkerDrawerValue } from './marker-drawer.token.js';

const elementName = 'gmaps-marker-drawer';

/**
 * Edits one marker. Changes accumulate in `value` and only reach the editor on
 * submit, so Cancel genuinely abandons the edit rather than requiring the
 * content editor to undo the whole document.
 */
@customElement(elementName)
export default class GMapsMarkerDrawerElement extends UmbModalBaseElement<
  GMapsMarkerDrawerData,
  GMapsMarkerDrawerValue
> {
  @state()
  private _colourMissingFromPalette = false;

  override willUpdate(changed: Map<string, unknown>) {
    super.willUpdate(changed);
    if (!changed.has('data') || !this.data) return;

    // UmbModalBaseElement seeds `value` from the token default, not from data.
    this.value = { ...this.data.marker };

    const colour = this.data.marker.color;
    this._colourMissingFromPalette =
      !!colour && !this.data.palette.some((p) => p.value.toLowerCase() === colour.toLowerCase());
  }

  #patch(patch: Partial<GMapsMarkerDrawerValue>) {
    // Identity must survive every edit - reorder and the editor's lookup both
    // key off it.
    this.value = { ...this.value, ...patch, key: this.value.key };
  }

  #onInput(field: 'friendlyName' | 'description', event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    this.#patch({ [field]: target?.value ?? '' });
  }

  #onSwatch(colour: string) {
    // Clicking the selected swatch clears it, which is the only way to get back
    // to "no colour" once one is chosen.
    this.#patch({ color: this.value.color === colour ? undefined : colour });
  }

  #renderColours() {
    if (!this.data?.palette.length) return nothing;

    return html`
      <div class='field colours'>
        <span class='label'>Colour</span>
        <div class='swatches'>
          ${this.data.palette.map(
            (colour) => html`
              <button
                type='button'
                class='swatch ${this.value.color === colour.value ? 'selected' : ''}'
                style='background:${colour.value}'
                title=${colour.label}
                aria-label=${colour.label}
                aria-pressed=${this.value.color === colour.value}
                @click=${() => this.#onSwatch(colour.value)}></button>
            `,
          )}
        </div>
        ${this._colourMissingFromPalette
          ? html`<div class='warning'>This marker's colour is no longer in the palette.</div>`
          : nothing}
      </div>
    `;
  }

  override render() {
    if (!this.data) return nothing;
    const coordinates = this.value.coordinates;

    return html`
      <umb-body-layout headline=${this.value.friendlyName || 'Marker'}>
        <div class='content'>
          <div class='field'>
            <span class='label'>Address</span>
            <div class='readonly'>${this.value.full_address ?? 'No address resolved'}</div>
            <div class='hint'>
              ${coordinates ? `${coordinates.lat}, ${coordinates.lng}` : 'No coordinates'}
              — drag the pin or search to move it
            </div>
          </div>

          <div class='field'>
            <label class='label' for='friendlyName'>Friendly name</label>
            <input
              id='friendlyName'
              type='text'
              .value=${this.value.friendlyName ?? ''}
              @input=${(e: Event) => this.#onInput('friendlyName', e)} />
          </div>

          ${this.data.enableDescription
            ? html`
                <div class='field'>
                  <label class='label' for='description'>Description</label>
                  <textarea
                    id='description'
                    rows='3'
                    .value=${this.value.description ?? ''}
                    @input=${(e: Event) => this.#onInput('description', e)}></textarea>
                </div>
              `
            : nothing}

          ${this.#renderColours()}
        </div>

        <div slot='actions'>
          <uui-button label='Cancel' look='secondary' @click=${this._rejectModal}></uui-button>
          <uui-button
            label='Submit'
            look='primary'
            color='positive'
            @click=${this._submitModal}></uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    UmbTextStyles,
    css`
      .content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: var(--uui-size-layout-1, 1rem);
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--uui-color-text-alt, #666);
      }

      input,
      textarea {
        width: 100%;
        box-sizing: border-box;
        padding: 0.4rem 0.5rem;
        border: 1px solid var(--uui-color-border, #ccc);
        border-radius: 3px;
        background: var(--uui-color-surface, #fff);
        color: var(--uui-color-text, #000);
        font: inherit;
      }

      .readonly {
        font-size: 0.95em;
      }

      .hint {
        font-size: 0.75rem;
        color: var(--uui-color-text-alt, #666);
      }

      .swatches {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
      }

      .swatch {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.2);
        cursor: pointer;
        padding: 0;
      }

      .swatch.selected {
        outline: 2px solid var(--uui-color-selected, #006eff);
        outline-offset: 2px;
      }

      .warning {
        font-size: 0.8rem;
        color: var(--uui-color-warning-emphasis, #d29c00);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    [elementName]: GMapsMarkerDrawerElement;
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 10 new tests.

- [ ] **Step 6: Commit**

```bash
git add src/multi-marker/marker-drawer/
git commit -m "feat: add the marker drawer sidebar modal"
```

---

## Task 7: The multi-marker editor element

The largest task. It is one task rather than several because the element is not independently testable until map, markers and value all work together.

**Files:**
- Create: `src/multi-marker/multi-marker-editor.element.ts`
- Create: `src/multi-marker/multi-marker-editor.element.test.ts`

**Interfaces:**
- Consumes: `MapSurfaceController`, `GeocodingController`, `GoogleMapsApi`, `GoogleMapsApiImpl`, `FakeMapsApi` (phase 2); `addMarker`, `removeMarker`, `updateMarker`, `reorderMarkers`, `canAddMarker`, `markerLimitsAreSane`, `newMarkerKey` (Task 4); `buildMultiMapValue`, `readMultiMapValue` (Task 5); `parseCoordinates`, `formatCoordinates` (phase 1); `GMAPS_MARKER_DRAWER_MODAL` (Task 6).
- Produces: default-exported `GMapsMultiMarkerEditorElement`, custom element `gmaps-multi-marker`, with a **settable `api` property** so tests can inject `FakeMapsApi`, and public `resetView()`.

**The one design decision this task adds to the spec:** the element exposes
`public api: GoogleMapsApi` defaulting to `new GoogleMapsApiImpl()`. Phase 2's
single editor hardcodes its api, which is precisely why no test can drive its
initialisation. Do not repeat that here.

- [ ] **Step 1: Write the failing tests**

Create `src/multi-marker/multi-marker-editor.element.test.ts`:

```ts
import { expect, fixture, html } from '@open-wc/testing';
import './multi-marker-editor.element.js';
import type GMapsMultiMarkerEditorElement from './multi-marker-editor.element.js';
import { FakeMapsApi } from '../maps/fake-maps-api.js';
import type { MultiMap } from '../types.js';

/** A stand-in for UmbPropertyEditorConfigCollection: only getValueByAlias is used. */
function config(values: Record<string, unknown>) {
  return {
    getValueByAlias: <T>(alias: string) => values[alias] as T,
  } as never;
}

async function editor(options: { value?: MultiMap; config?: Record<string, unknown> } = {}) {
  const api = new FakeMapsApi();
  const el = await fixture<GMapsMultiMarkerEditorElement>(
    html`<gmaps-multi-marker></gmaps-multi-marker>`,
  );
  el.api = api;
  el.config = config({ apikey: 'test-key', zoom: 12, maptype: 'roadmap', ...(options.config ?? {}) });
  el.value = options.value;
  await el.updateComplete;
  // Initialisation is async (library loading); give it a turn to settle.
  await el.whenInitialized;
  await el.updateComplete;
  return { el, api };
}

const markerValue = (count: number): MultiMap => ({
  markers: Array.from({ length: count }, (_, i) => ({
    key: `k${i}`,
    friendlyName: `Marker ${i}`,
    coordinates: { lat: i, lng: i },
  })),
  mapconfig: { zoom: 12, maptype: 'roadmap', centerCoordinates: { lat: 0, lng: 0 } },
});

describe('multi-marker editor', () => {
  it('creates the map through the injected api', async () => {
    const { api } = await editor();

    expect(api.configuredKey).to.equal('test-key');
    expect(api.lastMap).to.not.equal(undefined);
  });

  it('renders one chip per stored marker', async () => {
    const { el } = await editor({ value: markerValue(3) });

    expect(el.shadowRoot!.querySelectorAll('.chip')).to.have.length(3);
  });

  it('shows the marker count against the maximum', async () => {
    const { el } = await editor({ value: markerValue(2), config: { maxNumber: 10 } });

    expect(el.shadowRoot!.textContent).to.contain('2 of 10');
  });

  it('shows just the count when unlimited', async () => {
    const { el } = await editor({ value: markerValue(2), config: { maxNumber: 0 } });

    expect(el.shadowRoot!.textContent).to.contain('2 marker');
    expect(el.shadowRoot!.textContent).to.not.contain(' of ');
  });

  it('adds a marker at the map centre', async () => {
    const { el } = await editor({ value: markerValue(1) });
    el.addMarkerAtCentre();
    await el.updateComplete;

    expect(el.value!.markers).to.have.length(2);
  });

  it('refuses to add beyond the maximum', async () => {
    const { el } = await editor({ value: markerValue(2), config: { maxNumber: 2 } });
    el.addMarkerAtCentre();
    await el.updateComplete;

    expect(el.value!.markers).to.have.length(2);
  });

  it('disables the add affordance at the maximum', async () => {
    const { el } = await editor({ value: markerValue(2), config: { maxNumber: 2 } });
    const add = el.shadowRoot!.querySelector('#add-marker') as HTMLButtonElement;

    expect(add.disabled).to.equal(true);
  });

  it('removes a marker by key', async () => {
    const { el } = await editor({ value: markerValue(3) });
    el.removeMarker('k1');
    await el.updateComplete;

    expect(el.value!.markers.map((m) => m.key)).to.deep.equal(['k0', 'k2']);
  });

  it('reorders markers and keeps the new order in the value', async () => {
    const { el } = await editor({ value: markerValue(3) });
    el.reorder(['k2', 'k0', 'k1']);
    await el.updateComplete;

    expect(el.value!.markers.map((m) => m.key)).to.deep.equal(['k2', 'k0', 'k1']);
  });

  it('applies an edited marker from the drawer', async () => {
    const { el } = await editor({ value: markerValue(2) });
    el.applyMarkerEdit({ key: 'k1', friendlyName: 'Renamed', coordinates: { lat: 1, lng: 1 } });
    await el.updateComplete;

    expect(el.value!.markers[1].friendlyName).to.equal('Renamed');
    expect(el.value!.markers[0].friendlyName).to.equal('Marker 0');
  });

  it('reads a legacy single-map value as one marker', async () => {
    const legacy = {
      address: { friendlyName: 'HQ', coordinates: { lat: 1, lng: 2 } },
      mapconfig: { zoom: 15, maptype: 'roadmap' },
    } as never;
    const { el } = await editor({ value: legacy });

    expect(el.value!.markers).to.have.length(1);
    expect(el.value!.markers[0].friendlyName).to.equal('HQ');
  });

  it('dispatches change when markers change', async () => {
    const { el } = await editor({ value: markerValue(1) });
    let changes = 0;
    el.addEventListener('change', () => { changes++; });

    el.addMarkerAtCentre();
    await el.updateComplete;

    expect(changes).to.be.greaterThan(0);
  });

  it('does not dispatch change merely from loading a value', async () => {
    // Marking a document dirty on load is the bug this guards.
    const api = new FakeMapsApi();
    const el = await fixture<GMapsMultiMarkerEditorElement>(
      html`<gmaps-multi-marker></gmaps-multi-marker>`,
    );
    let changes = 0;
    el.addEventListener('change', () => { changes++; });
    el.api = api;
    el.config = config({ apikey: 'test-key', zoom: 12, maptype: 'roadmap' });
    el.value = markerValue(2);
    await el.updateComplete;
    await el.whenInitialized;
    await el.updateComplete;

    expect(changes).to.equal(0);
  });

  it('frames all markers on load when nothing framed them before', async () => {
    const value = markerValue(3);
    value.mapconfig.centerCoordinates = undefined;
    const { api } = await editor({ value });

    expect(api.lastMap!.fitBoundsCalls).to.have.length(1);
  });

  it('honours a stored centre instead of framing the markers', async () => {
    // Opening a document must never move a framing an editor chose.
    const { api } = await editor({ value: markerValue(3) });

    expect(api.lastMap!.fitBoundsCalls).to.have.length(0);
    expect(api.lastMap!.center).to.deep.equal({ lat: 0, lng: 0 });
  });

  it('warns when min exceeds max and treats both as unlimited', async () => {
    const { el } = await editor({ value: markerValue(3), config: { minNumber: 5, maxNumber: 2 } });

    expect(el.shadowRoot!.textContent).to.contain('misconfigured');
    el.addMarkerAtCentre();
    await el.updateComplete;
    expect(el.value!.markers).to.have.length(4);
  });

  it('is invalid below the minimum', async () => {
    const { el } = await editor({ value: markerValue(1), config: { minNumber: 3 } });

    expect(el.checkValidity()).to.equal(false);
  });

  it('is valid at or above the minimum', async () => {
    const { el } = await editor({ value: markerValue(3), config: { minNumber: 3 } });

    expect(el.checkValidity()).to.equal(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `./multi-marker-editor.element.js` does not exist.

- [ ] **Step 3: Create the element**

Create `src/multi-marker/multi-marker-editor.element.ts`. Written against the
controllers phase 2 produced; read `src/controllers/map-surface.controller.ts`
and `src/controllers/geocoding.controller.ts` before starting.

```ts
/// <reference types='@types/google.maps' />
import { LitElement, css, customElement, html, nothing, property, state } from '@umbraco-cms/backoffice/external/lit';
import type { UmbPropertyEditorConfigCollection, UmbPropertyEditorUiElement } from '@umbraco-cms/backoffice/property-editor';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UmbFormControlMixin } from '@umbraco-cms/backoffice/validation';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { umbOpenModal } from '@umbraco-cms/backoffice/modal';

import { DEFAULT_LOCATION } from '../types.js';
import type { Location, MapType, Marker, MarkerColor, MultiMap } from '../types.js';
import { formatCoordinates, parseCoordinates } from '../core/coordinates.js';
import {
  addMarker,
  canAddMarker,
  markerLimitsAreSane,
  removeMarker as removeFromCollection,
  reorderMarkers,
  updateMarker,
} from '../core/marker-collection.js';
import { buildMultiMapValue, readMultiMapValue } from '../core/value.js';
import { GoogleMapsApiImpl } from '../maps/google-maps-api.js';
import type { GoogleMapsApi } from '../maps/maps-api.js';
import { MapSurfaceController } from '../controllers/map-surface.controller.js';
import { GeocodingController } from '../controllers/geocoding.controller.js';
import { GMAPS_MARKER_DRAWER_MODAL } from './marker-drawer/marker-drawer.token.js';
import { onGoogleMapsAuthFailure } from '../google-maps-auth.js';

const elementName = 'gmaps-multi-marker';

const AUTH_FAILURE_MESSAGE =
  'Google Maps rejected this API key. Check that the key is valid, that billing is enabled, and that the site is allowed by the key\'s HTTP referrer restrictions.';

@customElement(elementName)
export default class GMapsMultiMarkerEditorElement
  extends UmbFormControlMixin<MultiMap | undefined>(UmbElementMixin(LitElement))
  implements UmbPropertyEditorUiElement
{
  /** Injectable so tests can drive initialisation with FakeMapsApi. */
  @property({ attribute: false })
  public api: GoogleMapsApi = new GoogleMapsApiImpl();

  #mapSurface?: MapSurfaceController;
  #geocoding?: GeocodingController;
  #markerElements = new Map<string, google.maps.marker.AdvancedMarkerElement>();
  #placeAutocomplete?: google.maps.places.PlaceAutocompleteElement;
  #initialValue?: MultiMap;
  #initialized = false;
  #valueReceived = false;
  #configReceived = false;
  #suppressChange = false;
  #resolveInitialized!: () => void;

  /** Resolves once the map has been created; tests await this. */
  public readonly whenInitialized = new Promise<void>((resolve) => {
    this.#resolveInitialized = resolve;
  });

  @state() private _markers: Marker[] = [];
  @state() private _selectedKey?: string;
  @state() private _notice?: string;
  @state() private _loading = true;

  private _apiKey?: string;
  private _mapType: MapType = 'roadmap';
  private _zoomLevel = 12;
  private _center?: Location;
  private _defaultLocation: Location = DEFAULT_LOCATION;
  private _hideMap = false;
  private _enableDescription = false;
  private _palette: MarkerColor[] = [];
  private _min?: number;
  private _max?: number;
  private _limitsSane = true;

  @property({ attribute: false })
  public override set value(next: MultiMap | undefined) {
    this.#valueReceived = true;
    if (!this.#initialValue && next) this.#initialValue = structuredClone(next);
    super.value = next;
  }
  public override get value(): MultiMap | undefined {
    return super.value;
  }

  @property({ attribute: false })
  public set config(config: UmbPropertyEditorConfigCollection) {
    this.#configReceived = true;
    this._apiKey = config?.getValueByAlias<string>('apikey');
    this._mapType = config?.getValueByAlias<MapType>('maptype') || 'roadmap';
    this._hideMap = config?.getValueByAlias<boolean>('hideMap') || false;
    this._zoomLevel = config?.getValueByAlias<number>('zoom') || 12;
    this._enableDescription = config?.getValueByAlias<boolean>('enableDescription') || false;
    this._palette = config?.getValueByAlias<MarkerColor[]>('markerColors') ?? [];
    this._min = config?.getValueByAlias<number>('minNumber') || undefined;
    this._max = config?.getValueByAlias<number>('maxNumber') || undefined;

    this._limitsSane = markerLimitsAreSane(this._min, this._max);
    if (!this._limitsSane) {
      console.warn(
        '[Our.Umbraco.GMaps] Multi Marker is misconfigured: minNumber is greater than maxNumber. Both limits are being ignored.',
        this,
      );
      this._min = undefined;
      this._max = undefined;
    }

    const configured = parseCoordinates(config?.getValueByAlias<string>('location'));
    if (configured) {
      this._defaultLocation = configured;
      this._center ??= configured;
    }
  }

  constructor() {
    super();
    this.addValidator(
      'rangeUnderflow',
      () => `At least ${this._min} marker${this._min === 1 ? '' : 's'} required.`,
      () => !!this._min && this._markers.length < this._min,
    );
    this.addValidator(
      'rangeOverflow',
      () => `No more than ${this._max} marker${this._max === 1 ? '' : 's'} allowed.`,
      () => !!this._max && this._markers.length > this._max,
    );
    onGoogleMapsAuthFailure(() => {
      this._notice = AUTH_FAILURE_MESSAGE;
      this._loading = false;
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#mapSurface?.destroy();
  }

  protected override updated(changed: Map<string, unknown>) {
    super.updated(changed);
    void this.#tryInitialize();
  }

  async #tryInitialize() {
    if (this.#initialized) return;
    if (!this.#valueReceived || !this.#configReceived) return;
    this.#initialized = true;
    await this.#initialize();
    this.#resolveInitialized();
  }

  async #initialize() {
    const stored = readMultiMapValue(this.value);
    this._markers = stored.markers;
    // The stored centre and zoom are the framing this document was saved with
    // and beat any configured default, which exists to frame new content.
    this._center = stored.center ?? this._center ?? this._defaultLocation;
    this._zoomLevel = stored.zoom ?? this._zoomLevel;

    this.api.configure(this._apiKey ?? '');
    this.#geocoding = new GeocodingController(this.api);
    this.#mapSurface = new MapSurfaceController(this.api);

    const map = await this.#mapSurface.create(
      this.shadowRoot?.getElementById('map') as HTMLElement,
      {
        center: this._center,
        zoom: this._zoomLevel,
        maptype: this._mapType,
        onCenterChanged: (center) => {
          this._center = center;
          this.#commit();
        },
        onZoomChanged: (zoom) => {
          this._zoomLevel = zoom;
          this.#commit();
        },
        onCtrlHintNeeded: () => this.#showCtrlHint(),
      },
    );

    // Plain click drops a pin: ctrl+drag already owns panning, so a click is free.
    map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      void this.#addMarkerAt({ lat: event.latLng.lat(), lng: event.latLng.lng() });
    });

    await this.#syncMarkerElements(map);
    await this.#setupAutocomplete(map);

    // Markers but no stored framing: show them all rather than opening on a
    // configured default that may not contain any of them. A stored centre
    // always wins, so this never moves a framing an editor chose.
    if (!stored.center && this._markers.some((m) => m.coordinates)) {
      this.fitToMarkers();
    }

    this._loading = false;
  }

  // ---- markers -----------------------------------------------------------

  /** Reconcile the pure marker list onto real AdvancedMarkerElements. */
  async #syncMarkerElements(map: google.maps.Map) {
    for (const [key, element] of this.#markerElements) {
      if (!this._markers.some((m) => m.key === key)) {
        element.map = null;
        this.#markerElements.delete(key);
      }
    }

    for (const marker of this._markers) {
      const position = marker.coordinates ?? this._defaultLocation;
      const existing = this.#markerElements.get(marker.key);
      if (existing) {
        existing.position = position;
        continue;
      }

      const element = await this.api.createMarker({ map, position, gmpDraggable: true });
      element.addListener('dragend', () => {
        const p = element.position;
        if (!p) return;
        const lat = typeof p.lat === 'function' ? p.lat() : p.lat;
        const lng = typeof p.lng === 'function' ? p.lng() : p.lng;
        void this.#moveMarker(marker.key, { lat, lng });
      });
      element.addListener('click', () => void this.openDrawer(marker.key));
      this.#markerElements.set(marker.key, element);
    }
  }

  async #addMarkerAt(coordinates: Location) {
    if (!canAddMarker(this._markers, this._max)) return;

    const next = addMarker(this._markers, { coordinates }, this._max);
    const created = next[next.length - 1];
    this._markers = next;
    this.#commit();
    await this.#refreshMarkerElements();

    // Best effort: give the new pin a readable address.
    const { result } = (await this.#geocoding?.reverse(coordinates)) ?? {};
    if (result) {
      this._markers = updateMarker(this._markers, created.key, {
        ...result.address,
        coordinates,
      });
      this.#commit();
    }
  }

  async #moveMarker(key: string, coordinates: Location) {
    this._markers = updateMarker(this._markers, key, { coordinates });
    this.#commit();

    const { result } = (await this.#geocoding?.reverse(coordinates)) ?? {};
    if (result) {
      this._markers = updateMarker(this._markers, key, { ...result.address, coordinates });
      this.#commit();
    }
  }

  async #refreshMarkerElements() {
    const map = this.#mapSurface?.map;
    if (map) await this.#syncMarkerElements(map);
  }

  // ---- public operations, also the test surface --------------------------

  public addMarkerAtCentre() {
    void this.#addMarkerAt(this._center ?? this._defaultLocation);
  }

  public removeMarker(key: string) {
    this._markers = removeFromCollection(this._markers, key);
    if (this._selectedKey === key) this._selectedKey = undefined;
    this.#commit();
    void this.#refreshMarkerElements();
  }

  public reorder(keys: string[]) {
    this._markers = reorderMarkers(this._markers, keys);
    this.#commit();
  }

  public applyMarkerEdit(marker: Marker) {
    const { key, ...patch } = marker;
    this._markers = updateMarker(this._markers, key, patch);
    this.#commit();
    void this.#refreshMarkerElements();
  }

  public async openDrawer(key: string) {
    const marker = this._markers.find((m) => m.key === key);
    if (!marker) return;

    this._selectedKey = key;
    try {
      const edited = await umbOpenModal(this, GMAPS_MARKER_DRAWER_MODAL, {
        data: {
          marker,
          palette: this._palette,
          enableDescription: this._enableDescription,
        },
      });
      this.applyMarkerEdit(edited);
    } catch {
      // Cancelled - umbOpenModal rejects, and abandoning the edit is the point.
    } finally {
      this._selectedKey = undefined;
    }
  }

  /**
   * Frame every marker.
   *
   * The bounds are computed as a plain literal rather than with
   * `new google.maps.LatLngBounds()`, so this stays reachable from tests running
   * against FakeMapsApi - the SDK global does not exist there. `fitBounds`
   * accepts a LatLngBoundsLiteral, so nothing is lost.
   */
  public fitToMarkers() {
    const map = this.#mapSurface?.map;
    const positioned = this._markers
      .map((m) => m.coordinates)
      .filter((c): c is Location => !!c);
    if (!map || positioned.length === 0) return;

    const lats = positioned.map((c) => c.lat);
    const lngs = positioned.map((c) => c.lng);

    map.fitBounds({
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    });
  }

  public resetView() {
    const restored = readMultiMapValue(this.#initialValue);
    this._markers = restored.markers;
    this._center = restored.center ?? this._defaultLocation;
    this._zoomLevel = restored.zoom ?? this._zoomLevel;
    this.#mapSurface?.setCenter(this._center);
    this.#mapSurface?.setZoom(this._zoomLevel);
    this.#commit();
    void this.#refreshMarkerElements();
  }

  // ---- value -------------------------------------------------------------

  #commit() {
    if (this.#suppressChange) return;

    this.value = buildMultiMapValue({
      markers: this._markers,
      zoom: this._zoomLevel,
      maptype: this._mapType,
      center: this._center,
      defaultLocation: this._defaultLocation,
    });

    this.dispatchEvent(new UmbChangeEvent());
  }

  // ---- search ------------------------------------------------------------

  async #setupAutocomplete(map: google.maps.Map) {
    const autocomplete = await this.api.createAutocomplete();
    this.#placeAutocomplete = autocomplete;
    this.shadowRoot?.getElementById('place-autocomplete-container')?.appendChild(autocomplete);

    map.addListener('idle', () => {
      const bounds = map.getBounds();
      if (bounds) autocomplete.locationBias = bounds;
    });

    // Coordinates typed into the box are intercepted in the capture phase, before
    // the component's own Enter handling can swallow them.
    autocomplete.addEventListener(
      'keydown',
      (event: Event) => {
        const ke = event as KeyboardEvent;
        if (ke.key !== 'Enter') return;
        const text =
          (event.composedPath().find((el): el is HTMLInputElement => el instanceof HTMLInputElement)
            ?.value ?? '');
        const coords = parseCoordinates(text);
        if (!coords) return;
        ke.preventDefault();
        ke.stopPropagation();
        void this.#addMarkerAt(coords);
        autocomplete.value = '';
      },
      { capture: true },
    );

    autocomplete.addEventListener('gmp-select', async (event) => {
      const { placePrediction } = event as unknown as {
        placePrediction?: { toPlace(): google.maps.places.Place };
      };
      if (!placePrediction) return;

      const place = placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'addressComponents', 'location'],
      });
      if (!place.location) return;

      const coordinates = { lat: place.location.lat(), lng: place.location.lng() };
      if (!canAddMarker(this._markers, this._max)) return;

      const next = addMarker(
        this._markers,
        {
          coordinates,
          full_address: place.formattedAddress ?? undefined,
          friendlyName: place.displayName ?? undefined,
        },
        this._max,
      );
      this._markers = next;
      this._center = coordinates;
      this.#commit();
      await this.#refreshMarkerElements();
      this.#mapSurface?.setCenter(coordinates);
      autocomplete.value = '';
    });
  }

  #showCtrlHint() {
    const overlay = this.shadowRoot?.getElementById('ctrlScrollOverlay');
    if (!overlay) return;
    overlay.classList.add('visible');
    globalThis.setTimeout(() => overlay.classList.remove('visible'), 2000);
  }

  // ---- render ------------------------------------------------------------

  #countLabel() {
    if (this._max) return `${this._markers.length} of ${this._max}`;
    return `${this._markers.length} marker${this._markers.length === 1 ? '' : 's'}`;
  }

  #chipLabel(marker: Marker) {
    return (
      marker.friendlyName ||
      marker.full_address ||
      formatCoordinates(marker.coordinates) ||
      'Marker'
    );
  }

  override render() {
    const atMax = !canAddMarker(this._markers, this._max);

    return html`
      <div class='search'>
        <div id='place-autocomplete-container'></div>
        ${this._notice ? html`<div class='notice' role='alert'>${this._notice}</div>` : nothing}
        ${!this._limitsSane
          ? html`<div class='warning'>
              This property is misconfigured: the minimum number of markers is greater than the
              maximum, so both limits are being ignored.
            </div>`
          : nothing}
      </div>

      ${this._loading ? html`<uui-loader></uui-loader>` : nothing}

      <div class='map-container' style=${this._hideMap ? 'display:none;' : ''}>
        <div id='map'></div>
        <div class='ctrl-scroll-overlay' id='ctrlScrollOverlay'>Use ctrl + drag to pan the map</div>
      </div>

      <div class='marker-bar'>
        <span class='count'>${this.#countLabel()}</span>
        <uui-button
          label='Fit to markers'
          look='secondary'
          compact
          ?disabled=${this._markers.length === 0}
          @click=${() => this.fitToMarkers()}>Fit to markers</uui-button>
      </div>

      <div class='chips' id='chips'>
        ${this._markers.map(
          (marker) => html`
            <div
              class='chip ${this._selectedKey === marker.key ? 'selected' : ''}'
              data-key=${marker.key}>
              <span class='grip' title='Drag to reorder'>⠿</span>
              ${marker.color
                ? html`<span class='dot' style='background:${marker.color}'></span>`
                : nothing}
              <button type='button' class='chip-label' @click=${() => this.openDrawer(marker.key)}>
                ${this.#chipLabel(marker)}
              </button>
              <button
                type='button'
                class='chip-remove'
                aria-label='Remove ${this.#chipLabel(marker)}'
                @click=${() => this.removeMarker(marker.key)}>✕</button>
            </div>
          `,
        )}
        <button
          type='button'
          id='add-marker'
          class='chip add'
          ?disabled=${atMax}
          @click=${() => this.addMarkerAtCentre()}>+ Add at centre</button>
      </div>
    `;
  }

  static override readonly styles = [
    UmbTextStyles,
    css`
      .search { display: flex; flex-direction: column; gap: .75em; }
      #place-autocomplete-container { width: 100%; }
      .map-container { position: relative; width: 100%; margin-top: 1em; }
      #map { height: 500px; width: 100%; }
      .ctrl-scroll-overlay {
        position: absolute; inset: 0; background: rgba(0,0,0,.55); color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.4rem; z-index: 1000; pointer-events: none;
        visibility: hidden; opacity: 0; transition: visibility .3s, opacity .3s ease-in-out;
      }
      .ctrl-scroll-overlay.visible { visibility: visible; opacity: 1; }
      .marker-bar {
        display: flex; align-items: center; justify-content: space-between;
        margin-top: .75em; font-size: .85em;
      }
      .count { text-transform: uppercase; letter-spacing: .05em; color: var(--uui-color-text-alt, #666); }
      .chips { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .5em; }
      .chip {
        display: inline-flex; align-items: center; gap: .35rem;
        border: 1px solid var(--uui-color-border, #ccc); border-radius: 20px;
        padding: .25rem .55rem; background: var(--uui-color-surface, #fff); font-size: .85em;
      }
      .chip.selected { border-color: var(--uui-color-selected, #006eff); }
      .chip.add { border-style: dashed; cursor: pointer; }
      .chip.add[disabled] { opacity: .5; cursor: not-allowed; }
      .grip { cursor: grab; color: var(--uui-color-text-alt, #999); }
      .dot { width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(0,0,0,.15); }
      .chip-label, .chip-remove {
        background: none; border: none; padding: 0; cursor: pointer;
        font: inherit; color: inherit;
      }
      .chip-remove { color: var(--uui-color-text-alt, #999); }
      .notice, .warning {
        padding: .6em .75em; font-size: .9em; border-radius: 3px;
        background: var(--uui-color-surface-alt, #f3f3f5);
        border-left: 3px solid var(--uui-color-danger, #d42054);
      }
      .warning { border-left-color: var(--uui-color-warning-emphasis, #d29c00); }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    [elementName]: GMapsMultiMarkerEditorElement;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. If "does not dispatch change merely from loading a value" fails,
`#initialize` is calling `#commit()` somewhere it should not — find it rather
than relaxing the test; that assertion is what stops documents loading dirty.

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/multi-marker/multi-marker-editor.element.ts \
        src/multi-marker/multi-marker-editor.element.test.ts
git commit -m "feat: add the multi marker editor element"
```

---

## Task 8: Chip reordering with `UmbSorterController`

Split from Task 7 because the sorter is a distinct mechanism a reviewer could reject on its own, and the reorder *model* logic is already proven by Task 4.

**Files:**
- Modify: `src/multi-marker/multi-marker-editor.element.ts`
- Modify: `src/multi-marker/multi-marker-editor.element.test.ts`

**Interfaces:**
- Consumes: `UmbSorterController` from `@umbraco-cms/backoffice/sorter`; `reorder(keys: string[])` (Task 7).
- Produces: no new public surface.

- [ ] **Step 1: Write the failing test**

Append to `src/multi-marker/multi-marker-editor.element.test.ts`:

```ts
describe('multi-marker editor: chip sorting', () => {
  it('wires a sorter over the chips whose model matches the markers', async () => {
    const { el } = await editor({ value: markerValue(3) });
    const sorter = el.sorterForTests;

    expect(sorter).to.not.equal(undefined);
    expect(sorter!.getModel().map((m) => m.key)).to.deep.equal(['k0', 'k1', 'k2']);
  });

  it('writes a sorter-reported order into the value', async () => {
    const { el } = await editor({ value: markerValue(3) });
    // Simulate what UmbSorterController does on drop.
    el.sorterForTests!.setModel([
      { key: 'k2', friendlyName: 'Marker 2' },
      { key: 'k0', friendlyName: 'Marker 0' },
      { key: 'k1', friendlyName: 'Marker 1' },
    ]);
    el.reorder(['k2', 'k0', 'k1']);
    await el.updateComplete;

    expect(el.value!.markers.map((m) => m.key)).to.deep.equal(['k2', 'k0', 'k1']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `sorterForTests` is undefined.

- [ ] **Step 3: Add the sorter**

In `src/multi-marker/multi-marker-editor.element.ts`, add the import:

```ts
import { UmbSorterController } from '@umbraco-cms/backoffice/sorter';
```

Add the controller as a field:

```ts
  /**
   * Drag-to-reorder over the chips. The stored order drives front-end legends,
   * so it is content, not presentation.
   */
  #sorter = new UmbSorterController<Marker, HTMLElement>(this, {
    getUniqueOfElement: (element) => element.dataset.key,
    getUniqueOfModel: (marker) => marker.key,
    identifier: 'GMaps.MultiMarker.Chips',
    itemSelector: '.chip:not(.add)',
    containerSelector: '#chips',
    ignorerSelector: 'button',
    handleSelector: '.grip',
    onChange: ({ model }) => this.reorder(model.map((m) => m.key)),
  });

  /** Exposed so tests can assert on the sorter's model without faking drag events. */
  public get sorterForTests() {
    return this.#sorter;
  }
```

Keep the sorter's model in step with the markers — add this to `updated()`,
after the `super.updated(changed)` call:

```ts
    this.#sorter.setModel(this._markers);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/multi-marker/multi-marker-editor.element.ts \
        src/multi-marker/multi-marker-editor.element.test.ts
git commit -m "feat: reorder markers by dragging their chips"
```

---

## Task 9: Value preset, manifests and the clear-all action

Registration and the two small satellites, folded together — none is independently useful and they share one manifest file.

**Files:**
- Create: `src/multi-marker/multi-marker-property-value-preset.ts`
- Create: `src/multi-marker/actions/clear/clear-markers-property-action.api.ts`
- Create: `src/multi-marker/actions/reset/reset-property-action.api.ts`
- Create: `src/multi-marker/manifest.ts`
- Modify: `src/bundle.manifests.ts`

**Interfaces:**
- Consumes: `GMapsSettingsRepository` from `src/repository/settings.repository.ts`; `GMAPS_MARKER_DRAWER_MODAL` (Task 6); the editor element (Task 7).
- Produces: manifests for `GMaps.PropertyEditorUi.MultiMap`, `GMaps.PropertyValuePreset.MultiMap`, `GMaps.Modal.MarkerDrawer`, `GMaps.PropertyAction.ClearMarkers`, `GMaps.PropertyAction.ResetMultiMapView`.

- [ ] **Step 1: Create the value preset**

Create `src/multi-marker/multi-marker-property-value-preset.ts`. Mirrors the
single editor's default-location resolution order — read
`src/single-marker/single-marker-property-value-preset.ts` alongside this:

```ts
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import type { UmbPropertyValuePreset } from '@umbraco-cms/backoffice/property';
import type { UmbPropertyEditorConfig } from '@umbraco-cms/backoffice/property-editor';
import { GMapsSettingsRepository } from '../repository/settings.repository.js';
import { DEFAULT_LOCATION } from '../types.js';
import type { Location, MapType, MultiMap } from '../types.js';
import { parseCoordinates } from '../core/coordinates.js';

/**
 * Seeds an empty multi-marker value so the map can open at the configured
 * centre before anything is placed.
 *
 * Note this makes the property non-null with zero markers, which is exactly why
 * the minimum is enforced by the element's own validator rather than by
 * Umbraco's `mandatory` flag.
 */
export class GMapsMultiMarkerValuePreset implements UmbPropertyValuePreset<MultiMap, UmbPropertyEditorConfig> {
  #host: UmbControllerHost;

  constructor(host: UmbControllerHost) {
    this.#host = host;
  }

  async processValue(value: MultiMap | undefined, config: UmbPropertyEditorConfig): Promise<MultiMap> {
    if (value !== undefined) return value;

    let coordinates: Location | undefined = parseCoordinates(
      config.find((x) => x.alias === 'location')?.value?.toString(),
    );
    if (!coordinates) {
      const settings = await new GMapsSettingsRepository(this.#host).settings();
      coordinates = parseCoordinates(settings.data?.defaultLocation ?? undefined) ?? DEFAULT_LOCATION;
    }

    return {
      markers: [],
      mapconfig: {
        zoom: Number(config.find((x) => x.alias === 'zoom')?.value) || 12,
        maptype: (config.find((x) => x.alias === 'maptype')?.value as MapType) || 'roadmap',
        centerCoordinates: coordinates,
      },
    };
  }

  destroy(): void {}
}

export { GMapsMultiMarkerValuePreset as api };
```

- [ ] **Step 2: Create the clear action**

Create `src/multi-marker/actions/clear/clear-markers-property-action.api.ts`:

```ts
import { UmbPropertyActionArgs, UmbPropertyActionBase } from '@umbraco-cms/backoffice/property-action';
import { UMB_PROPERTY_CONTEXT } from '@umbraco-cms/backoffice/property';
import { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';

export class GMapsPropertyActionClearMarkers extends UmbPropertyActionBase {
  #init: Promise<unknown>;
  #propertyContext?: typeof UMB_PROPERTY_CONTEXT.TYPE;

  constructor(host: UmbControllerHost, args: UmbPropertyActionArgs<never>) {
    super(host, args);

    this.#init = Promise.all([
      this.consumeContext(UMB_PROPERTY_CONTEXT, (context) => {
        this.#propertyContext = context;
      }).asPromise({ preventTimeout: true }),
    ]);
  }

  async execute() {
    await this.#init;
    if (!this.#propertyContext) throw new Error('Property context not found');

    // Clearing the value drops back to the preset, which re-seeds an empty
    // marker list at the configured centre.
    this.#propertyContext.clearValue();
  }
}

export { GMapsPropertyActionClearMarkers as api };
```

- [ ] **Step 2b: Create the reset action**

Create `src/multi-marker/actions/reset/reset-property-action.api.ts`. Same shape
as the single editor's — read `src/single-marker/actions/reset/reset-property-action.api.ts`
alongside it:

```ts
import { UmbPropertyActionArgs, UmbPropertyActionBase } from '@umbraco-cms/backoffice/property-action';
import { UMB_PROPERTY_CONTEXT } from '@umbraco-cms/backoffice/property';
import { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import type GMapsMultiMarkerEditorElement from '../../multi-marker-editor.element.js';

export class GMapsPropertyActionResetMultiMap extends UmbPropertyActionBase {
  #init: Promise<unknown>;
  #propertyContext?: typeof UMB_PROPERTY_CONTEXT.TYPE;

  constructor(host: UmbControllerHost, args: UmbPropertyActionArgs<never>) {
    super(host, args);

    this.#init = Promise.all([
      this.consumeContext(UMB_PROPERTY_CONTEXT, (context) => {
        this.#propertyContext = context;
      }).asPromise({ preventTimeout: true }),
    ]);
  }

  async execute() {
    await this.#init;
    if (!this.#propertyContext) throw new Error('Property context not found');

    const editor = this.#propertyContext.getEditor() as GMapsMultiMarkerEditorElement | undefined;
    if (editor && typeof editor.resetView === 'function') {
      editor.resetView();
    }
  }
}

export { GMapsPropertyActionResetMultiMap as api };
```

- [ ] **Step 3: Create the manifests**

Create `src/multi-marker/manifest.ts`:

```ts
import { UMB_PROPERTY_HAS_VALUE_CONDITION_ALIAS } from '@umbraco-cms/backoffice/property';

export const manifests: Array<UmbExtensionManifest> = [
  {
    type: 'propertyEditorUi',
    alias: 'GMaps.PropertyEditorUi.MultiMap',
    name: 'Our.Umbraco.GMaps Multi Property Editor UI',
    element: () => import('./multi-marker-editor.element.js'),
    meta: {
      label: 'Google Maps Multi Marker',
      icon: 'icon-map-location',
      group: 'richContent',
      propertyEditorSchemaAlias: 'Our.Umbraco.GMaps.Multi',
      settings: {
        properties: [
          {
            alias: 'hideMap',
            label: 'Hide Map',
            description: 'Removes the map from display but maintains all functionality.',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.Toggle',
          },
          {
            alias: 'enableDescription',
            label: 'Enable description',
            description: 'Adds a free-text description to each marker, for info windows and captions.',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.Toggle',
          },
          {
            alias: 'minNumber',
            label: 'Minimum markers',
            description: 'The fewest markers this property will accept. Leave empty for no minimum.',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.Integer',
          },
          {
            alias: 'maxNumber',
            label: 'Maximum markers',
            description: 'The most markers this property will accept. 0 or empty means unlimited.',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.Integer',
          },
          {
            alias: 'markerColors',
            label: 'Marker colours',
            description:
              'The palette editors can choose from for each marker. Leave empty to hide the colour control. Labels travel to the front-end, so name them for meaning ("Retail") rather than appearance ("Blue").',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.ColorSwatchesEditor',
          },
          {
            alias: 'apikey',
            label: 'Google API Key',
            description: 'Your Google Maps API Key',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.TextBox',
          },
          {
            alias: 'location',
            label: 'Default Location',
            description:
              'The coordinates (lat, long) of the centre this map will show. Example: 52.379189, 4.899431',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.TextBox',
          },
          {
            alias: 'zoom',
            label: 'Default zoom',
            description: 'The default zoom level of the map. Defaults to 12',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.Integer',
          },
          {
            alias: 'maptype',
            label: 'Map type',
            description: "The type of map to display. Defaults to 'roadmap'.",
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.RadioButtonList',
            config: [{ alias: 'items', value: ['Roadmap', 'Hybrid', 'Satellite', 'Terrain', 'Styled'] }],
          },
          {
            alias: 'mapstyle',
            label: 'Map style',
            description: 'Style of the map. Enter your SnazzyMaps.com API key to get the styles',
            propertyEditorUiAlias: 'GMaps.PropertyEditorUi.SnazzyMaps',
          },
        ],
        defaultData: [{ alias: 'zoom', value: 12 }],
      },
    },
  },
  {
    type: 'propertyValuePreset',
    alias: 'GMaps.PropertyValuePreset.MultiMap',
    name: 'Our.Umbraco.GMaps Multi Marker Default Value',
    api: () => import('./multi-marker-property-value-preset.js'),
    forPropertyEditorUiAlias: 'GMaps.PropertyEditorUi.MultiMap',
  },
  {
    type: 'modal',
    alias: 'GMaps.Modal.MarkerDrawer',
    name: 'Our.Umbraco.GMaps Marker Drawer',
    element: () => import('./marker-drawer/marker-drawer.element.js'),
  },
  {
    type: 'propertyAction',
    kind: 'default',
    alias: 'GMaps.PropertyAction.ClearMarkers',
    name: 'GMaps Clear Markers Property Action',
    weight: 20,
    forPropertyEditorUis: ['GMaps.PropertyEditorUi.MultiMap'],
    conditions: [{ alias: UMB_PROPERTY_HAS_VALUE_CONDITION_ALIAS }],
    api: () => import('./actions/clear/clear-markers-property-action.api.js'),
    meta: {
      icon: 'icon-badge-remove',
      label: 'Clear all markers',
    },
  },
  {
    type: 'propertyAction',
    kind: 'default',
    alias: 'GMaps.PropertyAction.ResetMultiMapView',
    name: 'GMaps Reset Multi Map View Property Action',
    weight: 10,
    forPropertyEditorUis: ['GMaps.PropertyEditorUi.MultiMap'],
    conditions: [{ alias: UMB_PROPERTY_HAS_VALUE_CONDITION_ALIAS }],
    api: () => import('./actions/reset/reset-property-action.api.js'),
    meta: {
      icon: 'icon-undo',
      label: 'Reset Map View',
    },
  },
];
```

- [ ] **Step 4: Register the bundle**

In `src/bundle.manifests.ts`, add the import alongside the existing ones:

```ts
import { manifests as multiMap } from './multi-marker/manifest';
```

and add `...multiMap,` to the exported array, after `...singleMap,`.

- [ ] **Step 5: Verify tests and build**

Run: `npm test && npm run build`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/multi-marker/manifest.ts \
        src/multi-marker/multi-marker-property-value-preset.ts \
        src/multi-marker/actions/ src/bundle.manifests.ts
git commit -m "feat: register the multi marker editor, preset, drawer and clear action"
```

---

## Task 10: UFM support for multi values, and the valueless-block crash

**Files:**
- Modify: `src/ufm/elements/gmap-value.element.ts`
- Create: `src/ufm/elements/gmap-value.element.test.ts`

**Interfaces:**
- Consumes: `Map`, `MultiMap` from `src/types.ts`.
- Produces: the `gmp` UFM component additionally accepts `member-field` values `count`, `names` and `first`.

`gmap-value.element.ts` currently does `rawValue.address.full_address` with no
guard, so a block whose map property has no value throws today. Fixing that is
part of this task, not a separate one.

- [ ] **Step 1: Write the failing tests**

Create `src/ufm/elements/gmap-value.element.test.ts`:

```ts
import { expect } from '@open-wc/testing';
import { resolveGmapField } from './gmap-value.element.js';
import type { Map, MultiMap } from '../../types.js';

const single = {
  address: {
    full_address: '12 Collins St, Melbourne',
    friendlyName: 'HQ',
    coordinates: { lat: 1, lng: 2 },
  },
  mapconfig: { zoom: 12 },
} as Map;

const multi = {
  markers: [
    { key: 'a', friendlyName: 'HQ', full_address: '12 Collins St', coordinates: { lat: 1, lng: 2 } },
    { key: 'b', friendlyName: 'Depot', full_address: '88 Dock Rd', coordinates: { lat: 3, lng: 4 } },
  ],
  mapconfig: { zoom: 12 },
} as MultiMap;

describe('ufm/resolveGmapField', () => {
  it('returns undefined when the property has no value', () => {
    // The crash this guards: a block whose map property was never filled in.
    expect(resolveGmapField(undefined, 'address')).to.equal(undefined);
    expect(resolveGmapField(null, 'address')).to.equal(undefined);
  });

  it('returns undefined for an unknown field', () => {
    expect(resolveGmapField(single, 'nonsense')).to.equal(undefined);
  });

  describe('single values', () => {
    it('reads the address', () => {
      expect(resolveGmapField(single, 'address')).to.equal('12 Collins St, Melbourne');
    });

    it('reads the friendly name', () => {
      expect(resolveGmapField(single, 'friendlyName')).to.equal('HQ');
    });

    it('reads the coordinates', () => {
      expect(resolveGmapField(single, 'coordinates')).to.equal('1, 2');
    });

    it('reports a count of one', () => {
      expect(resolveGmapField(single, 'count')).to.equal('1');
    });
  });

  describe('multi values', () => {
    it('counts the markers', () => {
      expect(resolveGmapField(multi, 'count')).to.equal('2');
    });

    it('lists the marker names', () => {
      expect(resolveGmapField(multi, 'names')).to.equal('HQ, Depot');
    });

    it('reads the first marker address', () => {
      expect(resolveGmapField(multi, 'first')).to.equal('12 Collins St');
      expect(resolveGmapField(multi, 'address')).to.equal('12 Collins St');
    });

    it('reads the first marker friendly name', () => {
      expect(resolveGmapField(multi, 'friendlyName')).to.equal('HQ');
    });

    it('reads the first marker coordinates', () => {
      expect(resolveGmapField(multi, 'coordinates')).to.equal('1, 2');
    });

    it('handles an empty marker list without throwing', () => {
      const empty = { markers: [], mapconfig: { zoom: 12 } } as MultiMap;

      expect(resolveGmapField(empty, 'count')).to.equal('0');
      expect(resolveGmapField(empty, 'names')).to.equal('');
      expect(resolveGmapField(empty, 'address')).to.equal(undefined);
    });

    it('falls back to the address when a marker has no friendly name', () => {
      const unnamed = {
        markers: [{ key: 'a', full_address: '88 Dock Rd' }],
        mapconfig: { zoom: 12 },
      } as MultiMap;

      expect(resolveGmapField(unnamed, 'names')).to.equal('88 Dock Rd');
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `resolveGmapField` is not exported.

- [ ] **Step 3: Extract and extend the resolver**

In `src/ufm/elements/gmap-value.element.ts`, add this exported function above
the class, and add `MultiMap`, `Marker` to the `../../types` import:

```ts
/**
 * Read one field out of either map shape, for a block-list label.
 *
 * Exported and pure so it can be tested without a UFM render context - and
 * because the guards matter: a block whose map property was never filled in used
 * to throw here.
 */
export function resolveGmapField(
  value: Map | MultiMap | undefined | null,
  field: string | undefined,
): string | undefined {
  if (!value || !field) return undefined;

  const markers: Marker[] = 'markers' in value
    ? (value.markers ?? [])
    : value.address
      ? [{ key: 'single', ...value.address }]
      : [];

  const nameOf = (marker: Marker) =>
    marker.friendlyName || marker.full_address || undefined;

  switch (field) {
    case 'count':
      return String(markers.length);
    case 'names':
      return markers.map(nameOf).filter(Boolean).join(', ');
    case 'address':
    case 'first':
      return markers[0]?.full_address ?? undefined;
    case 'friendlyName':
      return markers[0]?.friendlyName ?? undefined;
    case 'coordinates': {
      const coordinates = markers[0]?.coordinates;
      return coordinates ? `${coordinates.lat}, ${coordinates.lng}` : undefined;
    }
    default:
      return undefined;
  }
}
```

Then replace the body of the observer callback inside `connectedCallback` — the
block that currently reads `rawValue.address.full_address` and its siblings —
with:

```ts
				(blockData: Record<string, unknown> | undefined) => {
					if (!blockData || !this.propertyAlias) {
						this._value = undefined;
						return;
					}

					this._value = resolveGmapField(
						blockData[this.propertyAlias] as Map | MultiMap | undefined,
						this.memberField,
					);
				},
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 15 new tests.

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/ufm/elements/gmap-value.element.ts src/ufm/elements/gmap-value.element.test.ts
git commit -m "feat: UFM gmp component reads multi values, and no longer throws on an empty property"
```

---

## Task 11: Documentation, changelog and demo-site fixtures

Folded into one task: none of these is independently shippable, and they all describe the same feature.

**Files:**
- Modify: `README.md`, `README.nuget.md`
- Modify: `Docs/Accessing-&-Working-with-Map-Data.md`
- Modify: `Docs/Rendering-&-Styling-Maps-on-the-front-end.md`
- Create: `Our.Umbraco.GMaps.UmbracoV18/uSync/v18/DataTypes/TestMultiMarker.config`
- Create: `Our.Umbraco.GMaps.UmbracoV17/uSync/v17/DataTypes/TestMultiMarker.config`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the changelog entries**

At the top of the `## Change Log Summary` list in **both** `README.md` and
`README.nuget.md`:

```markdown
* Unreleased: New **Google Maps Multi Marker** property editor — many pins on one shared map, with per-marker friendly name, description and a datatype-configured colour palette, drag-to-reorder, and minimum/maximum marker counts. Resolves [#27](https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/27)
```

- [ ] **Step 2: Add the feature to the README feature list**

In `README.md`, under `## Features`, after the existing single-marker entries:

```markdown
* **Multi Marker editor** — many pins on one map, each with its own friendly name, description and colour
* Marker colours come from a palette you define on the data type, and the label travels to the front-end
* Minimum and maximum marker counts, enforced in the editor
```

- [ ] **Step 3: Document the model**

In `Docs/Accessing-&-Working-with-Map-Data.md`, add a section. Check the file's
existing heading levels and match them:

````markdown
## Multi Marker

The **Google Maps Multi Marker** editor returns a `MultiMap`:

```csharp
public class MultiMap
{
    public List<Marker> Markers { get; set; }
    public MapConfig MapConfig { get; set; }
}

// Marker inherits Address, so every address member is available directly.
public class Marker : Address
{
    public string? Key { get; set; }          // stable identity, survives reordering
    public string? Description { get; set; }
    public string? Color { get; set; }        // hex value from the datatype palette
    public string? ColorLabel { get; set; }   // resolved from the *current* palette
}
```

`MapConfig` — zoom, centre point and map type — is shared by every marker,
because it describes the map rather than any one pin.

```csharp
@{
    var map = Model.Value<MultiMap>("locations");
}

@if (map is not null)
{
    <ul>
        @foreach (var marker in map.Markers)
        {
            <li>
                <strong>@marker.FriendlyName</strong>
                @marker.FullAddress
                @if (marker.ColorLabel is not null)
                {
                    <span class="tag">@marker.ColorLabel</span>
                }
            </li>
        }
    </ul>
}
```

### Colours

Only the hex value is stored against a marker. `ColorLabel` is resolved from the
data type's palette when the value is read, so renaming a swatch updates every
document at once and cannot leave stale labels behind. A colour later removed
from the palette leaves `ColorLabel` null while `Color` keeps its value.

Because the label travels with the value, group markers by meaning rather than
appearance:

```csharp
@foreach (var group in map.Markers.GroupBy(m => m.ColorLabel ?? "Other"))
{
    <h3>@group.Key</h3>
    ...
}
```

### Switching an existing Single Marker property to Multi

The Multi converter reads a stored single-map value as a one-marker list, so
changing an existing data type over does not lose the pin. The value is
rewritten in the multi shape the next time an editor saves the document.
````

- [ ] **Step 4: Document front-end rendering**

In `Docs/Rendering-&-Styling-Maps-on-the-front-end.md`, add a section matching
the file's existing heading levels:

````markdown
## Rendering many markers

The package gives you the data; rendering stays yours. A minimal Google Maps
JavaScript rendering of a `MultiMap`:

```cshtml
@{
    var map = Model.Value<MultiMap>("locations");
}

@if (map is not null && map.Markers.Any())
{
    <div id="map" style="height:500px"></div>

    <script>
        const mapData = @Html.Raw(Json.Serialize(new {
            center = new { lat = map.MapConfig.CenterCoordinates.Latitude, lng = map.MapConfig.CenterCoordinates.Longitude },
            zoom = map.MapConfig.Zoom,
            markers = map.Markers.Select(m => new {
                lat = m.Coordinates.Latitude,
                lng = m.Coordinates.Longitude,
                title = m.FriendlyName ?? m.FullAddress,
                description = m.Description,
                color = m.Color
            })
        }));

        async function initMap() {
            const { Map } = await google.maps.importLibrary('maps');
            const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker');

            const map = new Map(document.getElementById('map'), {
                center: mapData.center,
                zoom: mapData.zoom,
                mapId: 'YOUR_MAP_ID'
            });

            const info = new google.maps.InfoWindow();

            for (const marker of mapData.markers) {
                const pin = new PinElement({ background: marker.color ?? undefined });
                const advanced = new AdvancedMarkerElement({
                    map,
                    position: { lat: marker.lat, lng: marker.lng },
                    title: marker.title,
                    content: pin.element
                });

                advanced.addListener('click', () => {
                    info.setContent(`<strong>${marker.title}</strong><p>${marker.description ?? ''}</p>`);
                    info.open(map, advanced);
                });
            }
        }

        initMap();
    </script>
}
```

The stored marker order is preserved, so a numbered legend rendered from
`map.Markers` matches whatever order the editor arranged in the backoffice.
````

- [ ] **Step 5: Add the UFM fields to the docs**

Wherever the existing `gmp` UFM component is documented (search with
`grep -rn "gmp" Docs/ README.md`), add the new fields to that list:

```markdown
| `count` | The number of markers (`1` for a single-marker property) |
| `names` | Comma-separated marker names, falling back to each marker's address |
| `first` | The first marker's address |
```

- [ ] **Step 6: Add the demo-site data types**

Create `Our.Umbraco.GMaps.UmbracoV18/uSync/v18/DataTypes/TestMultiMarker.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<DataType Key="b21a4f1e-3c7d-4a55-9f10-6e3d8c2a7b41" Alias="Test - Our.Umbraco.GMaps Multi Property Editor UI" Level="1">
  <Info>
    <Name>Test - Our.Umbraco.GMaps Multi Property Editor UI</Name>
    <EditorAlias>Our.Umbraco.GMaps.Multi</EditorAlias>
    <EditorUIAlias>GMaps.PropertyEditorUi.MultiMap</EditorUIAlias>
  </Info>
  <Config><![CDATA[{
  "zoom": 12,
  "maptype": "Roadmap",
  "enableDescription": true,
  "minNumber": 1,
  "maxNumber": 10,
  "markerColors": [
    { "label": "Logistics", "value": "#2d7ef7" },
    { "label": "Retail", "value": "#d64545" },
    { "label": "Office", "value": "#2fa84f" }
  ]
}]]></Config>
</DataType>
```

Create the same file at
`Our.Umbraco.GMaps.UmbracoV17/uSync/v17/DataTypes/TestMultiMarker.config` with
an identical body but a **different `Key`** —
`c8e5d2a7-91b4-4f63-8a2e-15d7f4b93c60` — so the two demo sites never collide if
someone syncs both into one database.

- [ ] **Step 7: Full verification**

```bash
cd Our.Umbraco.GMaps/Client && npm test && npm run build && cd ../..
dotnet test Our.Umbraco.GMaps.Tests
./build.sh --major 18
./build.sh --major 17
```
Expected: all pass.

- [ ] **Step 8: Manual verification in the demo site**

```bash
dotnet run --project Our.Umbraco.GMaps.UmbracoV18
```

The API key is in the V18 project's **user secrets** (`UserSecretsId`
`e6499993-…`), not `appsettings.json`, whose key is a placeholder.

Create a document type with a property using the new data type, then confirm by
hand: search adds a pin; typing `-37.8136,144.9631` and pressing Enter adds one;
clicking empty map adds one; clicking a pin opens the drawer with the map still
visible; Submit applies and Cancel discards; the colour swatches match the
palette; dragging chips reorders; ✕ removes; "Fit to markers" frames them all;
the add affordance disables at 10; saving with 0 markers is refused by the
minimum; and opening the document does **not** immediately mark it dirty.

- [ ] **Step 9: Commit**

```bash
git add README.md README.nuget.md Docs/ \
        Our.Umbraco.GMaps.UmbracoV18/uSync Our.Umbraco.GMaps.UmbracoV17/uSync
git commit -m "docs: document the multi marker editor and add demo-site data types"
```

---

## Definition of done

- `npm test` passes — the 91 tests from phases 0–2 plus roughly 70 new ones, none of the old ones modified.
- `dotnet test Our.Umbraco.GMaps.Tests` passes.
- `npm run build`, `./build.sh --major 17` and `./build.sh --major 18` all pass.
- The manual pass in Task 11 Step 8 is clean.
- `core/` imports nothing from `maps/`, `controllers/` or Google:
  ```bash
  grep -rnE "^\s*(import|export).*(from '\.\./(maps|controllers)|googlemaps|@types/google)" src/core/*.ts \
    && echo VIOLATION || echo clean
  ```
- The Single editor is untouched apart from nothing at all: `git diff develop..HEAD -- src/single-marker/` shows only the phase 0–2 commits.
- Line endings unchanged: `git diff --stat` shows no whole-file rewrites.

## Deliberately not in this plan

- **Marker clustering, heatmaps, or a rendering component.** The PVC exposes the data and the docs show one way to draw it; anything more is a front-end opinion the package should not hold.
- **Custom marker icons.** Colour covers categorisation. Icons pull media resolution into the PVC and the front-end, and were ruled out in the spec.
- **Property mapping on the multi editor.** Mapping is one address to one set of sibling properties and has no coherent meaning for *n* pins.
- **A migration from Single to Multi.** The Multi converter reading a legacy single value makes a manual switch safe; changing editor is a content-modelling decision, not something a package migration should do behind an implementor's back.
- **Fixing the single editor's `postal_town`/`locality` precedence or its `DEFAULT_LOCATION` centre fallback.** Both are pinned by the phase 0 characterisation tests and are behaviour changes needing their own commits.
