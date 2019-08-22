# Our.Umbraco.GMaps - Google Maps for Umbraco 8
Basic Google Maps with autocomplete property editor for Umbraco 8 including property value converter.

![Nuget](https://img.shields.io/nuget/v/Our.Umbraco.GMaps)
[![Nuget Downloads](https://img.shields.io/nuget/dt/Our.Umbraco.GMaps.svg)](https://www.nuget.org/packages/Our.Umbraco.GMaps)

## Features
- Search for address using autocomplete and place marker
- Enter coordinatesan place marker
- Click on exact location on map to place marker
- Drag marker around
- Set default location & zoomlevel on Data Type settings
- Zoomlevel is saved on the proprety to use the same zoomlevel on your website
- Centerpoint is saved on the proprety to use the same centerpoint on your website different than the marker.
- MapType is saved on the proprety to use the same maptype on your website
- User your SnazzyMaps API key to set mapstyles

## Install
Use NuGet to install Our.Umbraco.Gmaps:  
https://www.nuget.org/packages/Our.Umbraco.GMaps

- Enable the following Google Maps API on https://console.cloud.google.com/home/dashboard
  - Maps Javascript API
  - Geocoding API
  - Place API


## Manual Install
- Place Our.Umbraco.GMaps directory in /App_plugins
- In Umbraco backoffice in the Settings section create a new datatype of type "Google Maps Single Marker".
  - The API key, default location and default zoom can be entered on the Data Type settings.
  
## Build NuGet package
- nuget pack Our.Umbraco.GMaps.Core\Our.Umbraco.GMaps.Core.csproj

## Demo site Umbraco Backoffice Login Details
Username: admin@admin.com
Password: 1234567890 
  
## Special thanks
Special thanks to [prjseal](https://github.com/prjseal) for the visual studio project setup and included demo-site #h5yr!
