using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Our.Umbraco.GMaps.PropertyEditors;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Migrations;
using Umbraco.Cms.Infrastructure.Persistence.Dtos;
using Umbraco.Extensions;

namespace Our.Umbraco.GMaps.Migrations.Upgrade;

internal sealed class MigrateSingleDataType(IMigrationContext context, IKeyValueService keyValueService, IJsonSerializer jsonSerializer, ILogger<MigrateSingleDataType> logger) : AsyncMigrationBase(context)
{
    public const string State = "{gmaps-migrate-single-datatype}";
    protected override Task MigrateAsync()
    {
        // Look up the pre-migration data for data editor splits
        var dataEditorSplitCollectionData = keyValueService.GetValue("migrateDataEditorSplitCollectionData");
        if (dataEditorSplitCollectionData.IsNullOrWhiteSpace())
        {
            return Task.CompletedTask;
        }
        DataTypeEditorAliasMigrationData[] migrationData = jsonSerializer.Deserialize<DataTypeEditorAliasMigrationData[]>(dataEditorSplitCollectionData) ?? [];

        // Look for the old Data Type id - e.g.:
        //   {"DataTypeId":2608,"EditorUiAlias":"Our.Umbraco.GMaps","EditorAlias":"Umbraco.Plain.Json"},
        List<int> mapsEditorIds = [.. migrationData.Where(d => d.EditorUiAlias == "Our.Umbraco.GMaps").Select(d => d.DataTypeId)];

        var sql = Sql()
            .Select<DataTypeDto>()
            .AndSelect<NodeDto>()
            .From<DataTypeDto>()
            .InnerJoin<NodeDto>()
            .On<DataTypeDto, NodeDto>(left => left.NodeId, right => right.NodeId)
            .Where<DataTypeDto>(x => mapsEditorIds.Contains(x.NodeId));

        var dataTypeDtos = Database.Fetch<DataTypeDto>(sql);

        foreach (var dataTypeDto in dataTypeDtos)
        {
            logger.LogInformation("Updating EditorUiAlias for {alias} with DataTypeId {id}", dataTypeDto.EditorAlias, dataTypeDto.NodeId);
            dataTypeDto.EditorAlias = GMapsSingleDataEditor.EditorAlias;
            dataTypeDto.EditorUiAlias = GMapsSingleDataEditor.UiEditorAlias;
            _ = Database.Update(dataTypeDto);
        }
        
        return Task.CompletedTask;
    }
    
    private class DataTypeEditorAliasMigrationData
    {
        [JsonPropertyName("DataTypeId")]
        public int DataTypeId { get; set; }

        [JsonPropertyName("EditorUiAlias")]
        public string? EditorUiAlias { get; init; }

        [JsonPropertyName("EditorAlias")]
        public string? EditorAlias { get; init; }
    }
}