using Newtonsoft.Json;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models;

/// <summary>
/// One pin on a multi-marker map. Inherits <see cref="Address"/> so the stored
/// JSON stays flat and every existing address member is reused.
/// </summary>
public class Marker : Address
{
    /// <summary>
    /// Stable client-generated identity. Reordering and drawer editing both need
    /// it; index-based identity breaks as soon as a marker moves.
    /// </summary>
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
    /// Resolved from the datatype's <em>current</em> palette by the property value
    /// converter, so renaming a swatch does not leave stale labels in content.
    /// Null when the colour is no longer in the palette.
    /// </summary>
    [System.Text.Json.Serialization.JsonIgnore]
    [Newtonsoft.Json.JsonIgnore]
    [IgnoreDataMember]
    public string? ColorLabel { get; set; }
}
