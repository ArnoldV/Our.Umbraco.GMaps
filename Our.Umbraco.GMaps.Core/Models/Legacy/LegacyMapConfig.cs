using System.Text.Json.Serialization;
using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Models
{
    internal class LegacyMapConfig : MapConfig
    {
        [JsonProperty("mapcenter")]
        [JsonPropertyName("mapcenter")]
        public string MapCenter { get; set; }

        [JsonProperty("zoom")]
        [JsonPropertyName("zoom")]
        public new string Zoom { get; set; }
    }
}
