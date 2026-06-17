using Autodesk.Revit.Attributes;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;
using CommercialSpaceAI.RevitExporter.Core.Serialization;
using CommercialSpaceAI.RevitExporter.Revit2025.Services;
using Microsoft.Win32;
using System.IO;

namespace CommercialSpaceAI.RevitExporter.Revit2025;

[Transaction(TransactionMode.Manual)]
public sealed class ExportSpaceJsonCommand : IExternalCommand
{
    public Result Execute(ExternalCommandData commandData, ref string message, ElementSet elements)
    {
        UIDocument uiDocument = commandData.Application.ActiveUIDocument;
        Document document = uiDocument.Document;
        View view = document.ActiveView;

        var dialog = new SaveFileDialog
        {
            Title = "导出商业空间 AI JSON",
            Filter = "JSON 文件 (*.json)|*.json",
            FileName = $"{SanitizeFileName(document.Title)}-commercial-space-ai.json"
        };

        if (dialog.ShowDialog() != true) return Result.Cancelled;

        var service = new RevitExportService();
        var importDocument = service.ExportCurrentView(document, view);
        File.WriteAllText(dialog.FileName, RevitImportJsonSerializer.Serialize(importDocument));
        TaskDialog.Show("商业空间 AI", $"导出完成:\n{dialog.FileName}");
        return Result.Succeeded;
    }

    private static string SanitizeFileName(string value)
    {
        foreach (char invalid in Path.GetInvalidFileNameChars())
        {
            value = value.Replace(invalid, '_');
        }
        return string.IsNullOrWhiteSpace(value) ? "revit-export" : value;
    }
}
