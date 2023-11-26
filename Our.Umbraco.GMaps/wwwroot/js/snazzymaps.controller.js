angular.module('umbraco').controller('GMapsSnazzyMapsController', ['$scope', '$location', '$anchorScroll', 'GMapsSnazzyMapsFactory',
    function ($scope, $location, $anchorScroll, snazzyMapsFactory) {
        'use strict'
            
        $scope.pagination = {}
        $scope.styles = {}
        $scope.selectedStyle = {}
        $scope.saveData = {}
        $scope.apiKey = ''
        $scope.error = ''
        $scope.endpoint = 'explore'
        $scope.showLoader = false
        $scope.customMapStyle = ''

        $scope.options = {
            pageSize: 10,
            pageNumber: 1
        }

        if ($scope.model.value) {

            if ($scope.model.value.selectedstyle) {
                if ($scope.model.value.customstyle) {
                    $scope.customMapStyle = $scope.model.value.selectedstyle.json
                }
                else {
                    $scope.selectedStyle = $scope.model.value.selectedstyle
                }
            }
            if ($scope.model.value.apiKey) {
                $scope.apiKey = $scope.model.value.apiKey
            }
        }

        $scope.getApi = function (endpoint) {
            $scope.endpoint = endpoint
            $scope.showLoader = true
            snazzyMapsFactory.GetMapStyles($scope.apiKey, endpoint, $scope.options.pageNumber)
                .then(
                    response => {
                        $scope.pagination = response.pagination
                        $scope.styles = response.styles
                        $scope.showLoader = false
                    },
                    error => {
                        $scope.showLoader = false
                    }
                )
        }

        $scope.goToPage = function (pageNumber) {
            $scope.options.pageNumber = pageNumber
            $scope.getApi($scope.endpoint)
        }

        $scope.clickStyle = function (style) {
            $scope.selectedStyle = style
            $scope.saveData.selectedstyle = $scope.selectedStyle
            $scope.saveData.apiKey = $scope.apiKey
            $scope.saveData.customstyle = false
            // set value 
            $scope.model.value = $scope.saveData

            $location.hash('selectedStyle')

            // call $anchorScroll()
            $anchorScroll()
        }

        $scope.removeSelectedStyle = function () {
            $scope.selectedStyle = {}
            $scope.saveData.selectedstyle = $scope.selectedStyle
            $scope.saveData.apiKey = $scope.apiKey
            // set value 
            $scope.model.value = $scope.saveData
        }

        $scope.customMapChange = function () {
            if ($scope.customMapStyle !== '') {
                $scope.saveData.selectedstyle = {}
                $scope.saveData.selectedstyle.json = JSON.stringify(JSON.parse($scope.customMapStyle), undefined, 4)
                $scope.saveData.customstyle = true
                $scope.model.value = $scope.saveData
            }
        }

        if ($scope.apiKey) {
            // if an api is present, load the explore api results
            $scope.getApi('explore')
        }
    }
])
