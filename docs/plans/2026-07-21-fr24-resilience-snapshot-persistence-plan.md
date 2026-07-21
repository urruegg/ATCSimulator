# FR24 Resilience & Snapshot Persistence — Implementation Plan

> **For agentic workers: REQUIRED SUB-SKILL** — Execute each task with
> `superpowers:test-driven-development` (RED → GREEN → REFACTOR). Do not write
> implementation before a failing test where a test is specified.

- **Sprint issue:** [#10](https://github.com/urruegg/ATCSimulator/issues/10)
- **Design spec:** [`docs/specs/2026-07-21-fr24-resilience-snapshot-persistence-design.md`](../specs/2026-07-21-fr24-resilience-snapshot-persistence-design.md)
- **Branch:** `feat/fr24-resilience-snapshots`

## Goal

Make the ATC demo run at any time even when the FlightRadar24 (FR24) account
has no credit. Persist every successful FR24 fetch as a Parquet snapshot to
ADLS Gen2, auto-fall-back to the latest snapshot on credit exhaustion, expose a
tri-state feed status in the footer ribbon, and let the user pick from the last
10 snapshots while in fallback mode.

## Architecture

```text
Browser (atcsim-shell)
  ├─ BottomRibbon → FeedStatusIndicator (dot + label + tooltip)  ← /api/flight-feed/status (poll 60s)
  ├─ SnapshotSelector (fallback only)                            ← /api/flight-snapshots
  └─ AircraftMapPage → useFlightData → aircraftApi              ← /api/aircraft (envelope)
        │
FlightDataApi (net8.0)
  ├─ /api/aircraft        → AircraftQueryService
  │      ├─ live OK  → snapshot-on-success (ISnapshotStore.SaveLatestAndArchiveAsync) → { source:"live" }
  │      ├─ 402      → IFlightFeedStatusProvider.MarkNoCredit + ISnapshotStore.LoadLatestAsync → { source:"snapshot" }
  │      └─ 429      → 503 (unchanged)
  ├─ /api/aircraft?snapshot={id} → ISnapshotStore.LoadAsync(id)
  ├─ /api/flight-snapshots       → ISnapshotStore.ListRecentAsync(10)
  └─ /api/flight-feed/status     → IFlightFeedStatusProvider.GetStatusAsync (usage probe + cached credit)
        │
ADLS Gen2 (StorageV2, HNS) filesystem `flight-snapshots`
   region=ch/dt=YYYY-MM-DD/HH-mm-ss.parquet   (archive, keep all)
   region=ch/latest.parquet                    (overwrite)
```

## Tech stack

- Backend: net8.0 minimal API. New packages: `Parquet.Net`,
  `Azure.Storage.Files.DataLake`. Existing: `Azure.Identity` 1.13.0.
- Storage access: `DataLakeServiceClient` + `DefaultAzureCredential` (managed
  identity in Azure, developer identity locally). Role **Storage Blob Data
  Contributor** (`ba92f5b4-2d11-450d-9d4c-8f76a4a1e9c8`) on the account.
- Frontend: React + Fluent UI, i18next (4 locales en/de/fr/it).
- Tests: xUnit (backend), vitest (frontend).

## Conventions (read before every task)

- **Shell:** Windows PowerShell 5.x. NO `&&` / `||` — chain with `;`. No `pwsh`.
- **Frontend commands:** `cd src/web/atcsim-shell` FIRST (never `npm --prefix`).
  Single test: `npm run test -- <path>`. Full: `npm run test`, `npm run build`.
- **Backend commands:** `dotnet test <one .csproj>` (never whole solution
  unless a task says so). Build: `dotnet build <csproj>`.
- **Commit trailers (REQUIRED on every commit):**

  ```text
  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
  Copilot-Session: 768f2dc2-2961-43e4-a0b0-60805e501a7d
  ```

- **Staging:** `git add <specific files>` only — never `git add -A` (unrelated
  docs may be in the tree).
- **Pre-commit hook** runs markdownlint-cli2 on ~169 md files (~60s; allow
  120s). Common failures: MD056 (table column count), unescaped `|` inside
  tables/inline code (write `\|` or fence it).
- **Locale parity:** every new i18n key MUST be added to all 4 locale files or
  the i18n parity test fails.
- **Fluent test shims:** component tests rendering Fluent listboxes/comboboxes
  need `ResizeObserver` / `IntersectionObserver` / `matchMedia` shims in
  `beforeAll` — copy from `BottomRibbon.test.tsx`.
- **Envelope is a breaking change:** `/api/aircraft` moves from bare
  `Aircraft[]` to `{ source, snapshotAt, aircraft }`. Frontend client AND
  `scripts/verify-environment.ps1` must move in lockstep. Smoke test PASSES when
  `source == "snapshot"` (degraded but functional).

## Reference signatures (do not guess)

```csharp
// Contracts/AircraftResponse.cs (existing — DO NOT change shape)
public record AircraftResponse(
    string Callsign, string AircraftType, string? Registration,
    double Latitude, double Longitude, int AltitudeFt, int HeadingDeg, int GroundSpeedKt);

// Options/Fr24Options.cs (existing)
public sealed class Fr24Options { public string Token {get;set;}=""; public string ApiVersion {get;set;}="v1"; }

// Services/Fr24FlightFeedService.cs (existing) — ALREADY implements this interface:
public interface IFlightFeedService {
    Task<IReadOnlyList<AircraftResponse>> GetAircraftAsync(string bounds, CancellationToken ct);
}
// FlightFeedRateLimitedException lives in Services namespace (same file). Put the new
// FlightFeedCreditExhaustedException in the SAME namespace (AtcSim.FlightDataApi.Services),
// NOT a new Exceptions namespace.
// Program.cs registers: AddHttpClient<IFlightFeedService, Fr24FlightFeedService>(base=fr24 /api/),
// and AddSingleton<TokenCredential>(new DefaultAzureCredential()). REUSE that TokenCredential.
// /api/aircraft takes `string bounds` as a REQUIRED query-string param (not config).
```

```ts
// src/web/atcsim-shell/src/features/flight-data/types.ts (existing Aircraft)
interface Aircraft {
  callsign: string; aircraftType: string; registration: string | null;
  latitude: number; longitude: number; altitudeFt: number;
  headingDeg: number; groundSpeedKt: number;
}
```

## File structure (new files)

```text
src/apis/AtcSim.FlightDataApi/
  Options/StorageOptions.cs
  Contracts/AircraftFeedResponse.cs        # { source, snapshotAt, aircraft }
  Contracts/SnapshotInfo.cs                # { id, capturedAt }
  Contracts/FeedStatus.cs                  # { state, checkedAt }
  Contracts/SnapshotRow.cs                 # Parquet POCO
  Services/SnapshotSerializer.cs
  Services/SnapshotPaths.cs
  Services/ISnapshotStore.cs
  Services/AdlsSnapshotStore.cs
  Services/IFlightFeedStatusProvider.cs
  Services/FlightFeedStatusProvider.cs
  Services/IFr24UsageProbe.cs / Fr24UsageProbe.cs
  Services/AircraftQueryService.cs
  Exceptions/FlightFeedCreditExhaustedException.cs
tests/apis/AtcSim.FlightDataApi.Tests/
  SnapshotSerializerTests.cs
  SnapshotPathsTests.cs
  Fr24CreditExhaustionTests.cs
  FlightFeedStatusProviderTests.cs
  AircraftQueryServiceTests.cs
src/web/atcsim-shell/src/features/flight-data/
  flightFeedApi.ts
  useFlightFeedStatus.ts
  FeedStatusIndicator.tsx
  SnapshotSelector.tsx
infra/modules/storage.bicep
```

---

## Task 1 — Packages, StorageOptions, contracts

**Files:** `AtcSim.FlightDataApi.csproj`, `Options/StorageOptions.cs`,
`Contracts/AircraftFeedResponse.cs`, `Contracts/SnapshotInfo.cs`,
`Contracts/FeedStatus.cs`, `Contracts/SnapshotRow.cs`.

No TDD (config + DTOs). Add packages, define types, `dotnet build`.

`.csproj` — add inside the existing `<ItemGroup>` with PackageReferences:

```xml
<PackageReference Include="Parquet.Net" Version="5.0.2" />
<PackageReference Include="Azure.Storage.Files.DataLake" Version="12.20.0" />
```

`Options/StorageOptions.cs`:

```csharp
namespace AtcSim.FlightDataApi.Options;

public sealed class StorageOptions
{
    /// <summary>ADLS Gen2 DFS endpoint, e.g. https://acct.dfs.core.windows.net.</summary>
    public string AccountUrl { get; set; } = "";
    public string FileSystem { get; set; } = "flight-snapshots";
    public string Region { get; set; } = "ch";
}
```

`Contracts/AircraftFeedResponse.cs`:

```csharp
namespace AtcSim.FlightDataApi.Contracts;

/// <summary>source: "live" | "snapshot". snapshotAt null when source == "live".</summary>
public record AircraftFeedResponse(string Source, DateTimeOffset? SnapshotAt, IReadOnlyList<AircraftResponse> Aircraft);
```

`Contracts/SnapshotInfo.cs`:

```csharp
namespace AtcSim.FlightDataApi.Contracts;

public record SnapshotInfo(string Id, DateTimeOffset CapturedAt);
```

`Contracts/FeedStatus.cs`:

```csharp
namespace AtcSim.FlightDataApi.Contracts;

/// <summary>state: "connected" | "no_credit" | "offline".</summary>
public record FeedStatus(string State, DateTimeOffset CheckedAt);
```

`Contracts/SnapshotRow.cs` (Parquet POCO — public get/set required):

```csharp
namespace AtcSim.FlightDataApi.Contracts;

public sealed class SnapshotRow
{
    public DateTimeOffset SnapshotAt { get; set; }
    public string Callsign { get; set; } = "";
    public string AircraftType { get; set; } = "";
    public string? Registration { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int AltitudeFt { get; set; }
    public int HeadingDeg { get; set; }
    public int GroundSpeedKt { get; set; }
}
```

**Verify:** `dotnet build src\apis\AtcSim.FlightDataApi\AtcSim.FlightDataApi.csproj`
**Commit:** `feat(flight-api): add storage packages, options and feed contracts (#10)`

---

## Task 2 — SnapshotSerializer (Parquet round-trip) — TDD

**Files:** `Services/SnapshotSerializer.cs`, `tests/.../SnapshotSerializerTests.cs`.

**RED** — `SnapshotSerializerTests.cs`:

```csharp
using System.Text;                       // not needed; keep only used usings
using AtcSim.FlightDataApi.Contracts;
using AtcSim.FlightDataApi.Services;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class SnapshotSerializerTests
{
    [Fact]
    public async Task Round_trips_aircraft_through_parquet()
    {
        var capturedAt = new DateTimeOffset(2026, 7, 21, 10, 30, 0, TimeSpan.Zero);
        var aircraft = new List<AircraftResponse>
        {
            new("SWR123", "A320", "HB-IJJ", 47.45, 8.56, 15000, 270, 320),
            new("DLH456", "B738", null, 47.10, 8.20, 22000, 90, 410),
        };

        using var stream = new MemoryStream();
        await SnapshotSerializer.SerializeAsync(aircraft, capturedAt, stream);
        stream.Position = 0;
        var result = await SnapshotSerializer.DeserializeAsync(stream);

        Assert.Equal(capturedAt, result.CapturedAt);
        Assert.Equal(2, result.Aircraft.Count);
        Assert.Equal("SWR123", result.Aircraft[0].Callsign);
        Assert.Null(result.Aircraft[1].Registration);
        Assert.Equal(410, result.Aircraft[1].GroundSpeedKt);
    }
}
```

**GREEN** — `Services/SnapshotSerializer.cs`:

```csharp
using AtcSim.FlightDataApi.Contracts;
using Parquet.Serialization;

namespace AtcSim.FlightDataApi.Services;

public readonly record struct SnapshotContent(DateTimeOffset CapturedAt, IReadOnlyList<AircraftResponse> Aircraft);

public static class SnapshotSerializer
{
    public static async Task SerializeAsync(
        IReadOnlyList<AircraftResponse> aircraft, DateTimeOffset capturedAt, Stream destination)
    {
        var rows = aircraft.Select(a => new SnapshotRow
        {
            SnapshotAt = capturedAt,
            Callsign = a.Callsign,
            AircraftType = a.AircraftType,
            Registration = a.Registration,
            Latitude = a.Latitude,
            Longitude = a.Longitude,
            AltitudeFt = a.AltitudeFt,
            HeadingDeg = a.HeadingDeg,
            GroundSpeedKt = a.GroundSpeedKt,
        }).ToList();

        await ParquetSerializer.SerializeAsync(rows, destination);
    }

    public static async Task<SnapshotContent> DeserializeAsync(Stream source)
    {
        IList<SnapshotRow> rows = await ParquetSerializer.DeserializeAsync<SnapshotRow>(source);
        var capturedAt = rows.Count > 0 ? rows[0].SnapshotAt : DateTimeOffset.MinValue;
        var aircraft = rows
            .Select(r => new AircraftResponse(
                r.Callsign, r.AircraftType, r.Registration,
                r.Latitude, r.Longitude, r.AltitudeFt, r.HeadingDeg, r.GroundSpeedKt))
            .ToList();
        return new SnapshotContent(capturedAt, aircraft);
    }
}
```

> Note: if `Parquet.Net` cannot map `DateTimeOffset` directly, change
> `SnapshotRow.SnapshotAt` to `DateTime` (store `capturedAt.UtcDateTime`) and
> reconstruct as `new DateTimeOffset(row.SnapshotAt, TimeSpan.Zero)`; keep the
> public `SnapshotContent.CapturedAt` a `DateTimeOffset`. Verify against the
> test before committing.

**Verify:** `dotnet test tests\apis\AtcSim.FlightDataApi.Tests\AtcSim.FlightDataApi.Tests.csproj --filter FullyQualifiedName~SnapshotSerializerTests`
**Commit:** `feat(flight-api): parquet snapshot serializer (#10)`

---

## Task 3 — SnapshotPaths builder — TDD

**Files:** `Services/SnapshotPaths.cs`, `tests/.../SnapshotPathsTests.cs`.

Snapshot **id** = the archive relative path (URL-safe, no leading slash), e.g.
`dt=2026-07-21/10-30-00`. The `.parquet` suffix is appended by the store.

**RED** — `SnapshotPathsTests.cs`:

```csharp
using AtcSim.FlightDataApi.Services;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class SnapshotPathsTests
{
    [Fact]
    public void Builds_archive_path_from_utc_timestamp()
    {
        var at = new DateTimeOffset(2026, 7, 21, 10, 30, 5, TimeSpan.Zero);
        Assert.Equal("region=ch/dt=2026-07-21/10-30-05.parquet", SnapshotPaths.Archive("ch", at));
    }

    [Fact]
    public void Builds_latest_path()
    {
        Assert.Equal("region=ch/latest.parquet", SnapshotPaths.Latest("ch"));
    }

    [Fact]
    public void Id_round_trips_to_archive_path()
    {
        var at = new DateTimeOffset(2026, 7, 21, 10, 30, 5, TimeSpan.Zero);
        var id = SnapshotPaths.IdFromArchive("region=ch/dt=2026-07-21/10-30-05.parquet", "ch");
        Assert.Equal("dt=2026-07-21/10-30-05", id);
        Assert.Equal("region=ch/dt=2026-07-21/10-30-05.parquet", SnapshotPaths.ArchiveFromId("ch", id));
        _ = at;
    }
}
```

**GREEN** — `Services/SnapshotPaths.cs`:

```csharp
using System.Globalization;

namespace AtcSim.FlightDataApi.Services;

public static class SnapshotPaths
{
    public static string Latest(string region) => $"region={region}/latest.parquet";

    public static string Archive(string region, DateTimeOffset capturedAt)
    {
        var utc = capturedAt.ToUniversalTime();
        var day = utc.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var time = utc.ToString("HH-mm-ss", CultureInfo.InvariantCulture);
        return $"region={region}/dt={day}/{time}.parquet";
    }

    public static string IdFromArchive(string archivePath, string region)
    {
        var prefix = $"region={region}/";
        var trimmed = archivePath.StartsWith(prefix, StringComparison.Ordinal)
            ? archivePath[prefix.Length..] : archivePath;
        return trimmed.EndsWith(".parquet", StringComparison.Ordinal)
            ? trimmed[..^".parquet".Length] : trimmed;
    }

    public static string ArchiveFromId(string region, string id) => $"region={region}/{id}.parquet";
}
```

**Verify:** `dotnet test ...Tests.csproj --filter FullyQualifiedName~SnapshotPathsTests`
**Commit:** `feat(flight-api): snapshot path builder (#10)`

---

## Task 4 — ISnapshotStore + AdlsSnapshotStore

**Files:** `Services/ISnapshotStore.cs`, `Services/AdlsSnapshotStore.cs`.

Thin ADLS I/O (integration-only; no unit test — covered by the interface used
in later unit tests via fakes). Build-verify only.

`Services/ISnapshotStore.cs`:

```csharp
using AtcSim.FlightDataApi.Contracts;

namespace AtcSim.FlightDataApi.Services;

public interface ISnapshotStore
{
    Task SaveLatestAndArchiveAsync(IReadOnlyList<AircraftResponse> aircraft, DateTimeOffset capturedAt, CancellationToken ct);
    Task<SnapshotContent?> LoadLatestAsync(CancellationToken ct);
    Task<SnapshotContent?> LoadAsync(string id, CancellationToken ct);
    Task<IReadOnlyList<SnapshotInfo>> ListRecentAsync(int count, CancellationToken ct);
}
```

`Services/AdlsSnapshotStore.cs`:

```csharp
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
            var capturedAt = item.LastModified.HasValue
                ? item.LastModified.Value : DateTimeOffset.MinValue;
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
```

**Verify:** `dotnet build src\apis\AtcSim.FlightDataApi\AtcSim.FlightDataApi.csproj`
**Commit:** `feat(flight-api): ADLS Gen2 snapshot store (#10)`

---

## Task 5 — FR24 402 exception + service mapping — TDD

**Files:** `Services/FlightFeedCreditExhaustedException.cs` (Services namespace,
matching the existing `FlightFeedRateLimitedException`),
`Services/Fr24FlightFeedService.cs` (edit),
`tests/.../Fr24CreditExhaustionTests.cs`.

**RED** — `Fr24CreditExhaustionTests.cs` (mirror the existing StubMessageHandler,
but allow a configurable status code):

```csharp
using System.Net;
using System.Text;
using AtcSim.FlightDataApi.Options;
using AtcSim.FlightDataApi.Services;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class Fr24CreditExhaustionTests
{
    [Fact]
    public async Task Throws_credit_exhausted_on_402()
    {
        var handler = new StatusStubHandler((HttpStatusCode)402,
            """{ "message": "Forbidden", "details": "Credit limit reached." }""");
        var client = new HttpClient(handler) { BaseAddress = new Uri("https://fr24api.flightradar24.com/api/") };
        var service = new Fr24FlightFeedService(client, Microsoft.Extensions.Options.Options.Create(new Fr24Options { Token = "x" }));

        await Assert.ThrowsAsync<FlightFeedCreditExhaustedException>(
            () => service.GetAircraftAsync("47.7,47.2,8.3,8.8", CancellationToken.None));
    }

    private sealed class StatusStubHandler(HttpStatusCode code, string body) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(code)
            { Content = new StringContent(body, Encoding.UTF8, "application/json") });
    }
}
```

**GREEN** — `Services/FlightFeedCreditExhaustedException.cs`:

```csharp
namespace AtcSim.FlightDataApi.Services;

public sealed class FlightFeedCreditExhaustedException : Exception
{
    public FlightFeedCreditExhaustedException(string message) : base(message) { }
}
```

In `Fr24FlightFeedService.GetAircraftAsync`, before `EnsureSuccessStatusCode()`
(and near the existing 429 handling), add:

```csharp
if ((int)response.StatusCode == 402)
{
    throw new FlightFeedCreditExhaustedException("FR24 credit limit reached.");
}
```

> Keep the existing 429 → `FlightFeedRateLimitedException` branch unchanged.

**Verify:** `dotnet test ...Tests.csproj --filter FullyQualifiedName~Fr24CreditExhaustionTests`
**Commit:** `feat(flight-api): detect FR24 402 credit exhaustion (#10)`

---

## Task 6 — Feed status provider — TDD

**Files:** `Services/IFr24UsageProbe.cs`, `Services/Fr24UsageProbe.cs`,
`Services/IFlightFeedStatusProvider.cs`, `Services/FlightFeedStatusProvider.cs`,
`tests/.../FlightFeedStatusProviderTests.cs`.

State machine (singleton, thread-safe credit flag):

- usage probe throws/false → `offline`
- usage OK **and** credit flag == exhausted → `no_credit`
- else → `connected`

`MarkNoCredit()` set by the /api/aircraft 402 branch; `MarkCreditOk()` set on a
successful live fetch.

**RED** — `FlightFeedStatusProviderTests.cs`:

```csharp
using AtcSim.FlightDataApi.Services;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class FlightFeedStatusProviderTests
{
    private sealed class FakeProbe(bool reachable) : IFr24UsageProbe
    {
        public Task<bool> IsReachableAsync(CancellationToken ct) => Task.FromResult(reachable);
    }

    [Fact]
    public async Task Offline_when_usage_probe_unreachable()
    {
        var sut = new FlightFeedStatusProvider(new FakeProbe(false), TimeProvider.System);
        var status = await sut.GetStatusAsync(CancellationToken.None);
        Assert.Equal("offline", status.State);
    }

    [Fact]
    public async Task No_credit_when_reachable_but_credit_flag_exhausted()
    {
        var sut = new FlightFeedStatusProvider(new FakeProbe(true), TimeProvider.System);
        sut.MarkNoCredit();
        var status = await sut.GetStatusAsync(CancellationToken.None);
        Assert.Equal("no_credit", status.State);
    }

    [Fact]
    public async Task Connected_when_reachable_and_credit_ok()
    {
        var sut = new FlightFeedStatusProvider(new FakeProbe(true), TimeProvider.System);
        sut.MarkNoCredit();
        sut.MarkCreditOk();
        var status = await sut.GetStatusAsync(CancellationToken.None);
        Assert.Equal("connected", status.State);
    }
}
```

**GREEN:**
`Services/IFr24UsageProbe.cs`:

```csharp
namespace AtcSim.FlightDataApi.Services;

public interface IFr24UsageProbe
{
    Task<bool> IsReachableAsync(CancellationToken ct);
}
```

`Services/Fr24UsageProbe.cs` (uses the same named FR24 HttpClient; `/api/usage`
is a cheap probe that does not burn a data credit):

```csharp
namespace AtcSim.FlightDataApi.Services;

public sealed class Fr24UsageProbe(HttpClient client) : IFr24UsageProbe
{
    public async Task<bool> IsReachableAsync(CancellationToken ct)
    {
        try
        {
            using var response = await client.GetAsync("usage?period=24h", ct);
            return response.IsSuccessStatusCode || (int)response.StatusCode == 402;
        }
        catch (HttpRequestException) { return false; }
        catch (TaskCanceledException) { return false; }
    }
}
```

`Services/IFlightFeedStatusProvider.cs`:

```csharp
using AtcSim.FlightDataApi.Contracts;

namespace AtcSim.FlightDataApi.Services;

public interface IFlightFeedStatusProvider
{
    Task<FeedStatus> GetStatusAsync(CancellationToken ct);
    void MarkNoCredit();
    void MarkCreditOk();
}
```

`Services/FlightFeedStatusProvider.cs`:

```csharp
using AtcSim.FlightDataApi.Contracts;

namespace AtcSim.FlightDataApi.Services;

public sealed class FlightFeedStatusProvider(IFr24UsageProbe probe, TimeProvider clock)
    : IFlightFeedStatusProvider
{
    private volatile bool _creditExhausted;

    public void MarkNoCredit() => _creditExhausted = true;
    public void MarkCreditOk() => _creditExhausted = false;

    public async Task<FeedStatus> GetStatusAsync(CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var reachable = await probe.IsReachableAsync(ct);
        if (!reachable) return new FeedStatus("offline", now);
        return new FeedStatus(_creditExhausted ? "no_credit" : "connected", now);
    }
}
```

**Verify:** `dotnet test ...Tests.csproj --filter FullyQualifiedName~FlightFeedStatusProviderTests`
**Commit:** `feat(flight-api): tri-state feed status provider (#10)`

---

## Task 7 — AircraftQueryService (envelope + fallback) — TDD

**Files:** `Services/AircraftQueryService.cs`,
`tests/.../AircraftQueryServiceTests.cs`.

Encapsulates the /api/aircraft decision so it is unit-testable without a host.
`IFlightFeedService` is the existing abstraction implemented by
`Fr24FlightFeedService` (confirm the exact interface name/method during
implementation; adapt if it differs).

Behaviour:

- live OK → `SaveLatestAndArchiveAsync` (best-effort; swallow storage errors,
  do not fail the request), `MarkCreditOk`, return `("live", null, aircraft)`.
- `FlightFeedCreditExhaustedException` → `MarkNoCredit`, `LoadLatestAsync`;
  if snapshot present return `("snapshot", capturedAt, aircraft)`, else rethrow
  a domain "no data" signal (return `("snapshot", null, [])` so the endpoint
  emits 200 with empty list — smoke test tolerates this).
- `FlightFeedRateLimitedException` → rethrow (endpoint maps to 503, unchanged).

**RED** — `AircraftQueryServiceTests.cs`:

```csharp
using AtcSim.FlightDataApi.Contracts;
using AtcSim.FlightDataApi.Services;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class AircraftQueryServiceTests
{
    private static readonly IReadOnlyList<AircraftResponse> Sample =
        new List<AircraftResponse> { new("SWR1", "A320", "HB-AAA", 47.4, 8.5, 15000, 270, 320) };

    private sealed class FakeFeed(Func<Task<IReadOnlyList<AircraftResponse>>> impl) : IFlightFeedService
    {
        public Task<IReadOnlyList<AircraftResponse>> GetAircraftAsync(string bounds, CancellationToken ct) => impl();
    }

    private sealed class FakeStore : ISnapshotStore
    {
        public SnapshotContent? Latest;
        public bool Saved;
        public Task SaveLatestAndArchiveAsync(IReadOnlyList<AircraftResponse> a, DateTimeOffset at, CancellationToken ct) { Saved = true; return Task.CompletedTask; }
        public Task<SnapshotContent?> LoadLatestAsync(CancellationToken ct) => Task.FromResult(Latest);
        public Task<SnapshotContent?> LoadAsync(string id, CancellationToken ct) => Task.FromResult(Latest);
        public Task<IReadOnlyList<SnapshotInfo>> ListRecentAsync(int count, CancellationToken ct) => Task.FromResult((IReadOnlyList<SnapshotInfo>)new List<SnapshotInfo>());
    }

    private sealed class FakeStatus : IFlightFeedStatusProvider
    {
        public bool NoCredit, CreditOk;
        public Task<FeedStatus> GetStatusAsync(CancellationToken ct) => Task.FromResult(new FeedStatus("connected", DateTimeOffset.UtcNow));
        public void MarkNoCredit() => NoCredit = true;
        public void MarkCreditOk() => CreditOk = true;
    }

    [Fact]
    public async Task Live_success_saves_snapshot_and_returns_live()
    {
        var store = new FakeStore();
        var status = new FakeStatus();
        var sut = new AircraftQueryService(new FakeFeed(() => Task.FromResult(Sample)), store, status, TimeProvider.System);

        var result = await sut.GetAsync(null, "b", CancellationToken.None);

        Assert.Equal("live", result.Source);
        Assert.True(store.Saved);
        Assert.True(status.CreditOk);
    }

    [Fact]
    public async Task Credit_exhausted_falls_back_to_latest_snapshot()
    {
        var store = new FakeStore { Latest = new SnapshotContent(new DateTimeOffset(2026,7,21,9,0,0,TimeSpan.Zero), Sample) };
        var status = new FakeStatus();
        var sut = new AircraftQueryService(
            new FakeFeed(() => throw new FlightFeedCreditExhaustedException("no credit")),
            store, status, TimeProvider.System);

        var result = await sut.GetAsync(null, "b", CancellationToken.None);

        Assert.Equal("snapshot", result.Source);
        Assert.Equal(9, result.SnapshotAt!.Value.Hour);
        Assert.True(status.NoCredit);
    }

    [Fact]
    public async Task Explicit_snapshot_id_loads_that_snapshot()
    {
        var store = new FakeStore { Latest = new SnapshotContent(new DateTimeOffset(2026,7,21,8,0,0,TimeSpan.Zero), Sample) };
        var sut = new AircraftQueryService(new FakeFeed(() => Task.FromResult(Sample)), store, new FakeStatus(), TimeProvider.System);

        var result = await sut.GetAsync("dt=2026-07-21/08-00-00", "b", CancellationToken.None);

        Assert.Equal("snapshot", result.Source);
    }
}
```

**GREEN** — `Services/AircraftQueryService.cs`:

```csharp
using AtcSim.FlightDataApi.Contracts;

namespace AtcSim.FlightDataApi.Services;

public sealed class AircraftQueryService(
    IFlightFeedService feed, ISnapshotStore store, IFlightFeedStatusProvider status, TimeProvider clock)
{
    public async Task<AircraftFeedResponse> GetAsync(string? snapshotId, string bounds, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(snapshotId))
        {
            var pinned = await store.LoadAsync(snapshotId, ct);
            return pinned is { } p
                ? new AircraftFeedResponse("snapshot", p.CapturedAt, p.Aircraft)
                : new AircraftFeedResponse("snapshot", null, Array.Empty<AircraftResponse>());
        }

        try
        {
            var live = await feed.GetAircraftAsync(bounds, ct);
            status.MarkCreditOk();
            var capturedAt = clock.GetUtcNow();
            try { await store.SaveLatestAndArchiveAsync(live, capturedAt, ct); }
            catch { /* snapshotting is best-effort; never fail a good live response */ }
            return new AircraftFeedResponse("live", null, live);
        }
        catch (FlightFeedCreditExhaustedException)
        {
            status.MarkNoCredit();
            var latest = await store.LoadLatestAsync(ct);
            return latest is { } l
                ? new AircraftFeedResponse("snapshot", l.CapturedAt, l.Aircraft)
                : new AircraftFeedResponse("snapshot", null, Array.Empty<AircraftResponse>());
        }
    }
}
```

> During implementation, confirm the real feed abstraction. If the endpoint uses
> the concrete `Fr24FlightFeedService` directly, introduce
> `IFlightFeedService { Task<IReadOnlyList<AircraftResponse>> GetAircraftAsync(string bounds, CancellationToken ct) }`,
> implement it on `Fr24FlightFeedService`, and update DI. Match the existing
> method's exact return type (`IReadOnlyList<AircraftResponse>` vs
> `AircraftResponse[]`).

**Verify:** `dotnet test ...Tests.csproj --filter FullyQualifiedName~AircraftQueryServiceTests`
**Commit:** `feat(flight-api): aircraft query service with snapshot fallback (#10)`

---

## Task 8 — Endpoints + Program.cs DI wiring

**Files:** `Program.cs` (edit).

Add DI + endpoints. No new unit test (integration wiring); build + run the full
API test project to ensure nothing regressed.

DI additions:

```csharp
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection("Storage"));
builder.Services.AddSingleton(sp =>
{
    var url = sp.GetRequiredService<IOptions<StorageOptions>>().Value.AccountUrl;
    return new DataLakeServiceClient(new Uri(url), new DefaultAzureCredential());
});
builder.Services.AddSingleton<ISnapshotStore, AdlsSnapshotStore>();
builder.Services.AddSingleton<IFlightFeedStatusProvider, FlightFeedStatusProvider>();
builder.Services.AddSingleton(TimeProvider.System);
// Reuse the existing named FR24 HttpClient for the usage probe:
builder.Services.AddScoped<IFr24UsageProbe, Fr24UsageProbe>();   // adapt lifetime to existing HttpClient registration
builder.Services.AddScoped<AircraftQueryService>();
builder.Services.AddScoped<IFlightFeedService, Fr24FlightFeedService>(); // if not already registered
```

Endpoints:

```csharp
app.MapGet("/api/aircraft", async (
    string? snapshot, AircraftQueryService query, IConfiguration cfg, CancellationToken ct) =>
{
    var bounds = cfg["Fr24:Bounds"] ?? "47.9,45.7,5.9,10.6"; // existing default source
    try
    {
        var result = await query.GetAsync(snapshot, bounds, ct);
        return Results.Json(result);
    }
    catch (FlightFeedRateLimitedException)
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
});

app.MapGet("/api/flight-snapshots", async (ISnapshotStore store, CancellationToken ct) =>
    Results.Json(await store.ListRecentAsync(10, ct)));

app.MapGet("/api/flight-feed/status", async (IFlightFeedStatusProvider status, CancellationToken ct) =>
    Results.Json(await status.GetStatusAsync(ct)));
```

> Preserve the existing `/api/aircraft` bounds logic exactly — reuse whatever
> source the current endpoint uses (query string, config, or constant). The
> only change is the envelope + snapshot param + fallback.

**Verify:** `dotnet test tests\apis\AtcSim.FlightDataApi.Tests\AtcSim.FlightDataApi.Tests.csproj`
**Commit:** `feat(flight-api): wire snapshot store, status and endpoints (#10)`

---

## Task 9 — Frontend flightFeedApi client — TDD

**Files:** `src/web/atcsim-shell/src/features/flight-data/flightFeedApi.ts`,
`__tests__/flightFeedApi.test.ts`.

Fetches `/api/flight-feed/status` and `/api/flight-snapshots`. Mirror the
existing `aircraftApi.ts` fetch/error conventions.

Types:

```ts
export type FeedState = 'connected' | 'no_credit' | 'offline';
export interface FeedStatus { state: FeedState; checkedAt: string; }
export interface SnapshotInfo { id: string; capturedAt: string; }
```

`fetchFeedStatus(): Promise<FeedStatus>` and
`fetchSnapshots(): Promise<SnapshotInfo[]>`. Test with a mocked `fetch`
returning JSON; assert URL and parsed shape; assert a thrown error on non-OK.

**Verify:** `cd src/web/atcsim-shell` ; `npm run test -- src/features/flight-data/__tests__/flightFeedApi.test.ts`
**Commit:** `feat(web): flight feed status/snapshot api client (#10)`

---

## Task 10 — aircraftApi envelope + snapshotId — TDD

**Files:** `aircraftApi.ts` (edit), `types.ts` (edit),
`__tests__/aircraftApi.test.ts` (edit/add).

- `types.ts`: add `FeedSource = 'live' | 'snapshot'` and
  `AircraftFeed { source: FeedSource; snapshotAt: string | null; aircraft: Aircraft[] }`.
- `aircraftApi.ts`: parse the new envelope; return `AircraftFeed`. Add optional
  `snapshotId?: string` param → append `?snapshot=<id>`.
- Update existing tests that assumed a bare array. RED first: adjust a test to
  expect `.aircraft` / `.source`, watch it fail, then implement.

**Verify:** `npm run test -- src/features/flight-data/__tests__/aircraftApi.test.ts`
**Commit:** `feat(web): parse aircraft feed envelope with snapshot support (#10)`

---

## Task 11 — useFlightFeedStatus hook — TDD

**Files:** `useFlightFeedStatus.ts`, `__tests__/useFlightFeedStatus.test.tsx`.

Polls `fetchFeedStatus` every 60s (use a ref'd interval; clear on unmount).
Returns `{ status, isLoading }`. Initialize with `offline`/loading. Use
`vi.useFakeTimers` to assert a re-fetch after 60s. Guard against setState after
unmount (this repo is sensitive to render loops — keep the polled value in
state, deps stable; do NOT create new Date/objects in effect deps).

**Verify:** `npm run test -- src/features/flight-data/__tests__/useFlightFeedStatus.test.tsx`
**Commit:** `feat(web): useFlightFeedStatus polling hook (#10)`

---

## Task 12 — useFlightData snapshot mode + source — TDD

**Files:** `useFlightData.ts` (edit), `__tests__/useFlightData.test.tsx` (edit).

- Accept `selectedSnapshotId: string | null`; pass to `aircraftApi`.
- Expose `source: FeedSource` and `snapshotAt: string | null` from the envelope.
- When `selectedSnapshotId` is set, fetch that snapshot instead of live (no
  polling while pinned). Keep `lastUpdated` handling stable (avoid the known
  infinite-render pattern: derive `lastUpdated` from a stable value, not a new
  `Date()` in a dependency array).

**Verify:** `npm run test -- src/features/flight-data/__tests__/useFlightData.test.tsx`
**Commit:** `feat(web): flight data snapshot mode and source exposure (#10)`

---

## Task 13 — AppState selectedSnapshotId — TDD

**Files:** AppState context/store file (locate under
`src/web/atcsim-shell/src/app/` or `state/`), its test.

Add `selectedSnapshotId: string | null` (default null) + setter. Mirror the
existing `flightsUpdatedAt` state slice pattern. Add a test for
default + setter.

**Verify:** `npm run test -- <appstate test path>`
**Commit:** `feat(web): app state for selected snapshot (#10)`

---

## Task 14 — FeedStatusIndicator + i18n — TDD

**Files:** `FeedStatusIndicator.tsx`, `__tests__/FeedStatusIndicator.test.tsx`,
all 4 locale files under `src/i18n/locales/{en,de,fr,it}/*.json`.

Renders a colored dot (green connected / yellow no_credit / red offline),
localized label, and tooltip. New keys (add to ALL 4 locales):

```text
feed.status.connected, feed.status.noCredit, feed.status.offline, feed.status.label
feed.tooltip.connected, feed.tooltip.noCredit, feed.tooltip.offline
```

Test: renders correct label + `aria-label`/color per state (3 cases). Include
Fluent shims in `beforeAll` if a tooltip needs them.

Suggested copy:

| key | en | de | fr | it |
| --- | --- | --- | --- | --- |
| feed.status.connected | Live | Live | En direct | In diretta |
| feed.status.noCredit | Snapshot | Snapshot | Instantané | Istantanea |
| feed.status.offline | Offline | Offline | Hors ligne | Non in linea |

**Verify:** `npm run test -- src/features/flight-data/__tests__/FeedStatusIndicator.test.tsx` ; then `npm run test -- src/i18n` (parity)
**Commit:** `feat(web): feed status indicator with i18n (#10)`

---

## Task 15 — SnapshotSelector (fallback only) — TDD

**Files:** `SnapshotSelector.tsx`, `__tests__/SnapshotSelector.test.tsx`,
locale keys `feed.snapshot.{label,placeholder,none}` in all 4 locales.

Searchable Fluent dropdown listing last 10 snapshots (from `fetchSnapshots`),
rendered ONLY when `source === 'snapshot'`. Selecting sets
`selectedSnapshotId`. Include Fluent shims. Test: hidden when live; lists
options when in fallback; onSelect fires with id.

**Verify:** `npm run test -- src/features/flight-data/__tests__/SnapshotSelector.test.tsx` ; `npm run test -- src/i18n`
**Commit:** `feat(web): snapshot selector for fallback mode (#10)`

---

## Task 16 — BottomRibbon + AircraftMapPage wiring — TDD

**Files:** `BottomRibbon.tsx` (edit), `AircraftMapPage.tsx` (edit), their tests.

- BottomRibbon: render `FeedStatusIndicator` on the LEFT (keep last-updated on
  the right). Add `SnapshotSelector` (visible only in fallback).
- AircraftMapPage: pass `selectedSnapshotId` into `useFlightData`; surface
  `source`/`snapshotAt` to the ribbon. Do NOT reintroduce the fixed OOM
  pattern — keep the `setFlightsUpdatedAt` effect deps stable.

**Verify:** `npm run test -- src/app/__tests__/BottomRibbon.test.tsx` ; `npm run test -- src/features/flight-data/__tests__/AircraftMapPage.test.tsx` ; then full `npm run test` and `npm run build`
**Commit:** `feat(web): wire feed status and snapshot selector into shell (#10)`

---

## Task 17 — Infrastructure: storage + role assignment

**Files:** `infra/modules/storage.bicep` (new), `infra/main.bicep` (edit).

`storage.bicep`: `Microsoft.Storage/storageAccounts` `StorageV2`,
`isHnsEnabled: true`, Sweden Central, TLS1_2, `allowBlobPublicAccess: false`;
a `blobServices/containers` child named `flight-snapshots`; output the DFS
endpoint. Add a role assignment of **Storage Blob Data Contributor**
(`ba92f5b4-2d11-450d-9d4c-8f76a4a1e9c8`) to the flight API's managed identity
principalId.

`main.bicep`: instantiate the module; set the flight app setting
`Storage__AccountUrl` to the deterministic DFS URL
(`https://<name>.dfs.core.windows.net`) — derive statically from the computed
account name to avoid a circular dependency (mirror the Sprint 2 Speech
endpoint pattern). Also set `Storage__FileSystem=flight-snapshots`,
`Storage__Region=ch`.

**Verify:** `az bicep build --file infra\main.bicep` (delete the generated
`main.json` afterward if it is not tracked). Confirm no `main.json` is staged.
**Commit:** `feat(infra): ADLS Gen2 snapshot storage and role assignment (#10)`

---

## Task 18 — API docs (openapi + DATA)

**Files:** `openapi.yaml` (or the repo's API spec), `docs/DATA.md` (or nearest
data doc — locate; create if a data doc convention exists).

- Document the `/api/aircraft` envelope, `?snapshot={id}`,
  `/api/flight-snapshots`, `/api/flight-feed/status`.
- Document the snapshot storage layout and Parquet schema.

**Verify:** markdownlint via the pre-commit hook (allow 120s).
**Commit:** `docs: document feed envelope, snapshot endpoints and storage (#10)`

---

## Task 19 — ADR, runbook, smoke-test tolerance

**Files:** `docs/adr/0008-fr24-resilience-snapshots.md` (match existing ADR
numbering/format), a runbook (e.g. `docs/runbooks/fr24-credit.md`),
`scripts/verify-environment.ps1` (edit).

- ADR-0008: decision record for snapshot-based FR24 resilience (context =
  402 credit exhaustion; decision = D1–D7).
- Runbook: what green/yellow/red mean, how to top up FR24, how snapshots keep
  the demo alive, how to inspect ADLS.
- `verify-environment.ps1`: update the aircraft check (~lines 35–38) to parse
  the envelope — read `.aircraft` and PASS when
  `source == 'live'` OR `source == 'snapshot'` (degraded but functional).
  It should only FAIL on HTTP error or a malformed envelope.

**Verify:** run the updated smoke-test parsing locally against a sample JSON;
markdownlint via pre-commit.
**Commit:** `docs+ops: ADR-0008, FR24 runbook and snapshot-tolerant smoke test (#10)`

---

## Done criteria

- All 19 tasks committed on `feat/fr24-resilience-snapshots`.
- Backend: `dotnet test tests\apis\AtcSim.FlightDataApi.Tests\AtcSim.FlightDataApi.Tests.csproj` green.
- Frontend: `npm run test` (full) + `npm run build` green; i18n parity passes.
- `az bicep build --file infra\main.bicep` clean; no `main.json` committed.
- Smoke test PASSES when the API serves a snapshot (no FR24 credit).
- Final code review, then `superpowers:finishing-a-development-branch` → push +
  open PR referencing #10. **Do NOT merge** — a human reviews and approves.
