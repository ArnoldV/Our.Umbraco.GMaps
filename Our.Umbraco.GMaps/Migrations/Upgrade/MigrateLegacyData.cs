using Microsoft.Extensions.Logging;
using NPoco;
using System.Text.Json;
using Umbraco.Cms.Infrastructure.Migrations;
using Umbraco.Cms.Infrastructure.Persistence.Dtos;
using Umbraco.Extensions;

namespace Our.Umbraco.GMaps.Migrations.Upgrade;

internal sealed class MigrateLegacyData(IMigrationContext context, ILogger<MigrateLegacyData> logger) : AsyncMigrationBase(context)
{
  public const string State = "{gmaps-migrate-legacy-data}";
  
  protected override async Task MigrateAsync()
    {
        // 1. Resolve PropertyType IDs (The DocType Usage)
        var propertyTypeSql = Sql()
            .Select<LocalPropertyTypeDto>(x => x.Id)
            .From<LocalPropertyTypeDto>()
            .InnerJoin<DataTypeDto>().On<LocalPropertyTypeDto, DataTypeDto>((pt, dt) => pt.DataTypeId == dt.NodeId)
            .Where<DataTypeDto>(x => x.EditorAlias == "Our.Umbraco.GMaps.Single");

        var validPropertyTypeIds = await Database.FetchAsync<int>(propertyTypeSql) ?? [];
        if (validPropertyTypeIds.Count == 0) return;

        // 2. Fetch the actual Property Data
        var sql = Sql()
            .Select<GMapPropertyDataDto>()
            .From<GMapPropertyDataDto>()
            .Where<GMapPropertyDataDto>(x => validPropertyTypeIds.Contains(x.PropertyTypeId))
            // We use a broader LIKE check to ensure we catch all JSON formats (minified or pretty)
            .Where("textValue LIKE '%latlng%' OR textValue LIKE '%mapcenter%'");

        var propertyEntries = await Database.FetchAsync<GMapPropertyDataDto>(sql) ?? [];
        if (propertyEntries.Count == 0) return;

        // 3. Transform and Update
        var updateBatch = propertyEntries
            .Select(dto => UpdateBatch.For(dto, Database.StartSnapshot(dto)))
            .ToList();

        var skipList = new List<UpdateBatch<GMapPropertyDataDto>>();

        foreach (var update in updateBatch)
        {
            var dto = update.Poco;
            try
            {
                var upgradedJson = TransformJson(dto.TextValue);

                // Only mark for update if transformation returned new data and it differs from original
                if (!string.IsNullOrEmpty(upgradedJson) && upgradedJson != dto.TextValue)
                {
                    dto.TextValue = upgradedJson;
                }
                else
                {
                    skipList.Add(update);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error transforming GMap row ID: {id}", dto.Id);
                skipList.Add(update);
            }
        }

        updateBatch.RemoveAll(x => skipList.Contains(x));

        if (updateBatch.Count > 0)
        {
            if (logger.IsEnabled(LogLevel.Information))
                logger.LogInformation("Universal Migration: Updating {count} GMaps records.", updateBatch.Count);

            // Smaller batch size to maintain stability on production transaction logs
            Database.UpdateBatch(updateBatch, new BatchOptions { BatchSize = 50 });
        }
    }

    private static string? TransformJson(string? rawJson)
    {
        if (string.IsNullOrWhiteSpace(rawJson)) return null;
        try
        {
            using var doc = JsonDocument.Parse(rawJson);
            var root = doc.RootElement;

            // Idempotency check: if 'centerCoordinates' already exists, skip
            if (root.TryGetProperty("mapconfig", out var check) && check.TryGetProperty("centerCoordinates", out _))
                return null;

            string? latLngStr = null, fullAddress = null, pc = null, city = null, state = null, country = null, sn = null, st = null;

            if (root.TryGetProperty("address", out var addr))
            {
                if (addr.TryGetProperty("latlng", out var l)) latLngStr = l.GetString();
                if (addr.TryGetProperty("full_address", out var f)) fullAddress = f.GetString();
                if (addr.TryGetProperty("postalcode", out var p)) pc = p.GetString();
                if (addr.TryGetProperty("city", out var c)) city = c.GetString();
                if (addr.TryGetProperty("state", out var s)) state = s.GetString();
                if (addr.TryGetProperty("country", out var co)) country = co.GetString();
                if (addr.TryGetProperty("streetNumber", out var n)) sn = n.GetString();
                if (addr.TryGetProperty("street", out var str)) st = str.GetString();
            }

            string? centerStr = null; int zoom = 17; string mapType = "Roadmap";
            if (root.TryGetProperty("mapconfig", out var conf))
            {
                if (conf.TryGetProperty("mapcenter", out var m)) centerStr = m.GetString();
                if (conf.TryGetProperty("zoom", out var z))
                {
                    if (z.ValueKind == JsonValueKind.Number) zoom = z.GetInt32();
                    else if (int.TryParse(z.GetString(), out var zi)) zoom = zi;
                }
                if (conf.TryGetProperty("maptype", out var t)) mapType = t.GetString() ?? "Roadmap";
            }

            var coords = ParsePoint(latLngStr);
            var centerCoords = ParsePoint(centerStr) ?? coords;

            return JsonSerializer.Serialize(new
            {
                address = new { coordinates = coords, full_address = fullAddress, postalcode = pc, city, state, country, streetNumber = sn, street = st },
                mapconfig = new { zoom, maptype = mapType, centerCoordinates = centerCoords }
            });
        }
        catch { return null; }
    }

    private static object? ParsePoint(string? point)
    {
        if (string.IsNullOrWhiteSpace(point)) return null;
        var parts = point.Split(',');
        return parts.Length >= 2 && double.TryParse(parts[0], out var lat) && double.TryParse(parts[1], out var lng) ? new { lat, lng } : null;
    }

    /// <summary>
    /// Minimal DTO to bridge the DataType to PropertyData gap, bypassing internal Umbraco DTOs.
    /// </summary>
    [TableName("cmsPropertyType")]
    [PrimaryKey("id")]
    [ExplicitColumns]
    public class LocalPropertyTypeDto
    {
        [Column("id")] public int Id { get; set; }
        [Column("dataTypeId")] public int DataTypeId { get; set; }
    }

    /// <summary>
    /// Represents the target data to be migrated.
    /// </summary>
    [TableName("umbracoPropertyData")]
    [PrimaryKey("id")]
    [ExplicitColumns]
    public class GMapPropertyDataDto
    {
        [Column("id")] public int Id { get; set; }
        [Column("textValue")] public string? TextValue { get; set; }
        [Column("propertyTypeId")] public int PropertyTypeId { get; set; }
    }
}