using Newtonsoft.Json;
using System;
using System.Runtime.Serialization;

namespace Our.Umbraco.GMaps.Models
{
    public class Location
    {
        public string Coordinates => $"{Latitude},{Longitude}";

        [DataMember(Name = "lat")]
        [JsonProperty("lat")]
        public string Latitude { get; set; }

        [DataMember(Name = "lng")]
        [JsonProperty("lng")]
        public string Longitude { get; set; }

        public bool IsEmpty => Latitude == String.Empty && Longitude == String.Empty;

        /// <summary>
        /// Parse the coordinates string.
        /// </summary>
        /// <param name="latLng"></param>
        /// <returns></returns>
         internal static Location Parse(string latlng)
        {
            if (!string.IsNullOrEmpty(latlng))
            {
                var pair = latlng.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries);
                if (pair.Length == 2)
                {
                    return new Location
                    {
                        Latitude = pair[0],
                        Longitude = pair[1]
                    };
                }
            }
            return new Location();
        }
    }
}
