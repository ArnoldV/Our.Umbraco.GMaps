using System.Text.Json.Serialization;
using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Models.Legacy;

internal class LegacyAddress : Address
{
    [JsonProperty("latlng")]
    [JsonPropertyName("latlng")]
    public string LatLng { get; set; }
}