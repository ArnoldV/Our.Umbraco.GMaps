using Newtonsoft.Json;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models.Configuration;

public class SnazzyMapsStyle
{
    [DataMember(Name = "json")]
    [JsonProperty("json")]
    [JsonPropertyName("json")]
    public string? Json { get; set; }
}