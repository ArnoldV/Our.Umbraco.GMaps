using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Models
{
    public class Map
    {
        [JsonProperty("address")]
        public Address Address { get; set; }

        [JsonProperty("mapconfig")]
        public MapConfig MapConfig { get; set; }

        public Map()
        {
            // Defaults.
            Address = new Address();
            MapConfig = new MapConfig();
        }
    }
}