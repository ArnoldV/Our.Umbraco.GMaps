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
