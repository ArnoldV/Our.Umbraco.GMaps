using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System;
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

        [DataMember(Name = "mapcenter")]
        [JsonProperty("mapcenter")]
        [Obsolete("Used only for backwards compatibility with Our.Umbraco.GMaps for Umbraco 8")]
        public string MapCenter { get; set; }

        [DataMember(Name = "centerCoordinates")]
        [JsonProperty("centerCoordinates")]
        public Location CenterCoordinates { get; set; }

        [DataMember(Name = "mapstyle")]
        [JsonProperty("mapstyle")]
        public string Style { get; set; }

        [DataMember(Name = "maptype")]
        [JsonProperty("maptype")]
        [JsonConverter(typeof(StringEnumConverter))]
        public MapType? MapType { get; set; }

        internal MapConfig()
        {
        }
    }
}