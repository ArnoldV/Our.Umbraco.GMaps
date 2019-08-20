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
                if ($scope.model.value.selectedstyle) {
                    $scope.selectedStyle = $scope.model.value.selectedstyle;
                }
                if ($scope.model.value.apiKey) {
                    $scope.apiKey = $scope.model.value.apiKey;
                }

                console.log($scope.model.value);
            }

            $scope.getApi = function (endpoint) {
                $scope.endpoint = endpoint;
                if ($scope.apiKey) {
                    switch (endpoint) {
                        case 'explore':
                            OurGmapsSnazzyMapsFactory.Explore($scope.apiKey, $scope.options.pageNumber).then(
                                function (response) {
                                    $scope.pagination = response.pagination;
                                    $scope.styles = response.styles;
                                    $scope.model.value.apiKey = $scope.apiKey;
                                });
                            break;
                        case 'Favorites':
                            OurGmapsSnazzyMapsFactory.Favorites($scope.apiKey, $scope.options.pageNumber).then(
                                function (response) {
                                    $scope.pagination = response.pagination;
                                    $scope.styles = response.styles;
                                    $scope.model.value.apiKey = $scope.apiKey;
                                });
                            break;
                        case 'my-styles':
                            OurGmapsSnazzyMapsFactory.MyStyles($scope.apiKey, $scope.options.pageNumber).then(
                                function (response) {
                                    $scope.pagination = response.pagination;
                                    $scope.styles = response.styles;
                                    $scope.model.value.apiKey = $scope.apiKey;
                                });
                            break;
                        default:
                            OurGmapsSnazzyMapsFactory.Explore(vm.apiKey, $scope.options.pageNumber).then(
                                function(response) {
                                    $scope.pagination = response.pagination;
                                    $scope.styles = response.styles;
                                    $scope.model.value.apiKey = $scope.apiKey;
                                });

                            $scope.model.value.apiKey = vm.apiKey;
                    }
                } else {
                    $scope.error = "No (valid) SnazzyMaps API Key";
                }

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
        }
    ]);
