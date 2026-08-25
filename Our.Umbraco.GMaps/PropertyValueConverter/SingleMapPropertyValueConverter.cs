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

            // TODO: We really should create a package migration for legacy data and clean this up!
            bool legacyData = interString.Contains("latlng", StringComparison.OrdinalIgnoreCase);
            var model = legacyData
                ? ReadLegacyValue(interString)
                : JsonSerializer.Deserialize<Map>(interString);

            if (model != null)
            {
                model.MapConfig.ApplyDefaults(googleMapsConfig);
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
                        var style = TryDeserialize<MapStyle>(mapStyle.ToString());

                        model.MapConfig.Style = !string.IsNullOrWhiteSpace(style?.Selectedstyle?.Json)
                            ? style.Selectedstyle.Json
                            : style?.Customstyle;

                    }
                }
            }

            return model;
        }

        /// <summary>
        /// Reads the shape GMaps 1.x wrote on Umbraco 8, where the coordinates and the centre were
        /// "lat, lng" strings rather than points.
        /// </summary>
        private static Map? ReadLegacyValue(string interString)
        {
            var intermediate = JsonSerializer.Deserialize<LegacyMap>(interString);
            if (intermediate is null)
            {
                return default;
            }

            var address = intermediate.Address;
            address.Coordinates = Location.Parse(address.LatLng);

            return new Map
            {
                Address = address,
                MapConfig = new MapConfig
                {
                    Zoom = intermediate.MapConfig.Zoom,
                    MapType = intermediate.MapConfig.MapType ?? Models.MapType.Roadmap,
                    CenterCoordinates = Location.Parse(intermediate.MapConfig.MapCenter),
                }
            };
        }

        /// <summary>
        /// Reads a datatype configuration entry, leaving the map unstyled rather than
        /// taking the page down when the entry cannot be read.
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
}
