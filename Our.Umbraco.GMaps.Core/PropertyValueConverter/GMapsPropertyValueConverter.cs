using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Our.Umbraco.GMaps.Models;
using Umbraco.Core.Models.PublishedContent;
using Umbraco.Core.PropertyEditors;

namespace Our.Umbraco.GMaps.PropertyValueConverter
{
	public class GMapsPropertyValueConverter : PropertyValueConverterBase
	{
		public override bool IsConverter(IPublishedPropertyType propertyType) => propertyType.EditorAlias.Equals("Our.Umbraco.GMaps");

		public override Type GetPropertyValueType(IPublishedPropertyType propertyType) => typeof(GMapsModel);

		public override PropertyCacheLevel GetPropertyCacheLevel(IPublishedPropertyType propertyType) => PropertyCacheLevel.Element;

		public override object ConvertIntermediateToObject(IPublishedElement owner, IPublishedPropertyType propertyType, PropertyCacheLevel referenceCacheLevel, object inter, bool preview)
		{
			if (inter != null)
			{
				var model = JsonConvert.DeserializeObject<GMapsModel>(inter.ToString());
				if (model != null) {
					if (model.Address == null)
					{
						// Ensure address is not null
						model.Address = new GMapsAddress();
					}
					if (model.MapConfig == null)
					{
						// Ensure map config is not null
						model.MapConfig = new GMapsMapConfig();
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

			return null;
		}
	}
}
