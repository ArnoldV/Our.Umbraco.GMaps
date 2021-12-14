using Newtonsoft.Json;
using System;
using System.Runtime.Serialization;

namespace Our.Umbraco.GMaps.Models
{
    public class Address
    {
        [DataMember(Name = "coordinates")]
        [JsonProperty("coordinates")]
        public Location Coordinates { get; set; }

        [DataMember(Name = "latlng")]
        [JsonProperty("latlng")]
        [Obsolete("Used only for backwards compatibility with Our.Umbraco.GMaps for Umbraco 8")]
        public string LatLng { get; set; }

        [DataMember(Name = "lat")]
        [JsonProperty("lat")]
        public string Latitude { get; set; }

        [DataMember(Name = "lng")]
        [JsonProperty("lng")]
        public string Longitude { get; set; }

        [DataMember(Name = "full_address")]
        [JsonProperty("full_address")]
        public string FullAddress { get; set; }

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