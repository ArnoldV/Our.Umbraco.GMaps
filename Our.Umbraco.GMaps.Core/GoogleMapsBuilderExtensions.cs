using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Our.Umbraco.GMaps.Core.Configuration;
using System.Linq;
using Umbraco.Cms.Core.DependencyInjection;

namespace Our.Umbraco.GMaps.Core;

public static class GoogleMapsBuilderExtensions
{
    /// <summary>
    /// Registers the Google Maps Settings 
    /// </summary>
    /// <param name="builder"></param>
    /// <param name="defaultOptions"></param>
    /// <returns></returns>
    public static IUmbracoBuilder AddGoogleMaps(this IUmbracoBuilder builder)
    {
        // If the GoogleMapsConfig Service is registered then we assume this has been added before so we don't do it again. 
        if (builder.Services.Any(x => x.ServiceType == typeof(GoogleMaps)))
        {
            return builder;
        }

        builder.Services.Configure<GoogleMaps>(options =>
        {
            builder.Config.GetSection(nameof(GoogleMaps)).Bind(options);
        });

        return builder;
    }
}