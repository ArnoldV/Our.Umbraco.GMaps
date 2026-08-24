using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models.Legacy;

internal sealed class LegacyAddress : Address
{
    /// <summary>The coordinates as a "lat, lng" string, which is how 1.x stored them.</summary>
    [JsonPropertyName("latlng")]
    public string? LatLng { get; set; }
}