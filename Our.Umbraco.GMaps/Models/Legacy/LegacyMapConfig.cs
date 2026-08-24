using Our.Umbraco.GMaps.Serialization;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models.Legacy;

/// <summary>
/// The <c>mapconfig</c> written by GMaps 1.x on Umbraco 8: the centre as a "lat, lng" string
/// rather than a point, and the zoom as either a number or a string.
/// </summary>
internal sealed class LegacyMapConfig
{
    [JsonPropertyName("mapcenter")]
    public string? MapCenter { get; set; }

    [JsonPropertyName("zoom")]
    [JsonConverter(typeof(UnsetTolerantInt32Converter))]
    public int Zoom { get; set; }

    [JsonPropertyName("maptype")]
    [JsonConverter(typeof(MapTypeJsonConverter))]
    public MapType? MapType { get; set; }
}
