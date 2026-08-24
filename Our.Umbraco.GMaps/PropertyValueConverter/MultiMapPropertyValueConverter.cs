using Microsoft.Extensions.Options;
using Our.Umbraco.GMaps.Configuration;
using Our.Umbraco.GMaps.Models;
using Our.Umbraco.GMaps.Models.Configuration;
using System.Text.Json;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;

namespace Our.Umbraco.GMaps.PropertyValueConverter;

public class MultiMapPropertyValueConverter : PropertyValueConverterBase
{
    private GoogleMaps googleMapsConfig;

    public MultiMapPropertyValueConverter(IOptionsMonitor<GoogleMaps> googleMapsConfig)
    {
        this.googleMapsConfig = googleMapsConfig.CurrentValue;
        googleMapsConfig.OnChange(config => this.googleMapsConfig = config);
    }

    public override bool IsConverter(IPublishedPropertyType propertyType)
        => propertyType.EditorAlias.Equals(PropertyEditors.GMapsMultiDataEditor.EditorAlias);

    public override Type GetPropertyValueType(IPublishedPropertyType propertyType) => typeof(MultiMap);

    public override PropertyCacheLevel GetPropertyCacheLevel(IPublishedPropertyType propertyType)
        => PropertyCacheLevel.Element;

    public override object? ConvertIntermediateToObject(
        IPublishedElement owner,
        IPublishedPropertyType propertyType,
        PropertyCacheLevel referenceCacheLevel,
        object? inter,
        bool preview)
    {
        var interString = inter?.ToString();
        if (string.IsNullOrWhiteSpace(interString))
        {
            return default;
        }

        var model = Deserialize(interString);
        if (model is null)
        {
            return default;
        }

        // Legacy values and hand-authored content carry no keys, but the front
        // end still needs stable identity per marker.
        foreach (var marker in model.Markers.Where(m => string.IsNullOrWhiteSpace(m.Key)))
        {
            marker.Key = Guid.NewGuid().ToString();
        }

        model.MapConfig.ApiKey = googleMapsConfig.ApiKey;

        var config = propertyType.DataType.ConfigurationAs<Dictionary<string, object>>();
        if (config is not null)
        {
            ApplyConfiguration(model, config);
        }

        return model;
    }

    /// <summary>
    /// Reads either the multi shape or a legacy single-map value. Reading the
    /// legacy shape is what makes switching an existing datatype over to Multi
    /// survivable rather than data-destroying.
    /// </summary>
    private static MultiMap? Deserialize(string interString)
    {
        // A single-map value has "address" at the root and no "markers".
        var looksSingle = interString.Contains("\"address\"", StringComparison.OrdinalIgnoreCase)
            && !interString.Contains("\"markers\"", StringComparison.OrdinalIgnoreCase);

        if (looksSingle)
        {
            var single = JsonSerializer.Deserialize<Map>(interString);
            if (single is null)
            {
                return null;
            }

            return new MultiMap
            {
                Markers =
                [
                    new Marker
                    {
                        Key = Guid.NewGuid().ToString(),
                        Coordinates = single.Address.Coordinates,
                        FullAddress = single.Address.FullAddress,
                        FriendlyName = single.Address.FriendlyName,
                        StreetNumber = single.Address.StreetNumber,
                        Street = single.Address.Street,
                        PostalCode = single.Address.PostalCode,
                        City = single.Address.City,
                        State = single.Address.State,
                        Country = single.Address.Country,
                    }
                ],
                MapConfig = single.MapConfig,
            };
        }

        return JsonSerializer.Deserialize<MultiMap>(interString);
    }

    private static void ApplyConfiguration(MultiMap model, Dictionary<string, object> config)
    {
        if (config.TryGetValue("apikey", out var apiKey) && apiKey is not null)
        {
            var key = apiKey.ToString();
            if (!string.IsNullOrWhiteSpace(key))
            {
                model.MapConfig.ApiKey = key;
            }
        }

        if (config.TryGetValue("mapstyle", out var mapStyle) && mapStyle is not null)
        {
            var style = TryDeserialize<MapStyle>(mapStyle.ToString());
            model.MapConfig.Style = !string.IsNullOrWhiteSpace(style?.Selectedstyle?.Json)
                ? style.Selectedstyle.Json
                : style?.Customstyle;
        }

        if (config.TryGetValue("markerColors", out var palette) && palette is not null)
        {
            ApplyColourLabels(model, TryDeserialize<List<MarkerColor>>(palette.ToString()));
        }
    }

    /// <summary>
    /// Attach the label for each marker's colour from the datatype's <em>current</em>
    /// palette. Only the hex value is stored, so renaming a swatch cannot leave
    /// stale labels across content; a colour dropped from the palette simply
    /// resolves to no label.
    /// </summary>
    private static void ApplyColourLabels(MultiMap model, List<MarkerColor>? palette)
    {
        if (palette is null || palette.Count == 0)
        {
            return;
        }

        foreach (var marker in model.Markers.Where(m => !string.IsNullOrWhiteSpace(m.Color)))
        {
            marker.ColorLabel = palette
                .FirstOrDefault(p => SameColour(p.Value, marker.Color))
                ?.Label;
        }
    }

    /// <summary>
    /// Compares two stored colours ignoring the leading hash.
    /// <para>
    /// Umbraco's colour picker stores bare hex, so a palette holds <c>e61414</c>
    /// while content written by the editor holds <c>#e61414</c> - the editor adds
    /// the hash because the bare form is not valid CSS. Both must resolve to the
    /// same label, in either direction, for content saved before or after that.
    /// </para>
    /// </summary>
    private static bool SameColour(string? left, string? right)
        => string.Equals(left?.TrimStart('#'), right?.TrimStart('#'), StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Datatype configuration is editable by hand and survives package upgrades,
    /// so malformed JSON must degrade rather than throw during rendering.
    /// </summary>
    private static T? TryDeserialize<T>(string? json) where T : class
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<T>(json);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
