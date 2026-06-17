using Autodesk.Revit.DB;

namespace CommercialSpaceAI.RevitExporter.Revit2025.Services;

public sealed record ViewCoordinateContext
{
    public XYZ OriginFeet { get; init; } = XYZ.Zero;
    public double Rotation { get; init; }
    public double Scale { get; init; } = 1;
    public double[][]? CropBoxPolygon { get; init; }
}

public static class RevitViewCoordinateService
{
    private const double FeetToMillimeters = 304.8;

    public static ViewCoordinateContext FromView(View view)
    {
        BoundingBoxXYZ? cropBox = view.CropBox;
        XYZ origin = cropBox?.Min ?? XYZ.Zero;
        double[][]? cropPolygon = cropBox is null
            ? null
            : new[]
            {
                ToCanvasPoint(new XYZ(cropBox.Min.X, cropBox.Min.Y, cropBox.Min.Z), origin),
                ToCanvasPoint(new XYZ(cropBox.Max.X, cropBox.Min.Y, cropBox.Min.Z), origin),
                ToCanvasPoint(new XYZ(cropBox.Max.X, cropBox.Max.Y, cropBox.Min.Z), origin),
                ToCanvasPoint(new XYZ(cropBox.Min.X, cropBox.Max.Y, cropBox.Min.Z), origin)
            };

        return new ViewCoordinateContext
        {
            OriginFeet = origin,
            Rotation = 0,
            Scale = 1,
            CropBoxPolygon = cropPolygon
        };
    }

    public static double[] ToCanvasPoint(XYZ point, ViewCoordinateContext context)
    {
        return ToCanvasPoint(point, context.OriginFeet);
    }

    private static double[] ToCanvasPoint(XYZ point, XYZ origin)
    {
        return
        [
            Math.Round((point.X - origin.X) * FeetToMillimeters, 3),
            Math.Round((point.Y - origin.Y) * FeetToMillimeters, 3)
        ];
    }
}
