using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Models.Legacy
{
    internal class LegacyAddress : Address
    {
        [JsonProperty("latlng")]
        internal string LatLng { get; set; }
    }
}