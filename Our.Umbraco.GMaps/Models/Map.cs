using Newtonsoft.Json;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models;

public class Map
{
    [DataMember(Name = "address")]
    [JsonProperty("address")]
    [JsonPropertyName("address")]
    public Address Address { get; set; } = new Address();

    [DataMember(Name = "mapconfig")]
    [JsonProperty("mapconfig")]
    [JsonPropertyName("mapconfig")]
    public MapConfig MapConfig { get; set; } = new MapConfig();

}