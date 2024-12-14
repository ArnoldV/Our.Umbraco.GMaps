using System.Runtime.Serialization;

namespace Our.Umbraco.GMaps.Models
{
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