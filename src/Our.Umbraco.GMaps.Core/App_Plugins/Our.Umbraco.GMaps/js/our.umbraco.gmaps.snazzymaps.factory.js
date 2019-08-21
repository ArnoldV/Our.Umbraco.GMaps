angular.module('umbraco.resources').factory('OurGmapsSnazzyMapsFactory',

    function ($http, $q) {

        return {
            GetMapStyles: function (apiKey, method, pageNumber) {
                var deferred = $q.defer();
                if (apiKey) {
                    if (!method) {
                        method = 'explore';
                    }

                    $http({
                        method: 'get',
                        url: 'https://snazzymaps.com/' + method + '.json?key=' + apiKey + '&page=' + pageNumber
                    }).then(function (response) {
                        deferred.resolve({
                            pagination: response.data.pagination,
                            styles: response.data.styles
                        });
                    },
                        function (error) {
                            console.log(error, 'can not get data ');
                        });
                    return deferred.promise;
                } else {
                    console.log("No (valid) SnazzyMaps API Key");
                }
            }
        };
    }
);
