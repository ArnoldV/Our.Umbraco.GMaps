using Microsoft.Extensions.Options;
using Moq;
using Our.Umbraco.GMaps.Configuration;
using Our.Umbraco.GMaps.Models;
using Our.Umbraco.GMaps.PropertyValueConverter;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;

namespace Our.Umbraco.GMaps.Tests.PropertyValueConverter;

public class MultiMapPropertyValueConverterTests
{
    private static MultiMapPropertyValueConverter CreateSut(string? apiKey = "from-appsettings")
    {
        var monitor = new Mock<IOptionsMonitor<GoogleMaps>>();
        monitor.Setup(m => m.CurrentValue).Returns(new GoogleMaps { ApiKey = apiKey });
        return new MultiMapPropertyValueConverter(monitor.Object);
    }

    /// <summary>A property type whose datatype carries the given configuration.</summary>
    private static IPublishedPropertyType PropertyTypeWith(Dictionary<string, object>? config)
    {
        var dataType = new PublishedDataType(
            1,
            "Our.Umbraco.GMaps.Multi",
            "GMaps.PropertyEditorUi.MultiMap",
            new Lazy<object?>(() => config));

        var propertyType = new Mock<IPublishedPropertyType>();
        propertyType.Setup(p => p.DataType).Returns(dataType);
        propertyType.Setup(p => p.EditorAlias).Returns("Our.Umbraco.GMaps.Multi");
        return propertyType.Object;
    }

    private static MultiMap? Convert(
        string? stored,
        Dictionary<string, object>? config = null,
        string? apiKey = "from-appsettings")
        => CreateSut(apiKey).ConvertIntermediateToObject(
            null!, PropertyTypeWith(config), PropertyCacheLevel.Element, stored, false) as MultiMap;

    [Fact]
    public void Returns_null_for_empty_stored_values()
    {
        Assert.Null(Convert(null));
        Assert.Null(Convert(""));
        Assert.Null(Convert("   "));
    }

    [Fact]
    public void Reads_a_multi_map_value()
    {
        var model = Convert("""
        {"markers":[{"key":"a","friendlyName":"HQ","coordinates":{"lat":1,"lng":2}}],
         "mapconfig":{"zoom":12,"maptype":"roadmap"}}
        """);

        Assert.NotNull(model);
        var marker = Assert.Single(model!.Markers);
        Assert.Equal("HQ", marker.FriendlyName);
        Assert.Equal(12, model.MapConfig.Zoom);
    }

    [Fact]
    public void Reads_a_legacy_single_map_value_as_one_marker()
    {
        var model = Convert("""
        {"address":{"friendlyName":"HQ","full_address":"12 Collins St","coordinates":{"lat":1,"lng":2}},
         "mapconfig":{"zoom":15,"maptype":"roadmap"}}
        """);

        Assert.NotNull(model);
        var marker = Assert.Single(model!.Markers);
        Assert.Equal("HQ", marker.FriendlyName);
        Assert.Equal("12 Collins St", marker.FullAddress);
        Assert.Equal(1, marker.Coordinates.Latitude, 6);
        Assert.Equal(15, model.MapConfig.Zoom);
    }

    [Fact]
    public void Gives_every_marker_a_key_even_when_the_stored_value_has_none()
    {
        var model = Convert("""{"markers":[{"friendlyName":"HQ"},{"friendlyName":"Depot"}]}""");

        Assert.NotNull(model);
        Assert.All(model!.Markers, m => Assert.False(string.IsNullOrWhiteSpace(m.Key)));
        Assert.Equal(2, model.Markers.Select(m => m.Key).Distinct().Count());
    }

    [Fact]
    public void Takes_the_api_key_from_appsettings_when_the_datatype_has_none()
    {
        var model = Convert("""{"markers":[]}""");

        Assert.Equal("from-appsettings", model!.MapConfig.ApiKey);
    }

    [Fact]
    public void Lets_the_datatype_api_key_win_over_appsettings()
    {
        var model = Convert("""{"markers":[]}""",
            new Dictionary<string, object> { ["apikey"] = "from-datatype" });

        Assert.Equal("from-datatype", model!.MapConfig.ApiKey);
    }

    [Fact]
    public void Resolves_colour_labels_from_the_current_palette()
    {
        var model = Convert("""{"markers":[{"key":"a","color":"#2d7ef7"}]}""",
            new Dictionary<string, object>
            {
                ["markerColors"] = """[{"label":"Logistics","value":"#2d7ef7"},{"label":"Retail","value":"#d64545"}]"""
            });

        Assert.Equal("Logistics", Assert.Single(model!.Markers).ColorLabel);
    }

    [Fact]
    public void Leaves_the_label_null_when_the_colour_left_the_palette()
    {
        var model = Convert("""{"markers":[{"key":"a","color":"#123456"}]}""",
            new Dictionary<string, object>
            {
                ["markerColors"] = """[{"label":"Logistics","value":"#2d7ef7"}]"""
            });

        var marker = Assert.Single(model!.Markers);
        Assert.Equal("#123456", marker.Color);
        Assert.Null(marker.ColorLabel);
    }

    [Fact]
    public void Matches_palette_colours_case_insensitively()
    {
        var model = Convert("""{"markers":[{"key":"a","color":"#2D7EF7"}]}""",
            new Dictionary<string, object>
            {
                ["markerColors"] = """[{"label":"Logistics","value":"#2d7ef7"}]"""
            });

        Assert.Equal("Logistics", Assert.Single(model!.Markers).ColorLabel);
    }

    [Fact]
    public void Matches_a_palette_stored_without_the_leading_hash()
    {
        var model = Convert("""{"markers":[{"key":"a","color":"#e61414"}]}""",
            new Dictionary<string, object>
            {
                ["markerColors"] = """[{"label":"Logistics","value":"e61414"}]"""
            });

        Assert.Equal("Logistics", Assert.Single(model!.Markers).ColorLabel);
    }

    [Fact]
    public void Matches_content_saved_before_the_hash_was_added()
    {
        var model = Convert("""{"markers":[{"key":"a","color":"e61414"}]}""",
            new Dictionary<string, object>
            {
                ["markerColors"] = """[{"label":"Logistics","value":"#e61414"}]"""
            });

        Assert.Equal("Logistics", Assert.Single(model!.Markers).ColorLabel);
    }

    [Fact]
    public void Survives_malformed_palette_configuration()
    {
        var model = Convert("""{"markers":[{"key":"a","color":"#2d7ef7"}]}""",
            new Dictionary<string, object> { ["markerColors"] = "not json" });

        Assert.NotNull(model);
        Assert.Null(Assert.Single(model!.Markers).ColorLabel);
    }
}
