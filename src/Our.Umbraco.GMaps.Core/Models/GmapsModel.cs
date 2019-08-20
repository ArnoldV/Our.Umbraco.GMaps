using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Models
{
    public class GmapsModel
    {
        [JsonProperty("address")]
        public GmapsAddress Address { get; set; }
        [JsonProperty("mapconfig")]
        public GmapsMapConfig MapConfig { get; set; }
    }
}