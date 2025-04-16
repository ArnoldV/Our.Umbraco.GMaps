using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Our.Umbraco.GMaps.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Web.Common.Controllers;

namespace Our.Umbraco.GMaps.UmbracoV13.Controllers
{
    public class MapTestController(IContentService contentService,
                            IOptionsMonitor<Core.Configuration.GoogleMaps> mapsConfig,
                            ILogger<MapTestController> logger) : UmbracoApiController
    {
        public IActionResult CreateMapEntry()
        {
            logger.LogInformation("Testing Maps Configuration: {apiKey}", mapsConfig.CurrentValue.ApiKey);
            
            double lat = -35.23989947459226;
            double lng = 149.149934680426;
            Map map = new()
            {
                Address = new Address
                {
                    Coordinates = new Location
                    {
                        Latitude = lat,
                        Longitude = lng
                    }
                },
                MapConfig = new MapConfig
                {
                    Zoom = 15,
                    CenterCoordinates = new Location
                    {
                        Latitude = lat,
                        Longitude = lng
                    },
                    ApiKey = mapsConfig.CurrentValue.ApiKey
                }
            };

            logger.LogInformation("Map Details: {@Map}", map);
            string json = JsonSerializer.Serialize(map);

            // This is only needed for Newtonsoft.Json.  System.Text.Json doesn't have this issue.
            //Hack to get zoom to an int. Probably bug that's a string in model.
            //If a string the map won't show up and there is an error saying that zoom is not an int.
            //json = json.Replace("\"zoom\":\"15\"", "\"zoom\":15");

            var testContent = contentService.GetRootContent();
            foreach (var n in testContent)
            {
                n.SetValue("singleMap", json);
                contentService.SaveAndPublish(n);
            }

            return Ok();
        }
    }
}
