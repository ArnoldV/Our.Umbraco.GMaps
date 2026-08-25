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

        foreach (var marker in model.Markers.Where(m => string.IsNullOrWhiteSpace(m.Key)))
        {
            marker.Key = Guid.NewGuid().ToString();
        }

        model.MapConfig.ApplyDefaults(googleMapsConfig);
        model.MapConfig.ApiKey = googleMapsConfig.ApiKey;

        var config = propertyType.DataType.ConfigurationAs<Dictionary<string, object>>();
        if (config is not null)
        {
            ApplyConfiguration(model, config);
        }

        return model;
    }

    private static MultiMap? Deserialize(string interString)
    {
        var looksLikeLegacySingleValue =
            interString.Contains("\"address\"", StringComparison.OrdinalIgnoreCase)
            && !interString.Contains("\"markers\"", StringComparison.OrdinalIgnoreCase);

        if (looksLikeLegacySingleValue)
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

    private static void ApplyColourLabels(MultiMap model, List<MarkerColor>? palette)
    {
        if (palette is null || palette.Count == 0)
        {
            return;
        }

        foreach (var marker in model.Markers.Where(m => !string.IsNullOrWhiteSpace(m.Color)))
        {
            marker.ColorLabel = palette
                .FirstOrDefault(p => SameColourIgnoringHash(p.Value, marker.Color))
                ?.Label;
        }
    }

    private static bool SameColourIgnoringHash(string? left, string? right)
        => string.Equals(left?.TrimStart('#'), right?.TrimStart('#'), StringComparison.OrdinalIgnoreCase);

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
