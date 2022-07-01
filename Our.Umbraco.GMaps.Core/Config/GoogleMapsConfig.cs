using Newtonsoft.Json;
using System.Runtime.Serialization;
#if NET5_0_OR_GREATER
using Microsoft.Extensions.Configuration;
#else
using System.Configuration;
#endif

namespace Our.Umbraco.GMaps.Core.Config
{
    public class GoogleMapsConfig
    {
        [DataMember(Name = "apiKey")]
        [JsonProperty("apiKey")]
        public string ApiKey { get; set; }

        [DataMember(Name = "defaultLocation")]
        [JsonProperty("defaultLocation")]
        public string DefaultLocation { get; set; }

        [DataMember(Name = "zoomLevel")]
        [JsonProperty("zoomLevel")]
        public int? ZoomLevel { get; set; }

#if NET5_0_OR_GREATER
        public GoogleMapsConfig()
        {
        }

        internal GoogleMapsConfig(IConfiguration configuration)
        {
            if (configuration != null)
            {
                var configSection = configuration.GetSection(Constants.Configuration.SectionName).Get<GoogleMapsConfig>();

                ApiKey = configSection?.ApiKey;
                DefaultLocation = configSection?.DefaultLocation;
                ZoomLevel = configSection?.ZoomLevel;
            }
        }
#else
        public GoogleMapsConfig()
        {
            ApiKey = GetConfigurationItem(Constants.Configuration.ApiKey);
            DefaultLocation = GetConfigurationItem(Constants.Configuration.DefaultLocation);
            if (int.TryParse(GetConfigurationItem(Constants.Configuration.DefaultZoom), out int defaultZoom))
            {
                ZoomLevel = defaultZoom;
            }
        }
        private static string GetConfigurationItem(string key) => ConfigurationManager.AppSettings[$"{Constants.Configuration.SectionName}:{key}"];
#endif    
    }
}
