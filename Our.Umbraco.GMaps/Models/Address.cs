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
    public string? FullAddress { get; set; }

    [DataMember(Name = "friendlyName")]
    [JsonProperty("friendlyName")]
    [JsonPropertyName("friendlyName")]
    public string? FriendlyName { get; set; }

    [DataMember(Name = "streetNumber")]
    [JsonProperty("streetNumber")]
    [JsonPropertyName("streetNumber")]
    public string? StreetNumber { get; set; }

    [DataMember(Name = "street")]
    [JsonProperty("street")]
    [JsonPropertyName("street")]
    public string? Street { get; set; }

    [DataMember(Name = "postalcode")]
    [JsonProperty("postalcode")]
    [JsonPropertyName("postalcode")]
    public string? PostalCode { get; set; }

    [DataMember(Name = "city")]
    [JsonProperty("city")]
    [JsonPropertyName("city")]
    public string? City { get; set; }

    [DataMember(Name = "state")]
    [JsonProperty("state")]
    [JsonPropertyName("state")]
    public string? State { get; set; }

    [DataMember(Name = "country")]
    [JsonProperty("country")]
    [JsonPropertyName("country")]
    public string? Country { get; set; }

    /// <summary>
    /// The stored full address, or one composed from the address parts when no full address was stored.
    /// </summary>
    public override string ToString()
    {
        if (!string.IsNullOrWhiteSpace(FullAddress))
        {
            return FullAddress.Trim();
        }

        var parts = new[]
        {
            Join(" ", StreetNumber, Street),
            City,
            Join(" ", State, PostalCode),
            Country
        };

        return Join(", ", parts);
    }

    private static string Join(string separator, params string?[] values)
        => string.Join(separator, values.Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value!.Trim()));
}