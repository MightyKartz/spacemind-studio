using System.Text.Json;
using System.Text.Json.Serialization;
using CommercialSpaceAI.RevitExporter.Core.Models;

namespace CommercialSpaceAI.RevitExporter.Core.Serialization;

public static class RevitImportJsonSerializer
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static string Serialize(RevitImportDocument document)
    {
        return JsonSerializer.Serialize(document, Options);
    }
}
