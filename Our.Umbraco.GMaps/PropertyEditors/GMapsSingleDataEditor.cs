using Umbraco.Cms.Core.PropertyEditors;

namespace Our.Umbraco.GMaps.PropertyEditors;

[DataEditor(
    EditorAlias,
    ValueType = ValueTypes.Json,
    ValueEditorIsReusable = true)]
public class GMapsSingleDataEditor(IDataValueEditorFactory dataValueEditorFactory) : DataEditor(dataValueEditorFactory)
{
    internal const string EditorAlias = "Our.Umbraco.GMaps.Single";
    internal const string UiEditorAlias = "GMaps.PropertyEditorUi.SingleMap";
}