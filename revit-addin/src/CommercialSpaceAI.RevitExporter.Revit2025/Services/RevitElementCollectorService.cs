using Autodesk.Revit.DB;
using Autodesk.Revit.DB.Architecture;
using CommercialSpaceAI.RevitExporter.Core.Models;

namespace CommercialSpaceAI.RevitExporter.Revit2025.Services;

public sealed class RevitElementCollectorService
{
    private ViewCoordinateContext _coordinates = new();

    public RevitImportElements Collect(Document document, View view, ViewCoordinateContext coordinates, List<ExportWarning> warnings)
    {
        _coordinates = coordinates;
        return new RevitImportElements
        {
            Walls = CollectCategory(document, view, BuiltInCategory.OST_Walls, "wall", warnings),
            Columns = CollectMany(document, view, "col", warnings, BuiltInCategory.OST_Columns, BuiltInCategory.OST_StructuralColumns),
            Doors = CollectCategory(document, view, BuiltInCategory.OST_Doors, "door", warnings),
            Windows = CollectCategory(document, view, BuiltInCategory.OST_Windows, "window", warnings),
            Rooms = CollectSpatialElements(document, view, BuiltInCategory.OST_Rooms, "room", warnings),
            Areas = CollectSpatialElements(document, view, BuiltInCategory.OST_Areas, "area", warnings),
            Furniture = CollectCategory(document, view, BuiltInCategory.OST_Furniture, "furn", warnings),
            Fixtures = CollectMany(document, view, "fixture", warnings, BuiltInCategory.OST_Casework, BuiltInCategory.OST_PlumbingFixtures, BuiltInCategory.OST_LightingFixtures, BuiltInCategory.OST_GenericModel),
            TextNotes = CollectCategory(document, view, BuiltInCategory.OST_TextNotes, "text", warnings),
            FilledRegions = CollectCategory(document, view, BuiltInCategory.OST_FilledRegion, "fill", warnings),
            DetailLines = CollectCategory(document, view, BuiltInCategory.OST_Lines, "line", warnings),
            Dimensions = CollectCategory(document, view, BuiltInCategory.OST_Dimensions, "dim", warnings)
        };
    }

    private List<RevitElementDto> CollectMany(Document document, View view, string prefix, List<ExportWarning> warnings, params BuiltInCategory[] categories)
    {
        return categories.SelectMany(category => CollectCategory(document, view, category, prefix, warnings)).ToList();
    }

    private List<RevitElementDto> CollectCategory(Document document, View view, BuiltInCategory category, string prefix, List<ExportWarning> warnings)
    {
        try
        {
            return new FilteredElementCollector(document, view.Id)
                .OfCategory(category)
                .WhereElementIsNotElementType()
                .Select(element => ToDto(document, element, prefix))
                .ToList();
        }
        catch (Exception exception)
        {
            warnings.Add(new ExportWarning
            {
                Code = "category_export_failed",
                Message = $"{category} export failed: {exception.Message}"
            });
            return [];
        }
    }

    private List<RevitElementDto> CollectSpatialElements(Document document, View view, BuiltInCategory category, string prefix, List<ExportWarning> warnings)
    {
        return CollectCategory(document, view, category, prefix, warnings);
    }

    private RevitElementDto ToDto(Document document, Element element, string prefix)
    {
        return new RevitElementDto
        {
            Id = $"{prefix}_{element.Id.IntegerValue}",
            RevitElementId = element.Id.IntegerValue,
            UniqueId = element.UniqueId,
            Category = element.Category?.Name ?? "",
            FamilyName = FamilyName(element),
            TypeName = TypeName(document, element),
            Geometry = GeometryForElement(element),
            Parameters = ParametersForElement(element)
        };
    }

    private static string? FamilyName(Element element)
    {
        return element is FamilyInstance familyInstance
            ? familyInstance.Symbol?.Family?.Name
            : null;
    }

    private static string? TypeName(Document document, Element element)
    {
        ElementId typeId = element.GetTypeId();
        if (typeId == ElementId.InvalidElementId) return null;
        return document.GetElement(typeId)?.Name;
    }

    private GeometryDto GeometryForElement(Element element)
    {
        if (element is TextNote textNote)
        {
            return new GeometryDto { Kind = "point", Coordinates = Point(textNote.Coord) };
        }

        if (element is FilledRegion filledRegion)
        {
            IList<CurveLoop> loops = filledRegion.GetBoundaries();
            CurveLoop? firstLoop = loops.FirstOrDefault();
            if (firstLoop is not null)
            {
                return new GeometryDto { Kind = "polygon", Coordinates = CurveLoopToPolygon(firstLoop) };
            }
        }

        if (element is SpatialElement spatialElement)
        {
            IList<IList<BoundarySegment>>? boundaries = spatialElement.GetBoundarySegments(new SpatialElementBoundaryOptions());
            IList<BoundarySegment>? firstBoundary = boundaries?.FirstOrDefault();
            if (firstBoundary is not null)
            {
                return new GeometryDto
                {
                    Kind = "polygon",
                    Coordinates = firstBoundary.Select(segment => Point(segment.GetCurve().GetEndPoint(0))).ToArray()
                };
            }
        }

        if (element is CurveElement curveElement)
        {
            return CurveToGeometry(curveElement.GeometryCurve);
        }

        if (element.Location is LocationCurve locationCurve)
        {
            return CurveToGeometry(locationCurve.Curve);
        }

        if (element.Location is LocationPoint locationPoint)
        {
            return new GeometryDto { Kind = "point", Coordinates = Point(locationPoint.Point) };
        }

        BoundingBoxXYZ? box = element.get_BoundingBox(null);
        if (box is not null)
        {
            return new GeometryDto
            {
                Kind = "bbox",
                Coordinates = new[]
                {
                    Point(new XYZ(box.Min.X, box.Min.Y, box.Min.Z)),
                    Point(new XYZ(box.Max.X, box.Min.Y, box.Min.Z)),
                    Point(new XYZ(box.Max.X, box.Max.Y, box.Min.Z)),
                    Point(new XYZ(box.Min.X, box.Max.Y, box.Min.Z))
                }
            };
        }

        return new GeometryDto { Kind = "point", Coordinates = new double[] { 0, 0 } };
    }

    private GeometryDto CurveToGeometry(Curve curve)
    {
        IList<XYZ> tessellated = curve.Tessellate();
        if (tessellated.Count <= 2)
        {
            return new GeometryDto
            {
                Kind = "line",
                Coordinates = new[] { Point(curve.GetEndPoint(0)), Point(curve.GetEndPoint(1)) }
            };
        }

        return new GeometryDto
        {
            Kind = "polyline",
            Coordinates = tessellated.Select(Point).ToArray()
        };
    }

    private double[][] CurveLoopToPolygon(CurveLoop loop)
    {
        return loop.Select(curve => Point(curve.GetEndPoint(0))).ToArray();
    }

    private double[] Point(XYZ point)
    {
        return RevitViewCoordinateService.ToCanvasPoint(point, _coordinates);
    }

    private static Dictionary<string, object?> ParametersForElement(Element element)
    {
        Dictionary<string, object?> parameters = [];
        foreach (Parameter parameter in element.Parameters)
        {
            Definition? definition = parameter.Definition;
            if (definition is null || !parameter.HasValue) continue;
            parameters[definition.Name] = ParameterValue(parameter);
        }
        return parameters;
    }

    private static object? ParameterValue(Parameter parameter)
    {
        return parameter.StorageType switch
        {
            StorageType.Double => parameter.AsDouble(),
            StorageType.Integer => parameter.AsInteger(),
            StorageType.String => parameter.AsString(),
            StorageType.ElementId => parameter.AsElementId().IntegerValue,
            _ => parameter.AsValueString()
        };
    }
}
