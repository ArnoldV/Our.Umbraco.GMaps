using System.Text.Json.Serialization;
using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Models;

internal class LegacyMapConfig : MapConfig
{
    [JsonProperty("mapcenter")]
    [JsonPropertyName("mapcenter")]
    public string? MapCenter { get; set; }

    [Newtonsoft.Json.JsonIgnore]
    [System.Text.Json.Serialization.JsonIgnore]
    public new string? Zoom { get; set; }

    [JsonProperty("zoom")]
    [JsonPropertyName("zoom")]
    public object? _zoom
    {
        get
        {
            if (int.TryParse(Zoom, out var intValue)) return intValue;
            return Zoom;
        }
        set { Zoom = value?.ToString(); }
    }

    [Newtonsoft.Json.JsonIgnore]
    [System.Text.Json.Serialization.JsonIgnore]
    public new MapType MapType { get; set; }

    [JsonProperty("maptype")]
    [JsonPropertyName("maptype")]
    public object _mapType
    {
        get
        {
            return MapType;
            //return base.MapType?.ToString().ToLower();
        }
        set {
            MapType = value switch
            {
                "roadmap" => MapType.Roadmap,
                "satellite" => MapType.Satellite,
                "hybrid" => MapType.Hybrid,
                "terrain" => MapType.Terrain,
                "styled_map" => MapType.StyledMap,
                "styled map" => MapType.StyledMap,
                _ => MapType.Roadmap,
            }; 
        }
    }
}
