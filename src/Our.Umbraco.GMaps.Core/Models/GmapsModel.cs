using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Models
{
    public class GmapsModel
    {
        [JsonProperty("latlon")]
        public string Coordinates { get; set; }
        [JsonProperty("full_address")]
        public string FullAddress { get; set; }
        [JsonProperty("postcode")]
        public string PostCode { get; set; }
        [JsonProperty("city")]
        public string City { get; set; }
        [JsonProperty("state")]
        public string State { get; set; }
        [JsonProperty("country")]
        public string Country { get; set; }
        [JsonProperty("apikey")]
        public string ApiKey { get; set; }
        [JsonProperty("zoom")]
        public string Zoom { get; set; }
    }
}