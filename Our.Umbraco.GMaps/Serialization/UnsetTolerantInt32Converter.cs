using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Serialization;

/// <summary>
/// Reads an int from any of the shapes earlier versions of the package left in the database:
/// a number, a number inside a string, a JSON null, or an empty string. Anything unreadable
/// becomes 0, which both the package and the editor treat as "not set".
/// </summary>
/// <remarks>
/// A stored <c>"zoom": null</c> otherwise throws "The JSON value could not be converted to
/// System.Int32" and takes the whole document down.
/// See https://github.com/ArnoldV/Our.Umbraco.GMaps/issues/197.
/// </remarks>
internal sealed class UnsetTolerantInt32Converter : JsonConverter<int>
{
    /// <summary>Without this, System.Text.Json rejects a null before asking the converter.</summary>
    public override bool HandleNull => true;

    public override int Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => reader.TokenType switch
        {
            JsonTokenType.Number => reader.TryGetInt32(out var number) ? number
                : reader.TryGetDouble(out var fractional) ? (int)fractional
                : 0,
            JsonTokenType.String => int.TryParse(
                reader.GetString(),
                NumberStyles.Integer,
                CultureInfo.InvariantCulture,
                out var parsed) ? parsed : 0,
            _ => 0,
        };

    public override void Write(Utf8JsonWriter writer, int value, JsonSerializerOptions options)
        => writer.WriteNumberValue(value);
}
