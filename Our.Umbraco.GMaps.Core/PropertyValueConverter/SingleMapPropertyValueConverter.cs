using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;
using System;
using Newtonsoft.Json;
using Our.Umbraco.GMaps.Models;
using Our.Umbraco.GMaps.Core;
using Our.Umbraco.GMaps.Core.Models.Configuration;
using System.Collections.Generic;
using Our.Umbraco.GMaps.Core.Configuration;
using Our.Umbraco.GMaps.Models.Legacy;
using Microsoft.Extensions.Options;

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
        public override bool IsConverter(IPublishedPropertyType propertyType) => propertyType.EditorAlias.Equals(Constants.MapPropertyAlias);

        public override Type GetPropertyValueType(IPublishedPropertyType propertyType) => typeof(Map);

        public override PropertyCacheLevel GetPropertyCacheLevel(IPublishedPropertyType propertyType) => PropertyCacheLevel.Element;

        public override object ConvertIntermediateToObject(IPublishedElement owner, IPublishedPropertyType propertyType, PropertyCacheLevel referenceCacheLevel, object inter, bool preview)
        {
            Map model = null;
            if (inter != null)
            {
                // Handle pre v2.0.0 data.
                inter = inter.ToString().ToLower().Replace("google.maps.maptypeid.", string.Empty);
                bool legacyData = inter.ToString().Contains("latlng");
                if (legacyData)
                {
                    var intermediate = JsonConvert.DeserializeObject<LegacyMap>(inter.ToString());
                    model = new Map
                    {
                        Address = intermediate.Address,
                        MapConfig = intermediate.MapConfig
                    };

                    // Map the LatLng property.
                    model.Address.Coordinates = Location.Parse(intermediate.Address.LatLng);
                    model.MapConfig.CenterCoordinates = Location.Parse(intermediate.MapConfig.MapCenter);
                    model.MapConfig.Zoom = string.IsNullOrEmpty(intermediate.MapConfig.Zoom) ? 17 : Convert.ToInt32(intermediate.MapConfig.Zoom);
                }
                else
                {
                    model = JsonConvert.DeserializeObject<Map>(inter.ToString());
                }
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

                    if (config.TryGetValue("mapstyle", out var mapStyle) && mapStyle != null)
                    {
                        var style = JsonConvert.DeserializeObject<MapStyle>(mapStyle.ToString());
                        model.MapConfig.Style = style?.Selectedstyle?.Json;
                    }
                }
            }

            return model;
        }
    }
}
