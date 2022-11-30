using Newtonsoft.Json;
using System;
using System.Globalization;
using System.Runtime.Serialization;
#if NET5_0_OR_GREATER
using System.Text.Json.Serialization;
#endif

namespace Our.Umbraco.GMaps.Models
{
    public class Location
    {
        [Obsolete("Use the ToString() method instead")]
        public string Coordinates => ToString();

        [DataMember(Name = "lat")]
        [JsonProperty("lat")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("lat")]
#endif
        public double Latitude { get; set; }

        [DataMember(Name = "lng")]
        [JsonProperty("lng")]
#if NET5_0_OR_GREATER
        [JsonPropertyName("lng")]
#endif
        public double Longitude { get; set; }

        public bool IsEmpty => Latitude == 0 && Longitude == 0;

        public override string ToString()
        {
            // Make sure coordinates are always formatted invariant (e.g. -1.23456789,12.3456789 vs. -1,23456789,12,3456789)
            return FormattableString.Invariant($"{Latitude}, {Longitude}");
        }
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
                    if (double.TryParse(pair[0], NumberStyles.Float | NumberStyles.AllowThousands, CultureInfo.InvariantCulture, out double latitude) && double.TryParse(pair[1], NumberStyles.Float | NumberStyles.AllowThousands, CultureInfo.InvariantCulture, out double longitude))
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