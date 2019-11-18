using System;
using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Models
{
	public class GMapsMapConfig
	{
		private string _mapType;

		[JsonProperty("apikey")]
		public string ApiKey { get; set; }

		[JsonProperty("zoom")]
		public string Zoom { get; set; }

		[JsonProperty("mapcenter")]
		public string CenterCoordinates { get; set; }

		[JsonProperty("mapstyle")]
		public string Style { get; set; }

		[JsonProperty("maptype")]
		[Obsolete("This property should not return a different value than previously set.")]
		public string MapType
		{
			get
			{
				switch (this._mapType)
				{
					case "Hybrid":
						return "google.maps.MapTypeId.HYBRID";
					case "Satellite":
						return "google.maps.MapTypeId.SATELLITE";
					case "Terrain":
						return "google.maps.MapTypeId.TERRAIN";
					case "styled_map":
						return "styled_map";
					default:
						return "google.maps.MapTypeId.ROADMAP";
				}
			}
			set => this._mapType = value;
		}
	}

}