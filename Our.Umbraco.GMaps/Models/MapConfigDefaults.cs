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
}
