using System;
using Newtonsoft.Json;
#if NET5_0_OR_GREATER
using Microsoft.Extensions.Configuration;
#else
using System.Configuration;
#endif

namespace Our.Umbraco.GMaps.Core.Utility
{
    public class Settings
    {
        private const string ConfigurationSection = "GoogleMaps";

        [JsonProperty("apiKey")]
        internal string ApiKey { get; private set; }

        [JsonProperty("defaultLocation")]
        internal string DefaultLocation { get; private set; }

        [JsonProperty("zoomLevel")]
        internal int? ZoomLevel { get; private set; }

#if NET5_0_OR_GREATER
        internal Settings(IConfiguration configuration)
        {
            ApiKey = configuration[GetConfigKey(Constants.Configuration.ApiKey)];
            DefaultLocation = configuration[GetConfigKey(Constants.Configuration.DefaultLocation)];
            if (int.TryParse(configuration[GetConfigKey(Constants.Configuration.DefaultZoom)], out int defaultZoom)) {
                ZoomLevel = defaultZoom;
            }
        }
#else
        internal Settings()
        {
            ApiKey = ConfigurationManager.AppSettings[GetConfigKey(Constants.Configuration.ApiKey)];
            DefaultLocation = ConfigurationManager.AppSettings[GetConfigKey(Constants.Configuration.DefaultLocation)];
            if (int.TryParse(ConfigurationManager.AppSettings[GetConfigKey(Constants.Configuration.DefaultZoom)], out int defaultZoom)) {
                ZoomLevel = defaultZoom;
            }
        }
#endif
        private string GetConfigKey(string key) => $"{ConfigurationSection}:{key}";
    }
}
