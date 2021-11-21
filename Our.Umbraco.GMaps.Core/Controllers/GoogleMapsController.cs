using Our.Umbraco.GMaps.Core.Utility;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
#if NET5_0_OR_GREATER
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Dictionary;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Mapping;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.ContentEditing;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;
using Umbraco.Cms.Web.Common.Attributes;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Cms.Web.Common.Security;
using Umbraco.Cms.Web.Common.Controllers;
using Umbraco.Extensions;
#else
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Web.Http;
using System.Web.Security;
using System.Web;
using System.Web.Hosting;
using Umbraco.Web.WebApi;
using Umbraco.Core.Cache;
using Umbraco.Core.Configuration;
using Umbraco.Core.Logging;
using Umbraco.Core.Models;
using Umbraco.Core.Persistence;
using Umbraco.Core.Persistence.DatabaseModelDefinitions;
using Umbraco.Core.PropertyEditors;
using Umbraco.Core.Services;
using Umbraco.Core.Security;
using Umbraco.Web;
using Umbraco.Web.Editors;
using Umbraco.Web.Models.ContentEditing;
using Umbraco.Web.Mvc;
using Umbraco.Web.WebApi.Filters;
using static Umbraco.Core.Constants;
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
