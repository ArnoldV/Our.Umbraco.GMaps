using Newtonsoft.Json;
using System.Runtime.Serialization;

namespace Our.Umbraco.GMaps.Models.Legacy
{
    internal class LegacyMap
    {
        [DataMember(Name = "address")]
        [JsonProperty("address")]
        internal LegacyAddress Address { get; set; }

        [DataMember(Name = "mapconfig")]
        [JsonProperty("mapconfig")]
        internal LegacyMapConfig MapConfig { get; set; }

    }
}