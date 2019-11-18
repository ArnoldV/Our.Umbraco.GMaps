using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Models
{
    public class GMapsModel
    {
        [JsonProperty("address")]
        public GMapsAddress Address { get; set; }

        [JsonProperty("mapconfig")]
        public GMapsMapConfig MapConfig { get; set; }
    }
}