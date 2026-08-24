using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NPoco;
using Our.Umbraco.GMaps.Configuration;
using Our.Umbraco.GMaps.Models;
using Our.Umbraco.GMaps.PropertyEditors;
using Umbraco.Cms.Infrastructure.Migrations;
using Umbraco.Cms.Infrastructure.Persistence.Dtos;
using Umbraco.Extensions;

namespace Our.Umbraco.GMaps.Migrations.Upgrade;

/// <summary>
/// Repairs stored map values that older versions of the package wrote in shapes the current
/// models cannot read: a "lat, lng" string instead of a point (1.x, issue 165), and a null zoom
/// that throws "The JSON value could not be converted to System.Int32" (2.x, issue 197).
/// </summary>
/// <remarks>
/// <see cref="MigrateLegacyData"/> already did this for the single-map editor on sites that
/// upgraded through it, but it never covered the multi-map editor or the null values, and sites
/// that installed later never ran it against their content. This pass covers both editors and
/// rewrites only the values that actually need it, so it is safe to run over content that is
/// already correct.
/// </remarks>
internal sealed class RepairStoredMapValues(
    IMigrationContext context,
    IOptions<GoogleMaps> googleMapsConfig,
    ILogger<RepairStoredMapValues> logger) : AsyncMigrationBase(context)
{
    public const string State = "{gmaps-repair-stored-values}";

    protected override async Task MigrateAsync()
    {
        // A local list, because that is the shape NPoco reliably turns into an IN clause.
        List<string> editorAliases =
        [
            GMapsSingleDataEditor.EditorAlias,
            GMapsMultiDataEditor.EditorAlias,
        ];

        var propertyTypeSql = Sql()
            .Select<MapPropertyData.PropertyTypeDto>(x => x.Id)
            .From<MapPropertyData.PropertyTypeDto>()
            .InnerJoin<DataTypeDto>()
            .On<MapPropertyData.PropertyTypeDto, DataTypeDto>((pt, dt) => pt.DataTypeId == dt.NodeId)
            .Where<DataTypeDto>(x => editorAliases.Contains(x.EditorAlias));

        var propertyTypeIds = await Database.FetchAsync<int>(propertyTypeSql) ?? [];
        if (propertyTypeIds.Count == 0)
        {
            return;
        }

        var sql = Sql()
            .Select<MapPropertyData.PropertyDataDto>()
            .From<MapPropertyData.PropertyDataDto>()
            .Where<MapPropertyData.PropertyDataDto>(x => propertyTypeIds.Contains(x.PropertyTypeId));

        var storedValues = await Database.FetchAsync<MapPropertyData.PropertyDataDto>(sql) ?? [];
        if (storedValues.Count == 0)
        {
            return;
        }

        var defaultZoom = googleMapsConfig.Value.ZoomLevel ?? MapConfigDefaults.Zoom;
        var updates = new List<UpdateBatch<MapPropertyData.PropertyDataDto>>();

        foreach (var stored in storedValues)
        {
            string? repaired;
            try
            {
                repaired = StoredMapValue.Repair(stored.TextValue, defaultZoom);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Could not repair the GMaps value in row {id}; leaving it alone.", stored.Id);
                continue;
            }

            if (repaired is null)
            {
                continue;
            }

            var update = UpdateBatch.For(stored, Database.StartSnapshot(stored));
            stored.TextValue = repaired;
            updates.Add(update);
        }

        if (updates.Count == 0)
        {
            return;
        }

        if (logger.IsEnabled(LogLevel.Information))
        {
            logger.LogInformation("Repairing {count} of {total} stored GMaps values.", updates.Count, storedValues.Count);
        }

        // A small batch keeps production transaction logs stable.
        Database.UpdateBatch(updates, new BatchOptions { BatchSize = 50 });
    }
}
