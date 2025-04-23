using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Our.Umbraco.GMaps.Core.Configuration;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Api.Management.Routing;

namespace Our.Umbraco.GMaps.Core.Controllers
{
    [VersionedApiBackOfficeRoute("gmaps")]
    [ApiExplorerSettings(GroupName = "Our.Umbraco.GMaps")]
    public class GoogleMapsController : ManagementApiControllerBase
    {
        private GoogleMaps googleMapsConfig;

        public GoogleMapsController(IOptionsMonitor<GoogleMaps> settings)
        {
            googleMapsConfig = settings.CurrentValue;
            settings.OnChange(config => googleMapsConfig = config);
        }

        [HttpGet("config")]
        public GoogleMaps GetSettings()
        {
            return googleMapsConfig;
        }
    }
}
