using NPoco;

namespace Our.Umbraco.GMaps.Migrations.Upgrade;

/// <summary>
/// Minimal DTOs bridging a data type to its stored property values, so the migrations need none
/// of Umbraco's internal ones.
/// </summary>
internal static class MapPropertyData
{
    [TableName("cmsPropertyType")]
    [PrimaryKey("id")]
    [ExplicitColumns]
    public class PropertyTypeDto
    {
        [Column("id")] public int Id { get; set; }
        [Column("dataTypeId")] public int DataTypeId { get; set; }
    }

    [TableName("umbracoPropertyData")]
    [PrimaryKey("id")]
    [ExplicitColumns]
    public class PropertyDataDto
    {
        [Column("id")] public int Id { get; set; }
        [Column("textValue")] public string? TextValue { get; set; }
        [Column("propertyTypeId")] public int PropertyTypeId { get; set; }
    }
}
