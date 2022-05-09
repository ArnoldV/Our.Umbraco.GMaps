#if NET5_0_OR_GREATER
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;
using Microsoft.Extensions.Configuration;
#else
using Umbraco.Core.Models.PublishedContent;
using Umbraco.Core.PropertyEditors;
#endif
using System;
using Newtonsoft.Json;
using Our.Umbraco.GMaps.Models;
using Our.Umbraco.GMaps.Core;
using Our.Umbraco.GMaps.Core.Models.Configuration;
using System.Collections.Generic;
using Our.Umbraco.GMaps.Core.Config;
using Our.Umbraco.GMaps.Models.Legacy;

namespace Our.Umbraco.GMaps.PropertyValueConverter
{
    public class SingleMapPropertyValueConverter : PropertyValueConverterBase
    {
        private readonly GoogleMapsConfig googleMapsConfig;

        public SingleMapPropertyValueConverter(GoogleMapsConfig googleMapsConfig)
        {
            this.googleMapsConfig = googleMapsConfig;
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
