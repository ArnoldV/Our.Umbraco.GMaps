using System.Reflection;
using System.Runtime.Serialization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Our.Umbraco.GMaps.Models;

namespace Our.Umbraco.GMaps.Serialization;

/// <summary>
/// Reads and writes <see cref="MapType"/> as the Google map type id the editor stores
/// (<c>roadmap</c>, <c>styled_map</c>), taken from each member's <see cref="EnumMemberAttribute"/>
/// so the enum stays the only place the ids are spelled out.
/// </summary>
/// <remarks>
/// Reading is deliberately forgiving. Umbraco 8 data stored the id with a space rather than an
/// underscore, and the stock <c>JsonStringEnumConverter</c> throws on anything it does not
/// recognise — including <c>styled_map</c> — which loses the whole document rather than one
/// setting. An unrecognised id reads as null and the caller picks a default.
/// </remarks>
internal sealed class MapTypeJsonConverter : JsonConverter<MapType?>
{
    private static readonly Dictionary<string, MapType> ByCanonicalId =
        Enum.GetValues<MapType>().ToDictionary(CanonicalId, StringComparer.OrdinalIgnoreCase);

    public override bool HandleNull => true;

    public override MapType? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => reader.TokenType == JsonTokenType.String ? Parse(reader.GetString()) : null;

    public override void Write(Utf8JsonWriter writer, MapType? value, JsonSerializerOptions options)
    {
        if (value is null)
        {
            writer.WriteNullValue();
            return;
        }

        writer.WriteStringValue(CanonicalId(value.Value));
    }

    /// <summary>The id as the editor writes it, or null when it is not one we know.</summary>
    internal static MapType? Parse(string? stored)
    {
        if (string.IsNullOrWhiteSpace(stored))
        {
            return null;
        }

        // Umbraco 8 wrote "styled map"; some of that data also carried a Google API prefix.
        var id = stored
            .Replace("google.maps.maptypeid.", string.Empty, StringComparison.OrdinalIgnoreCase)
            .Trim()
            .Replace(' ', '_');

        return ByCanonicalId.TryGetValue(id, out var mapType) ? mapType : null;
    }

    /// <summary>The id as Google spells it, and as the editor stores it.</summary>
    internal static string CanonicalId(MapType mapType)
        => typeof(MapType).GetField(mapType.ToString())?
            .GetCustomAttribute<EnumMemberAttribute>()?.Value
            ?? mapType.ToString().ToLowerInvariant();
}
