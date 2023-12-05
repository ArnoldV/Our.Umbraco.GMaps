using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace Our.Umbraco.GMaps.Core.Composing
{
    public class Composer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
			builder.AddGoogleMaps();
            builder.AddNotificationHandler<ServerVariablesParsingNotification, ServerVariablesParsingHandler>();
        }
    }
}