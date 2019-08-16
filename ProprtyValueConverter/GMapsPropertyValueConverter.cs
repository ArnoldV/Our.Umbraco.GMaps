using Axendo.Umb.Watersportverbond.Platform.Web.Core.Models.GMaps;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Umbraco.Core.Models.PublishedContent;
using Umbraco.Core.PropertyEditors;

namespace Axendo.Umb.Watersportverbond.Platform.Web.Core.Extensions
{
    public class GMapsPropertyValueConverter : PropertyValueConverterBase
    {
        public override Type GetPropertyValueType(IPublishedPropertyType propertyType)
        {
            return typeof(OurGmapsCore);
        }

        public override PropertyCacheLevel GetPropertyCacheLevel(IPublishedPropertyType propertyType)
        {
            return PropertyCacheLevel.Element;
        }


        public override bool IsConverter(IPublishedPropertyType propertyType)
        {
            return propertyType.EditorAlias.Equals("Our.Gmaps.Core");
        }

        public override object ConvertSourceToIntermediate(IPublishedElement owner, IPublishedPropertyType propertyType, object source, bool preview)
        {
            return source;
        }

        public override object ConvertIntermediateToObject(IPublishedElement owner, IPublishedPropertyType propertyType, PropertyCacheLevel referenceCacheLevel, object inter, bool preview)
        {
            if (inter != null)
            {
                return JsonConvert.DeserializeObject<OurGmapsCore>(inter.ToString());
            }

            return null;
        }
    }
}
