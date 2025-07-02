using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Our.Umbraco.GMaps.Core.Configuration;
using Umbraco.Cms.Api.Common.Attributes;
using Umbraco.Cms.Api.Management.Controllers;

namespace Our.Umbraco.GMaps.Core.Controllers;

[ApiExplorerSettings(GroupName = "Settings")]
[ApiVersion("1.0")]
[MapToApi(Constants.ApiName)]
public class SettingsController(IOptions<GoogleMaps> settings) : ManagementApiControllerBase
{
    [HttpGet("Settings")]
    [ProducesResponseType(typeof(GoogleMaps), 200)]
    public GoogleMaps GetSettings()
    {
        return settings.Value;
    }
}