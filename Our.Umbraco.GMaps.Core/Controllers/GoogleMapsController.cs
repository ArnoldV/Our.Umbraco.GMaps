using Our.Umbraco.GMaps.Core.Utility;
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
#endif

namespace Our.Umbraco.GMaps.Core.Controllers
{
    [PluginController(Constants.PluginName)]
    public class GoogleMapsController : UmbracoApiController
    {
        private readonly Settings settings;

#if NET5_0_OR_GREATER
        public GoogleMapsController(IConfiguration configuration)
#else
        public GoogleMapsController(IGlobalSettings globalSettings, IUmbracoContextAccessor umbracoContextAccessor,
                                   ISqlContext sqlContext, ServiceContext services,
                                   AppCaches appCaches, IProfilingLogger logger, global::Umbraco.Core.IRuntimeState runtimeState,
                                   UmbracoHelper umbracoHelper) :
            base(globalSettings, umbracoContextAccessor, sqlContext, services, appCaches, logger, runtimeState, umbracoHelper)
#endif
        {
#if NET5_0_OR_GREATER
            settings = new Settings(configuration);
#else
            settings = new Settings();
#endif
        }


        [HttpGet]
        public Settings GetSettings()
        {
            return settings;
        }
    }
}
