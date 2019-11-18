angular.module('umbraco.resources').factory('OurGmapsCoreFactory',

    function ($q, $window) {

        //Google's url for async maps initialization accepting callback function
        var asyncUrl = 'https://maps.googleapis.com/maps/api/js',
            mapsDefer = $q.defer();

        $window.googleMapsInitialized = mapsDefer.resolve;

        function scriptExists(url) {
            return document.querySelectorAll(`script[src="${url}"]`).length > 0;
        }

        //Async loader
        var asyncLoad = function (asyncUrl, apiKey, callbackName) {

            var gMapsApiUrl = asyncUrl + '?key=' + apiKey + '&libraries=places&callback=' + callbackName;

            // initialize google maps
            // only add script to page when not yet there          

            if (!scriptExists(gMapsApiUrl)) {
                var script = document.createElement('script');
                script.src = gMapsApiUrl;
                document.head.appendChild(script);
            }
        };

        //Usage: OurGmapsCoreFactory.mapsInitialized().then(callback)
        return {
            mapsInitialized: function (apiKey) {
                asyncLoad(asyncUrl, apiKey, 'googleMapsInitialized');
                return mapsDefer.promise;
            }
        };
    }
);
