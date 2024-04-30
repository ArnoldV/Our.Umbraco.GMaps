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
        public object _value
        {
            get
            {
                if (int.TryParse(Zoom, out var intValue)) return intValue;
                return this.Zoom;
            }
            set { this.Zoom = value.ToString(); }
        }
    }
}
