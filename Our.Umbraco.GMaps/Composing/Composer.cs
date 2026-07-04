using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Our.Umbraco.GMaps.Configuration;
using Umbraco.Cms.Api.Common.OpenApi;
using Umbraco.Cms.Api.Management.OpenApi;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace Our.Umbraco.GMaps.Composing;

public class Composer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        // Umbraco 18 replaced Swashbuckle with Microsoft.AspNetCore.OpenApi. Register the
        // package's Management API OpenAPI document; controllers opt in via [MapToApi(Constants.ApiName)].
        builder.AddBackOfficeOpenApiDocument(Constants.ApiName, document => document
            .WithTitle("Google Maps Management Api")
            .WithBackOfficeAuthentication());

        builder.Services.Configure<GoogleMaps>(options =>
        {
            builder.Config.GetSection(nameof(GoogleMaps)).Bind(options);
        });
    }
}