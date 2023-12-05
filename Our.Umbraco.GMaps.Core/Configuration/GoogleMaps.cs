using System.Runtime.Serialization;

namespace Our.Umbraco.GMaps.Core.Configuration
{
    [DataContract]
    public class GoogleMaps
    {
        [DataMember(Name = "apiKey")]
        public string ApiKey { get; set; }

        [DataMember(Name = "defaultLocation")]
        public string DefaultLocation { get; set; }

        [DataMember(Name = "zoomLevel")]
        public int? ZoomLevel { get; set; }
    }
}
