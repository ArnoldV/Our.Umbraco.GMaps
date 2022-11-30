using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System.Runtime.Serialization;
#if NET5_0_OR_GREATER
using System.Text.Json.Serialization;
#endif

namespace Our.Umbraco.GMaps.Models
{
    public class MapConfig
    {
        [DataMember(Name = "apikey")]
        [JsonProperty("apikey")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("apikey")]
#endif
        public string ApiKey { get; set; }

        [DataMember(Name = "zoom")]
        [JsonProperty("zoom")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("zoom")]
#endif
        public int Zoom { get; set; }

        [DataMember(Name = "centerCoordinates")]
        [JsonProperty("centerCoordinates")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("centerCoordinates")]
#endif
        public Location CenterCoordinates { get; set; } = new Location();

        [DataMember(Name = "mapstyle")]
        [JsonProperty("mapstyle")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("mapstyle")]
#endif
        public string Style { get; set; }

        [DataMember(Name = "maptype")]
        [JsonProperty("maptype")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("maptype")]
        [System.Text.Json.Serialization.JsonConverter(typeof(JsonStringEnumConverter))]
#endif
        [Newtonsoft.Json.JsonConverter(typeof(StringEnumConverter))]
        public MapType? MapType { get; set; }
    }
}