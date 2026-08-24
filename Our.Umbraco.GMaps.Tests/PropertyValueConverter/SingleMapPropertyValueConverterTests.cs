using Microsoft.Extensions.Options;
using Moq;
using Our.Umbraco.GMaps.Configuration;
using Our.Umbraco.GMaps.Models;
using Our.Umbraco.GMaps.PropertyValueConverter;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;

namespace Our.Umbraco.GMaps.Tests.PropertyValueConverter;

public class SingleMapPropertyValueConverterTests
{
    private static SingleMapPropertyValueConverter CreateSut(
        string? apiKey = "from-appsettings",
        int? zoomLevel = null)
    {
        var monitor = new Mock<IOptionsMonitor<GoogleMaps>>();
        monitor.Setup(m => m.CurrentValue)
            .Returns(new GoogleMaps { ApiKey = apiKey, ZoomLevel = zoomLevel });
        return new SingleMapPropertyValueConverter(monitor.Object);
    }

    /// <summary>A property type whose datatype carries the given configuration.</summary>
    private static IPublishedPropertyType PropertyTypeWith(Dictionary<string, object>? config)
    {
        var dataType = new PublishedDataType(
            1,
            "Our.Umbraco.GMaps",
            "GMaps.PropertyEditorUi.SingleMap",
            new Lazy<object?>(() => config));

        var propertyType = new Mock<IPublishedPropertyType>();
        propertyType.Setup(p => p.DataType).Returns(dataType);
        propertyType.Setup(p => p.EditorAlias).Returns("Our.Umbraco.GMaps");
        return propertyType.Object;
    }

    private static Map? Convert(
        string? stored,
        Dictionary<string, object>? config = null,
        string? apiKey = "from-appsettings")
        => CreateSut(apiKey).ConvertIntermediateToObject(
            null!, PropertyTypeWith(config), PropertyCacheLevel.Element, stored, false) as Map;

    // ---- Issue 165: Umbraco 8 (GMaps 1.x) data ---------------------------------

    /// <summary>The exact value reported in issue 165.</summary>
    private const string LegacyV8Json = """
    {"address":{"latlng":"53.5879923, -2.5384524","full_address":"mansell house","postalcode":"bl6 6qq","city":"horwich","state":"england","country":"united kingdom"},"mapconfig":{"zoom":16,"maptype":"roadmap","mapcenter":"53.58793457153, -2.5383417500000194"}}
    """;

    [Fact]
    public void Reads_a_legacy_v8_value()
    {
        var model = Convert(LegacyV8Json);

        Assert.NotNull(model);
        Assert.Equal("mansell house", model!.Address.FullAddress);
        Assert.Equal("bl6 6qq", model.Address.PostalCode);
        Assert.Equal("horwich", model.Address.City);
        Assert.Equal(53.5879923, model.Address.Coordinates.Latitude, 6);
        Assert.Equal(-2.5384524, model.Address.Coordinates.Longitude, 6);
        Assert.Equal(16, model.MapConfig.Zoom);
        Assert.Equal(53.58793457153, model.MapConfig.CenterCoordinates.Latitude, 6);
    }

    [Theory]
    [InlineData("roadmap", MapType.Roadmap)]
    [InlineData("satellite", MapType.Satellite)]
    [InlineData("hybrid", MapType.Hybrid)]
    [InlineData("terrain", MapType.Terrain)]
    public void Keeps_the_legacy_v8_map_type(string stored, MapType expected)
    {
        var model = Convert(
            $$$"""{"address":{"latlng":"53.5879923, -2.5384524"},"mapconfig":{"zoom":16,"maptype":"{{{stored}}}"}}""");

        Assert.Equal(expected, model!.MapConfig.MapType);
    }

    [Fact]
    public void Falls_back_to_a_default_zoom_when_the_legacy_value_has_none()
    {
        var model = Convert("""{"address":{"latlng":"53.5879923, -2.5384524"},"mapconfig":{}}""");

        Assert.Equal(17, model!.MapConfig.Zoom);
    }

    // ---- Issue 197: nulls written by GMaps 2.x --------------------------------

    /// <summary>The exact value reported in issue 197.</summary>
    private const string NullZoomJson = """
    {"address":{"coordinates":{"Coordinates":"57.0599305,9.9190195","lat":57.0599305,"lng":9.9190195,"IsEmpty":false},"full_address":"Nørresundby Citycenter, Vestergade 30, 9400 Nørresundby, Denmark","streetNumber":null,"street":null,"postalcode":"DK-9400","city":"Nørresundby","state":"","country":"Denmark"},"mapconfig":{"apikey":null,"zoom":null,"centerCoordinates":null,"mapstyle":null,"maptype":null}}
    """;

    [Fact]
    public void Reads_a_value_whose_mapconfig_is_all_nulls()
    {
        var model = Convert(NullZoomJson);

        Assert.NotNull(model);
        Assert.Equal(57.0599305, model!.Address.Coordinates.Latitude, 6);
        Assert.Equal(9.9190195, model.Address.Coordinates.Longitude, 6);
        Assert.Equal("DK-9400", model.Address.PostalCode);
    }

    [Fact]
    public void Falls_back_to_a_default_zoom_when_the_stored_zoom_is_null()
    {
        var model = Convert(NullZoomJson);

        Assert.Equal(17, model!.MapConfig.Zoom);
    }

    [Fact]
    public void Never_hands_back_a_null_coordinate_object()
    {
        var model = Convert(NullZoomJson);

        Assert.NotNull(model!.MapConfig.CenterCoordinates);
        Assert.True(model.MapConfig.CenterCoordinates.IsEmpty);
    }

    [Fact]
    public void Reads_the_styled_map_type_the_legacy_data_stores()
    {
        var model = Convert("""{"address":{},"mapconfig":{"zoom":12,"maptype":"styled_map"}}""");

        Assert.Equal(MapType.StyledMap, model!.MapConfig.MapType);
    }

    [Fact]
    public void Takes_the_default_zoom_from_configuration()
    {
        var model = CreateSut(zoomLevel: 9).ConvertIntermediateToObject(
            null!, PropertyTypeWith(null), PropertyCacheLevel.Element, NullZoomJson, false) as Map;

        Assert.Equal(9, model!.MapConfig.Zoom);
    }

    [Fact]
    public void Reads_a_null_address()
    {
        var model = Convert("""{"address":null,"mapconfig":{"zoom":12}}""");

        Assert.NotNull(model);
        Assert.NotNull(model!.Address);
        Assert.NotNull(model.Address.Coordinates);
    }
}
