using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models
{
    public class MapConfig
    {
        [DataMember(Name = "apikey")]
        [JsonProperty("apikey")]
        [JsonPropertyName("apikey")]
        public string ApiKey { get; set; }

        [DataMember(Name = "zoom")]
        [JsonProperty("zoom")]
        [JsonPropertyName("zoom")]
        public int Zoom { get; set; }

        [DataMember(Name = "centerCoordinates")]
        [JsonProperty("centerCoordinates")]
        [JsonPropertyName("centerCoordinates")]
        public Location CenterCoordinates { get; set; } = new Location();

        [DataMember(Name = "mapstyle")]
        [JsonProperty("mapstyle")]
        [JsonPropertyName("mapstyle")]
        public string Style { get; set; }

        [DataMember(Name = "maptype")]
        [JsonProperty("maptype")]
        [JsonPropertyName("maptype")]
        [System.Text.Json.Serialization.JsonConverter(typeof(JsonStringEnumConverter))]
        [Newtonsoft.Json.JsonConverter(typeof(StringEnumConverter))]
        public MapType? MapType { get; set; }
    }
}