using Newtonsoft.Json;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models;

/// <summary>
/// One pin on a multi-marker map. Inherits <see cref="Address"/> so the stored
/// JSON stays flat.
/// </summary>
public class Marker : Address
{
    /// <summary>Stable client-generated identity, independent of list position.</summary>
    [DataMember(Name = "key")]
    [JsonProperty("key")]
    [JsonPropertyName("key")]
    public string? Key { get; set; }

    [DataMember(Name = "description")]
    [JsonProperty("description")]
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>The hex value from the datatype's palette. The label is not stored.</summary>
    [DataMember(Name = "color")]
    [JsonProperty("color")]
    [JsonPropertyName("color")]
    public string? Color { get; set; }

    /// <summary>
    /// Resolved from the datatype's current palette, so renaming a swatch leaves no
    /// stale labels. Null when the colour is no longer in the palette.
    /// </summary>
    [System.Text.Json.Serialization.JsonIgnore]
    [Newtonsoft.Json.JsonIgnore]
    [IgnoreDataMember]
    public string? ColorLabel { get; set; }
}
