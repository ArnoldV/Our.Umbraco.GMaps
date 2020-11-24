using System.Runtime.Serialization;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Our.Umbraco.GMaps.Models
{
	public class GMapsMapConfig
	{
		[JsonProperty("apikey")]
		public string ApiKey { get; set; }

		[JsonProperty("zoom")]
		public string Zoom { get; set; }

		[JsonProperty("mapcenter")]
		public string CenterCoordinates { get; set; }

		[JsonProperty("mapstyle")]
		public string Style { get; set; }

		[JsonProperty("maptype")]
		[JsonConverter(typeof(StringEnumConverter))]
		public MapType? MapType { get; set; }
	}

	/// <summary>
	/// https://developers.google.com/maps/documentation/javascript/maptypes?hl=nl#BasicMapTypes
	/// </summary>
	public enum MapType
	{
		[EnumMember(Value = "roadmap")]
		Roadmap,
		[EnumMember(Value = "satellite")]
		Satellite,
		[EnumMember(Value = "hybrid")]
		Hybrid,
		[EnumMember(Value = "terrain")]
		Terrain,
		[EnumMember(Value = "styled_map")]
		StyledMap
	}
}