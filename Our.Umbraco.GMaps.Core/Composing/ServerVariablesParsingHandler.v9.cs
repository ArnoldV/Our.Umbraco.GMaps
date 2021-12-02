#if NET5_0_OR_GREATER
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

        if (!serverVars.ContainsKey("umbracoUrls"))
        {
            throw new ArgumentException("Missing umbracoUrls.");
        }

        var umbracoUrlsObject = serverVars["umbracoUrls"];
        if (umbracoUrlsObject == null)
        {
            throw new ArgumentException("Null umbracoUrls");
        }

        if (!(umbracoUrlsObject is Dictionary<string, object> umbracoUrls))
        {
            throw new ArgumentException("Invalid umbracoUrls");
        }

        if (!serverVars.ContainsKey("umbracoPlugins"))
        {
            throw new ArgumentException("Missing umbracoPlugins.");
        }

        if (!(serverVars["umbracoPlugins"] is Dictionary<string, object> umbracoPlugins))
        {
            throw new ArgumentException("Invalid umbracoPlugins");
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
#endif