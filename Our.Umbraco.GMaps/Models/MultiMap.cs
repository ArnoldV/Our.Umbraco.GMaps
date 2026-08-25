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
    public List<Marker> Markers
    {
        get => field;
        set => field = value ?? [];
    } = [];

    [DataMember(Name = "mapconfig")]
    [JsonProperty("mapconfig")]
    [JsonPropertyName("mapconfig")]
    public MapConfig MapConfig
    {
        get => field;
        set => field = value ?? new MapConfig();
    } = new MapConfig();
}
