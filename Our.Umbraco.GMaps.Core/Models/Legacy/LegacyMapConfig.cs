using System.Text.Json.Serialization;
using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Models
{
    internal class LegacyMapConfig : MapConfig
    {
        [JsonProperty("mapcenter")]
        [JsonPropertyName("mapcenter")]
        public string MapCenter { get; set; }

        [Newtonsoft.Json.JsonIgnore]
        [System.Text.Json.Serialization.JsonIgnore]
        public new string Zoom { get; set; }

        [JsonProperty("zoom")]
        [JsonPropertyName("zoom")]
        public object _zoom
        {
            get
            {
                if (int.TryParse(Zoom, out var intValue)) return intValue;
                return this.Zoom;
            }
            set { this.Zoom = value.ToString(); }
        }

        [Newtonsoft.Json.JsonIgnore]
        [System.Text.Json.Serialization.JsonIgnore]
        public new MapType MapType { get; set; }

        [JsonProperty("maptype")]
        [JsonPropertyName("maptype")]
        public new object _mapType
        {
            get
            {
                return this.MapType;
                //return base.MapType?.ToString().ToLower();
            }
            set {
                this.MapType = value switch
                {
                    "roadmap" => Models.MapType.Roadmap,
                    "satellite" => Models.MapType.Satellite,
                    "hybrid" => Models.MapType.Hybrid,
                    "terrain" => Models.MapType.Terrain,
                    "styled_map" => Models.MapType.StyledMap,
                    "styled map" => Models.MapType.StyledMap,
                    _ => Models.MapType.Roadmap,
                }; 
            }
        }
    }
}
