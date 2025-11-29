using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Our.Umbraco.GMaps.Configuration;

public class MapsApiSwaggerGenOptions : IConfigureOptions<SwaggerGenOptions>
{
	public void Configure(SwaggerGenOptions options)
	{
		options.SwaggerDoc(
		  Constants.ApiName,
		  new OpenApiInfo
		  {
			  Title = "Google Maps Management Api",
			  Version = "Latest",
			  Description = "Api access Google Maps Management operations"
		  });

		options.OperationFilter<MapsApiOperationSecurityFilter>();
	}
}