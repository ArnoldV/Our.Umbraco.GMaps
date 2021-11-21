using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Core.Models.Configuration
{
    public class SnazzyMapsStyle
    {
        [JsonProperty("json")]
        public string Json { get; set; }
    }
}