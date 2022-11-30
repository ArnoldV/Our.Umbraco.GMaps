using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Our.Umbraco.GMaps.Models;
using System.Runtime.Serialization;
#if NET5_0_OR_GREATER
using System.Text.Json.Serialization;
#endif
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
#if NET5_0_OR_GREATER
        [JsonPropertyName("maptype")]
        [System.Text.Json.Serialization.JsonConverter(typeof(JsonStringEnumConverter))]
#endif
        [JsonProperty("maptype")]
        [Newtonsoft.Json.JsonConverter(typeof(StringEnumConverter))]
        public MapType MapType { get; set; }

        [DataMember(Name = "mapstyle")]
        [JsonProperty("mapstyle")]
        public MapStyle MapStyle { get; set; }
    }
}
