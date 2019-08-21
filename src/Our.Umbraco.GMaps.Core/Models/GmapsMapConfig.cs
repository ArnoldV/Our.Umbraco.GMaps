using Newtonsoft.Json;

namespace Our.Umbraco.GMaps.Models
{
    public class GmapsMapConfig
    {
        private string _mapType;
       
        public string Country { get; set; }
        [JsonProperty("apikey")]
        public string ApiKey { get; set; }
        [JsonProperty("zoom")]
        public string Zoom { get; set; }
        [JsonProperty("mapcenter")]
        public string CenterCoordinates { get; set; }

        [JsonProperty("mapstyle")]
        public string Style { get; set; }

        [JsonProperty("maptype")]
        public string MapType
        {
            get
            {
                var mapType = _mapType;

                string mapTypeId;
                switch (mapType)
                {
                    case "Hybrid":
                        mapTypeId = "google.maps.MapTypeId.HYBRID";
                        break;
                    case "Satellite":
                        mapTypeId = "google.maps.MapTypeId.SATELLITE";
                        break;
                    case "Terrain":
                        mapTypeId = "google.maps.MapTypeId.TERRAIN";
                        break;
                    case "styled_map":
                        mapTypeId = "styled_map";
                        break;
                    default:
                        mapTypeId = "google.maps.MapTypeId.ROADMAP";
                        break;
                };

                return mapTypeId;
            }
            set => _mapType = value;
        }
    }

}