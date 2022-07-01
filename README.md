# Our.Umbraco.GMaps - Google Maps for Umbraco 8 and Umbraco 9

![Our.Umbraco.GMaps Logo](https://raw.githubusercontent.com/ArnoldV/Our.Umbraco.GMaps/master/icon.png)

Basic Google Maps with autocomplete property editor for Umbraco 8+ including property value converter.

[![Our.Umbraco.GMaps - CI](https://github.com/ArnoldV/Our.Umbraco.GMaps/actions/workflows/build.yml/badge.svg)](https://github.com/ArnoldV/Our.Umbraco.GMaps/actions/workflows/build.yml)
[![Our.Umbraco.GMaps - Release](https://github.com/ArnoldV/Our.Umbraco.GMaps/actions/workflows/release.yml/badge.svg)](https://github.com/ArnoldV/Our.Umbraco.GMaps/actions/workflows/release.yml)

| Package | NuGet |
| ------- | ----- |
| Our.Umbraco.GMaps | [![NuGet](https://img.shields.io/nuget/v/Our.Umbraco.GMaps)](https://www.nuget.org/packages/Our.Umbraco.GMaps) [![NuGet downloads](https://img.shields.io/nuget/dt/Our.Umbraco.GMaps.svg)](https://www.nuget.org/packages/Our.Umbraco.GMaps) |
| Our.Umbraco.GMaps.Core | [![NuGet](https://img.shields.io/nuget/v/Our.Umbraco.GMaps.Core)](https://www.nuget.org/packages/Our.Umbraco.GMaps.Core) [![NuGet downloads](https://img.shields.io/nuget/dt/Our.Umbraco.GMaps.Core.svg)](https://www.nuget.org/packages/Our.Umbraco.GMaps.Core) |

## Features

- Multi-targeting Umbraco 8, 9 and 10
- Search for address using autocomplete and place marker
- Enter coordinates in place marker
- Click on exact location on map to place marker
- Drag marker around
- Set default location & zoomlevel on Data Type settings
- Zoomlevel is saved on the property to use the same zoomlevel on your website
- Centerpoint is saved on the property to use the same centerpoint on your website different than the marker.
- MapType is saved on the property to use the same maptype on your website
- Use your SnazzyMaps API key to set mapstyles

## Install

Use NuGet to install Our.Umbraco.GMaps:  

```powershell
Install-Package Our.Umbraco.GMaps
```

- Enable the following Google Maps API on <https://console.cloud.google.com/home/dashboard>
  - Maps Javascript API
  - Geocoding API
  - Place API

## Configuration

You can configure the API Key along with other settings directly in AppSettings as per below:

### Umbraco 8

Add the following keys to your web.config AppSettings node:

```xml
 <!--Google Maps Configuration-->
 <add key="GoogleMaps:ApiKey" value="" /> <!-- Google Maps API Key -->
 <add key="GoogleMaps:DefaultLocation" value="" /> <!-- Coordinate pair in the format lat,lng -->
 <add key="GoogleMaps:DefaultZoom" value="17" /> <!-- Default Zoom Level for the Maps Property Editor. -->
```

### Umbraco 9+

Add the following to your appsettings.json file or equivalent settings provider (Azure KeyVault, Environment, etc.):

```json
  "GoogleMaps": {
    "ApiKey": "",
    "DefaultLocation": "",
    "ZoomLevel": 17
  }
```

These settings can be overridden by configuring the relevant properties of the Data Type prevalues.

## Build NuGet package

```powershell
PM> nuget pack Our.Umbraco.GMaps.Core\Our.Umbraco.GMaps.Core.csproj -Build
```

## Breaking Changes

- Coordinates in the strongly typed models are now represented using the `Location` object with individual `Latitude` and `Longitude` properties.

## Demo site Umbraco Backoffice Login Details

Username: admin@admin.com  
Password: *Password123*
  
## Special thanks and big #H5YR

Special thanks to:

- [ronaldbarendse](https://github.com/ronaldbarendse) for all his contributions to this project
- [prjseal](https://github.com/prjseal) for the Visual Studio project setup and included demo-site
- [robertjf](https://github.com/robertjf) for making the Umbraco 9 version a reality, accepting and testing PR's and setting up release automation

<a href="https://www.flaticon.com/free-icons/google-maps" title="google maps icons">Google maps icons created by Freepik - Flaticon</a>
