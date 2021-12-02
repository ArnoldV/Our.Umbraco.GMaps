using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Core.Models.Configuration
{
    public class MapStyle
    {
        [JsonProperty("apiKey")]
        public string ApiKey { get; set; }

        [JsonProperty("customstyle")]
        public bool Customstyle { get; set; }

        [JsonProperty("selectedstyle")]
        public SnazzyMapsStyle Selectedstyle { get; set; }

    }
}
