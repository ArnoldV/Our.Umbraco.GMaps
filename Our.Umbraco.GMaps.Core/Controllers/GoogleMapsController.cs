using Our.Umbraco.GMaps.Core.Configuration;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Web.BackOffice.Controllers;
using Umbraco.Cms.Web.Common.Attributes;
using Umbraco.Cms.Web.Common.Controllers;
using Microsoft.Extensions.Options;

namespace Our.Umbraco.GMaps.Core.Controllers
{
    [PluginController(Constants.PluginName)]
    public class GoogleMapsController : UmbracoAuthorizedApiController
    {
        private GoogleMaps googleMapsConfig;

        public GoogleMapsController(IOptionsMonitor<GoogleMaps> settings)
        {
            googleMapsConfig = settings.CurrentValue;
            settings.OnChange(config => googleMapsConfig = config);
        }

        [HttpGet]
        public GoogleMaps GetSettings()
        {
            return googleMapsConfig;
        }
    }
}
