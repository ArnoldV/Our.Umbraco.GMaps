using Our.Umbraco.GMaps.Migrations.Install;
using Our.Umbraco.GMaps.Migrations.Upgrade;
using Umbraco.Cms.Core.Packaging;

namespace Our.Umbraco.GMaps.Migrations;

internal sealed class MigrationPlan() : PackageMigrationPlan("GMaps")
{
    public override string InitialState => "{gmaps-init-state}";

    protected override void DefinePlan()
    {
        From(InitialState)
            .To<RegisterUmbracoPackageEntry>(RegisterUmbracoPackageEntry.State)
            .To<MigrateSingleDataType>(MigrateSingleDataType.State)
            ;
    }
}