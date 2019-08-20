angular.module('umbraco.resources').factory('OurGmapsSnazzyMapsFactory',

    function ($http, $q) {

        return {
            Explore: function (apiKey, pageNumber) {
                var deferred = $q.defer();

                $http({
                    method: 'get',
                    url: 'https://snazzymaps.com/explore.json?key=' + apiKey + '&page=' + pageNumber
                }).then(function (response) {
                    deferred.resolve({
                        pagination: response.data.pagination,
                        styles: response.data.styles
                    });
                }, function (error) {
                    console.log(error, 'can not get data.');
                });
                return deferred.promise;
            },
            Favorites: function (apiKey, pageNumber) {
                var deferred = $q.defer();

                $http({
                    method: 'get',
                    url: 'https://snazzymaps.com/favorites.json?key=' + apiKey + '&page=' + pageNumber
                }).then(function (response) {
                    deferred.resolve({
                        pagination: response.data.pagination,
                        styles: response.data.styles
                    });
                }, function (error) {
                    console.log(error, 'can not get data.');
                });
                return deferred.promise;
            },
            MyStyles: function (apiKey, pageNumber) {
                var deferred = $q.defer();
                $http({
                    method: 'get',
                    url: 'https://snazzymaps.com/my-styles.json?key=' + apiKey + '&page=' + pageNumber
                }).then(function (response) {
                    deferred.resolve({
                        pagination: response.data.pagination,
                        styles: response.data.styles
                    });
                }, function (error) {
                    console.log(error, 'can not get data.');
                });
                return deferred.promise;
            }
        };
    }
);
