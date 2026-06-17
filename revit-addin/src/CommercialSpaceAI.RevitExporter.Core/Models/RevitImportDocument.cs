using System.Text.Json.Serialization;

namespace CommercialSpaceAI.RevitExporter.Core.Models;

public sealed record RevitImportDocument
{
    public string SchemaVersion { get; init; } = "0.1.0";
    public string ImportId { get; init; } = "";
    public RevitImportSource Source { get; init; } = new();
    public string Unit { get; init; } = "mm";
    public RevitImportView View { get; init; } = new();
    public RevitImportSite? Site { get; init; }
    public RevitImportElements Elements { get; init; } = new();
    public List<SemanticHint> SemanticHints { get; init; } = [];
    public List<ExportWarning> Warnings { get; init; } = [];
}

public sealed record RevitImportSource
{
    public string Application { get; init; } = "Autodesk Revit";
    public string RevitVersion { get; init; } = "";
    public string DocumentTitle { get; init; } = "";
    public string ExportedAt { get; init; } = "";
    public string ExporterVersion { get; init; } = "0.1.0";
    public string ExportScope { get; init; } = "current_view";
    public string PrivacyMode { get; init; } = "standard";
}

public sealed record RevitImportView
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public double Scale { get; init; } = 1;
    public double[] Origin { get; init; } = [0, 0];
    public double[][]? CropBox { get; init; }
    public string? Level { get; init; }
    public string? UniqueId { get; init; }
    public ViewTransform Transform { get; init; } = new();
}

public sealed record ViewTransform
{
    public double Rotation { get; init; }
    public double Scale { get; init; } = 1;
}

public sealed record RevitImportSite
{
    public double[][]? CandidateBoundary { get; init; }
    public double? GrossArea { get; init; }
    public List<string> CandidateEntrances { get; init; } = [];
}

public sealed record RevitImportElements
{
    public List<RevitElementDto> Walls { get; init; } = [];
    public List<RevitElementDto> Columns { get; init; } = [];
    public List<RevitElementDto> Doors { get; init; } = [];
    public List<RevitElementDto> Windows { get; init; } = [];
    public List<RevitElementDto> Rooms { get; init; } = [];
    public List<RevitElementDto> Areas { get; init; } = [];
    public List<RevitElementDto> Furniture { get; init; } = [];
    public List<RevitElementDto> Fixtures { get; init; } = [];
    public List<RevitElementDto> TextNotes { get; init; } = [];
    public List<RevitElementDto> FilledRegions { get; init; } = [];
    public List<RevitElementDto> DetailLines { get; init; } = [];
    public List<RevitElementDto> Dimensions { get; init; } = [];
}

public sealed record RevitElementDto
{
    public string Id { get; init; } = "";
    public int RevitElementId { get; init; }
    public string UniqueId { get; init; } = "";
    public string Category { get; init; } = "";
    public string? FamilyName { get; init; }
    public string? TypeName { get; init; }
    public GeometryDto Geometry { get; init; } = new();
    public Dictionary<string, object?> Parameters { get; init; } = [];
}

public sealed record GeometryDto
{
    public string Kind { get; init; } = "point";
    public object Coordinates { get; init; } = new double[] { 0, 0 };
}

public sealed record SemanticHint
{
    public string Type { get; init; } = "";
    public string TargetId { get; init; } = "";
    public double Confidence { get; init; }
    public string? Reason { get; init; }
    public string Status { get; init; } = "candidate";
}

public sealed record ExportWarning
{
    public string Code { get; init; } = "";
    public string Message { get; init; } = "";
    public int? RevitElementId { get; init; }
}
