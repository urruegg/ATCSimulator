using AtcSim.FlightDataApi.Contracts;
using AtcSim.FlightDataApi.Options;
using Azure.Storage.Files.DataLake;
using Azure.Storage.Files.DataLake.Models;
using Microsoft.Extensions.Options;

namespace AtcSim.FlightDataApi.Services;

public sealed class AdlsSnapshotStore : ISnapshotStore
{
    private readonly DataLakeFileSystemClient _fs;
    private readonly string _region;

    public AdlsSnapshotStore(DataLakeServiceClient service, IOptions<StorageOptions> options)
    {
        var o = options.Value;
        _region = o.Region;
        _fs = service.GetFileSystemClient(o.FileSystem);
    }

    public async Task SaveLatestAndArchiveAsync(
        IReadOnlyList<AircraftResponse> aircraft, DateTimeOffset capturedAt, CancellationToken ct)
    {
        using var buffer = new MemoryStream();
        await SnapshotSerializer.SerializeAsync(aircraft, capturedAt, buffer);

        await UploadAsync(SnapshotPaths.Archive(_region, capturedAt), buffer, ct);
        await UploadAsync(SnapshotPaths.Latest(_region), buffer, ct);
    }

    public Task<SnapshotContent?> LoadLatestAsync(CancellationToken ct) =>
        ReadAsync(SnapshotPaths.Latest(_region), ct);

    public Task<SnapshotContent?> LoadAsync(string id, CancellationToken ct) =>
        ReadAsync(SnapshotPaths.ArchiveFromId(_region, id), ct);

    public async Task<IReadOnlyList<SnapshotInfo>> ListRecentAsync(int count, CancellationToken ct)
    {
        var infos = new List<SnapshotInfo>();
        await foreach (PathItem item in _fs.GetPathsAsync(path: $"region={_region}", recursive: true, cancellationToken: ct))
        {
            if (item.IsDirectory == true) continue;
            var name = item.Name;
            if (!name.EndsWith(".parquet", StringComparison.Ordinal)) continue;
            if (name.EndsWith("latest.parquet", StringComparison.Ordinal)) continue;

            var id = SnapshotPaths.IdFromArchive(name, _region);
            var capturedAt = item.LastModified;
            infos.Add(new SnapshotInfo(id, capturedAt));
        }

        return infos.OrderByDescending(i => i.Id, StringComparer.Ordinal).Take(count).ToList();
    }

    private async Task UploadAsync(string path, MemoryStream buffer, CancellationToken ct)
    {
        buffer.Position = 0;
        var file = _fs.GetFileClient(path);
        await file.UploadAsync(buffer, overwrite: true, cancellationToken: ct);
    }

    private async Task<SnapshotContent?> ReadAsync(string path, CancellationToken ct)
    {
        var file = _fs.GetFileClient(path);
        if (!await file.ExistsAsync(ct)) return null;

        var download = await file.ReadAsync(ct);
        using var ms = new MemoryStream();
        await download.Value.Content.CopyToAsync(ms, ct);
        ms.Position = 0;
        return await SnapshotSerializer.DeserializeAsync(ms);
    }
}
