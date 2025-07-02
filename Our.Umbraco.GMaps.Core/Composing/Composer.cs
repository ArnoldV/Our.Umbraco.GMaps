using Microsoft.Extensions.DependencyInjection;
using Our.Umbraco.GMaps.Core.Configuration;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace Our.Umbraco.GMaps.Core.Composing
{
    public class Composer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
		    builder.Services.ConfigureOptions<MapsApiSwaggerGenOptions>();

			builder.AddGoogleMaps();
        }
    }
}