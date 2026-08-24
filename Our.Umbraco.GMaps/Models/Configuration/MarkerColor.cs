using Newtonsoft.Json;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Models.Configuration;

/// <summary>
/// One swatch from the datatype's marker palette. Matches the shape
/// Umb.PropertyEditorUi.ColorSwatchesEditor produces.
/// </summary>
public class MarkerColor
{
    [DataMember(Name = "label")]
    [JsonProperty("label")]
    [JsonPropertyName("label")]
    public string? Label { get; set; }

    [DataMember(Name = "value")]
    [JsonProperty("value")]
    [JsonPropertyName("value")]
    public string? Value { get; set; }
}
