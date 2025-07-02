using Newtonsoft.Json;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models;

public class Address
{
    [DataMember(Name = "coordinates")]
    [JsonProperty("coordinates")]
    [JsonPropertyName("coordinates")]
    public Location Coordinates { get; set; } = new Location();

    [DataMember(Name = "full_address")]
    [JsonProperty("full_address")]
    [JsonPropertyName("full_address")]
    public string FullAddress { get; set; }

    [DataMember(Name = "streetNumber")]
    [JsonProperty("streetNumber")]
    [JsonPropertyName("streetNumber")]
    public string StreetNumber { get; set; }

    [DataMember(Name = "street")]
    [JsonProperty("street")]
    [JsonPropertyName("street")]
    public string Street { get; set; }

    [DataMember(Name = "postalcode")]
    [JsonProperty("postalcode")]
    [JsonPropertyName("postalcode")]
    public string PostalCode { get; set; }

    [DataMember(Name = "city")]
    [JsonProperty("city")]
    [JsonPropertyName("city")]
    public string City { get; set; }

    [DataMember(Name = "state")]
    [JsonProperty("state")]
    [JsonPropertyName("state")]
    public string State { get; set; }

    [DataMember(Name = "country")]
    [JsonProperty("country")]
    [JsonPropertyName("country")]
    public string Country { get; set; }

}