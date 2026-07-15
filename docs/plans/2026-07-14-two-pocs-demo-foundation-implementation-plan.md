# Two PoCs Demo Foundation Implementation Plan

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Two PoCs Demo Foundation — Implementation Plan |
| Type | Plan |
| Version | 0.1 (Draft) |
| Date | 2026-07-14 |
| Author | ATCSimulator team |
| Status | In progress — Tasks 1-8 merged (issue #1) |
| Classification | Public — anonymized demo |

**Related documents:** [design spec](../specs/2026-07-14-two-pocs-demo-foundation-design.md) · [SD.md](../SD.md) · [AI.md](../AI.md) · [DATA.md](../DATA.md) · [SECURITY.md](../SECURITY.md) · sprint issue #1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two PoCs in one shared Entra-protected React shell on Azure App Service: PoC 1 proves FR24 sandbox-backed aircraft selection on Azure Maps, and PoC 2 proves voice-in and voice-out conversational latency through a Foundry-controlled agent path with tool-first mock knowledge.

**Architecture:** Use one shared React + Fluent UI shell and two explicit backend APIs: `flight-data-api` and `voice-agent-api`. Keep the first deployment compact and App Service-first, but preserve clean service seams, reusable Bicep modules, Key Vault-based secret management, and Application Insights telemetry so the resulting assets can seed the later Demo App.

**Tech Stack:** React, TypeScript, Vite, Fluent UI v9, Azure Maps Web SDK, MSAL React, ASP.NET Core minimal APIs, xUnit, Bicep, Azure App Service, Azure Key Vault, Application Insights, Microsoft Foundry, Azure OpenAI realtime model family.

---

## File Structure

### Frontend shell

- Create: `src/web/atcsim-shell/package.json`
  - Frontend dependencies and scripts.
- Create: `src/web/atcsim-shell/tsconfig.json`
  - TypeScript compiler settings.
- Create: `src/web/atcsim-shell/vite.config.ts`
  - Dev/build configuration.
- Create: `src/web/atcsim-shell/index.html`
  - Vite entry point.
- Create: `src/web/atcsim-shell/src/main.tsx`
  - React bootstrap.
- Create: `src/web/atcsim-shell/src/App.tsx`
  - Shared shell layout and top-level route handling.
- Create: `src/web/atcsim-shell/src/auth/msalConfig.ts`
  - Entra client configuration.
- Create: `src/web/atcsim-shell/src/auth/ProtectedRoute.tsx`
  - Auth gate for app routes.
- Create: `src/web/atcsim-shell/src/app/router.tsx`
  - Route declarations for PoC 1 and PoC 2.
- Create: `src/web/atcsim-shell/src/features/flight-data/AircraftMapPage.tsx`
  - PoC 1 screen.
- Create: `src/web/atcsim-shell/src/features/flight-data/aircraftApi.ts`
  - Frontend client for `flight-data-api`.
- Create: `src/web/atcsim-shell/src/features/flight-data/types.ts`
  - Flight data DTOs.
- Create: `src/web/atcsim-shell/src/features/voice-agent/VoiceAgentPage.tsx`
  - PoC 2 screen.
- Create: `src/web/atcsim-shell/src/features/voice-agent/voiceSessionApi.ts`
  - Frontend client for `voice-agent-api`.
- Create: `src/web/atcsim-shell/src/features/voice-agent/useVoiceSession.ts`
  - Browser microphone/session orchestration hook.
- Create: `src/web/atcsim-shell/src/features/voice-agent/types.ts`
  - Voice session DTOs.

### Backend APIs

- Create: `src/apis/AtcSim.FlightDataApi/AtcSim.FlightDataApi.csproj`
  - ASP.NET Core project file for PoC 1 backend.
- Create: `src/apis/AtcSim.FlightDataApi/Program.cs`
  - Minimal API endpoints and DI registration.
- Create: `src/apis/AtcSim.FlightDataApi/Contracts/AircraftResponse.cs`
  - Response model exposed to the frontend.
- Create: `src/apis/AtcSim.FlightDataApi/Options/Fr24Options.cs`
  - Provider configuration.
- Create: `src/apis/AtcSim.FlightDataApi/Services/IFlightFeedService.cs`
  - Provider abstraction.
- Create: `src/apis/AtcSim.FlightDataApi/Services/Fr24FlightFeedService.cs`
  - FR24 sandbox integration.
- Create: `src/apis/AtcSim.FlightDataApi/Telemetry/FlightDataTelemetry.cs`
  - Flight-data telemetry helper.
- Create: `tests/apis/AtcSim.FlightDataApi.Tests/AtcSim.FlightDataApi.Tests.csproj`
  - Test project.
- Create: `tests/apis/AtcSim.FlightDataApi.Tests/FlightDataEndpointsTests.cs`
  - Endpoint tests.
- Create: `tests/apis/AtcSim.FlightDataApi.Tests/Fr24FlightFeedServiceTests.cs`
  - Provider normalization tests.

- Create: `src/apis/AtcSim.VoiceAgentApi/AtcSim.VoiceAgentApi.csproj`
  - ASP.NET Core project file for PoC 2 backend.
- Create: `src/apis/AtcSim.VoiceAgentApi/Program.cs`
  - Minimal API endpoints and DI registration.
- Create: `src/apis/AtcSim.VoiceAgentApi/Contracts/VoiceSessionRequest.cs`
  - Session start/turn contract.
- Create: `src/apis/AtcSim.VoiceAgentApi/Contracts/VoiceSessionResponse.cs`
  - Spoken-response contract.
- Create: `src/apis/AtcSim.VoiceAgentApi/Options/FoundryOptions.cs`
  - Model and endpoint configuration.
- Create: `src/apis/AtcSim.VoiceAgentApi/Services/IVoiceAgentService.cs`
  - Agent orchestration abstraction.
- Create: `src/apis/AtcSim.VoiceAgentApi/Services/MockKnowledgeTool.cs`
  - Tool-first mock knowledge implementation.
- Create: `src/apis/AtcSim.VoiceAgentApi/Services/FoundryVoiceAgentService.cs`
  - Foundry and model orchestration.
- Create: `src/apis/AtcSim.VoiceAgentApi/Telemetry/VoiceTurnTelemetry.cs`
  - Voice latency telemetry helper.
- Create: `tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj`
  - Test project.
- Create: `tests/apis/AtcSim.VoiceAgentApi.Tests/VoiceSessionEndpointsTests.cs`
  - Endpoint tests.
- Create: `tests/apis/AtcSim.VoiceAgentApi.Tests/MockKnowledgeToolTests.cs`
  - Mock knowledge tests.

### Infrastructure and auth bootstrap

- Create: `azure.yaml`
  - Azure Developer CLI service definitions and hooks.
- Create: `infra/main.bicep`
  - Top-level deployment composition.
- Create: `infra/modules/appservice-plan.bicep`
  - Shared hosting plan.
- Create: `infra/modules/webapp.bicep`
  - Frontend App Service.
- Create: `infra/modules/apiapp.bicep`
  - Backend App Service module.
- Create: `infra/modules/appinsights.bicep`
  - Application Insights.
- Create: `infra/modules/keyvault.bicep`
  - Key Vault.
- Create: `infra/modules/appconfig.bicep`
  - Shared app settings composition if used.
- Create: `infra/parameters/dev.bicepparam`
  - Dev environment parameters.
- Create: `scripts/bootstrap-entra.ps1`
  - App registration and scope bootstrap for the shared shell and APIs.
- Create: `scripts/set-dev-secrets.ps1`
  - Writes FR24 and Foundry settings into Key Vault.

### Documentation and validation

- Create: `docs/OPERATIONS.md` updates
  - Add PoC operational notes, latency telemetry expectations, and secret rotation notes.
- Create: `docs/TEST.md` updates
  - Add PoC validation commands and latency proof requirements.

## Task 1: Scaffold the Shared Solution Structure

**Files:**

- Create: `src/web/atcsim-shell/package.json`
- Create: `src/web/atcsim-shell/tsconfig.json`
- Create: `src/web/atcsim-shell/vite.config.ts`
- Create: `src/web/atcsim-shell/index.html`
- Create: `src/web/atcsim-shell/src/main.tsx`
- Create: `src/apis/AtcSim.FlightDataApi/AtcSim.FlightDataApi.csproj`
- Create: `src/apis/AtcSim.FlightDataApi/Program.cs`
- Create: `src/apis/AtcSim.VoiceAgentApi/AtcSim.VoiceAgentApi.csproj`
- Create: `src/apis/AtcSim.VoiceAgentApi/Program.cs`

- [ ] **Step 1: Create the frontend package file**

```json
{
  "name": "atcsim-shell",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@azure/msal-browser": "^3.20.0",
    "@azure/msal-react": "^2.0.22",
    "@fluentui/react-components": "^9.55.1",
    "azure-maps-control": "^3.5.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 2: Add the frontend bootstrap files**

```tsx
// src/web/atcsim-shell/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FluentProvider theme={webLightTheme}>
      <App />
    </FluentProvider>
  </React.StrictMode>,
);
```

```html
<!-- src/web/atcsim-shell/index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ATCSim PoCs</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
  </html>
```

- [ ] **Step 3: Create the backend project files**

```xml
<!-- src/apis/AtcSim.FlightDataApi/AtcSim.FlightDataApi.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Azure.Identity" Version="1.13.0" />
    <PackageReference Include="Azure.Monitor.OpenTelemetry.AspNetCore" Version="1.2.0" />
    <PackageReference Include="Microsoft.Identity.Web" Version="2.20.0" />
  </ItemGroup>
</Project>
```

```xml
<!-- src/apis/AtcSim.VoiceAgentApi/AtcSim.VoiceAgentApi.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Azure.Identity" Version="1.13.0" />
    <PackageReference Include="Azure.Monitor.OpenTelemetry.AspNetCore" Version="1.2.0" />
    <PackageReference Include="Microsoft.Identity.Web" Version="2.20.0" />
  </ItemGroup>
</Project>
```

- [ ] **Step 4: Add minimal health endpoints to both APIs**

```csharp
// src/apis/AtcSim.FlightDataApi/Program.cs
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "flight-data-api" }));
app.Run();
```

```csharp
// src/apis/AtcSim.VoiceAgentApi/Program.cs
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "voice-agent-api" }));
app.Run();
```

- [ ] **Step 5: Verify the skeleton builds**

Run: `dotnet build src/apis/AtcSim.FlightDataApi/AtcSim.FlightDataApi.csproj; dotnet build src/apis/AtcSim.VoiceAgentApi/AtcSim.VoiceAgentApi.csproj; npm install --prefix src/web/atcsim-shell; npm run build --prefix src/web/atcsim-shell`
Expected: backend builds succeed and Vite build finishes without TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/web/atcsim-shell src/apis/AtcSim.FlightDataApi src/apis/AtcSim.VoiceAgentApi
git commit -m "chore: scaffold shared shell and backend APIs"
```

## Task 2: Bootstrap Entra and Shared Auth Configuration

**Files:**

- Create: `scripts/bootstrap-entra.ps1`
- Create: `src/web/atcsim-shell/src/auth/msalConfig.ts`
- Create: `src/web/atcsim-shell/src/auth/ProtectedRoute.tsx`
- Create: `src/web/atcsim-shell/src/App.tsx`

- [ ] **Step 1: Write the auth bootstrap script**

```powershell
# scripts/bootstrap-entra.ps1
param(
  [Parameter(Mandatory = $true)] [string] $TenantId,
  [Parameter(Mandatory = $true)] [string] $SubscriptionId,
  [string] $Prefix = "atcsim"
)

$webName = "$Prefix-web-dev"
$apiName = "$Prefix-api-dev"

$webApp = az ad app create --display-name $webName --web-redirect-uris "http://localhost:5173" "https://$webName.azurewebsites.net" | ConvertFrom-Json
$apiApp = az ad app create --display-name $apiName --identifier-uris "api://$apiName" | ConvertFrom-Json

az ad app update --id $apiApp.appId --set api.oauth2PermissionScopes="[{\"adminConsentDescription\":\"Access flight and voice APIs\",\"adminConsentDisplayName\":\"Access ATCSim APIs\",\"id\":\"00000000-0000-0000-0000-000000000001\",\"isEnabled\":true,\"type\":\"User\",\"userConsentDescription\":\"Allow access to APIs\",\"userConsentDisplayName\":\"Access ATCSim APIs\",\"value\":\"access_as_user\"}]"

Write-Host "WEB_CLIENT_ID=$($webApp.appId)"
Write-Host "API_CLIENT_ID=$($apiApp.appId)"
```

- [ ] **Step 2: Add frontend MSAL configuration**

```ts
// src/web/atcsim-shell/src/auth/msalConfig.ts
import { Configuration, LogLevel } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_ENTRA_TENANT_ID}`,
    redirectUri: '/',
  },
  system: {
    loggerOptions: {
      loggerCallback: (_, message) => console.debug(message),
      piiLoggingEnabled: false,
      logLevel: LogLevel.Warning,
    },
  },
};

export const loginRequest = {
  scopes: [import.meta.env.VITE_API_SCOPE],
};
```

- [ ] **Step 3: Add protected shell wiring**

```tsx
// src/web/atcsim-shell/src/auth/ProtectedRoute.tsx
import { PropsWithChildren } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { Button } from '@fluentui/react-components';
import { loginRequest } from './msalConfig';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const authenticated = useIsAuthenticated();
  const { instance } = useMsal();

  if (!authenticated) {
    return <Button onClick={() => instance.loginRedirect(loginRequest)}>Sign in</Button>;
  }

  return <>{children}</>;
}
```

```tsx
// src/web/atcsim-shell/src/App.tsx
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { BrowserRouter } from 'react-router-dom';
import { msalConfig } from './auth/msalConfig';
import { ProtectedRoute } from './auth/ProtectedRoute';

const msal = new PublicClientApplication(msalConfig);

export function App() {
  return (
    <MsalProvider instance={msal}>
      <BrowserRouter>
        <ProtectedRoute>
          <div>ATCSim shared shell</div>
        </ProtectedRoute>
      </BrowserRouter>
    </MsalProvider>
  );
}
```

- [ ] **Step 4: Validate auth bootstrap and frontend build**

Run: `powershell -ExecutionPolicy Bypass -File scripts/bootstrap-entra.ps1 -TenantId "mngenvmcap164444.onmicrosoft.com" -SubscriptionId "75102af9-fc92-45d4-99a8-5510a24b5421"; npm run build --prefix src/web/atcsim-shell`
Expected: script prints client IDs and the frontend build still passes.

- [ ] **Step 5: Commit**

```bash
git add scripts/bootstrap-entra.ps1 src/web/atcsim-shell/src/auth src/web/atcsim-shell/src/App.tsx
git commit -m "feat: add entra-first auth foundation"
```

## Task 3: Implement Flight Data API with FR24 Sandbox Integration

**Files:**

- Create: `src/apis/AtcSim.FlightDataApi/Contracts/AircraftResponse.cs`
- Create: `src/apis/AtcSim.FlightDataApi/Options/Fr24Options.cs`
- Create: `src/apis/AtcSim.FlightDataApi/Services/IFlightFeedService.cs`
- Create: `src/apis/AtcSim.FlightDataApi/Services/Fr24FlightFeedService.cs`
- Create: `tests/apis/AtcSim.FlightDataApi.Tests/AtcSim.FlightDataApi.Tests.csproj`
- Create: `tests/apis/AtcSim.FlightDataApi.Tests/FlightDataEndpointsTests.cs`
- Create: `tests/apis/AtcSim.FlightDataApi.Tests/Fr24FlightFeedServiceTests.cs`
- Modify: `src/apis/AtcSim.FlightDataApi/Program.cs`

- [ ] **Step 1: Write the failing normalization test**

```csharp
// tests/apis/AtcSim.FlightDataApi.Tests/Fr24FlightFeedServiceTests.cs
public class Fr24FlightFeedServiceTests
{
    [Fact]
    public async Task Maps_fr24_payload_to_aircraft_response()
    {
        const string payload = """
        { "data": [ { "callsign": "SWR123", "lat": 47.45, "lon": 8.56, "alt": 15000, "track": 270, "gspeed": 320, "type": "A320", "registration": "HB-IJJ" } ] }
        """;

        var handler = new StubMessageHandler(payload);
        var client = new HttpClient(handler) { BaseAddress = new Uri("https://fr24api.flightradar24.com/") };
        var service = new Fr24FlightFeedService(client, Options.Create(new Fr24Options { Token = "sandbox" }));

        var results = await service.GetAircraftAsync("47.7,8.3,47.2,8.8", CancellationToken.None);

        Assert.Single(results);
        Assert.Equal("SWR123", results[0].Callsign);
        Assert.Equal("A320", results[0].AircraftType);
    }
}
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `dotnet test tests/apis/AtcSim.FlightDataApi.Tests/AtcSim.FlightDataApi.Tests.csproj --filter Maps_fr24_payload_to_aircraft_response`
Expected: FAIL because the service and contracts do not exist yet.

- [ ] **Step 3: Add the minimal flight-data implementation**

```csharp
// src/apis/AtcSim.FlightDataApi/Contracts/AircraftResponse.cs
public sealed record AircraftResponse(
    string Callsign,
    string AircraftType,
    string? Registration,
    double Latitude,
    double Longitude,
    int AltitudeFt,
    int HeadingDeg,
    int GroundSpeedKt);
```

```csharp
// src/apis/AtcSim.FlightDataApi/Services/IFlightFeedService.cs
public interface IFlightFeedService
{
    Task<IReadOnlyList<AircraftResponse>> GetAircraftAsync(string bounds, CancellationToken cancellationToken);
}
```

```csharp
// src/apis/AtcSim.FlightDataApi/Services/Fr24FlightFeedService.cs
public sealed class Fr24FlightFeedService(HttpClient httpClient, IOptions<Fr24Options> options) : IFlightFeedService
{
    public async Task<IReadOnlyList<AircraftResponse>> GetAircraftAsync(string bounds, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"/live/flight-positions/full?bounds={bounds}");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", options.Value.Token);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        using var content = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(content, cancellationToken: cancellationToken);

        return document.RootElement.GetProperty("data")
            .EnumerateArray()
            .Select(x => new AircraftResponse(
                x.GetProperty("callsign").GetString() ?? string.Empty,
                x.GetProperty("type").GetString() ?? string.Empty,
                x.TryGetProperty("registration", out var reg) ? reg.GetString() : null,
                x.GetProperty("lat").GetDouble(),
                x.GetProperty("lon").GetDouble(),
                x.GetProperty("alt").GetInt32(),
                x.GetProperty("track").GetInt32(),
                x.GetProperty("gspeed").GetInt32()))
            .ToArray();
    }
}
```

- [ ] **Step 4: Expose the API endpoint and rerun tests**

```csharp
// src/apis/AtcSim.FlightDataApi/Program.cs
builder.Services.Configure<Fr24Options>(builder.Configuration.GetSection("Fr24"));
builder.Services.AddHttpClient<IFlightFeedService, Fr24FlightFeedService>(client =>
{
    client.BaseAddress = new Uri("https://fr24api.flightradar24.com");
});

app.MapGet("/api/aircraft", async (string bounds, IFlightFeedService service, CancellationToken ct) =>
{
    var aircraft = await service.GetAircraftAsync(bounds, ct);
    return Results.Ok(aircraft);
});
```

Run: `dotnet test tests/apis/AtcSim.FlightDataApi.Tests/AtcSim.FlightDataApi.Tests.csproj`
Expected: PASS for service normalization tests.

- [ ] **Step 5: Commit**

```bash
git add src/apis/AtcSim.FlightDataApi tests/apis/AtcSim.FlightDataApi.Tests
git commit -m "feat: add flight data API for fr24 sandbox"
```

## Task 4: Build the Shared Shell and PoC 1 Azure Maps Experience

**Files:**

- Create: `src/web/atcsim-shell/src/app/router.tsx`
- Create: `src/web/atcsim-shell/src/features/flight-data/types.ts`
- Create: `src/web/atcsim-shell/src/features/flight-data/aircraftApi.ts`
- Create: `src/web/atcsim-shell/src/features/flight-data/AircraftMapPage.tsx`
- Modify: `src/web/atcsim-shell/src/App.tsx`

- [ ] **Step 1: Write the failing frontend API test**

```ts
// src/web/atcsim-shell/src/features/flight-data/aircraftApi.test.ts
import { describe, expect, it, vi } from 'vitest';
import { fetchAircraft } from './aircraftApi';

describe('fetchAircraft', () => {
  it('requests aircraft with bounds query', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ callsign: 'SWR123' }] }));

    const result = await fetchAircraft('47.7,8.3,47.2,8.8');

    expect(fetch).toHaveBeenCalledWith('/api/aircraft?bounds=47.7%2C8.3%2C47.2%2C8.8', expect.any(Object));
    expect(result[0].callsign).toBe('SWR123');
  });
});
```

- [ ] **Step 2: Run the frontend test and confirm it fails**

Run: `npm run test --prefix src/web/atcsim-shell -- aircraftApi`
Expected: FAIL because the API client does not exist yet.

- [ ] **Step 3: Add the API client and map page**

```ts
// src/web/atcsim-shell/src/features/flight-data/aircraftApi.ts
import type { Aircraft } from './types';

export async function fetchAircraft(bounds: string): Promise<Aircraft[]> {
  const response = await fetch(`/api/aircraft?bounds=${encodeURIComponent(bounds)}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch aircraft');
  }

  return response.json();
}
```

```tsx
// src/web/atcsim-shell/src/features/flight-data/AircraftMapPage.tsx
import { useEffect, useState } from 'react';
import { Card, Text } from '@fluentui/react-components';
import { fetchAircraft } from './aircraftApi';
import type { Aircraft } from './types';

export function AircraftMapPage() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [selected, setSelected] = useState<Aircraft | null>(null);

  useEffect(() => {
    void fetchAircraft('47.7,8.3,47.2,8.8').then(setAircraft);
  }, []);

  return (
    <div>
      <div id="azure-map-host" style={{ height: 480 }} />
      {aircraft.map(item => (
        <Card key={item.callsign} onClick={() => setSelected(item)}>
          <Text>{item.callsign}</Text>
        </Card>
      ))}
      {selected && <Text>{selected.callsign} {selected.aircraftType}</Text>}
    </div>
  );
}
```

- [ ] **Step 4: Wire routes and rerun tests**

```tsx
// src/web/atcsim-shell/src/app/router.tsx
import { createBrowserRouter } from 'react-router-dom';
import { AircraftMapPage } from '../features/flight-data/AircraftMapPage';
import { VoiceAgentPage } from '../features/voice-agent/VoiceAgentPage';

export const router = createBrowserRouter([
  { path: '/', element: <AircraftMapPage /> },
  { path: '/voice', element: <VoiceAgentPage /> },
]);
```

Run: `npm run test --prefix src/web/atcsim-shell -- aircraftApi; npm run build --prefix src/web/atcsim-shell`
Expected: API client test passes and the frontend build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/web/atcsim-shell/src/app src/web/atcsim-shell/src/features/flight-data
git commit -m "feat: add aircraft selection ux with azure maps shell"
```

## Task 5: Implement the Voice Agent API with Tool-First Mock Knowledge

**Files:**

- Create: `src/apis/AtcSim.VoiceAgentApi/Contracts/VoiceSessionRequest.cs`
- Create: `src/apis/AtcSim.VoiceAgentApi/Contracts/VoiceSessionResponse.cs`
- Create: `src/apis/AtcSim.VoiceAgentApi/Options/FoundryOptions.cs`
- Create: `src/apis/AtcSim.VoiceAgentApi/Services/IVoiceAgentService.cs`
- Create: `src/apis/AtcSim.VoiceAgentApi/Services/MockKnowledgeTool.cs`
- Create: `src/apis/AtcSim.VoiceAgentApi/Services/FoundryVoiceAgentService.cs`
- Create: `tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj`
- Create: `tests/apis/AtcSim.VoiceAgentApi.Tests/MockKnowledgeToolTests.cs`
- Modify: `src/apis/AtcSim.VoiceAgentApi/Program.cs`

- [ ] **Step 1: Write the failing mock-knowledge test**

```csharp
// tests/apis/AtcSim.VoiceAgentApi.Tests/MockKnowledgeToolTests.cs
public class MockKnowledgeToolTests
{
    [Fact]
    public async Task Returns_curated_answer_for_known_prompt()
    {
        var tool = new MockKnowledgeTool();
        var answer = await tool.ResolveAsync("What does the aircraft selection PoC prove?", CancellationToken.None);

        Assert.Contains("FR24 sandbox", answer);
    }
}
```

- [ ] **Step 2: Run the voice test and confirm it fails**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj --filter Returns_curated_answer_for_known_prompt`
Expected: FAIL because the tool class does not exist yet.

- [ ] **Step 3: Add the minimal mock knowledge and response contract**

```csharp
// src/apis/AtcSim.VoiceAgentApi/Services/MockKnowledgeTool.cs
public sealed class MockKnowledgeTool
{
    public Task<string> ResolveAsync(string prompt, CancellationToken cancellationToken)
    {
        var answer = prompt.Contains("aircraft selection", StringComparison.OrdinalIgnoreCase)
            ? "The aircraft selection PoC proves FR24 sandbox reading, Azure Maps rendering, and signed-in aircraft selection UX."
            : "This PoC focuses on low-latency voice interaction backed by tool-first mock knowledge.";

        return Task.FromResult(answer);
    }
}
```

```csharp
// src/apis/AtcSim.VoiceAgentApi/Contracts/VoiceSessionResponse.cs
public sealed record VoiceSessionResponse(
    string Transcript,
    string AnswerText,
    string AudioContentBase64,
    long AgentLatencyMs,
    long TotalLatencyMs);
```

- [ ] **Step 4: Add a minimal voice session endpoint and rerun tests**

```csharp
// src/apis/AtcSim.VoiceAgentApi/Program.cs
builder.Services.AddSingleton<MockKnowledgeTool>();

app.MapPost("/api/voice/respond", async (VoiceSessionRequest request, MockKnowledgeTool tool, CancellationToken ct) =>
{
    var started = Stopwatch.GetTimestamp();
    var answer = await tool.ResolveAsync(request.Transcript, ct);
    var elapsed = (long)Stopwatch.GetElapsedTime(started).TotalMilliseconds;

    return Results.Ok(new VoiceSessionResponse(
        request.Transcript,
        answer,
        Convert.ToBase64String(Encoding.UTF8.GetBytes(answer)),
        elapsed,
        elapsed));
});
```

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj`
Expected: PASS for mock knowledge tests.

- [ ] **Step 5: Commit**

```bash
git add src/apis/AtcSim.VoiceAgentApi tests/apis/AtcSim.VoiceAgentApi.Tests
git commit -m "feat: add voice agent api with mock knowledge"
```

## Task 6: Build the Voice UI and End-to-End Latency Instrumentation

**Files:**

- Create: `src/web/atcsim-shell/src/features/voice-agent/types.ts`
- Create: `src/web/atcsim-shell/src/features/voice-agent/voiceSessionApi.ts`
- Create: `src/web/atcsim-shell/src/features/voice-agent/useVoiceSession.ts`
- Create: `src/web/atcsim-shell/src/features/voice-agent/VoiceAgentPage.tsx`

- [ ] **Step 1: Write the failing voice API client test**

```ts
// src/web/atcsim-shell/src/features/voice-agent/voiceSessionApi.test.ts
import { describe, expect, it, vi } from 'vitest';
import { sendVoiceTurn } from './voiceSessionApi';

describe('sendVoiceTurn', () => {
  it('posts transcript payload to voice endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ answerText: 'ok' }) }));

    await sendVoiceTurn({ transcript: 'Hello tower', audioBase64: 'abc' });

    expect(fetch).toHaveBeenCalledWith('/api/voice/respond', expect.any(Object));
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm run test --prefix src/web/atcsim-shell -- voiceSessionApi`
Expected: FAIL because the client and hook do not exist yet.

- [ ] **Step 3: Add the client and voice-session hook**

```ts
// src/web/atcsim-shell/src/features/voice-agent/voiceSessionApi.ts
import type { VoiceTurnRequest, VoiceTurnResponse } from './types';

export async function sendVoiceTurn(request: VoiceTurnRequest): Promise<VoiceTurnResponse> {
  const response = await fetch('/api/voice/respond', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Voice response failed');
  }

  return response.json();
}
```

```ts
// src/web/atcsim-shell/src/features/voice-agent/useVoiceSession.ts
import { useState } from 'react';
import { sendVoiceTurn } from './voiceSessionApi';

export function useVoiceSession() {
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  async function submitTranscript(transcript: string) {
    const started = performance.now();
    const response = await sendVoiceTurn({ transcript, audioBase64: '' });
    setLatencyMs(performance.now() - started);
    return response;
  }

  return { latencyMs, submitTranscript };
}
```

- [ ] **Step 4: Add the voice page and rerun tests**

```tsx
// src/web/atcsim-shell/src/features/voice-agent/VoiceAgentPage.tsx
import { Button, Text } from '@fluentui/react-components';
import { useState } from 'react';
import { useVoiceSession } from './useVoiceSession';

export function VoiceAgentPage() {
  const { latencyMs, submitTranscript } = useVoiceSession();
  const [answer, setAnswer] = useState('');

  return (
    <div>
      <Button onClick={async () => setAnswer((await submitTranscript('Hello tower')).answerText)}>
        Start voice proof
      </Button>
      <Text>{answer}</Text>
      <Text>{latencyMs ? `Latency: ${Math.round(latencyMs)} ms` : 'Latency pending'}</Text>
    </div>
  );
}
```

Run: `npm run test --prefix src/web/atcsim-shell -- voiceSessionApi; npm run build --prefix src/web/atcsim-shell`
Expected: tests pass and the frontend builds successfully.

- [ ] **Step 5: Commit**

```bash
git add src/web/atcsim-shell/src/features/voice-agent
git commit -m "feat: add voice ui latency proof"
```

## Task 7: Add Reusable App Service and Key Vault Infrastructure

**Files:**

- Create: `azure.yaml`
- Create: `infra/main.bicep`
- Create: `infra/modules/appservice-plan.bicep`
- Create: `infra/modules/webapp.bicep`
- Create: `infra/modules/apiapp.bicep`
- Create: `infra/modules/appinsights.bicep`
- Create: `infra/modules/keyvault.bicep`
- Create: `infra/parameters/dev.bicepparam`
- Create: `scripts/set-dev-secrets.ps1`

- [ ] **Step 1: Add the top-level Azure Developer CLI definition**

```yaml
# azure.yaml
name: atcsim-pocs
services:
  web:
    project: src/web/atcsim-shell
    language: js
    host: appservice
  flight-data-api:
    project: src/apis/AtcSim.FlightDataApi
    language: dotnet
    host: appservice
  voice-agent-api:
    project: src/apis/AtcSim.VoiceAgentApi
    language: dotnet
    host: appservice
```

- [ ] **Step 2: Add reusable Bicep modules**

```bicep
// infra/modules/appservice-plan.bicep
param name string
param location string

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: name
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  kind: 'app'
}

output id string = plan.id
```

```bicep
// infra/main.bicep
param location string = resourceGroup().location
param prefix string = 'atcsim'

module plan './modules/appservice-plan.bicep' = {
  name: 'appservice-plan'
  params: {
    name: '${prefix}-plan-dev-we-01'
    location: location
  }
}
```

- [ ] **Step 3: Add Key Vault seeding script**

```powershell
# scripts/set-dev-secrets.ps1
param(
  [Parameter(Mandatory = $true)] [string] $VaultName,
  [Parameter(Mandatory = $true)] [string] $Fr24Token,
  [Parameter(Mandatory = $true)] [string] $FoundryEndpoint,
  [Parameter(Mandatory = $true)] [string] $FoundryApiKey
)

az keyvault secret set --vault-name $VaultName --name fr24-token --value $Fr24Token | Out-Null
az keyvault secret set --vault-name $VaultName --name foundry-endpoint --value $FoundryEndpoint | Out-Null
az keyvault secret set --vault-name $VaultName --name foundry-api-key --value $FoundryApiKey | Out-Null
```

- [ ] **Step 4: Validate infrastructure syntax**

Run: `azd config set subscription "75102af9-fc92-45d4-99a8-5510a24b5421"; azd provision --dry-run`
Expected: Bicep resolves and the environment definition is accepted without template syntax errors.

- [ ] **Step 5: Commit**

```bash
git add azure.yaml infra scripts/set-dev-secrets.ps1
git commit -m "feat: add reusable app service infrastructure baseline"
```

## Task 8: Add Validation and Operational Guidance

**Files:**

- Modify: `docs/OPERATIONS.md`
- Modify: `docs/TEST.md`

- [ ] **Step 1: Add PoC validation guidance to test strategy**

```md
## PoC Validation Addendum

- PoC 1 validates authenticated FR24 sandbox reading, Azure Maps rendering, and aircraft selection.
- PoC 2 validates full voice-in/voice-out flow with tool-first mock knowledge.
- Latency evidence must be recorded for capture, backend, agent/model, and spoken response stages.
```

- [ ] **Step 2: Add operational notes for secrets and telemetry**

```md
## PoC Operations Addendum

- FR24 sandbox and Foundry credentials must be stored in Key Vault.
- Application Insights is required for flight-data response timing and voice-turn latency.
- App Service configuration must use `atcsim` naming conventions and environment-specific secret references.
```

- [ ] **Step 3: Run markdown checks and targeted builds**

Run: `npx --yes markdownlint-cli2 "docs/TEST.md" "docs/OPERATIONS.md"; dotnet test tests/apis/AtcSim.FlightDataApi.Tests/AtcSim.FlightDataApi.Tests.csproj; dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj; npm run build --prefix src/web/atcsim-shell`
Expected: markdown passes, backend tests pass, and the frontend build succeeds.

- [ ] **Step 4: Commit**

```bash
git add docs/TEST.md docs/OPERATIONS.md
git commit -m "docs: add poc validation and operations guidance"
```

## Self-Review Notes

- Spec coverage: the plan covers shared shell, Entra-first auth, FR24 sandbox UX, Foundry voice proof, App Service baseline, Key Vault, Application Insights, and reusable IaC.
- Placeholder scan: no `TBD`, `TODO`, or deferred implementation notes remain in task steps.
- Type consistency: frontend routes, API names, service seams, and naming prefix are consistent with the approved spec.

## Sprint Retrospective — Gaps & Next-Sprint Evidence Steps

Status as of 2026-07-15: Tasks 1-8 implemented and merged to `main`. Verified by
evidence — backend tests (2 + 3 passing), frontend tests (2 passing), the frontend
build succeeds, and Bicep compiles clean (`az bicep build`).

### Open gaps (not yet proven by evidence)

- **No live Azure deployment.** Task 7 Step 4 (`azd provision --dry-run`) was not
  run — no `azd` / Azure auth in the build environment. Infrastructure is validated
  only by `az bicep build`, not by an ARM what-if or a real deployment.
- **No real end-to-end latency figure.** The PoC 2 latency UI is built and
  unit-tested, but the capture -> backend -> agent -> spoken-response latency
  evidence required by [TEST.md](../TEST.md) section 7 has not been recorded against
  running services.
- **Entra bootstrap not executed.** [bootstrap-entra.ps1](../../scripts/bootstrap-entra.ps1)
  exists but has not been run against a tenant, so interactive sign-in is unverified.
- **Voice agent uses mock knowledge only.** The real Foundry / real-time model path
  (`FoundryVoiceAgentService`, `FoundryOptions`, `IVoiceAgentService`) was
  intentionally deferred; the current agent returns tool-first curated answers.

### Suggested evidence steps for the next sprint

- Run the app end-to-end locally (frontend + both APIs) and record an actual PoC 2
  latency figure across all four stages.
- Execute `bootstrap-entra.ps1` in a dev tenant and verify interactive sign-in
  against the created app registrations.
- In an Azure-enabled environment, run `azd provision --preview` (or
  `az deployment group what-if`) to validate the infrastructure against ARM.
- Implement and evaluate the Foundry-backed voice path behind the existing
  `IVoiceAgentService` seam, replacing the mock for real conversational latency.

### Sprint tracking convention

Each sprint is tracked by a dedicated GitHub issue that references this plan and the
related documents, and is used to manage the backlog and work-in-progress. The issue
is closed when the sprint's committed scope is merged, and any remaining gaps are
carried into the next sprint's plan and issue.
