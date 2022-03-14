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
                inter = inter.ToString().Replace("google.maps.MapTypeId.", string.Empty);

                model = JsonConvert.DeserializeObject<Map>(inter.ToString());
                if(!string.IsNullOrWhiteSpace(model.Address?.Latlng))
                {
                    model.Address.Coordinates = Location.Parse(model.Address.Latlng);
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
