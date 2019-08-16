using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Axendo.Umb.Watersportverbond.Platform.Web.Core.Models.GMaps
{
    public class OurGmapsCore
    {
        [JsonProperty("latlon")]
        public string Coordinates { get; set; }
        [JsonProperty("full_address")]
        public string FullAddress { get; set; }
        [JsonProperty("postcode")]
        public string PostCode { get; set; }
        [JsonProperty("city")]
        public string City { get; set; }
        [JsonProperty("state")]
        public string State { get; set; }
        [JsonProperty("country")]
        public string Country { get; set; }
    }
}