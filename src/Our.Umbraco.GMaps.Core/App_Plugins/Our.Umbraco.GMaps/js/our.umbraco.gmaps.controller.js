angular.module("umbraco").controller("Our.Gmaps.Core.Controller",
    [
        "$scope",
        "OurGmapsCoreFactory",

        function ($scope, OurGmapsCoreFactory) {
            'use strict';

            $scope.apiKey = '';
            // amsterdam central station
            $scope.defaultLocation = '52.379189, 4.899431';
            // default zoomlevel
            $scope.zoomLevel = 17;
            $scope.mapStyleFromModel = false;
            $scope.map = '';
            $scope.mapType = 'Roadmap';
            $scope.mapStyle = {};
            $scope.mapCenter = '';
            $scope.mapObject = {};
            $scope.address = {};
            $scope.mapconfig = {};
            // show the overlay loader
            $scope.showLoader = true;
            $scope.searchedValue = '';

            var mapElement = document.getElementById('map-canvas');
            var autoCompleteElement = document.getElementById('map-autocomplete');

            if ($scope.model.config !== null) {
                // default location when set on data type config
                if ($scope.model.config.location) {
                    $scope.defaultLocation = $scope.model.config.location;
                }
                // default zoom when set on data type config
                if ($scope.model.config.zoom) {
                    $scope.zoomLevel = $scope.model.config.zoom;
                }
                if ($scope.model.config.apikey) {
                    $scope.apiKey = $scope.model.config.apikey;
                }
                if ($scope.model.config.maptype) {
                    $scope.mapType = $scope.model.config.maptype;
                }
                if ($scope.model.config.mapstyle && $scope.model.config.mapstyle.selectedstyle) {
                    $scope.mapStyle = $scope.model.config.mapstyle.selectedstyle;
                }
            }

            //$scope.model.value.map.zoom = $scope.defaultZoom;
            $scope.address.latlng = $scope.defaultLocation;

            // if there is a value on the model set this to the editor
            if ($scope.model.value) {
                if ($scope.model.value.address) {

                    if ($scope.model.value.address.latlng) {
                        $scope.address.latlng = $scope.model.value.address.latlng;
                    }

                    if ($scope.model.value.address.full_address) {
                        $scope.address.full_address = $scope.model.value.address.full_address;
                    }

                    if ($scope.model.value.address.postalcode) {
                        $scope.address.postalcode = $scope.model.value.address.postalcode;
                    }
                    if ($scope.model.value.address.state) {
                        $scope.address.state = $scope.model.value.address.state;
                    }
                    if ($scope.model.value.address.country) {
                        $scope.address.country = $scope.model.value.address.country;
                    }
                    if ($scope.model.value.address.city) {
                        $scope.address.city = $scope.model.value.address.city;
                        $scope.searchedValue = [
                            $scope.address.full_address, $scope.address.postalcode, $scope.address.city,
                            $scope.address.country
                        ].join(' ');
                    } else {
                        $scope.searchedValue = $scope.address.latlng;
                    }
                }

                if ($scope.model.value.mapconfig) {

                    if ($scope.model.value.mapconfig.apikey) {
                        $scope.apikey = $scope.model.value.mapconfig.apikey;
                    }
                    if ($scope.model.value.mapconfig.zoom) {
                        $scope.zoomLevel = $scope.model.value.mapconfig.zoom;
                    }
                    if ($scope.model.value.mapconfig.maptype) {
                        $scope.mapType = $scope.model.value.mapconfig.maptype;
                        $scope.mapStyleFromModel = true;
                    }
                    if ($scope.model.value.mapconfig.mapcenter) {
                        $scope.mapCenter = $scope.model.value.mapconfig.mapcenter;
                    }
                }
                else {
                    $scope.model.value.map = {};
                }
            }

            // validate the coordiantes input
            var checkLat = /^(-?[1-8]?\d(?:\.\d{1,18})?|90(?:\.0{1,18})?)$/;
            var checkLng = /^(-?(?:1[0-7]|[1-9])?\d(?:\.\d{1,18})?|180(?:\.0{1,18})?)$/;
            $scope.validateLatLong = function (latLng) {

                var lat_lgn = latLng.split(",");

                var latVal = parseFloat(lat_lgn[0]);
                var lngVal = parseFloat(lat_lgn[1]);

                var validLat = checkLat.test(latVal);
                var validLgn = checkLng.test(lngVal);
                if (validLat && validLgn) {
                    return true;
                } else {
                    return false;
                }
            };

            // Geocode based on coordinates
            $scope.geocodePosition = function (coordinates, callback) {
                $scope.showLoader = true;

                var geocoder = new google.maps.Geocoder();
                geocoder.geocode({
                    latLng: coordinates
                }, function (results, status) {
                    if (status === 'OK') {
                        if (results && results.length > 0) {
                            $scope.updateMarkerAddress(results[0], coordinates);
                        }
                    } else if (status === 'ZERO_RESULTS') {
                        $scope.updateMarkerAddress(null, coordinates);
                    } else {
                        console.log('Geocode was not successful for the following reason: ' + status);
                    }
                    callback();
                });
            };

            // Create a (simplified) address object based on the address components
            $scope.getAddressObject = function (address_components) {
                var ShouldBeComponent = {
                    // street_number indicates the precise street number.
                    home: [
                        "street_number"
                    ],
                    postalcode: ["postal_code"],
                    street: [
                        //street_address indicates a precise street address.
                        "street_address",
                        //route indicates a named route (such as "US 101").
                        "route"
                    ],
                    region: [
                        // administrative_area_level_1 indicates a first-order civil entity below the country level. Within the United States, these administrative levels are states. 
                        // Not all nations exhibit these administrative levels.In most cases, administrative_area_level_1 short names will closely match ISO 3166-2 subdivisions and other widely circulated lists; however this is not guaranteed as our geocoding results are based on a variety of signals and location data.                    
                        "administrative_area_level_1",
                        // administrative_area_level_2 indicates a second-order civil entity below the country level. Within the United States, these administrative levels are counties. Not all nations exhibit these administrative levels.
                        "administrative_area_level_2",
                        // administrative_area_level_3 indicates a third-order civil entity below the country level. This type indicates a minor civil division. Not all nations exhibit these administrative levels.
                        "administrative_area_level_3",
                        // administrative_area_level_4 indicates a fourth-order civil entity below the country level. This type indicates a minor civil division. Not all nations exhibit these administrative levels.
                        "administrative_area_level_4",
                        // administrative_area_level_5 indicates a fifth-order civil entity below the country level. This type indicates a minor civil division. Not all nations exhibit these administrative levels.
                        "administrative_area_level_5"
                    ],
                    city: [
                        // locality indicates an incorporated city or town political entity.
                        "locality",
                        // sublocality indicates a first-order civil entity below a locality. For some locations may receive one of the additional types: sublocality_level_1 to sublocality_level_5. 
                        // Each sublocality level is a civil entity. Larger numbers indicate a smaller geographic area.
                        "sublocality",
                        "sublocality_level_1",
                        "sublocality_level_2",
                        "sublocality_level_3",
                        "sublocality_level_4",
                        "sublocality_level_5"
                    ],
                    country: ["country"]
                };

                var address = {
                    home: "",
                    postalcode: "",
                    street: "",
                    region: "",
                    city: "",
                    country: ""
                };

                address_components.forEach(component => {
                    for (var shouldBe in ShouldBeComponent) {
                        if (ShouldBeComponent[shouldBe].indexOf(component.types[0]) !== -1) {
                            address[shouldBe] = component.long_name;
                        }
                    }
                });
                return address;
            };


            $scope.updateMarkerAddress = function (str, coordinates) {
                if (str !== null) {
                    var split_address = str.formatted_address.split(',');

                    $scope.address.full_address = split_address[0];
                    var address = $scope.getAddressObject(str.address_components);

                    $scope.address.postalcode = address.postalcode;
                    $scope.address.city = address.city;
                    $scope.address.state = address.region;
                    $scope.address.country = address.country;
                } else {
                    // no results == no address, but just a location
                    $scope.address = {};
                }

                if ($scope.address.city) {
                    $scope.searchedValue = [
                        $scope.address.full_address, $scope.address.postalcode, $scope.address.city,
                        $scope.address.state, $scope.address.country
                    ].join(' ');
                } else {
                    $scope.searchedValue = coordinates;
                }

                $scope.address.latlng = [coordinates.lat(), coordinates.lng()].join(', ');

                $scope.savedata();
            };

            $scope.savedata = function () {
                $scope.mapconfig.apikey = $scope.apiKey;
                $scope.mapconfig.zoom = $scope.zoomLevel;
                $scope.mapconfig.maptype = $scope.mapType;
                $scope.mapconfig.mapstyle = $scope.mapStyle.json;

                if ($scope.mapCenter) {
                    $scope.mapconfig.mapcenter = $scope.mapCenter;
                }

                // update model
                $scope.mapObject.address = $scope.address;
                $scope.mapObject.mapconfig = $scope.mapconfig;

                $scope.model.value = $scope.mapObject;
            };

            $scope.initMapMarker = function (marker_latlng) {
                var lat_lgn = marker_latlng;
                if (lat_lgn === null || lat_lgn === undefined) {
                    lat_lgn = $scope.address.latlng;
                    lat_lgn = lat_lgn.split(",");
                } else {
                    lat_lgn = lat_lgn.split(",");
                }
                var latLng = new google.maps.LatLng(parseFloat(lat_lgn[0]), parseFloat(lat_lgn[1]));

                var mapTypeId = google.maps.MapTypeId.ROADMAP;
                switch ($scope.mapType) {
                    case 'Hybrid':
                        mapTypeId = google.maps.MapTypeId.HYBRID;
                        break;
                    case 'Satellite':
                        mapTypeId = google.maps.MapTypeId.SATELLITE;
                        break;
                    case 'Terrain':
                        mapTypeId = google.maps.MapTypeId.TERRAIN;
                        break;
                    case 'styled_map':
                        mapTypeId = 'styled_map';
                        break;
                };

                var useMapStyle = false;
                var maptypeIds = ['roadmap', 'satellite', 'hybrid', 'terrain'];

                if ($scope.mapStyle && $scope.mapStyle.json) {
                    maptypeIds = [
                        'roadmap', 'satellite', 'hybrid', 'terrain',
                        'styled_map'
                    ];
                    useMapStyle = true;
                }

                // styled map is chosen, but no style is selected, set the style to roadmap
                if ($scope.mapType === 'styled_map' && useMapStyle === false) {
                    mapTypeId = google.maps.MapTypeId.ROADMAP;
                }

                var mapOptions = {
                    zoom: $scope.zoomLevel,
                    center: latLng,
                    mapTypeControlOptions: {
                        mapTypeIds: maptypeIds
                    }
                };

                $scope.map = new google.maps.Map(mapElement, mapOptions);

                if (useMapStyle) {
                    var styledMapType =
                        new google.maps.StyledMapType(JSON.parse($scope.mapStyle.json),
                            {
                                name: 'Styled Map'
                            });

                    $scope.map.mapTypes.set('styled_map', styledMapType);
                }

                $scope.map.setMapTypeId(mapTypeId);

                var marker = new google.maps.Marker({
                    position: latLng,
                    title: 'Marker',
                    map: $scope.map,
                    draggable: true
                });

                google.maps.event.addListener(marker, 'dragend', function () {
                    $scope.geocodePosition(marker.getPosition(), function () {
                        $scope.$apply(function () {
                            $scope.showLoader = false;
                        });
                    });
                });

                google.maps.event.addListener($scope.map, 'click', function (event) {
                    var clickedMapLocation = event.latLng;
                    marker.setPosition(clickedMapLocation);
                    $scope.geocodePosition(clickedMapLocation, function () {
                        $scope.$apply(function () {
                            $scope.showLoader = false;
                        });
                    });
                });

                google.maps.event.addListener($scope.map, 'zoom_changed', function () {
                    $scope.zoomLevel = $scope.map.getZoom();
                    $scope.savedata();
                });

                google.maps.event.addListener($scope.map, 'maptypeid_changed', function () {
                    $scope.mapType = $scope.map.getMapTypeId();
                    $scope.savedata();
                });

                google.maps.event.addListener($scope.map, 'center_changed', function () {
                    var mapCenter = $scope.map.getCenter();
                    $scope.mapCenter = [mapCenter.lat(), mapCenter.lng()].join(', ');
                    $scope.savedata();
                });

                var autocomplete = new google.maps.places.Autocomplete(autoCompleteElement);
                autocomplete.bindTo('bounds', $scope.map);

                autocomplete.setFields(['formatted_address', 'address_components', 'geometry', 'icon', 'name']);

                autocomplete.addListener('place_changed', function () {

                    marker.setVisible(false);
                    var place = autocomplete.getPlace();
                    if (!place.geometry) {
                        // User entered the name of a Place that was not suggested and
                        // pressed the Enter key, or the Place Details request failed.
                        var latLngValue = $scope.address.latlng;
                        $scope.initMapMarker(latLngValue);
                        return;
                    }

                    // If the place has a location, then show it on the map and show that area
                    if (place.geometry.viewport) {
                        $scope.map.fitBounds(place.geometry.viewport);
                    } else {
                        $scope.map.setCenter(place.geometry.location);
                        $scope.map.setZoom($scope.zoomLevel);
                    }
                    marker.setPosition(place.geometry.location);
                    marker.setVisible(true);
                    $scope.updateMarkerAddress(place, place.geometry.location);
                });
            };


            // initialize google maps
            // only add script to page when not yet there (so not yet loaded
            if ($scope.apiKey !== '') {
                OurGmapsCoreFactory.mapsInitialized($scope.apiKey).then(function () {
                    // resolved
                    $scope.initMapMarker($scope.address.latlng);
                    $scope.showLoader = false;
                });
            }
            else {
                console.log("No Google API Key set on Data Type");
            }
        }

    ]);
