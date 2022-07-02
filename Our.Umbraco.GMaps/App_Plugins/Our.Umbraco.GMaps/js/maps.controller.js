angular.module('umbraco').controller('GMapsMapsController', ['$scope', '$element', 'GMapsMapsFactory',
	function ($scope, $element, mapsFactory) {
		'use strict'
		let vm = this

		vm.apiKey = ''
		vm.defaultLocation = { lat: 52.379189, lng: 4.899431 } // Amsterdam Central Station
		vm.zoomLevel = 17 // Default zoomlevel

		vm.map = null
		vm.mapType = 'roadmap'
		vm.mapStyle = {}
		$scope.mapCenter = ''
		$scope.address = {}
		vm.mapconfig = {}
		vm.marker = null

		$scope.showLoader = true // Show the overlay loader
		$scope.error = null
		$scope.searchedValue = ''

		vm.mapElement = $element.find('.our-coremaps__canvas').get(0)
		vm.autoCompleteElement = $element.find('.our-coremaps__autocomplete').get(0)

		var actClearLocation = {
			labelKey: 'actions_clearLocation',
			labelTokens: [],
			icon: 'trash',
			method: clearLocation,
			isDisabled: true
		}

		var actResetCenter = {
			labelKey: 'actions_resetCenter',
			labelTokens: [],
			icon: 'map-location',
			method: resetCenter,
			isDisabled: true
		}

		var propertyActions = [
			actClearLocation,
			actResetCenter
		]

		this.$onInit = function () {
			if ($scope.umbProperty) {
				$scope.umbProperty.setPropertyActions(propertyActions)
			}
		}

		function clearLocation() {
			actClearLocation.isDisabled = true
			if (vm.marker) {
				vm.marker.setVisible(true)
				vm.map.setCenter(vm.defaultLocation)
				vm.marker.setPosition(vm.defaultLocation)
				vm.marker.setVisible(true)
			}
			clearData()
		}

		function resetCenter() {

			if ($scope.address && $scope.address.coordinates) {
				$scope.mapCenter = $scope.address.coordinates
			} else {
				$scope.mapCenter = vm.defaultLocation
            }
			if (vm.marker) {
				vm.marker.setVisible(true)
				vm.map.setCenter($scope.mapCenter)
				vm.marker.setVisible(true)
			}
			saveData()
			actResetCenter.isDisabled = true
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
					// Used when postal area is not the same as the other localities. Must be used for proper addresses.
					"postal_town",
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
			$scope.address = {}
			if (address !== null && (!address.types || address.types.indexOf('plus_code') < 0)) {
				const composedAddress = getAddressObject(address.address_components)
				$scope.address = { ...composedAddress, ...{ full_address: address.formatted_address } }
			}
			$scope.address.coordinates = { lat: coordinates.lat(), lng: coordinates.lng() }

			if ($scope.address.full_address) {
				$scope.searchedValue = $scope.address.full_address
			} else {
				$scope.searchedValue = formatCoordinates($scope.address.coordinates)
			}

			saveData()
		}

		function clearData() {
			$scope.model.value = {}
			$scope.searchedValue = ''
			$scope.address = {}
		}

		function saveData() {
			// Clearing old legacy properties
			delete vm.mapconfig.apiKey
			delete vm.mapconfig.mapstyle
			delete vm.mapconfig.latlng
			vm.mapconfig.zoom = vm.zoomLevel
			vm.mapconfig.maptype = vm.mapType

			if ($scope.mapCenter) {
				vm.mapconfig.centerCoordinates = $scope.mapCenter
			}

			$scope.model.value = {
				address: $scope.address,
				mapconfig: vm.mapconfig
			}
			if ($scope.mapCenter !== $scope.model.value.address.coordinates) {
				actResetCenter.isDisabled = false
            }
		}

		function initMapMarker(coordinates) {
			if (!coordinates) {
				coordinates = $scope.address.coordinates
			}
			var mapCenterCoordinates = $scope.mapCenter
			if (!mapCenterCoordinates) {
				mapCenterCoordinates = coordinates
			}

			if (mapCenterCoordinates !== coordinates) {
				actResetCenter.isDisabled = false
			}

			var latLng = new google.maps.LatLng(parseFloat(coordinates.lat), parseFloat(coordinates.lng))
			var latLngMapCenter = new google.maps.LatLng(parseFloat(mapCenterCoordinates.lat), parseFloat(mapCenterCoordinates.lng))

			var mapTypeId = vm.mapType || google.maps.MapTypeId.ROADMAP

			var useMapStyle = false
			var maptypeIds = Object.values(google.maps.MapTypeId)
			if (vm.mapStyle && vm.mapStyle.json) {
				maptypeIds.push('styled_map')
				useMapStyle = true
			}

			// Styled map is chosen, but no style is selected, set the style to roadmap
			if (vm.mapType === 'styled_map' && !useMapStyle) {
				mapTypeId = google.maps.MapTypeId.ROADMAP
			}
			
			var mapOptions = {
				zoom: vm.zoomLevel,
				center: latLngMapCenter,
				streetViewControl: false, // Fix for #15
				gestureHandling: 'cooperative',
				mapTypeControlOptions: {
					mapTypeIds: maptypeIds
				}
			}

			vm.map = new google.maps.Map(vm.mapElement, mapOptions)

			if (useMapStyle) {
				var styledMapType = new google.maps.StyledMapType(JSON.parse(vm.mapStyle.json),
				{
					name: 'Styled Map'
				})

				vm.map.mapTypes.set('styled_map', styledMapType)
			}

			vm.map.setMapTypeId(mapTypeId)

			vm.marker = new google.maps.Marker({
				position: latLng,
				title: 'Marker',
				map: vm.map,
				draggable: true
			})

			google.maps.event.addListener(vm.marker, 'dragend', function () {
				geocodePosition(vm.marker.getPosition(), function () {
					$scope.$apply(function () {
						$scope.showLoader = false
					})
				})
			})

			google.maps.event.addListener(vm.map, 'click', function (event) {
				var clickedMapLocation = event.latLng
				vm.marker.setPosition(clickedMapLocation)
				geocodePosition(clickedMapLocation, function () {
					$scope.$apply(function () {
						$scope.showLoader = false
					})
				})
			})

			google.maps.event.addListener(vm.map, 'zoom_changed', function () {
				vm.zoomLevel = vm.map.getZoom()
				saveData()
			})

			google.maps.event.addListener(vm.map, 'maptypeid_changed', function () {
				vm.mapType = vm.map.getMapTypeId()
				saveData()
			})

			google.maps.event.addListener(vm.map, 'center_changed', function () {
				var mapCenter = vm.map.getCenter()
				$scope.mapCenter = { lat: mapCenter.lat(), lng: mapCenter.lng() }
				saveData()
			})

			var autocomplete = new google.maps.places.Autocomplete(vm.autoCompleteElement)
			autocomplete.bindTo('bounds', vm.map)

			autocomplete.setFields(['formatted_address', 'address_components', 'geometry', 'icon', 'name'])

			autocomplete.addListener('place_changed', function () {

				vm.marker.setVisible(false)
				var place = autocomplete.getPlace()
				if (!place.geometry) {
					// User entered the name of a Place that was not suggested and pressed the Enter key, or the Place Details request failed.
					var coordTest = parseCoordinates($scope.searchedValue, false)
					if (coordTest) {
						$scope.address.coordinates = coordTest
						// Set the map center as well.
						$scope.mapCenter = coordTest
						vm.marker.setPosition($scope.address.coordinates)
						vm.marker.setVisible(true)
						vm.map.setCenter($scope.address.coordinates)
						actResetCenter.isDisabled = true
					} else {
						initMapMarker($scope.address.coordinates)
					}
					return
				} else {

					// If the place has a location, then show it on the map and show that area
					if (place.geometry.viewport) {
						vm.map.fitBounds(place.geometry.viewport)
					} else {
						vm.map.setCenter(place.geometry.location)
						vm.map.setZoom(vm.zoomLevel)
					}
					vm.marker.setPosition(place.geometry.location)
					vm.marker.setVisible(true)
					updateMarkerAddress(place, place.geometry.location)
				}
			})
		}

		function init() {

			if ($scope.model.config !== null) {
				// default location when set on data type config
				if ($scope.model.config.location) {
					vm.defaultLocation = parseCoordinates($scope.model.config.location)
				}
				// default zoom when set on data type config
				if ($scope.model.config.zoom) {
					vm.zoomLevel = +$scope.model.config.zoom
				}
				if ($scope.model.config.apikey) {
					vm.apiKey = $scope.model.config.apikey
				}
				if ($scope.model.config.maptype) {
					vm.mapType = $scope.model.config.maptype.toLowerCase()
				}
				if ($scope.model.config.mapstyle && $scope.model.config.mapstyle.selectedstyle) {
					vm.mapStyle = $scope.model.config.mapstyle.selectedstyle
				}
			}

			$scope.address.coordinates = vm.defaultLocation

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

					var enableSearchedCoordinates = false
					if ($scope.model.value.address.coordinates) {
						$scope.address.coordinates = $scope.model.value.address.coordinates
						enableSearchedCoordinates = true
					} else if ($scope.model.value.address.latlng) {
						// Fall back to legacy field.
						$scope.address.coordinates = parseCoordinates($scope.model.value.address.latlng)
						enableSearchedCoordinates = true
					}

					if ($scope.address.full_address) {
						$scope.searchedValue = $scope.address.full_address
					} else if (enableSearchedCoordinates) {
						$scope.searchedValue = formatCoordinates($scope.address.coordinates)
					}
				}

				if ($scope.model.value.mapconfig) {

					if ($scope.model.value.mapconfig.zoom) {
						vm.zoomLevel = +$scope.model.value.mapconfig.zoom
					}

					if ($scope.model.value.mapconfig.maptype) {
						vm.mapType = $scope.model.value.mapconfig.maptype.toLowerCase()
					}

					if ($scope.model.value.mapconfig.centerCoordinates) {
						$scope.mapCenter = $scope.model.value.mapconfig.centerCoordinates
					} else if ($scope.model.value.mapconfig.mapcenter) {
						// Fallback to legacy property
						$scope.mapCenter = parseCoordinates($scope.model.value.mapconfig.mapcenter)
					}
				}
			}

			// Initialize Google Maps (only add script to page when not yet there)
			if (vm.apiKey !== '') {
				mapsFactory.initialize(vm.apiKey).then(function () {
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
					vm.apiKey = data.apiKey
				}
				if (data.defaultLocation) {
					vm.defaultLocation = parseCoordinates(data.defaultLocation)
				}
				if (data.zoomLevel) {
					vm.zoomLevel = data.zoomLevel
				}
			}

			init()
		})
	}
])
