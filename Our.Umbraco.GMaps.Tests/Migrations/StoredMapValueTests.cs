using Our.Umbraco.GMaps.Migrations.Upgrade;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Our.Umbraco.GMaps.Tests.Migrations;

public class StoredMapValueTests
{
    private const int DefaultZoom = 17;

    private static JsonObject Repair(string stored, int defaultZoom = DefaultZoom)
    {
        var repaired = StoredMapValue.Repair(stored, defaultZoom);
        Assert.NotNull(repaired);
        return Assert.IsType<JsonObject>(JsonNode.Parse(repaired!));
    }

    [Fact]
    public void Leaves_a_value_alone_when_there_is_nothing_to_repair()
    {
        var canonical = """
        {"address":{"coordinates":{"lat":-37.834,"lng":144.926},"city":"Melbourne"},
         "mapconfig":{"zoom":12,"maptype":"roadmap","centerCoordinates":{"lat":-37.81,"lng":144.96}}}
        """;

        Assert.Null(StoredMapValue.Repair(canonical, DefaultZoom));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not json")]
    [InlineData("[1,2,3]")]
    public void Leaves_anything_that_is_not_a_map_value(string? stored)
        => Assert.Null(StoredMapValue.Repair(stored, DefaultZoom));

    // ---- Issue 165: the Umbraco 8 shape ---------------------------------------

    /// <summary>The exact value reported in issue 165.</summary>
    private const string LegacyV8Json = """
    {"address":{"latlng":"53.5879923, -2.5384524","full_address":"mansell house","postalcode":"bl6 6qq","city":"horwich","state":"england","country":"united kingdom"},"mapconfig":{"zoom":16,"maptype":"roadmap","mapcenter":"53.58793457153, -2.5383417500000194"}}
    """;

    [Fact]
    public void Turns_the_legacy_latlng_string_into_a_point()
    {
        var address = Repair(LegacyV8Json)["address"]!;

        Assert.Equal(53.5879923, (double)address["coordinates"]!["lat"]!, 6);
        Assert.Equal(-2.5384524, (double)address["coordinates"]!["lng"]!, 6);
        Assert.Null(address["latlng"]);
    }

    [Fact]
    public void Turns_the_legacy_mapcenter_string_into_a_point()
    {
        var mapConfig = Repair(LegacyV8Json)["mapconfig"]!;

        Assert.Equal(53.58793457153, (double)mapConfig["centerCoordinates"]!["lat"]!, 6);
        Assert.Null(mapConfig["mapcenter"]);
    }

    [Fact]
    public void Keeps_the_rest_of_the_legacy_address()
    {
        var address = Repair(LegacyV8Json)["address"]!;

        Assert.Equal("mansell house", (string?)address["full_address"]);
        Assert.Equal("bl6 6qq", (string?)address["postalcode"]);
        Assert.Equal("united kingdom", (string?)address["country"]);
    }

    [Theory]
    [InlineData("satellite", "satellite")]
    [InlineData("styled map", "styled_map")]
    [InlineData("Roadmap", "roadmap")]
    [InlineData("google.maps.maptypeid.terrain", "terrain")]
    [InlineData("nonsense", "roadmap")]
    public void Rewrites_the_map_type_as_the_google_id(string stored, string expected)
    {
        // The null zoom guarantees a rewrite, so this says nothing about whether the map
        // type alone was worth one.
        var repaired = Repair($$$"""{"mapconfig":{"zoom":null,"maptype":"{{{stored}}}"}}""");

        Assert.Equal(expected, (string?)repaired["mapconfig"]!["maptype"]);
    }

    [Fact]
    public void Leaves_a_map_type_that_is_already_a_google_id()
        => Assert.Null(StoredMapValue.Repair("""{"mapconfig":{"zoom":12,"maptype":"satellite"}}""", DefaultZoom));

    // ---- Issue 197: the nulls 2.x wrote ---------------------------------------

    /// <summary>The exact value reported in issue 197.</summary>
    private const string NullZoomJson = """
    {"address":{"coordinates":{"Coordinates":"57.0599305,9.9190195","lat":57.0599305,"lng":9.9190195,"IsEmpty":false},"full_address":"Nørresundby Citycenter, Vestergade 30, 9400 Nørresundby, Denmark","streetNumber":null,"street":null,"postalcode":"DK-9400","city":"Nørresundby","state":"","country":"Denmark"},"mapconfig":{"apikey":null,"zoom":null,"centerCoordinates":null,"mapstyle":null,"maptype":null}}
    """;

    [Fact]
    public void Replaces_a_null_zoom_with_the_default()
    {
        Assert.Equal(17, (int)Repair(NullZoomJson)["mapconfig"]!["zoom"]!);
    }

    [Fact]
    public void Takes_the_default_zoom_from_configuration()
    {
        Assert.Equal(9, (int)Repair(NullZoomJson, defaultZoom: 9)["mapconfig"]!["zoom"]!);
    }

    [Fact]
    public void Drops_a_null_centre_rather_than_storing_one()
    {
        var mapConfig = Repair(NullZoomJson)["mapconfig"]!;

        Assert.False(mapConfig.AsObject().ContainsKey("centerCoordinates"));
    }

    [Fact]
    public void Replaces_a_null_map_type_with_roadmap()
    {
        Assert.Equal("roadmap", (string?)Repair(NullZoomJson)["mapconfig"]!["maptype"]);
    }

    [Fact]
    public void Drops_the_computed_members_an_earlier_version_serialised()
    {
        var coordinates = Repair(NullZoomJson)["address"]!["coordinates"]!.AsObject();

        Assert.False(coordinates.ContainsKey("IsEmpty"));
        Assert.False(coordinates.ContainsKey("Coordinates"));
        Assert.Equal(57.0599305, (double)coordinates["lat"]!, 6);
        Assert.Equal(9.9190195, (double)coordinates["lng"]!, 6);
    }

    [Fact]
    public void Keeps_the_address_the_null_value_still_carried()
    {
        var address = Repair(NullZoomJson)["address"]!;

        Assert.Equal("DK-9400", (string?)address["postalcode"]);
        Assert.Equal("Nørresundby", (string?)address["city"]);
    }

    [Fact]
    public void Reads_back_as_the_shape_the_models_expect()
    {
        var repaired = StoredMapValue.Repair(NullZoomJson, DefaultZoom);

        var model = JsonSerializer.Deserialize<Our.Umbraco.GMaps.Models.Map>(repaired!);

        Assert.NotNull(model);
        Assert.Equal(17, model!.MapConfig.Zoom);
        Assert.Equal(57.0599305, model.Address.Coordinates.Latitude, 6);
    }

    // ---- Other shapes older versions left behind ------------------------------

    [Fact]
    public void Turns_a_zoom_stored_as_a_string_into_a_number()
    {
        var zoom = Repair("""{"mapconfig":{"zoom":"14"}}""")["mapconfig"]!["zoom"]!;

        Assert.Equal(JsonValueKind.Number, zoom.GetValueKind());
        Assert.Equal(14, (int)zoom);
    }

    [Theory]
    [InlineData("""{"mapconfig":{"zoom":0}}""")]
    [InlineData("""{"mapconfig":{"zoom":""}}""")]
    [InlineData("""{"mapconfig":{"zoom":"nonsense"}}""")]
    public void Replaces_an_unusable_zoom_with_the_default(string stored)
    {
        Assert.Equal(17, (int)Repair(stored)["mapconfig"]!["zoom"]!);
    }

    [Fact]
    public void Replaces_a_null_marker_list_with_an_empty_one()
    {
        var markers = Repair("""{"markers":null,"mapconfig":{"zoom":12}}""")["markers"]!;

        Assert.Empty(markers.AsArray());
    }

    [Fact]
    public void Drops_a_null_marker_from_the_list()
    {
        var markers = Repair("""{"markers":[{"key":"a"},null,{"key":"b"}]}""")["markers"]!.AsArray();

        Assert.Equal(2, markers.Count);
        Assert.All(markers, m => Assert.NotNull(m));
    }

    [Fact]
    public void Repairs_each_marker_in_a_multi_map()
    {
        var markers = Repair("""
        {"markers":[{"key":"a","latlng":"1.5, 2.5"}],"mapconfig":{"zoom":null}}
        """)["markers"]!.AsArray();

        var marker = Assert.Single(markers)!;
        Assert.Equal(1.5, (double)marker["coordinates"]!["lat"]!, 6);
        Assert.Null(marker["latlng"]);
    }

    [Fact]
    public void Repairing_twice_changes_nothing_the_second_time()
    {
        var once = StoredMapValue.Repair(NullZoomJson, DefaultZoom);

        Assert.NotNull(once);
        Assert.Null(StoredMapValue.Repair(once, DefaultZoom));
    }

    [Fact]
    public void Repairing_the_legacy_value_twice_changes_nothing_the_second_time()
    {
        var once = StoredMapValue.Repair(LegacyV8Json, DefaultZoom);

        Assert.NotNull(once);
        Assert.Null(StoredMapValue.Repair(once, DefaultZoom));
    }
}
