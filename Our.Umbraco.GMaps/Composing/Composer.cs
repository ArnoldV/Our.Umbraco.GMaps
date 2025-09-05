using Microsoft.Extensions.DependencyInjection;
using Our.Umbraco.GMaps.Configuration;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace Our.Umbraco.GMaps.Composing;

public class Composer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
		    builder.Services.ConfigureOptions<MapsApiSwaggerGenOptions>();

			builder.AddGoogleMaps();
    }
}