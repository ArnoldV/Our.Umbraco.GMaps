using Newtonsoft.Json;
using System.Runtime.Serialization;

namespace Our.Umbraco.GMaps.Models
{
    public class Map
    {
        [DataMember(Name = "address")]
        [JsonProperty("address")]
        public Address Address { get; set; }

        [DataMember(Name = "mapconfig")]
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