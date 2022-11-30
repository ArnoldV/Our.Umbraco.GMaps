using Newtonsoft.Json;
using System.Runtime.Serialization;
#if NET5_0_OR_GREATER
using System.Text.Json.Serialization;
#endif

namespace Our.Umbraco.GMaps.Models
{
    public class Map
    {
        [DataMember(Name = "address")]
        [JsonProperty("address")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("address")]
#endif
        public Address Address { get; set; } = new Address();

        [DataMember(Name = "mapconfig")]
        [JsonProperty("mapconfig")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("mapconfig")]
#endif
        public MapConfig MapConfig { get; set; } = new MapConfig();

    }
}