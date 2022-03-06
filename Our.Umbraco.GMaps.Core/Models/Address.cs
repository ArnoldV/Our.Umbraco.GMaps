using Newtonsoft.Json;
using System.Runtime.Serialization;

namespace Our.Umbraco.GMaps.Models
{
    public class Address
    {
        //Legacy property for V8 data
        [DataMember(Name = "latlng")]
        [JsonProperty("latlng")]
        public string Latlng { get; set; }
        
        [DataMember(Name = "coordinates")]
        [JsonProperty("coordinates")]
        public Location Coordinates { get; set; }

        [DataMember(Name = "full_address")]
        [JsonProperty("full_address")]
        public string FullAddress { get; set; }

        [DataMember(Name = "streetNumber")]
        [JsonProperty("streetNumber")]
        public string StreetNumber { get; set; }

        [DataMember(Name = "street")]
        [JsonProperty("street")]
        public string Street { get; set; }

        [DataMember(Name = "postalcode")]
        [JsonProperty("postalcode")]
        public string PostalCode { get; set; }

        [DataMember(Name = "city")]
        [JsonProperty("city")]
        public string City { get; set; }

        [DataMember(Name = "state")]
        [JsonProperty("state")]
        public string State { get; set; }

        [DataMember(Name = "country")]
        [JsonProperty("country")]
        public string Country { get; set; }

        internal Address()
        {
            Coordinates = new Location();
        }
    }
}
