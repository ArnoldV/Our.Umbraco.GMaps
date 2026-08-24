using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models.Legacy;

/// <summary>
/// The value written by GMaps 1.x on Umbraco 8. Read-only: nothing writes this shape any more.
/// </summary>
internal sealed class LegacyMap
{
    [JsonPropertyName("address")]
    public LegacyAddress Address
    {
        get => field;
        set => field = value ?? new();
    } = new();

    [JsonPropertyName("mapconfig")]
    public LegacyMapConfig MapConfig
    {
        get => field;
        set => field = value ?? new();
    } = new();
}