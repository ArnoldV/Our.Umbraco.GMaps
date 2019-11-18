using System;
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
				return JsonConvert.DeserializeObject<GMapsModel>(inter.ToString());
			}

			return null;
		}
	}
}
