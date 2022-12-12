angular.module('umbraco.resources').factory('GMapsSnazzyMapsFactory',

    function ($http, $q) {

        return {
            GetMapStyles: function (apiKey, method, pageNumber) {
                var deferred = $q.defer();
                if (!method) {
                    method = 'explore';
                }

                $http({
                    method: 'get',
                    url: 'https://snazzymaps.com/' + method + '.json?key=' + apiKey + '&page=' + pageNumber
                }).then(
                    function success(response) {
                        deferred.resolve({
                            pagination: response.data.pagination,
                            styles: response.data.styles
                        });
                    },
                    function error(response) {
                        console.log(response, 'can not get data');
                        deferred.reject('can not get data')
                    });
                return deferred.promise;
            }
        };
    }
);
