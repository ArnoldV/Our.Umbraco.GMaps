using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Our.Umbraco.GMaps.Models;
using Umbraco.Core.Models.PublishedContent;
using Umbraco.Core.PropertyEditors;

namespace Our.Umbraco.GMaps.PropertyValueConverter { 

    public class GMapsPropertyValueConverter : PropertyValueConverterBase
    {
        public override Type GetPropertyValueType(IPublishedPropertyType propertyType)
        {
            return typeof(GmapsModel);
        }

        public override PropertyCacheLevel GetPropertyCacheLevel(IPublishedPropertyType propertyType)
        {
            return PropertyCacheLevel.Element;
        }


        public override bool IsConverter(IPublishedPropertyType propertyType)
        {
            return propertyType.EditorAlias.Equals("Our.Umbraco.GMaps");
        }

        public override object ConvertSourceToIntermediate(IPublishedElement owner, IPublishedPropertyType propertyType, object source, bool preview)
        {
            return source;
        }

        public override object ConvertIntermediateToObject(IPublishedElement owner, IPublishedPropertyType propertyType, PropertyCacheLevel referenceCacheLevel, object inter, bool preview)
        {
            if (inter != null)
            {
                var model = JsonConvert.DeserializeObject<GmapsModel>(inter.ToString());
                if (model.Address == null)
                {
                    // Ensure address is not null
                    model.Address = new GmapsAddress();
                }
                if (model.MapConfig == null)
                {
                    // Ensure map config is not null
                    model.MapConfig = new GmapsMapConfig();
                }

                // Get API key from configuration
                var config = propertyType.DataType.ConfigurationAs<IDictionary<string, object>>();
                if (config != null &&
                    config.TryGetValue("apikey", out var apiKey))
                {
                    model.MapConfig.ApiKey = apiKey?.ToString();
                }

                return model;
            }

            return null;
        }
    }
}
