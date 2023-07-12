angular.module('umbraco.resources').factory('GMapsSnazzyMapsFactory',

    function ($q) {

        return {
            GetMapStyles: function (apiKey, method, pageNumber) {
                var deferred = $q.defer();
                if (!method) {
                    method = 'explore';
                }

                fetch('https://snazzymaps.com/' + method + '.json?key=' + apiKey + '&page=' + pageNumber)
                	.then(response => response.json())
                  .then(data => {
                      deferred.resolve({
                          pagination: data.pagination,
                          styles: data.styles
                      });
                  })
                  .catch(error => {
                      console.log(error, 'can not get data');
                      deferred.reject('can not get data');
                  });
                return deferred.promise;
            }
        };
    }
);
