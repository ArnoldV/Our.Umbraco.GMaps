using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Our.Umbraco.GMaps.Configuration;
#if !UMBRACO_17
using Umbraco.Cms.Api.Common.OpenApi;
using Umbraco.Cms.Api.Management.OpenApi;
#endif
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace Our.Umbraco.GMaps.Composing;

public class Composer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        // Registering the package's Management API OpenAPI document is the only place the two
        // supported Umbraco majors diverge; controllers opt in via [MapToApi(Constants.ApiName)].
#if UMBRACO_17
        // Umbraco 17 describes the Management API with Swashbuckle.
        builder.Services.ConfigureOptions<MapsApiSwaggerGenOptions>();
#else
        // Umbraco 18 replaced Swashbuckle with Microsoft.AspNetCore.OpenApi.
        builder.AddBackOfficeOpenApiDocument(Constants.ApiName, document => document
            .WithTitle("Google Maps Management Api")
            .WithBackOfficeAuthentication());
#endif

        builder.Services.Configure<GoogleMaps>(options =>
        {
            builder.Config.GetSection(nameof(GoogleMaps)).Bind(options);
        });
    }
}