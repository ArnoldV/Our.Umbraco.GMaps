using System.Text.Json;
using System.Text.Json.Serialization;

namespace Our.Umbraco.GMaps.Serialization;

/// <summary>
/// Reads the <c>customstyle</c> entry of a datatype's map style configuration in
/// whichever shape it was stored.
/// </summary>
/// <remarks>
/// Versions before 4.0 used <c>customstyle</c> as a flag: <c>true</c> meant "the JSON
/// in <c>selectedstyle</c> was typed by hand rather than picked from Snazzy Maps".
/// The style itself always lived in <c>selectedstyle.json</c>, which the property
/// value converters still prefer, so the flag reads as "no custom style" rather than
/// being repaired. A style stored as raw JSON instead of a JSON string is kept as it
/// was written, since that is what the map ends up handing to Google either way.
/// </remarks>
internal class CustomStyleJsonConverter : JsonConverter<string?>
{
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.String:
                return reader.GetString();

            // The pre-4.0 flag, and an absent value.
            case JsonTokenType.True:
            case JsonTokenType.False:
            case JsonTokenType.Null:
                return null;

            // A hand-written style, stored as JSON rather than as a JSON string.
            case JsonTokenType.StartArray:
            case JsonTokenType.StartObject:
                return JsonDocument.ParseValue(ref reader).RootElement.GetRawText();

            default:
                reader.Skip();
                return null;
        }
    }

    public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
    {
        if (value is null)
        {
            writer.WriteNullValue();
            return;
        }

        writer.WriteStringValue(value);
    }
}
