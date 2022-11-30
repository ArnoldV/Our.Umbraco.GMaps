using Newtonsoft.Json;
using System.Runtime.Serialization;
#if NET5_0_OR_GREATER
using System.Text.Json.Serialization;
#endif

namespace Our.Umbraco.GMaps.Models
{
    public class Address
    {
        [DataMember(Name = "coordinates")]
        [JsonProperty("coordinates")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("coordinates")]
#endif
        public Location Coordinates { get; set; } = new Location();

        [DataMember(Name = "full_address")]
        [JsonProperty("full_address")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("full_address")]
#endif
        public string FullAddress { get; set; }

        [DataMember(Name = "streetNumber")]
        [JsonProperty("streetNumber")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("streetNumber")]
#endif
        public string StreetNumber { get; set; }

        [DataMember(Name = "street")]
        [JsonProperty("street")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("street")]
#endif
        public string Street { get; set; }

        [DataMember(Name = "postalcode")]
        [JsonProperty("postalcode")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("postalcode")]
#endif
        public string PostalCode { get; set; }

        [DataMember(Name = "city")]
        [JsonProperty("city")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("city")]
#endif
        public string City { get; set; }

        [DataMember(Name = "state")]
        [JsonProperty("state")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("state")]
#endif
        public string State { get; set; }

        [DataMember(Name = "country")]
        [JsonProperty("country")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("country")]
#endif
        public string Country { get; set; }

    }
}