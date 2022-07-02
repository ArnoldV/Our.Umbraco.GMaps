using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Models
{
    internal class LegacyMapConfig : MapConfig
    {
        [JsonProperty("mapcenter")]
        internal string MapCenter { get; set; }
    }
}