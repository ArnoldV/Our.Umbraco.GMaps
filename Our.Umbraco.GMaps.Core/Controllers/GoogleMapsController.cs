using Our.Umbraco.GMaps.Core.Config;
#if NET5_0_OR_GREATER
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Umbraco.Cms.Web.Common.Attributes;
using Umbraco.Cms.Web.Common.Controllers;
#else
using System.Web.Http;
using Umbraco.Web.WebApi;
using Umbraco.Core.Cache;
using Umbraco.Core.Configuration;
using Umbraco.Core.Logging;
using Umbraco.Core.Persistence;
using Umbraco.Core.Services;
using Umbraco.Web;
using Umbraco.Web.Mvc;
using Umbraco.Core.Mapping;
#endif

namespace Our.Umbraco.GMaps.Core.Controllers
{
    [PluginController(Constants.PluginName)]
    public class GoogleMapsController : UmbracoApiController
    {
        private readonly GoogleMapsConfig googleMapsConfig;

#if NET5_0_OR_GREATER
        public GoogleMapsController(GoogleMapsConfig settings)
#else
        public GoogleMapsController(IGlobalSettings globalSettings, IUmbracoContextAccessor umbracoContextAccessor,
                                   ISqlContext sqlContext, ServiceContext services, GoogleMapsConfig settings,
                                   AppCaches appCaches, IProfilingLogger logger, global::Umbraco.Core.IRuntimeState runtimeState,
                                   UmbracoHelper umbracoHelper, UmbracoMapper umbracoMapper) :
            base(globalSettings, umbracoContextAccessor, sqlContext, services, appCaches, logger, runtimeState, umbracoHelper, umbracoMapper)
#endif
        {
            googleMapsConfig = settings;
        }


        [HttpGet]
        public GoogleMapsConfig GetSettings()
        {
            return googleMapsConfig;
        }
    }
}
