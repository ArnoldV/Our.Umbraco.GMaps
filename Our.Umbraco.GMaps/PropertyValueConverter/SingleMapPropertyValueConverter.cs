using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;
using Our.Umbraco.GMaps.Models;
using Our.Umbraco.GMaps.Models.Configuration;
using Our.Umbraco.GMaps.Configuration;
using Our.Umbraco.GMaps.Models.Legacy;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace Our.Umbraco.GMaps.PropertyValueConverter
{
    public class SingleMapPropertyValueConverter : PropertyValueConverterBase
    {
        private GoogleMaps googleMapsConfig;

        public SingleMapPropertyValueConverter(IOptionsMonitor<GoogleMaps> googleMapsConfig)
        {
            this.googleMapsConfig = googleMapsConfig.CurrentValue;
            googleMapsConfig.OnChange(config => this.googleMapsConfig = config);
        }
        public override bool IsConverter(IPublishedPropertyType propertyType)
            => propertyType.EditorAlias.Equals(PropertyEditors.GMapsSingleDataEditor.EditorAlias);

        public override Type GetPropertyValueType(IPublishedPropertyType propertyType) => typeof(Map);

        public override PropertyCacheLevel GetPropertyCacheLevel(IPublishedPropertyType propertyType) => PropertyCacheLevel.Element;

        public override object? ConvertIntermediateToObject(IPublishedElement owner, IPublishedPropertyType propertyType, PropertyCacheLevel referenceCacheLevel, object? inter, bool preview)
        {
            var interString = inter?.ToString();
            if (string.IsNullOrWhiteSpace(interString))
            {
                return default;
            }

            Map? model;
            // TODO: We really should create a package migration for legacy data and clean this up!
            // Handle pre v2.0.0 data (Removes the prefix 'google.maps.maptypeid.')
            interString = interString.Replace("google.maps.maptypeid.", string.Empty, StringComparison.InvariantCultureIgnoreCase);

            bool legacyData = interString.Contains("latlng", StringComparison.CurrentCultureIgnoreCase);
            if (legacyData)
            {
                var intermediate = JsonSerializer.Deserialize<LegacyMap>(interString);
                if (intermediate is null)
                {
                    return default;
                }
                model = new Map
                {
                    Address = intermediate.Address,
                    MapConfig = intermediate.MapConfig
                };

                // Map the LatLng property.
                model.Address.Coordinates = Location.Parse(intermediate.Address.LatLng);
                model.MapConfig.CenterCoordinates = Location.Parse(intermediate.MapConfig.MapCenter);
                if (model.MapConfig.Zoom == 0)
                {
                    model.MapConfig.Zoom = string.IsNullOrEmpty(intermediate.MapConfig.Zoom) ? 17 : Convert.ToInt32(intermediate.MapConfig.Zoom);
                }
                if (model.MapConfig.MapType == null)
                {
                    model.MapConfig.MapType = intermediate.MapConfig.MapType;
                }
            }
            else
            {
                model = JsonSerializer.Deserialize<Map>(interString);
            }

            if (model != null)
            {
                model.MapConfig.ApiKey = googleMapsConfig.ApiKey;

                // Get API key and mapStyle from configuration
                var config = propertyType.DataType.ConfigurationAs<Dictionary<string, object>>();

                if (config != null)
                {
                    if (config.TryGetValue("apikey", out var apiKey) && apiKey != null)
                    {
                        model.MapConfig.ApiKey = apiKey.ToString();
                    }

                    if (config.TryGetValue("mapstyle", out var mapStyle) && mapStyle is not null)
                    {
                        var style = JsonSerializer.Deserialize<MapStyle>(mapStyle.ToString()!);
                        model.MapConfig.Style = style?.Selectedstyle?.Json;
                    }
                }
            }

            return model;
        }
    }
}
