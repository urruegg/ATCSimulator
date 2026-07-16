namespace AtcSim.FlightDataApi.Services;

public static class Airports
{
    // bounds are "N,S,W,E"
    private static readonly Dictionary<string, string> Boxes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["ZRH"] = "47.7,47.2,8.3,8.8",
    };

    public static string BoundingBox(string code)
        => Boxes.TryGetValue(code, out var b)
            ? b
            : throw new ArgumentOutOfRangeException(nameof(code), $"Unknown airport '{code}'.");
}
