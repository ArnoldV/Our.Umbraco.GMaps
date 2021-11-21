using Newtonsoft.Json;
using System;

namespace Our.Umbraco.GMaps.Models
{
    public class Address
    {
        [JsonProperty("coordinates")]
        public Location Coordinates { get; set; }

        [JsonProperty("latlng")]
        [Obsolete("Used only for backwards compatibility with Our.Umbraco.GMaps for Umbraco 8")]
        public string LatLng { get; set; }

        [JsonProperty("lat")]
        public string Latitude { get; set; }

        [JsonProperty("lng")]
        public string Longitude { get; set; }

        [JsonProperty("full_address")]
        public string FullAddress { get; set; }

        [JsonProperty("postalcode")]
        public string PostalCode { get; set; }

        [JsonProperty("city")]
        public string City { get; set; }

        [JsonProperty("state")]
        public string State { get; set; }

        [JsonProperty("country")]
        public string Country { get; set; }

        internal Address()
        {
            Coordinates = new Location();
        }
    }
}