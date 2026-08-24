using Microsoft.Extensions.Options;
using Moq;
using Our.Umbraco.GMaps.Configuration;
using Our.Umbraco.GMaps.Models;
using Our.Umbraco.GMaps.PropertyValueConverter;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;

namespace Our.Umbraco.GMaps.Tests.PropertyValueConverter;

/// <summary>
/// The <c>mapstyle</c> entry of the datatype configuration, as read by both
/// converters. Configuration written before 4.0 carries a boolean
/// <c>customstyle</c> flag with the style itself in <c>selectedstyle.json</c>.
/// </summary>
public class MapStyleConfigurationTests
{
    private const string CustomStyleJson = """[{"elementType":"geometry","stylers":[{"color":"#212121"}]}]""";

    private static IPublishedPropertyType PropertyTypeWith(string editorAlias, string mapStyle)
    {
        var dataType = new PublishedDataType(
            1,
            editorAlias,
            "GMaps.PropertyEditorUi",
            new Lazy<object?>(() => new Dictionary<string, object> { ["mapstyle"] = mapStyle }));

        var propertyType = new Mock<IPublishedPropertyType>();
        propertyType.Setup(p => p.DataType).Returns(dataType);
        propertyType.Setup(p => p.EditorAlias).Returns(editorAlias);
        return propertyType.Object;
    }

    private static IOptionsMonitor<GoogleMaps> Options()
    {
        var monitor = new Mock<IOptionsMonitor<GoogleMaps>>();
        monitor.Setup(m => m.CurrentValue).Returns(new GoogleMaps { ApiKey = "from-appsettings" });
        return monitor.Object;
    }

    private static string? SingleMapStyle(string mapStyle)
        => (new SingleMapPropertyValueConverter(Options()).ConvertIntermediateToObject(
            null!,
            PropertyTypeWith("Our.Umbraco.GMaps.Single", mapStyle),
            PropertyCacheLevel.Element,
            """{"address":{"friendlyName":"HQ"},"mapconfig":{"zoom":12}}""",
            false) as Map)?.MapConfig.Style;

    private static string? MultiMapStyle(string mapStyle)
        => (new MultiMapPropertyValueConverter(Options()).ConvertIntermediateToObject(
            null!,
            PropertyTypeWith("Our.Umbraco.GMaps.Multi", mapStyle),
            PropertyCacheLevel.Element,
            """{"markers":[{"key":"a"}],"mapconfig":{"zoom":12}}""",
            false) as MultiMap)?.MapConfig.Style;

    [Fact]
    public void Single_map_uses_the_custom_style_when_no_snazzy_style_is_picked()
    {
        var config = $$"""{"apiKey":"k","selectedstyle":{},"customstyle":{{System.Text.Json.JsonSerializer.Serialize(CustomStyleJson)}}}""";

        Assert.Equal(CustomStyleJson, SingleMapStyle(config));
        Assert.Equal(CustomStyleJson, MultiMapStyle(config));
    }

    [Fact]
    public void Legacy_configuration_keeps_the_style_it_stored_in_selectedstyle()
    {
        var config = $$"""{"apiKey":"k","selectedstyle":{"json":{{System.Text.Json.JsonSerializer.Serialize(CustomStyleJson)}}},"customstyle":true}""";

        Assert.Equal(CustomStyleJson, SingleMapStyle(config));
        Assert.Equal(CustomStyleJson, MultiMapStyle(config));
    }

    [Fact]
    public void Survives_malformed_map_style_configuration()
    {
        Assert.Null(SingleMapStyle("not json"));
        Assert.Null(MultiMapStyle("not json"));
    }
}
