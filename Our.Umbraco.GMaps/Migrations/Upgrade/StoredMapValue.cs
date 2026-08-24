using Our.Umbraco.GMaps.Serialization;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Our.Umbraco.GMaps.Migrations.Upgrade;

/// <summary>
/// Rewrites a stored map value into the shape the editor writes today, so that reading it back
/// needs no special cases:
/// <list type="bullet">
/// <item>coordinates and the map centre as points rather than "lat, lng" strings (1.x)</item>
/// <item>a zoom that is a number rather than null or a string (2.x)</item>
/// <item>a map type spelled the way Google spells it</item>
/// </list>
/// </summary>
/// <remarks>
/// Repairs are surgical. Anything unrecognised is left exactly where it is, and a value that is
/// already canonical is not rewritten at all — reserialising the whole document would reorder
/// keys and drop unknown ones, which both block editors and Umbraco Deploy notice.
/// </remarks>
internal static class StoredMapValue
{
    /// <summary>Location's computed members, which an earlier version serialised into the value.</summary>
    private static readonly string[] ComputedNoise = ["IsEmpty", "Coordinates"];

    /// <summary>
    /// The canonical form of <paramref name="storedJson"/>, or null when it is already canonical
    /// or is not a map value at all.
    /// </summary>
    public static string? Repair(string? storedJson, int defaultZoom)
    {
        if (string.IsNullOrWhiteSpace(storedJson))
        {
            return null;
        }

        JsonObject? value;
        try
        {
            value = JsonNode.Parse(storedJson) as JsonObject;
        }
        catch (JsonException)
        {
            return null;
        }

        if (value is null)
        {
            return null;
        }

        var repaired = false;
        repaired |= RepairAddress(value);
        repaired |= RepairMarkers(value);
        repaired |= RepairMapConfig(value, defaultZoom);

        return repaired ? value.ToJsonString() : null;
    }

    /// <summary>The single-map shape: one address, which 1.x stored as a "lat, lng" string.</summary>
    private static bool RepairAddress(JsonObject value)
    {
        if (!value.TryGetPropertyValue("address", out var address))
        {
            return false;
        }

        if (address is null)
        {
            value["address"] = new JsonObject();
            return true;
        }

        return address is JsonObject addressObject
            && RepairPoint(addressObject, "coordinates", legacyKey: "latlng");
    }

    /// <summary>The multi-map shape: a marker list, each marker carrying its own point.</summary>
    private static bool RepairMarkers(JsonObject value)
    {
        if (!value.TryGetPropertyValue("markers", out var markers))
        {
            return false;
        }

        if (markers is null)
        {
            value["markers"] = new JsonArray();
            return true;
        }

        if (markers is not JsonArray markerArray)
        {
            return false;
        }

        var repaired = false;

        // A null in the list deserialises to a null marker, which every caller then trips over.
        for (var i = markerArray.Count - 1; i >= 0; i--)
        {
            if (markerArray[i] is null)
            {
                markerArray.RemoveAt(i);
                repaired = true;
            }
        }

        foreach (var marker in markerArray.OfType<JsonObject>())
        {
            repaired |= RepairPoint(marker, "coordinates", legacyKey: "latlng");
        }

        return repaired;
    }

    private static bool RepairMapConfig(JsonObject value, int defaultZoom)
    {
        if (!value.TryGetPropertyValue("mapconfig", out var mapConfig))
        {
            return false;
        }

        if (mapConfig is null)
        {
            value["mapconfig"] = new JsonObject();
            return true;
        }

        if (mapConfig is not JsonObject mapConfigObject)
        {
            return false;
        }

        var repaired = false;
        repaired |= RepairPoint(mapConfigObject, "centerCoordinates", legacyKey: "mapcenter");
        repaired |= RepairZoom(mapConfigObject, defaultZoom);
        repaired |= RepairMapType(mapConfigObject);
        return repaired;
    }

    /// <summary>
    /// A zoom of null, an empty string or 0 all mean "never set" — the editor's own default
    /// wins. A zoom in a string becomes a number.
    /// </summary>
    private static bool RepairZoom(JsonObject mapConfig, int defaultZoom)
    {
        if (!mapConfig.TryGetPropertyValue("zoom", out var zoom))
        {
            return false;
        }

        var current = ReadInt(zoom);
        if (current is > 0 && zoom?.GetValueKind() == JsonValueKind.Number)
        {
            return false;
        }

        mapConfig["zoom"] = current is > 0 ? current.Value : defaultZoom;
        return true;
    }

    /// <summary>Rewrites the map type as the Google id, the form the editor stores.</summary>
    private static bool RepairMapType(JsonObject mapConfig)
    {
        if (!mapConfig.TryGetPropertyValue("maptype", out var mapType))
        {
            return false;
        }

        var stored = mapType?.GetValueKind() == JsonValueKind.String ? mapType.GetValue<string>() : null;
        var canonical = MapTypeJsonConverter.CanonicalId(MapTypeJsonConverter.Parse(stored) ?? Models.MapType.Roadmap);

        if (string.Equals(stored, canonical, StringComparison.Ordinal))
        {
            return false;
        }

        mapConfig["maptype"] = canonical;
        return true;
    }

    /// <summary>
    /// Turns a legacy "lat, lng" string into a point, and drops the computed properties an
    /// earlier version serialised alongside one.
    /// </summary>
    private static bool RepairPoint(JsonObject owner, string key, string legacyKey)
    {
        var repaired = false;

        if (owner.TryGetPropertyValue(legacyKey, out var legacy))
        {
            var parsed = legacy?.GetValueKind() == JsonValueKind.String
                ? ToPoint(legacy.GetValue<string>())
                : null;

            owner.Remove(legacyKey);
            repaired = true;

            if (parsed is not null && owner[key] is not JsonObject)
            {
                owner[key] = parsed;
                return true;
            }
        }

        if (!owner.TryGetPropertyValue(key, out var point))
        {
            return repaired;
        }

        // A null point is less use than no point at all: the model supplies an empty one.
        if (point is null)
        {
            owner.Remove(key);
            return true;
        }

        if (point is not JsonObject pointObject)
        {
            return repaired;
        }

        repaired |= RepairCoordinate(pointObject, "lat");
        repaired |= RepairCoordinate(pointObject, "lng");

        foreach (var noise in ComputedNoise)
        {
            if (pointObject.Remove(noise))
            {
                repaired = true;
            }
        }

        return repaired;
    }

    private static bool RepairCoordinate(JsonObject point, string key)
    {
        if (!point.TryGetPropertyValue(key, out var value)
            || value?.GetValueKind() == JsonValueKind.Number)
        {
            return false;
        }

        var parsed = value?.GetValueKind() == JsonValueKind.String
            ? ToDouble(value.GetValue<string>())
            : null;

        if (parsed is null)
        {
            point.Remove(key);
            return true;
        }

        point[key] = parsed.Value;
        return true;
    }

    private static JsonObject? ToPoint(string? latLng)
    {
        var pair = latLng?.Split(',', StringSplitOptions.RemoveEmptyEntries);
        if (pair?.Length != 2)
        {
            return null;
        }

        var lat = ToDouble(pair[0]);
        var lng = ToDouble(pair[1]);

        return lat is null || lng is null
            ? null
            : new JsonObject { ["lat"] = lat.Value, ["lng"] = lng.Value };
    }

    private static double? ToDouble(string? value)
        => double.TryParse(
            value,
            NumberStyles.Float | NumberStyles.AllowThousands,
            CultureInfo.InvariantCulture,
            out var parsed) ? parsed : null;

    private static int? ReadInt(JsonNode? node)
        => node?.GetValueKind() switch
        {
            JsonValueKind.Number => (int?)node.GetValue<double>(),
            JsonValueKind.String => (int?)ToDouble(node.GetValue<string>()),
            _ => null,
        };
}
