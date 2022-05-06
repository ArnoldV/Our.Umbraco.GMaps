using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System.Runtime.Serialization;

namespace Our.Umbraco.GMaps.Models
{
    public class MapConfig
    {
        [DataMember(Name = "apikey")]
        [JsonProperty("apikey")]
        public string ApiKey { get; set; }

        [DataMember(Name = "zoom")]
        [JsonProperty("zoom")]
        public string Zoom { get; set; }

        [DataMember(Name = "centerCoordinates")]
        [JsonProperty("centerCoordinates")]
        public Location CenterCoordinates { get; set; } = new Location();

        [DataMember(Name = "mapstyle")]
        [JsonProperty("mapstyle")]
        public string Style { get; set; }

        [DataMember(Name = "maptype")]
        [JsonProperty("maptype")]
        [JsonConverter(typeof(StringEnumConverter))]
        public MapType? MapType { get; set; }
    }
}