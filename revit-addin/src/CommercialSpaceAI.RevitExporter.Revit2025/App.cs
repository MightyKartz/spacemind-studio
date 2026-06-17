using Autodesk.Revit.UI;

namespace CommercialSpaceAI.RevitExporter.Revit2025;

public sealed class App : IExternalApplication
{
    public Result OnStartup(UIControlledApplication application)
    {
        const string tabName = "商业空间 AI";
        try
        {
            application.CreateRibbonTab(tabName);
        }
        catch
        {
            // Revit throws if the tab already exists.
        }

        RibbonPanel panel = application.CreateRibbonPanel(tabName, "图纸导出");
        string assemblyPath = typeof(App).Assembly.Location;
        var exportButton = new PushButtonData(
            "CommercialSpaceAI.ExportCurrentView",
            "导出空间 JSON",
            assemblyPath,
            typeof(ExportSpaceJsonCommand).FullName);

        panel.AddItem(exportButton);
        return Result.Succeeded;
    }

    public Result OnShutdown(UIControlledApplication application)
    {
        return Result.Succeeded;
    }
}
