using Umbraco.Cms.Api.Management.OpenApi;

namespace Our.Umbraco.GMaps.Configuration;

public class MapsApiOperationSecurityFilter : BackOfficeSecurityRequirementsOperationFilterBase
{
	protected override string ApiName => Constants.ApiName;
}