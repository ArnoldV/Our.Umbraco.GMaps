using Our.Umbraco.GMaps.Configuration;

namespace Our.Umbraco.GMaps.Models;

internal static class MapConfigDefaults
{
    /// <summary>What the editor falls back to, and what the docs promise.</summary>
    public const int Zoom = 17;

    /// <summary>
    /// A zoom that is absent, null or unreadable in the stored value arrives as 0, which is what
    /// the editor also treats as "not set". Resolve it the same way the editor does, so a value
    /// saved by an older version of the package still renders at a sensible zoom.
    /// </summary>
    public static void ApplyDefaults(this MapConfig mapConfig, GoogleMaps configuration)
    {
        if (mapConfig.Zoom == 0)
        {
            mapConfig.Zoom = configuration.ZoomLevel ?? Zoom;
        }
    }

    /// <summary>
    /// Resolves the key the map renders under: the datatype's own, falling back to the site-wide
    /// <c>GoogleMaps:ApiKey</c>.
    /// </summary>
    /// <remarks>
    /// A datatype whose key field was filled in and then cleared stores an empty string rather
    /// than dropping the entry, and an empty string is not a key. Treating it as one blanks out
    /// the site-wide key, which is the whole point of configuring <c>GoogleMaps:ApiKey</c>.
    /// Both converters resolve it here so the two cannot drift apart again.
    /// </remarks>
    public static void ApplyApiKey(
        this MapConfig mapConfig,
        GoogleMaps configuration,
        Dictionary<string, object>? dataTypeConfiguration)
    {
        string? dataTypeKey = null;
        if (dataTypeConfiguration is not null
            && dataTypeConfiguration.TryGetValue("apikey", out var configured))
        {
            dataTypeKey = configured?.ToString();
        }

        mapConfig.ApiKey = string.IsNullOrWhiteSpace(dataTypeKey)
            ? configuration.ApiKey
            : dataTypeKey;
    }
}
