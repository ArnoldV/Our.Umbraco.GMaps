using Newtonsoft.Json;
using System;
using System.Globalization;
using System.Runtime.Serialization;

namespace Our.Umbraco.GMaps.Models
{
    public class Location
    {
        public string Coordinates => $"{Latitude},{Longitude}";

        [DataMember(Name = "lat")]
        [JsonProperty("lat")]
        public double Latitude { get; set; }

        [DataMember(Name = "lng")]
        [JsonProperty("lng")]
        public double Longitude { get; set; }

        public bool IsEmpty => Latitude == 0 && Longitude == 0;

        /// <summary>
        /// Parse the coordinates string.
        /// </summary>
        /// <param name="latLng"></param>
        /// <returns></returns>
        internal static Location Parse(string latLng)
        {
            if (!string.IsNullOrEmpty(latLng))
            {
                var pair = latLng.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries);
                if (pair.Length == 2)
                {
                    if (double.TryParse(pair[0], NumberStyles.Any, CultureInfo.InvariantCulture, out double latitude) && double.TryParse(pair[1], NumberStyles.Any, CultureInfo.InvariantCulture, out double longitude))
                    {
                        return new Location
                        {
                            Latitude = latitude,
                            Longitude = longitude
                        };
                    }
                }
            }
            return new Location();
        }
    }
}
