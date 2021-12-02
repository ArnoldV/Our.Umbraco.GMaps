angular.module('umbraco').controller('GMapsMapsController', ['$scope', '$element', 'GMapsMapsFactory',
	function ($scope, $element, mapsFactory) {
		'use strict'

		$scope.apiKey = ''
		$scope.defaultLocation = { lat: 52.379189, lng: 4.899431 } // Amsterdam Central Station
		$scope.zoomLevel = 17 // Default zoomlevel

		$scope.mapStyleFromModel = false
		$scope.map = ''
		$scope.mapType = 'roadmap'
		$scope.mapStyle = {}
		$scope.mapCenter = ''
		$scope.mapObject = {}
		$scope.address = {}
		$scope.mapconfig = {}
		$scope.showLoader = true // Show the overlay loader
		$scope.error = null
		$scope.searchedValue = ''

		var mapElement = $element.find('.our-coremaps__canvas').get(0)
		var autoCompleteElement = $element.find('.our-coremaps__autocomplete').get(0)

		// Parse a LatLng string.
		function parseLatLng(latLng) {
			if (latLng) {
				const lat_lng = latLng.split(',')
				if (lat_lng.length > 1) {
					const latVal = parseFloat(lat_lng[0])
					const lngVal = parseFloat(lat_lng[1])
					return { lat: latVal, lng: lngVal }
				}
			}
			return $scope.defaultLocation
		}

		// Geocode based on coordinates
		$scope.geocodePosition = function (coordinates, callback) {
			$scope.showLoader = true

			var geocoder = new google.maps.Geocoder()
			geocoder.geocode({
				latLng: coordinates
			}, function (results, status) {
				if (status === 'OK') {
					if (results && results.length > 0) {
						$scope.updateMarkerAddress(results[0], coordinates)
					}
				} else if (status === 'ZERO_RESULTS') {
					$scope.updateMarkerAddress(null, coordinates)
				} else {
					console.log('Geocode was not successful for the following reason: ' + status)
				}
				callback()
			})
		}

		// Create a (simplified) address object based on the address components
		$scope.getAddressObject = function (address_components) {
			var ShouldBeComponent = {
				// street_number indicates the precise street number.
				home: [
					'street_number'
				],
				postalcode: ['postal_code'],
				street: [
					// street_address indicates a precise street address.
					'street_address',
					// route indicates a named route (such as 'US 101').
					'route'
				],
				region: [
					// administrative_area_level_1 indicates a first-order civil entity below the country level. Within the United States, these administrative levels are states. 
					// Not all nations exhibit these administrative levels.In most cases, administrative_area_level_1 short names will closely match ISO 3166-2 subdivisions and other widely circulated lists however this is not guaranteed as our geocoding results are based on a variety of signals and location data.                    
					'administrative_area_level_1',
					// administrative_area_level_2 indicates a second-order civil entity below the country level. Within the United States, these administrative levels are counties. Not all nations exhibit these administrative levels.
					'administrative_area_level_2',
					// administrative_area_level_3 indicates a third-order civil entity below the country level. This type indicates a minor civil division. Not all nations exhibit these administrative levels.
					'administrative_area_level_3',
					// administrative_area_level_4 indicates a fourth-order civil entity below the country level. This type indicates a minor civil division. Not all nations exhibit these administrative levels.
					'administrative_area_level_4',
					// administrative_area_level_5 indicates a fifth-order civil entity below the country level. This type indicates a minor civil division. Not all nations exhibit these administrative levels.
					'administrative_area_level_5'
				],
				city: [
					// locality indicates an incorporated city or town political entity.
					'locality',
					// sublocality indicates a first-order civil entity below a locality. For some locations may receive one of the additional types: sublocality_level_1 to sublocality_level_5. 
					// Each sublocality level is a civil entity. Larger numbers indicate a smaller geographic area.
					'sublocality',
					'sublocality_level_1',
					'sublocality_level_2',
					'sublocality_level_3',
					'sublocality_level_4',
					'sublocality_level_5'
				],
				country: ['country']
			}

			var address = {
				home: '',
				postalcode: '',
				street: '',
				region: '',
				city: '',
				country: ''
			}

			address_components.forEach(component => {
				for (var shouldBe in ShouldBeComponent) {
					if (ShouldBeComponent[shouldBe].indexOf(component.types[0]) !== -1) {
						address[shouldBe] = component.long_name
					}
				}
			})
			return address
		}

		$scope.updateMarkerAddress = function (strAddress, coordinates) {
			if (strAddress !== null) {
				var split_address = strAddress.formatted_address.split(',')

				$scope.address.full_address = split_address[0]
				var address = $scope.getAddressObject(strAddress.address_components)

				$scope.address.postalcode = address.postalcode
				$scope.address.city = address.city
				$scope.address.state = address.region
				$scope.address.country = address.country
			} else {
				// No results == no address, but just a location
				$scope.address = {}
			}

			if ($scope.address.city) {
				$scope.searchedValue = [
					$scope.address.full_address, $scope.address.postalcode, $scope.address.city,
					$scope.address.state, $scope.address.country
				].join(' ')
			} else {
				$scope.searchedValue = coordinates
			}

			// $scope.address.latlng = [coordinates.lat(), coordinates.lng()].join(', ')
			$scope.address.coordinates = { lat: coordinates.lat(), lng: coordinates.lng() }

			$scope.savedata()
		}

		$scope.savedata = function () {
			delete $scope.mapconfig.apiKey
			delete $scope.mapconfig.mapstyle
			$scope.mapconfig.zoom = $scope.zoomLevel
			$scope.mapconfig.maptype = $scope.mapType

			if ($scope.mapCenter) {
				$scope.mapconfig.centerCoordinates = $scope.mapCenter
			}

			// Update model
			$scope.mapObject.address = $scope.address
			$scope.mapObject.mapconfig = $scope.mapconfig

			$scope.model.value = $scope.mapObject
		}

		$scope.initMapMarker = function (coordinates) {
			if (!coordinates) {
				coordinates = $scope.address.coordinates
			}
			var latLng = new google.maps.LatLng(parseFloat(coordinates.lat), parseFloat(coordinates.lng))

			var mapTypeId = $scope.mapType || google.maps.MapTypeId.ROADMAP

			var useMapStyle = false
			var maptypeIds = Object.values(google.maps.MapTypeId)
			if ($scope.mapStyle && $scope.mapStyle.json) {
				maptypeIds.push('styled_map')
				useMapStyle = true
			}

			// \dtyled map is chosen, but no style is selected, set the style to roadmap
			if ($scope.mapType === 'styled_map' && useMapStyle === false) {
				mapTypeId = google.maps.MapTypeId.ROADMAP
			}

			var mapOptions = {
				zoom: $scope.zoomLevel,
				center: latLng,
				streetViewControl: false, // Fix for #15
				gestureHandling: 'cooperative',
				mapTypeControlOptions: {
					mapTypeIds: maptypeIds
				}
			}

			$scope.map = new google.maps.Map(mapElement, mapOptions)

			if (useMapStyle) {
				var styledMapType = new google.maps.StyledMapType(JSON.parse($scope.mapStyle.json),
				{
					name: 'Styled Map'
				})

				$scope.map.mapTypes.set('styled_map', styledMapType)
			}

			$scope.map.setMapTypeId(mapTypeId)

			var marker = new google.maps.Marker({
				position: latLng,
				title: 'Marker',
				map: $scope.map,
				draggable: true
			})

			google.maps.event.addListener(marker, 'dragend', function () {
				$scope.geocodePosition(marker.getPosition(), function () {
					$scope.$apply(function () {
						$scope.showLoader = false
					})
				})
			})

			google.maps.event.addListener($scope.map, 'click', function (event) {
				var clickedMapLocation = event.latLng
				marker.setPosition(clickedMapLocation)
				$scope.geocodePosition(clickedMapLocation, function () {
					$scope.$apply(function () {
						$scope.showLoader = false
					})
				})
			})

			google.maps.event.addListener($scope.map, 'zoom_changed', function () {
				$scope.zoomLevel = $scope.map.getZoom()
				$scope.savedata()
			})

			google.maps.event.addListener($scope.map, 'maptypeid_changed', function () {
				$scope.mapType = $scope.map.getMapTypeId()
				$scope.savedata()
			})

			google.maps.event.addListener($scope.map, 'center_changed', function () {
				var mapCenter = $scope.map.getCenter()
				$scope.mapCenter = { lat: mapCenter.lat(), lng: mapCenter.lng() }
				$scope.savedata()
			})

			var autocomplete = new google.maps.places.Autocomplete(autoCompleteElement)
			autocomplete.bindTo('bounds', $scope.map)

			autocomplete.setFields(['formatted_address', 'address_components', 'geometry', 'icon', 'name'])

			autocomplete.addListener('place_changed', function () {

				marker.setVisible(false)
				var place = autocomplete.getPlace()
				if (!place.geometry) {
					// User entered the name of a Place that was not suggested and pressed the Enter key, or the Place Details request failed.
					$scope.initMapMarker($scope.address.coordinates)
					return
				}

				// If the place has a location, then show it on the map and show that area
				if (place.geometry.viewport) {
					$scope.map.fitBounds(place.geometry.viewport)
				} else {
					$scope.map.setCenter(place.geometry.location)
					$scope.map.setZoom($scope.zoomLevel)
				}
				marker.setPosition(place.geometry.location)
				marker.setVisible(true)
				$scope.updateMarkerAddress(place, place.geometry.location)
			})
		}

		function init() {

			if ($scope.model.config !== null) {
				// default location when set on data type config
				if ($scope.model.config.location) {
					$scope.defaultLocation = parseLatLng($scope.model.config.location)
				}
				// default zoom when set on data type config
				if ($scope.model.config.zoom) {
					$scope.zoomLevel = $scope.model.config.zoom
				}
				if ($scope.model.config.apikey) {
					$scope.apiKey = $scope.model.config.apikey
				}
				if ($scope.model.config.maptype) {
					$scope.mapType = $scope.model.config.maptype
				}
				if ($scope.model.config.mapstyle && $scope.model.config.mapstyle.selectedstyle) {
					$scope.mapStyle = $scope.model.config.mapstyle.selectedstyle
				}
			}

			//$scope.model.value.map.zoom = $scope.defaultZoom
			$scope.address.coordinates = $scope.defaultLocation

			// if there is a value on the model set this to the editor
			if ($scope.model.value) {
				if ($scope.model.value.address) {

					if ($scope.model.value.address.latlng) {
						$scope.address.latlng = $scope.model.value.address.latlng
					}

					if ($scope.model.value.address.full_address) {
						$scope.address.full_address = $scope.model.value.address.full_address
					}

					if ($scope.model.value.address.postalcode) {
						$scope.address.postalcode = $scope.model.value.address.postalcode
					}
					if ($scope.model.value.address.state) {
						$scope.address.state = $scope.model.value.address.state
					}
					if ($scope.model.value.address.country) {
						$scope.address.country = $scope.model.value.address.country
					}
					if ($scope.model.value.address.city) {
						$scope.address.city = $scope.model.value.address.city
						$scope.searchedValue = [
							$scope.address.full_address, $scope.address.postalcode, $scope.address.city,
							$scope.address.country
						].join(' ')
					} else {
						$scope.searchedValue = $scope.address.latlng
					}
				}

				if ($scope.model.value.mapconfig) {

					if ($scope.model.value.mapconfig.zoom) {
						$scope.zoomLevel = $scope.model.value.mapconfig.zoom
					}

					if ($scope.model.value.mapconfig.maptype) {
						$scope.mapType = $scope.model.value.mapconfig.maptype
						$scope.mapStyleFromModel = true
					}

					if ($scope.model.value.mapconfig.centerCoordinates) {
						$scope.mapCenter = $scope.model.value.mapconfig.centerCoordinates
					} else if ($scope.model.value.mapconfig.mapcenter) {
						$scope.mapCenter = parseLatLng($scope.model.value.mapconfig.mapcenter)
					}
				}
				else {
					$scope.model.value.map = {}
				}
			}

			// Initialize Google Maps (only add script to page when not yet there)
			if ($scope.apiKey !== '') {
				mapsFactory.initialize($scope.apiKey).then(function () {
					// Resolved
					$scope.initMapMarker($scope.address.coordinates)
					$scope.showLoader = false
				})
			}
			else {
				$scope.error = 'No Google Maps API key set, Maps Editor cannot load.'
				console.warn($scope.error)
			}
		}

		// Attempt to retrieve settings from the server before initialising the property editor.
		// Settings in the datatype property config will override these.
		mapsFactory.getSettings().then(data => {
			if (data) {
				if (data.apiKey) {
					$scope.apiKey = data.apiKey
				}
				if (data.defaultLocation) {
					$scope.defaultLocation = parseLatLng(data.defaultLocation)
				}
				if (data.zoomLevel) {
					$scope.zoomLevel = data.zoomLevel
				}
			}

			init()
		})
	}
])
