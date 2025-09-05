using Newtonsoft.Json;
using System.Runtime.Serialization;

namespace Our.Umbraco.GMaps.Models.Configuration;

public class MapStyle
{
    [DataMember(Name = "apiKey")]
    [JsonProperty("apiKey")]
    public string? ApiKey { get; set; }

    [DataMember(Name = "customstyle")]
    [JsonProperty("customstyle")]
    public bool Customstyle { get; set; }

    [DataMember(Name = "selectedstyle")]
    [JsonProperty("selectedstyle")]
    public SnazzyMapsStyle Selectedstyle { get; set; } = new();

}
