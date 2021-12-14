#if NET5_0_OR_GREATER
using Microsoft.Extensions.DependencyInjection;
using Our.Umbraco.GMaps.Core.Config;
using System;
using System.Linq;
using Umbraco.Cms.Core.DependencyInjection;

namespace Our.Umbraco.GMaps.Core
{
    public static class GoogleMapsBuilderExtensions
    {

        //A BIG Thanks to Kevin Jump, Your uSync Settings saved me time working the config out! https://github.com/KevinJump/uSync/blob/v9/main/uSync.BackOffice/uSyncBackOfficeBuilderExtensions.cs

        /// <summary>
        /// Registers the Google Maps Settings 
        /// </summary>
        /// <param name="builder"></param>
        /// <param name="defaultOptions"></param>
        /// <returns></returns>
        public static IUmbracoBuilder AddGoogleMaps(this IUmbracoBuilder builder, Action<GoogleMapsConfig> defaultOptions = default)
        {
            // if the MetaMomentumConfig Service is registered then we assume this has been added before so we don't do it again. 
            if (builder.Services.FirstOrDefault(x => x.ServiceType == typeof(GoogleMapsConfig)) != null)
            {
                return builder;
            }

            var options = builder.Services.AddSingleton(r =>
            {
                var ret = new GoogleMapsConfig(builder.Config);

                if (defaultOptions != default)
                {
                    //Override with custom details
                    defaultOptions.Invoke(ret);
                }
                return ret;
            });


            if (defaultOptions != default)
            {
                //options..Configure(defaultOptions);
            }

            return builder;
        }
    }
}
#endif