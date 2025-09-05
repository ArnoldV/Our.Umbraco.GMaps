using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;
namespace Our.Umbraco.GMaps.Models.Configuration;

public class Config
{
    [DataMember(Name = "apikey")]
    [JsonProperty("apikey")]
    public string? ApiKey { get; set; }

    [DataMember(Name = "location")]
    [JsonProperty("location")]
    public string? Location { get; set; }

    [DataMember(Name = "zoom")]
    [JsonProperty("zoom")]
    public string? Zoom { get; set; }

    [DataMember(Name = "maptype")]
    [JsonPropertyName("maptype")]
    [System.Text.Json.Serialization.JsonConverter(typeof(JsonStringEnumConverter))]
    [JsonProperty("maptype")]
    [Newtonsoft.Json.JsonConverter(typeof(StringEnumConverter))]
    public MapType MapType { get; set; }

    [DataMember(Name = "mapstyle")]
    [JsonProperty("mapstyle")]
    public MapStyle MapStyle { get; set; } = new();
}
