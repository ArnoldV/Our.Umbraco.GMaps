using Newtonsoft.Json;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models.Legacy
{
    internal class LegacyMap
    {
        [DataMember(Name = "address")]
        [JsonProperty("address")]
        [JsonPropertyName("address")]
        internal LegacyAddress Address { get; set; }

        [DataMember(Name = "mapconfig")]
        [JsonProperty("mapconfig")]
        [JsonPropertyName("mapconfig")]
        internal LegacyMapConfig MapConfig { get; set; }

    }
}