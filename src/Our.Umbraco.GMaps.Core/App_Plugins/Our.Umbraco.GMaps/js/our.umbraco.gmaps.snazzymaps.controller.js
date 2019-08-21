angular.module("umbraco").controller("Our.Gmaps.SnazzyMaps.Controller",
    [
        "$scope",
        "OurGmapsSnazzyMapsFactory",
        function ($scope, OurGmapsSnazzyMapsFactory) {
            'use strict';


            var vm = this;

            $scope.pagination = {};
            $scope.styles = {};
            $scope.selectedStyle = {};
            $scope.saveData = {};
            $scope.apiKey = "";
            $scope.error = "";
            $scope.endpoint = "explore";

            $scope.options = {
                pageSize: 10,
                pageNumber: 1
            };

            if ($scope.model.value) {
                console.log($scope.model.value);
                if ($scope.model.value.selectedstyle) {
                    $scope.selectedStyle = $scope.model.value.selectedstyle;
                }
                if ($scope.model.value.apiKey) {
                    $scope.apiKey = $scope.model.value.apiKey;
                }
            }

            $scope.getApi = function (endpoint) {
                $scope.endpoint = endpoint;

                OurGmapsSnazzyMapsFactory.GetMapStyles($scope.apiKey, endpoint, $scope.options.pageNumber).then(
                    function (response) {
                        $scope.pagination = response.pagination;
                        $scope.styles = response.styles;
                    });
            };

            $scope.goToPage = function (pageNumber) {
                $scope.options.pageNumber = pageNumber;
                $scope.getApi($scope.endpoint);
            };

            $scope.clickStyle = function (style) {
                $scope.selectedStyle = style;
                $scope.saveData.selectedstyle = $scope.selectedStyle;
                $scope.saveData.apiKey = $scope.apiKey;
                // set value 
                $scope.model.value = $scope.saveData;
            };

            $scope.removeSelectedStyle = function () {
                $scope.selectedStyle = {};
                $scope.saveData.selectedstyle = $scope.selectedStyle;
                $scope.saveData.apiKey = $scope.apiKey;
                // set value 
                $scope.model.value = $scope.saveData;
            };
        }


    ]);
