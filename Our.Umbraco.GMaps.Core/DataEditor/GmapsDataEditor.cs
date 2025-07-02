using Umbraco.Cms.Core.PropertyEditors;

namespace Our.Umbraco.GMaps.Core.DataEditor;

[DataEditor(Constants.MapPropertyAlias, ValueType = ValueTypes.Json, ValueEditorIsReusable = true)]
public class GmapsDataEditor : global::Umbraco.Cms.Core.PropertyEditors.DataEditor
{
    public GmapsDataEditor(IDataValueEditorFactory dataValueEditorFactory)
        : base(dataValueEditorFactory)
    {
    }
}