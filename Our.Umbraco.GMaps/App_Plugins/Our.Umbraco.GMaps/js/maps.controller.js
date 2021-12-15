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

		var actClearLocation = {
			labelKey: 'actions_clearLocation',
			labelTokens: [],
			icon: 'trash',
			method: clearLocation,
			isDisabled: true
		}

		var propertyActions = [
			actClearLocation
		]

		this.$onInit = function () {
			if ($scope.umbProperty) {
				$scope.umbProperty.setPropertyActions(propertyActions)
			}
		}

		function clearLocation() {
			actClearLocation.isDisabled = true
			$scope.address = {}
			$scope.searchedValue = ''
			savedata()
		}

		// Parse a LatLng string.
		function parseCoordinates (latLng, fallbackToDefault = true) {
			if (latLng) {
				const lat_lng = latLng.split(',')
				if (lat_lng.length > 1) {
					const latVal = parseFloat(lat_lng[0])
					const lngVal = parseFloat(lat_lng[1])
					return { lat: latVal, lng: lngVal }
				}
			}
			if (fallbackToDefault) {
				return $scope.defaultLocation
			}
			return null
		}

		function formatCoordinates(coordinates) {
			if (coordinates) {
				return `${coordinates.lat},${coordinates.lng}`
			}
		}

		// Geocode based on coordinates
		function geocodePosition (coordinates, callback) {
			$scope.showLoader = true

			var geocoder = new google.maps.Geocoder()
			geocoder.geocode({
				latLng: coordinates
			}, function (results, status) {
				if (status === 'OK') {
					if (results && results.length > 0) {
						updateMarkerAddress(results[0], coordinates)
					}
				} else if (status === 'ZERO_RESULTS') {
					updateMarkerAddress(null, coordinates)
				} else {
					console.log('Geocode was not successful for the following reason: ' + status)
				}
				callback()
			})
		}

		// Create a (simplified) address object based on the address components
		function getAddressObject (address_components) {
			var ShouldBeComponent = {
				// street_number indicates the precise street number.
				streetNumber: [
					'street_number'
				],
				street: [
					// street_address indicates a precise street address.
					'street_address',
					// route indicates a named route (such as 'US 101').
					'route'
				],
				state: [
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
				postalcode: ['postal_code'],
				country: ['country']
			}

			var address = {
				full_address: '',
				streetNumber: '',
				street: '',
				postalcode: '',
				street: '',
				state: '',
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

		function updateMarkerAddress (address, coordinates) {
			actClearLocation.isDisabled = false

			if (address !== null && address.types.indexOf('plus_code') < 0) {
				const composedAddress = getAddressObject(address.address_components)
				$scope.address = { ...composedAddress, ...{ full_address: address.formatted_address } }
			} else {
				// No results == no address, but just a location
				$scope.address = {}
			}
			$scope.address.coordinates = { lat: coordinates.lat(), lng: coordinates.lng() }

			if ($scope.address.full_address) {
				$scope.searchedValue = $scope.address.full_address
			} else {
				$scope.searchedValue = formatCoordinates($scope.address.coordinates)
			}

			savedata()
		}

		function savedata () {
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

		function initMapMarker (coordinates) {
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
				geocodePosition(marker.getPosition(), function () {
					$scope.$apply(function () {
						$scope.showLoader = false
					})
				})
			})

			google.maps.event.addListener($scope.map, 'click', function (event) {
				var clickedMapLocation = event.latLng
				marker.setPosition(clickedMapLocation)
				geocodePosition(clickedMapLocation, function () {
					$scope.$apply(function () {
						$scope.showLoader = false
					})
				})
			})

			google.maps.event.addListener($scope.map, 'zoom_changed', function () {
				$scope.zoomLevel = $scope.map.getZoom()
				savedata()
			})

			google.maps.event.addListener($scope.map, 'maptypeid_changed', function () {
				$scope.mapType = $scope.map.getMapTypeId()
				savedata()
			})

			google.maps.event.addListener($scope.map, 'center_changed', function () {
				var mapCenter = $scope.map.getCenter()
				$scope.mapCenter = { lat: mapCenter.lat(), lng: mapCenter.lng() }
				savedata()
			})

			var autocomplete = new google.maps.places.Autocomplete(autoCompleteElement)
			autocomplete.bindTo('bounds', $scope.map)

			autocomplete.setFields(['formatted_address', 'address_components', 'geometry', 'icon', 'name'])

			autocomplete.addListener('place_changed', function () {

				marker.setVisible(false)
				var place = autocomplete.getPlace()
				if (!place.geometry) {
					// User entered the name of a Place that was not suggested and pressed the Enter key, or the Place Details request failed.
					var coordTest = parseCoordinates($scope.searchedValue, false)
					if (coordTest) {
						$scope.address.coordinates = coordTest
					}
					initMapMarker($scope.address.coordinates)
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
				updateMarkerAddress(place, place.geometry.location)
			})
		}

		function init() {

			if ($scope.model.config !== null) {
				// default location when set on data type config
				if ($scope.model.config.location) {
					$scope.defaultLocation = parseCoordinates($scope.model.config.location)
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
					actClearLocation.isDisabled = false

					$scope.address.full_address = $scope.model.value.address.full_address
					$scope.address.streetNumber = $scope.model.value.address.streetNumber
					$scope.address.street = $scope.model.value.address.street
					$scope.address.city = $scope.model.value.address.city
					$scope.address.state = $scope.model.value.address.state
					$scope.address.postalcode = $scope.model.value.address.postalcode
					$scope.address.country = $scope.model.value.address.country

					if ($scope.model.value.address.coordinates) {
						$scope.address.coordinates = $scope.model.value.address.coordinates
					} else if ($scope.model.value.address.latlng) {
						// Fall back to legacy field.
						$scope.address.coordinates = parseCoordinates($scope.model.value.address.latlng)
					}

					if ($scope.address.full_address) {
						$scope.searchedValue = $scope.address.full_address
					} else {
						$scope.searchedValue = formatCoordinates($scope.address.coordinates)
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
						// Fallback to legacy property
						$scope.mapCenter = parseCoordinates($scope.model.value.mapconfig.mapcenter)
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
					initMapMarker($scope.address.coordinates)
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
					$scope.defaultLocation = parseCoordinates(data.defaultLocation)
				}
				if (data.zoomLevel) {
					$scope.zoomLevel = data.zoomLevel
				}
			}

			init()
		})
	}
])
