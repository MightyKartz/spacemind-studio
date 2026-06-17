using Autodesk.Revit.DB;
using CommercialSpaceAI.RevitExporter.Core.Models;

namespace CommercialSpaceAI.RevitExporter.Revit2025.Services;

public sealed class RevitExportService
{
    private readonly RevitElementCollectorService _collector = new();

    public RevitImportDocument ExportCurrentView(Document document, View view)
    {
        string now = DateTimeOffset.Now.ToString("O");
        List<ExportWarning> warnings = [];
        ViewCoordinateContext coordinates = RevitViewCoordinateService.FromView(view);
        RevitImportElements elements = _collector.Collect(document, view, coordinates, warnings);
        return new RevitImportDocument
        {
            ImportId = $"imp_{Guid.NewGuid():N}",
            Source = new RevitImportSource
            {
                RevitVersion = document.Application.VersionNumber,
                DocumentTitle = document.Title,
                ExportedAt = now,
                ExportScope = "current_view",
                PrivacyMode = "standard"
            },
            View = new RevitImportView
            {
                Id = view.Id.IntegerValue,
                Name = view.Name,
                Scale = Math.Max(1, view.Scale),
                Origin = [0, 0],
                CropBox = coordinates.CropBoxPolygon,
                UniqueId = view.UniqueId,
                Transform = new ViewTransform { Rotation = coordinates.Rotation, Scale = coordinates.Scale }
            },
            Elements = elements,
            Warnings = warnings
        };
    }
}
