using System.Text.Json;
using Our.Umbraco.GMaps.Models.Configuration;

namespace Our.Umbraco.GMaps.Tests.Models;

public class MapStyleSerialisationTests
{
    /// <summary>
    /// What the current snazzy maps prevalue editor writes: the hand-written style
    /// lives in <c>customstyle</c>, a picked Snazzy style in <c>selectedstyle</c>.
    /// </summary>
    [Fact]
    public void Reads_a_current_custom_style()
    {
        var style = JsonSerializer.Deserialize<MapStyle>("""
        {
          "apiKey": "snazzy-key",
          "selectedstyle": {},
          "customstyle": "[{\"elementType\":\"geometry\",\"stylers\":[{\"color\":\"#212121\"}]}]"
        }
        """);

        Assert.NotNull(style);
        Assert.Equal("snazzy-key", style!.ApiKey);
        Assert.Contains("#212121", style.Customstyle);
    }

    /// <summary>
    /// Versions before 4.0 used <c>customstyle</c> as a flag saying "the JSON in
    /// selectedstyle was typed by hand" — the style itself was always in
    /// <c>selectedstyle.json</c>. Reading that boolean must not throw (#264).
    /// </summary>
    [Theory]
    [InlineData("true")]
    [InlineData("false")]
    public void Reads_the_legacy_boolean_flag_as_no_custom_style(string flag)
    {
        var style = JsonSerializer.Deserialize<MapStyle>($$"""
        {
          "apiKey": "snazzy-key",
          "selectedstyle": { "json": "[{\"featureType\":\"water\"}]" },
          "customstyle": {{flag}}
        }
        """);

        Assert.NotNull(style);
        Assert.Null(style!.Customstyle);
        Assert.Equal("""[{"featureType":"water"}]""", style.Selectedstyle.Json);
    }

    [Fact]
    public void Reads_a_null_custom_style()
    {
        var style = JsonSerializer.Deserialize<MapStyle>("""{"customstyle":null}""");

        Assert.NotNull(style);
        Assert.Null(style!.Customstyle);
    }

    [Fact]
    public void Writes_the_custom_style_back_as_a_string()
    {
        var json = JsonSerializer.Serialize(new MapStyle { Customstyle = "[{}]" });

        Assert.Contains("""
        "customstyle":"[{}]"
        """.Trim(), json);
    }

    /// <summary>A style hand-edited into the configuration as JSON rather than as a JSON string.</summary>
    [Fact]
    public void Reads_a_custom_style_stored_as_raw_json()
    {
        var style = JsonSerializer.Deserialize<MapStyle>(
            """{"customstyle":[{"featureType":"water","stylers":[{"color":"#000000"}]}]}""");

        Assert.NotNull(style);
        Assert.Equal(
            """[{"featureType":"water","stylers":[{"color":"#000000"}]}]""",
            style!.Customstyle);
    }
}
