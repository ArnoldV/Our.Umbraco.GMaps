using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Our.Umbraco.GMaps.Models;
using System.Runtime.Serialization;

namespace Our.Umbraco.GMaps.Core.Models.Configuration
{
    public class Config
    {
        [DataMember(Name = "apikey")]
        [JsonProperty("apikey")]
        public string ApiKey { get; set; }

        [DataMember(Name = "location")]
        [JsonProperty("location")]
        public string Location { get; set; }

        [DataMember(Name = "zoom")]
        [JsonProperty("zoom")]
        public string Zoom { get; set; }

        [DataMember(Name = "maptype")]
        [JsonProperty("maptype")]
        [JsonConverter(typeof(StringEnumConverter))]
        public MapType MapType { get; set; }

        [DataMember(Name = "mapstyle")]
        [JsonProperty("mapstyle")]
        public MapStyle MapStyle { get; set; }
    }
}
