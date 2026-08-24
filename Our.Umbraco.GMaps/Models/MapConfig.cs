using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Our.Umbraco.GMaps.Serialization;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models;

public class MapConfig
{
    [DataMember(Name = "apikey")]
    [JsonProperty("apikey")]
    [JsonPropertyName("apikey")]
    public string? ApiKey { get; set; }

    /// <summary>0 means "not set"; the property value converter resolves the default.</summary>
    [DataMember(Name = "zoom")]
    [JsonProperty("zoom")]
    [JsonPropertyName("zoom")]
    [System.Text.Json.Serialization.JsonConverter(typeof(UnsetTolerantInt32Converter))]
    public int Zoom { get; set; }

    /// <summary>Stored values can carry an explicit null here; an empty point is kinder than one.</summary>
    [DataMember(Name = "centerCoordinates")]
    [JsonProperty("centerCoordinates")]
    [JsonPropertyName("centerCoordinates")]
    public Location CenterCoordinates
    {
        get => field;
        set => field = value ?? new Location();
    } = new Location();

    [DataMember(Name = "mapstyle")]
    [JsonProperty("mapstyle")]
    [JsonPropertyName("mapstyle")]
    public string? Style { get; set; }

    [DataMember(Name = "maptype")]
    [JsonProperty("maptype")]
    [JsonPropertyName("maptype")]
    [System.Text.Json.Serialization.JsonConverter(typeof(MapTypeJsonConverter))]
    [Newtonsoft.Json.JsonConverter(typeof(StringEnumConverter))]
    public MapType? MapType { get; set; }
}