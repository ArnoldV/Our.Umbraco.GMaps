using System;
using System.Runtime.Serialization;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Our.Umbraco.GMaps.Models
{
    public class MapConfig
	{
		[JsonProperty("apikey")]
		public string ApiKey { get; set; }

		[JsonProperty("zoom")]
		public string Zoom { get; set; }

		[JsonProperty("mapcenter")]
		[Obsolete("Used only for backwards compatibility with Our.Umbraco.GMaps for Umbraco 8")]
		public string MapCenter { get; set; }

		[JsonProperty("centerCoordinates")]
		public Location CenterCoordinates { get; set; }

		[JsonProperty("mapstyle")]
		public string Style { get; set; }

		[JsonProperty("maptype")]
		[JsonConverter(typeof(StringEnumConverter))]
		public MapType? MapType { get; set; }

		internal MapConfig()
        {
        }
	}
}