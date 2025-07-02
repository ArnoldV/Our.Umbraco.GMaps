using System.Runtime.Serialization;

namespace Our.Umbraco.GMaps.Core.Configuration;

public class GoogleMaps
{
    public string ApiKey { get; set; }

    public string DefaultLocation { get; set; }

    public int? ZoomLevel { get; set; }
}
