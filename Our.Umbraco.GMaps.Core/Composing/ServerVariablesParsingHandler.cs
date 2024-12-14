using Our.Umbraco.GMaps.Core.Controllers;
using Microsoft.AspNetCore.Routing;
using System;
using System.Collections.Generic;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Extensions;

namespace Our.Umbraco.GMaps.Core.Composing
{
    internal class ServerVariablesParsingHandler :
        INotificationHandler<ServerVariablesParsingNotification>
    {
        private readonly LinkGenerator linkGenerator;

        public ServerVariablesParsingHandler(LinkGenerator linkGenerator)
        {
            this.linkGenerator = linkGenerator;
        }

        public void Handle(ServerVariablesParsingNotification notification)
        {
            IDictionary<string, object> serverVars = notification.ServerVariables;

            if (!serverVars.TryGetValue("umbracoUrls", out object umbracoUrlsObject))
            {
                throw new ArgumentException("Missing umbracoUrls.");
            }

            if (umbracoUrlsObject is not Dictionary<string, object> umbracoUrls)
            {
                throw new ArgumentException("Invalid umbracoUrls");
            }

            var gMapsBaseUrl = linkGenerator.GetUmbracoApiServiceBaseUrl<GoogleMapsController>(controller =>
                controller.GetSettings());

            if (!umbracoUrls.ContainsKey(nameof(gMapsBaseUrl)))
            {
                umbracoUrls[nameof(gMapsBaseUrl)] = gMapsBaseUrl;
            }
        }
    }
}