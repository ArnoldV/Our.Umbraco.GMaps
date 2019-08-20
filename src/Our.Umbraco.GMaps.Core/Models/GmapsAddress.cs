using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Models
{
    public class GmapsAddress
    {
        [JsonProperty("latlon")]
        public string Coordinates { get; set; }
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
    }

}