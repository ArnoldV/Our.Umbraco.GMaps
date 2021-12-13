using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Our.Umbraco.GMaps.Models;

namespace Our.Umbraco.GMaps.Core.Models.Configuration
{
    public class Config
    {
        [JsonProperty("apikey")]
        public string ApiKey { get; set; }

        [JsonProperty("location")]
        public string Location { get; set; }

        [JsonProperty("zoom")]
        public string Zoom { get; set; }

        [JsonProperty("maptype")]
        [JsonConverter(typeof(StringEnumConverter))]
        public MapType MapType { get; set; }

        [JsonProperty("mapstyle")]
        public MapStyle MapStyle { get; set; }
    }
}
