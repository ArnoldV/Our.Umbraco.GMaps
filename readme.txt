
 ██████╗ ██╗   ██╗██████╗    ██╗   ██╗███╗   ███╗██████╗ ██████╗  █████╗  ██████╗ ██████╗     ██████╗ ███╗   ███╗ █████╗ ██████╗ ███████╗
██╔═══██╗██║   ██║██╔══██╗   ██║   ██║████╗ ████║██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔═══██╗   ██╔════╝ ████╗ ████║██╔══██╗██╔══██╗██╔════╝
██║   ██║██║   ██║██████╔╝   ██║   ██║██╔████╔██║██████╔╝██████╔╝███████║██║     ██║   ██║   ██║  ███╗██╔████╔██║███████║██████╔╝███████╗
██║   ██║██║   ██║██╔══██╗   ██║   ██║██║╚██╔╝██║██╔══██╗██╔══██╗██╔══██║██║     ██║   ██║   ██║   ██║██║╚██╔╝██║██╔══██║██╔═══╝ ╚════██║
╚██████╔╝╚██████╔╝██║  ██║██╗╚██████╔╝██║ ╚═╝ ██║██████╔╝██║  ██║██║  ██║╚██████╗╚██████╔╝██╗╚██████╔╝██║ ╚═╝ ██║██║  ██║██║     ███████║
 ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝     ╚══════╝

--------------------------------------------------------------------------

# Our.Umbraco.GMaps - Google Maps for Umbraco 8+
Basic Google Maps with autocomplete property editor for Umbraco 8+ including property value converter.

# Features
- Search for address using autocomplete and place marker
- Enter coordinates in place marker
- Click on exact location on map to place marker
- Drag marker around
- Set default location & zoomlevel on Data Type settings
- Zoomlevel is saved on the proprety to use the same zoomlevel on your website
- Centerpoint is saved on the proprety to use the same centerpoint on your website different than the marker.
- MapType is saved on the proprety to use the same maptype on your website
- Use your SnazzyMaps API key to set mapstyles

# Enable Google Maps API

- Enable the following Google Maps API on https://console.cloud.google.com/home/dashboard
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

### Umbraco 9
Add the following to your appsettings.json file or equivalent settings provider (Azure KeyVault, Environment, etc.):

```json
  "GoogleMaps": {
    "ApiKey": "",
    "DefaultLocation": "",
    "ZoomLevel": 17
  }
```

These settings can be overridden by configuring the relevant properties of the Data Type prevalues.

# Manual Install

- Place Our.Umbraco.GMaps directory in \App_Plugins
- In Umbraco backoffice in the Settings section create a new datatype of type "Google Maps Single Marker".
  - The API key, default location and default zoom can be entered on the Data Type settings.

# Special thanks
Special thanks to [ronaldbarendse](https://github.com/ronaldbarendse) for contributing to this project #h5yr!
Special thanks to [prjseal](https://github.com/prjseal) for the Visual Studio project setup and included demo-site #h5yr!
Special thanks to [robertjf](https://github.com/robertjf) for contributing to this project and setting up the Release Workflow #h5yr!