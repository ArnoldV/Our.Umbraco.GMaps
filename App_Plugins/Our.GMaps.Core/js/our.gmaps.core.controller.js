angular.module("umbraco").controller("Our.Gmaps.Core.Controller",
    [
        "$scope",

        function ($scope, localizationService) {
            'use strict';

            $scope.map = '';
            $scope.address = {};            
            $scope.showLoader = true;

            // amsterdam central station
            $scope.address.latlon = '52.379189, 4.899431';
            var checkLat = /^(-?[1-8]?\d(?:\.\d{1,18})?|90(?:\.0{1,18})?)$/;
            var checkLng = /^(-?(?:1[0-7]|[1-9])?\d(?:\.\d{1,18})?|180(?:\.0{1,18})?)$/;

            var mapElement = document.getElementById('map-canvas');
            var autoCompleteElement = document.getElementById('map-autocomplete');
 

            if ($scope.model.value) {
                if ($scope.model.value.latlon) {
                    $scope.address.latlon = $scope.model.value.latlon;
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
            }

            var geocoder = new google.maps.Geocoder();

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

            $scope.geocodePosition = function (pos) {
                $scope.showLoader = true;

                geocoder.geocode({
                    latLng: pos
                }, function (responses) {

                    if (responses && responses.length > 0) {
                        $scope.updateMarkerAddress(responses[0]);
                    }

                });
            };

            $scope.geocodeAddress = function (address) {
                geocoder.geocode({ 'address': address }, function (results, status) {
                    if (status === 'OK') {
                        $scope.map.setCenter(results[0].geometry.location);
                        var marker = new google.maps.Marker({
                            map: $scope.map,
                            position: results[0].geometry.location,
                            draggable: true
                        });
                        $scope.updateMarkerAddress(results[0]);                        
                    } else {
                        alert('Geocode was not successful for the following reason: ' + status);
                    }
                });
            };

            $scope.updateMarkerAddress = function (str) {
                $scope.showLoader = true;
                var split_address = str.formatted_address.split(',');

                $scope.address.full_address = split_address[0];
                $scope.model.value.full_address = $scope.address.full_address;

                for (var i = 0; i < str.address_components.length; i++) {
                    for (var j = 0; j < str.address_components[i].types.length; j++) {

                        if (str.address_components[i].types[j] === 'postal_code') {
                            $scope.address.postcode = str.address_components[i].long_name;
                            $scope.model.value.postcode = $scope.address.postcode;
                        }

                        if (str.address_components[i].types[j] === 'administrative_area_level_2') {
                            $scope.address.city = str.address_components[i].long_name;
                            $scope.model.value.city = $scope.address.city;
                        }

                        if (str.address_components[i].types[j] === 'administrative_area_level_1') {
                            $scope.address.state = str.address_components[i].long_name;
                            $scope.model.value.state = $scope.address.state;
                        }

                        if (str.address_components[i].types[j] === 'country') {
                            $scope.address.country = str.address_components[i].long_name;
                            $scope.model.value.country = $scope.address.country;
                        }
                    }
                }

                $scope.showLoader = false;
            };

            $scope.updateMarkerPosition = function (latLng) {
                $scope.address.latlon = [
                    latLng.lat(),
                    latLng.lng()
                ].join(', ');
                $scope.model.value = $scope.address;
            };

            $scope.initMapMarker = function (marker_latlon, geocodeLocation) {
                var lat_lon = marker_latlon;
                if (lat_lon === null) {
                    lat_lon = $scope.address.latlon;
                    lat_lon = lat_lon.split(",");
                } else {
                    lat_lon = lat_lon.split(",");
                }
                var latLng = new google.maps.LatLng(parseFloat(lat_lon[0]), parseFloat(lat_lon[1]));

                $scope.map = new google.maps.Map(mapElement, {
                    zoom: 12,
                    center: latLng,
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                });
                var marker = new google.maps.Marker({
                    position: latLng,
                    title: 'Marker',
                    map: $scope.map,
                    draggable: true
                });

                $scope.geocodePosition(latLng);

                google.maps.event.addListener(marker, 'drag', function () {
                    $scope.updateMarkerPosition(marker.getPosition());
                });

                google.maps.event.addListener(marker, 'dragend', function () {
                    $scope.geocodePosition(marker.getPosition());
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

                    // If the place has a geometry, then present it on a map.
                    if (place.geometry.viewport) {
                        $scope.map.fitBounds(place.geometry.viewport);
                    } else {
                        $scope.map.setCenter(place.geometry.location);
                        $scope.map.setZoom(17); 
                    }
                    marker.setPosition(place.geometry.location);
                    marker.setVisible(true);
                    

                    $scope.updateMarkerAddress(place);         
                    $scope.updateMarkerPosition(place.geometry.location);
                });
            };

            $scope.initMapMarker($scope.address.latlon);
        }

    ]);
