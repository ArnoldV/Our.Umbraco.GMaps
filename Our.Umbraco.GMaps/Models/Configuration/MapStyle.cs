using Newtonsoft.Json;
using Our.Umbraco.GMaps.Serialization;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models.Configuration;

public class MapStyle
{
    [DataMember(Name = "apiKey")]
    [JsonProperty("apiKey")]
    [JsonPropertyName("apiKey")]
    public string? ApiKey { get; set; }

    [DataMember(Name = "customstyle")]
    [JsonProperty("customstyle")]
    [JsonPropertyName("customstyle")]
    [System.Text.Json.Serialization.JsonConverter(typeof(CustomStyleJsonConverter))]
    public string? Customstyle { get; set; }

    [DataMember(Name = "selectedstyle")]
    [JsonProperty("selectedstyle")]
    [JsonPropertyName("selectedstyle")]
    public SnazzyMapsStyle Selectedstyle { get; set; } = new();

}
