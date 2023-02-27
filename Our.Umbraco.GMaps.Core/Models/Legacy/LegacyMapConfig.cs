using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Models
{
    internal class LegacyMapConfig : MapConfig
    {
        [JsonProperty("mapcenter")]
        internal string MapCenter { get; set; }

        [JsonProperty("zoom")]
        internal new string Zoom { get; set; }
    }
}
