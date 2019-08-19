
 ██████╗ ██╗   ██╗██████╗    ██╗   ██╗███╗   ███╗██████╗ ██████╗  █████╗  ██████╗ ██████╗     ██████╗ ███╗   ███╗ █████╗ ██████╗ ███████╗
██╔═══██╗██║   ██║██╔══██╗   ██║   ██║████╗ ████║██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔═══██╗   ██╔════╝ ████╗ ████║██╔══██╗██╔══██╗██╔════╝
██║   ██║██║   ██║██████╔╝   ██║   ██║██╔████╔██║██████╔╝██████╔╝███████║██║     ██║   ██║   ██║  ███╗██╔████╔██║███████║██████╔╝███████╗
██║   ██║██║   ██║██╔══██╗   ██║   ██║██║╚██╔╝██║██╔══██╗██╔══██╗██╔══██║██║     ██║   ██║   ██║   ██║██║╚██╔╝██║██╔══██║██╔═══╝ ╚════██║
╚██████╔╝╚██████╔╝██║  ██║██╗╚██████╔╝██║ ╚═╝ ██║██████╔╝██║  ██║██║  ██║╚██████╗╚██████╔╝██╗╚██████╔╝██║ ╚═╝ ██║██║  ██║██║     ███████║
 ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝     ╚══════╝

--------------------------------------------------------------------------

# Our.Umbraco.GMaps - Google Maps for Umbraco 8
Basic Google Maps with autocomplete property editor for Umbraco 8 including property value converter.

# Features
- Search for address using autocomplete and place marker
- Enter coordinatesan place marker
- Click on exact location on map to place marker
- Drag marker around
- Set default location & zoomlevel on Data Type settings
- Zoomlevel is saved on the proprety to use the same zoomlevel on your website

# Manual Install

- Enable the following Google Maps API on https://console.cloud.google.com/home/dashboard
  - Maps Javascript API
  - Geocoding API
  - Place API

- Place Our.Umbraco.GMaps directory in /App_plugins
- In Umbraco backoffice in the Settings section create a new datatype of type "Google Maps Single Marker".
  - The API key, default location and default zoom can be entered on the Data Type settings.

# Special thanks
Special thanks to [prjseal](https://github.com/prjseal) for the visual studio project setup and included demo-site #h5yr!