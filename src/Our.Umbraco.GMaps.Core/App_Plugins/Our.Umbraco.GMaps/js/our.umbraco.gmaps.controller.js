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
            $scope.defaultZoom = 17;

            $scope.map = '';
            $scope.address = {};
            // show the overlay loader
            $scope.showLoader = true;
            $scope.searchedValue = '';
            
            var mapElement = document.getElementById('map-canvas');
            var autoCompleteElement = document.getElementById('map-autocomplete');

            if ($scope.model.config !== null) {
                // default location when set on data type config
                if ($scope.model.config.location !== null) {
                    $scope.defaultLocation = $scope.model.config.location;
                }
                // default zoom when set on data type config
                if ($scope.model.config.zoom !== null) {
                    $scope.defaultZoom = $scope.model.config.zoom;
                }
                if ($scope.model.config.apikey !== null) {
                    $scope.apiKey = $scope.model.config.apikey;
                }
            }

            $scope.address.zoom = $scope.defaultZoom;
            $scope.address.latlon = $scope.defaultLocation;

            // if there is a value on the model set this to the editor
            if ($scope.model.value) {
                if ($scope.model.value.latlon) {
                    $scope.address.latlon = $scope.model.value.latlon;
                }
                if ($scope.model.value.zoom) {
                    $scope.address.zoom = $scope.model.value.zoom;
                }
                if ($scope.model.value.apikey) {
                    $scope.address.apikey = $scope.model.value.apikey;
                }
                if ($scope.model.value.full_address) {
                    $scope.address.full_address = $scope.model.value.full_address;
                }
                if ($scope.model.value.postcode) {
                    $scope.address.postcode = $scope.model.value.postcode;
                }
                if ($scope.model.value.city) {
                    $scope.address.city = $scope.model.value.city;
                }
                if ($scope.model.value.city) {
                    $scope.address.state = $scope.model.value.state;
                }
                if ($scope.model.value.city) {
                    $scope.address.country = $scope.model.value.country;
                }

                $scope.searchedValue = $scope.address.full_address + ' ' + $scope.address.postcode + ' ' + $scope.address.city + ' ' + $scope.address.country;
            }

            // validate the coordiantes input
            var checkLat = /^(-?[1-8]?\d(?:\.\d{1,18})?|90(?:\.0{1,18})?)$/;
            var checkLng = /^(-?(?:1[0-7]|[1-9])?\d(?:\.\d{1,18})?|180(?:\.0{1,18})?)$/;
            $scope.validateLatLong = function (latLng) {

                var lat_lon = latLng.split(",");

                var latVal = parseFloat(lat_lon[0]);
                var lngVal = parseFloat(lat_lon[1]);

                var validLat = checkLat.test(latVal);
                var validLon = checkLng.test(lngVal);
                if (validLat && validLon) {
                    return true;
                } else {
                    return false;
                }
            };

            // Geocode based on coordinates
            $scope.geocodePosition = function (coordinates, geocoder) {
                $scope.showLoader = true;

                geocoder.geocode({
                    latLng: coordinates
                }, function (responses) {

                    if (responses && responses.length > 0) {
                        $scope.updateMarkerAddress(responses[0]);
                    }

                });
            };



            // Create a (simplified) address object based on the address components
            $scope.getAddressObject = function (address_components) {
                var ShouldBeComponent = {
                    // street_number indicates the precise street number.
                    home: [
                        "street_number"
                    ],
                    postal_code: ["postal_code"],
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
                    postal_code: "",
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


            $scope.updateMarkerAddress = function (str) {
                $scope.showLoader = true;
                var split_address = str.formatted_address.split(',');

                $scope.address.full_address = split_address[0];
                var address = $scope.getAddressObject(str.address_components);

                $scope.address.postcode = address.postal_code;
                $scope.address.city = address.city;
                $scope.address.state = address.region;
                $scope.address.country = address.country;

                $scope.searchedValue = $scope.address.full_address + ' ' + $scope.address.postcode + ' ' + $scope.address.city + ' ' + $scope.address.country;

                $scope.model.value = $scope.address;

                $scope.showLoader = false;
            };

            $scope.updateMarkerPosition = function (latLng) {
                $scope.address.latlon = [
                    latLng.lat(),
                    latLng.lng()
                ].join(', ');
            };

            $scope.initMapMarker = function (marker_latlon) {
                var lat_lon = marker_latlon;
                if (lat_lon === null || lat_lon === undefined) {
                    lat_lon = $scope.address.latlon;
                    lat_lon = lat_lon.split(",");
                } else {
                    lat_lon = lat_lon.split(",");
                }
                var latLng = new google.maps.LatLng(parseFloat(lat_lon[0]), parseFloat(lat_lon[1]));

                $scope.map = new google.maps.Map(mapElement, {
                    zoom: $scope.defaultZoom,
                    center: latLng,
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                });
                var marker = new google.maps.Marker({
                    position: latLng,
                    title: 'Marker',
                    map: $scope.map,
                    draggable: true
                });

                $scope.showLoader = false;

                var geocoder = new google.maps.Geocoder();

                google.maps.event.addListener(marker, 'drag', function () {
                    $scope.updateMarkerPosition(marker.getPosition());
                });

                google.maps.event.addListener(marker, 'dragend', function () {
                    $scope.geocodePosition(marker.getPosition(), geocoder);
                });

                google.maps.event.addListener($scope.map, 'click', function (event) {
                    var clickedMapLocation = event.latLng;
                    marker.setPosition(clickedMapLocation);
                    $scope.updateMarkerPosition(clickedMapLocation);
                    $scope.geocodePosition(clickedMapLocation, geocoder);
                });

                google.maps.event.addListener($scope.map, 'zoom_changed', function () {
                    $scope.address.zoom = $scope.map.getZoom();
                    $scope.model.value.zoom = $scope.address.zoom;
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
                        var latLngValue = $scope.address.latlon;
                        $scope.initMapMarker(latLngValue);
                        return;
                    }

                    // If the place has a location, then show it on the map and show that area
                    if (place.geometry.viewport) {
                        $scope.map.fitBounds(place.geometry.viewport);
                    } else {
                        $scope.map.setCenter(place.geometry.location);
                        $scope.map.setZoom($scope.defaultZoom);
                    }
                    marker.setPosition(place.geometry.location);
                    marker.setVisible(true);


                    $scope.updateMarkerAddress(place);
                    $scope.updateMarkerPosition(place.geometry.location);
                });
            };


            // initialize google maps
            // only add script to page when not yet there (so not yet loaded
            if ($scope.apiKey !== '') {
                OurGmapsCoreFactory.mapsInitialized($scope.apiKey).then(function () {
                    // resolved
                    $scope.initMapMarker($scope.address.latlon);
                }, function () {
                    // not resovlved
                });
            }
            else {
                console.log("No Google API Key set on Data Type");
            }
        }

    ]);
