# Simulator Scenarios + Efficient Flight Load — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace continuous FR24 polling with a one-shot Switzerland-wide load plus a manual refresh, and add a searchable simulator-scenario picker that arms an end-to-end mock voice exercise (Azure AI Speech STT/TTS + deterministic scripted pilot) with both sides transcribed in the chat.

**Architecture:** Frontend is a Vite + React 18 + Fluent UI v9 SPA (`src/web/atcsim-shell`). The voice broker is a .NET 8 minimal-API (`src/apis/AtcSim.VoiceAgentApi`) that already owns the deterministic command boundary (`SimCommandValidator` → `FunctionCallHandler` → `MockSimulatorAdapter`) and an SSE `TranscriptHub`. Feature 1 is purely frontend (new `useFlightData` hook + refresh control + last-updated ribbon). Feature 2 adds four broker endpoints (`capabilities`, `scenarios`, `speech/token`, `scenario/turn`), a `MockScenarioService` that reuses the existing deterministic path and emits ATC/Pilot transcript events, and a frontend `ScenarioPicker` + mock/live voice engine. No free text ever commands the simulator; the LLM/agent proposes and the schema-validated layer disposes.

**Tech Stack:** React 18, TypeScript, Fluent UI v9 (`@fluentui/react-components`), Vitest + Testing Library, azure-maps-control; .NET 8 minimal API, xUnit; `microsoft-cognitiveservices-speech-sdk`; Azure AI Speech (Switzerland North); Bicep.

**Spec:** [docs/specs/2026-07-20-simulator-scenarios-efficient-flightload-design.md](../specs/2026-07-20-simulator-scenarios-efficient-flightload-design.md)

**Sprint issue:** [#8](https://github.com/urruegg/ATCSimulator/issues/8)

## Conventions (read before starting)

- **Working directory for frontend:** `cd src/web/atcsim-shell` (do NOT use `npm --prefix` — it misreads the root `package.json` on this setup). Run tests with `npm run test -- <path>` and the type/build check with `npm run build`.
- **Backend tests run one project per invocation** (a single `dotnet test` cannot take two projects). Command: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj`.
- **Shell:** Windows PowerShell 5.x. No `&&`/`||` — chain with `;`. Use `git` (present). No `pwsh`.
- **Locales:** four files under `src/web/atcsim-shell/src/i18n/locales/` (`en/de/fr/it`). Every new UI key MUST be added to all four or `i18n` parity breaks.
- **Markdown:** `npx markdownlint-cli2 <file>` must pass (MD012 no multiple blank lines is enforced).
- **Do NOT commit or push unless explicitly requested by the user.** Commits below are logical checkpoints; when working inline, stage them but leave pushing to the user. PR approvals/merges are always human.
- **Fluent test setup:** component tests that render Fluent listboxes/comboboxes need the `ResizeObserver`/`IntersectionObserver`/`matchMedia` shims — copy the `beforeAll` block from `src/app/__tests__/BottomRibbon.test.tsx`.

---

## File Structure

**Feature 1 (frontend):**

- Create `src/web/atcsim-shell/src/data/switzerland.ts` — `SWITZERLAND_BOUNDS` constant.
- Create `src/web/atcsim-shell/src/features/flight-data/useFlightData.ts` — one-shot fetch + `refresh()`.
- Create `src/web/atcsim-shell/src/features/flight-data/__tests__/useFlightData.test.ts`.
- Modify `src/web/atcsim-shell/src/features/flight-data/AircraftMapPage.tsx` — use `useFlightData`, add refresh button.
- Modify `src/web/atcsim-shell/src/app/BottomRibbon.tsx` — last-updated display.
- Modify `src/web/atcsim-shell/src/state/AppStateContext.tsx` — remove `refreshCadenceSec`, add `lastUpdated` plumbing is NOT needed (ribbon reads from a shared source; see Task 4).
- Delete `src/web/atcsim-shell/src/features/flight-data/useFlightPolling.ts` + its test (superseded).

**Feature 2 (backend):**

- Create `src/apis/AtcSim.VoiceAgentApi/Contracts/ScenarioContracts.cs` — DTOs.
- Create `src/apis/AtcSim.VoiceAgentApi/Services/MockScenarioService.cs` — catalog + turn handling.
- Create `src/apis/AtcSim.VoiceAgentApi/Services/SpeechTokenService.cs` — MI-minted Azure Speech token.
- Create `src/apis/AtcSim.VoiceAgentApi/Options/SpeechOptions.cs`.
- Modify `src/apis/AtcSim.VoiceAgentApi/Program.cs` — register services + 4 endpoints.
- Create tests under `tests/apis/AtcSim.VoiceAgentApi.Tests/`.

**Feature 2 (frontend):**

- Create `src/web/atcsim-shell/src/features/simulator/scenarioApi.ts` + `types.ts`.
- Create `src/web/atcsim-shell/src/features/simulator/ScenarioPicker.tsx` + test.
- Create `src/web/atcsim-shell/src/features/chat/speechClient.ts` — Azure Speech STT/TTS wrapper (thin, mockable).
- Modify `src/web/atcsim-shell/src/state/AppStateContext.tsx` — `selectedScenario`.
- Modify `src/web/atcsim-shell/src/features/chat/ChatPage.tsx` + `MicControl.tsx` — picker placement, gating, mock loop + toggle.
- Locale + docs updates.

**Infra / docs:**

- Modify `infra/` Bicep — Azure AI Speech account (Switzerland North) + role assignment for the voice-api MI.
- Modify `api/openapi.yaml`, `docs/DATA.md`, create `docs/adr/ADR-0007-mock-scenario-voice-loop.md`, extend `docs/runbooks/poc-e2e-validation-runbook.md`.

---

## Feature 1 — One-shot Switzerland load + manual refresh

### Task 1: Switzerland bounds constant

**Files:**

- Create: `src/web/atcsim-shell/src/data/switzerland.ts`

- [ ] **Step 1: Create the constant**

```ts
// Country-wide bounding box for the one-shot flight load. Format is
// "N,S,W,E" decimal degrees, matching the flight API's `bounds` query param
// (see features/flight-data/aircraftApi.ts). Covers mainland Switzerland with
// a small margin so border traffic is included.
export const SWITZERLAND_BOUNDS = '47.95,45.75,5.85,10.55';
```

- [ ] **Step 2: Type-check**

Run: `cd src/web/atcsim-shell; npm run build`
Expected: build succeeds (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/web/atcsim-shell/src/data/switzerland.ts
git commit -m "feat(flight): add SWITZERLAND_BOUNDS for one-shot load"
```

### Task 2: `useFlightData` hook (replaces polling)

**Files:**

- Create: `src/web/atcsim-shell/src/features/flight-data/useFlightData.ts`
- Test: `src/web/atcsim-shell/src/features/flight-data/__tests__/useFlightData.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFlightData } from '../useFlightData';
import { fetchAircraft } from '../aircraftApi';

vi.mock('../aircraftApi', () => ({ fetchAircraft: vi.fn() }));
const fetchAircraftMock = vi.mocked(fetchAircraft);

describe('useFlightData', () => {
  beforeEach(() => {
    fetchAircraftMock.mockReset();
    fetchAircraftMock.mockResolvedValue([{ callsign: 'SWR123' } as any]);
  });

  it('fetches once on mount and exposes lastUpdated', async () => {
    const { result } = renderHook(() => useFlightData('47.95,45.75,5.85,10.55'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchAircraftMock).toHaveBeenCalledTimes(1);
    expect(result.current.aircraft).toEqual([{ callsign: 'SWR123' }]);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('does NOT poll again on its own', async () => {
    vi.useFakeTimers();
    renderHook(() => useFlightData('47.95,45.75,5.85,10.55'));
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(fetchAircraftMock).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('refresh() refetches', async () => {
    const { result } = renderHook(() => useFlightData('47.95,45.75,5.85,10.55'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.refresh(); });
    expect(fetchAircraftMock).toHaveBeenCalledTimes(2);
  });

  it('keeps last-known aircraft on error', async () => {
    const { result } = renderHook(() => useFlightData('47.95,45.75,5.85,10.55'));
    await waitFor(() => expect(result.current.aircraft.length).toBe(1));
    fetchAircraftMock.mockRejectedValueOnce(new Error('429'));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.aircraft).toEqual([{ callsign: 'SWR123' }]);
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/web/atcsim-shell; npm run test -- src/features/flight-data/__tests__/useFlightData.test.ts`
Expected: FAIL — cannot find module `../useFlightData`.

- [ ] **Step 3: Implement the hook**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAircraft } from './aircraftApi';
import type { Aircraft } from './types';

export interface FlightData {
  aircraft: Aircraft[];
  error: Error | null;
  loading: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

/**
 * Load all aircraft within `bounds` once on mount; `refresh()` reloads on
 * demand. Unlike the removed `useFlightPolling`, no interval timer runs — this
 * cuts third-party feed consumption. The last-known aircraft set is kept on
 * error (e.g. FR24 429) so the map never goes blank.
 */
export function useFlightData(bounds: string): FlightData {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const data = await fetchAircraft(bounds);
      setAircraft(data);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e as Error); // keep last-known aircraft on screen
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [bounds]);

  useEffect(() => {
    void load();
  }, [load]);

  return { aircraft, error, loading, lastUpdated, refresh: load };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src/web/atcsim-shell; npm run test -- src/features/flight-data/__tests__/useFlightData.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/web/atcsim-shell/src/features/flight-data/useFlightData.ts src/web/atcsim-shell/src/features/flight-data/__tests__/useFlightData.test.ts
git commit -m "feat(flight): add useFlightData one-shot hook with manual refresh"
```

### Task 3: Map page uses `useFlightData` + refresh button

**Files:**

- Modify: `src/web/atcsim-shell/src/features/flight-data/AircraftMapPage.tsx`
- Modify test: `src/web/atcsim-shell/src/features/flight-data/__tests__/AircraftMapPage.test.tsx`

- [ ] **Step 1: Update the map page imports + data source**

Replace the polling import and hook usage. Change the import line:

```ts
import { useFlightData } from './useFlightData';
import { SWITZERLAND_BOUNDS } from '../../data/switzerland';
```

Remove the `import { useFlightPolling } from './useFlightPolling';` line and remove `airportBounds` from the `../../data/airports` import if it is now unused (keep other named imports). Inside the component, replace:

```ts
const { setSelectedFlight, refreshCadenceSec, selectedAirport } = useAppState();
```

with:

```ts
const { setSelectedFlight, selectedAirport } = useAppState();
```

and replace:

```ts
const { aircraft, error } = useFlightPolling(airportBounds(selectedAirport), refreshCadenceSec);
```

with:

```ts
const { aircraft, error, loading, refresh } = useFlightData(SWITZERLAND_BOUNDS);
```

- [ ] **Step 2: Add the refresh icon import**

Add `ArrowClockwise24Regular` to the `@fluentui/react-icons` import:

```ts
import { Add24Regular, ArrowClockwise24Regular, Subtract24Regular, Target24Regular } from '@fluentui/react-icons';
```

- [ ] **Step 3: Add the refresh button to the control group**

Inside the `<div className={styles.mapButtons} ...>` group, add a 4th button after the zoom-out button:

```tsx
          <Button
            appearance="subtle"
            icon={<ArrowClockwise24Regular />}
            aria-label={t('map.refresh')}
            disabled={loading}
            onClick={() => {
              void refresh();
            }}
          />
```

- [ ] **Step 4: Add the i18n key `map.refresh` to all four locales**

`src/i18n/locales/en.json` → `"map"` object: add `"refresh": "Refresh flights"`.
`de.json`: `"refresh": "Flüge aktualisieren"`.
`fr.json`: `"refresh": "Actualiser les vols"`.
`it.json`: `"refresh": "Aggiorna voli"`.

- [ ] **Step 5: Update the map page test**

Open `AircraftMapPage.test.tsx`. It currently mocks `./useFlightPolling`. Change the mock to `./useFlightData` returning the new shape, and add an assertion for the refresh button. Replace the polling mock block with:

```ts
vi.mock('../useFlightData', () => ({
  useFlightData: () => ({
    aircraft: [],
    error: null,
    loading: false,
    lastUpdated: new Date(),
    refresh: vi.fn(),
  }),
}));
```

Add a test asserting the refresh control renders:

```ts
it('renders a refresh flights control', () => {
  // render as the existing tests do (reuse their render helper/wrapper)
  expect(screen.getByRole('button', { name: /refresh flights/i })).toBeInTheDocument();
});
```

(If the existing test file references `useFlightPolling` anywhere else, update those references to `useFlightData`.)

- [ ] **Step 6: Run tests + build**

Run: `cd src/web/atcsim-shell; npm run test -- src/features/flight-data/__tests__/AircraftMapPage.test.tsx`
Expected: PASS.
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/web/atcsim-shell/src/features/flight-data/AircraftMapPage.tsx src/web/atcsim-shell/src/features/flight-data/__tests__/AircraftMapPage.test.tsx src/web/atcsim-shell/src/i18n/locales
git commit -m "feat(flight): load Switzerland-wide once and add map refresh control"
```

### Task 4: BottomRibbon shows last-updated instead of cadence

**Design note:** `lastUpdated` lives in `useFlightData` inside `AircraftMapPage`, but the ribbon is a sibling. To avoid prop-drilling across the layout, expose the last-updated time via `AppState`. `AircraftMapPage` writes it after each load; `BottomRibbon` reads it. This keeps a single shared source without a timer.

**Files:**

- Modify: `src/web/atcsim-shell/src/state/AppStateContext.tsx` (add `flightsUpdatedAt` + setter — done together with Task 5's removals)
- Modify: `src/web/atcsim-shell/src/features/flight-data/AircraftMapPage.tsx` (publish `lastUpdated`)
- Modify: `src/web/atcsim-shell/src/app/BottomRibbon.tsx`
- Modify test: `src/web/atcsim-shell/src/app/__tests__/BottomRibbon.test.tsx`

- [ ] **Step 1: Rewrite the BottomRibbon test (TDD)**

Replace the `describe('BottomRibbon', ...)` body (keep the `beforeAll` shims) with:

```ts
describe('BottomRibbon', () => {
  it('shows the last-updated time when flights have loaded', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <AppStateProvider>
          <BottomRibbon />
        </AppStateProvider>
      </FluentProvider>,
    );
    // With no load yet, shows the dash placeholder.
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/web/atcsim-shell; npm run test -- src/app/__tests__/BottomRibbon.test.tsx`
Expected: FAIL — still renders the cadence combobox / no "last updated" text.

- [ ] **Step 3: Rewrite BottomRibbon**

```tsx
import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../state/AppStateContext';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  spacer: { flexGrow: 1 },
});

/** Full-width bottom ribbon. Shows when the flight set was last loaded. */
export function BottomRibbon() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { flightsUpdatedAt } = useAppState();
  const time = flightsUpdatedAt ? flightsUpdatedAt.toLocaleTimeString() : '—';

  return (
    <footer className={styles.root}>
      <div className={styles.spacer} />
      <Text size={200}>{t('map.lastUpdated', { time })}</Text>
    </footer>
  );
}
```

- [ ] **Step 4: Add the `map.lastUpdated` i18n key to all four locales**

`en.json` `"map"`: `"lastUpdated": "Last updated {{time}}"`.
`de.json`: `"lastUpdated": "Zuletzt aktualisiert {{time}}"`.
`fr.json`: `"lastUpdated": "Dernière mise à jour {{time}}"`.
`it.json`: `"lastUpdated": "Ultimo aggiornamento {{time}}"`.

- [ ] **Step 5: Publish `lastUpdated` from the map page**

In `AircraftMapPage.tsx`, pull `setFlightsUpdatedAt` from `useAppState()` and sync it in an effect:

```ts
const { setSelectedFlight, selectedAirport, setFlightsUpdatedAt } = useAppState();
const { aircraft, error, loading, lastUpdated, refresh } = useFlightData(SWITZERLAND_BOUNDS);

useEffect(() => {
  if (lastUpdated) setFlightsUpdatedAt(lastUpdated);
}, [lastUpdated, setFlightsUpdatedAt]);
```

(The `AppState` field + setter are added in Task 5.)

- [ ] **Step 6: Run test to verify it passes** (after Task 5 adds the state field, re-run)

Run: `cd src/web/atcsim-shell; npm run test -- src/app/__tests__/BottomRibbon.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit** (bundle with Task 5 since they share `AppStateContext`)

### Task 5: Remove `refreshCadenceSec`, add `flightsUpdatedAt` to AppState

**Files:**

- Modify: `src/web/atcsim-shell/src/state/AppStateContext.tsx`
- Modify test: `src/web/atcsim-shell/src/state/__tests__/AppStateContext.test.tsx`
- Delete: `src/web/atcsim-shell/src/features/flight-data/useFlightPolling.ts` and `.../__tests__/useFlightPolling.test.ts`

- [ ] **Step 1: Update AppStateContext**

In `AppState` interface: remove `refreshCadenceSec: number;` and `setRefreshCadenceSec: (n: number) => void;`. Add:

```ts
  flightsUpdatedAt: Date | null;
  setFlightsUpdatedAt: (d: Date) => void;
```

Remove the `DEFAULT_REFRESH_CADENCE_SEC` const, the `refreshCadenceSec` storage key, the `readStoredNumber` usage for cadence, the `refreshCadenceSec` state + `setRefreshCadenceSec` callback, and their entries in the `value`/deps arrays. Add:

```ts
  const [flightsUpdatedAt, setFlightsUpdatedAtState] = useState<Date | null>(null);
  const setFlightsUpdatedAt = useCallback((d: Date) => setFlightsUpdatedAtState(d), []);
```

Add `flightsUpdatedAt` and `setFlightsUpdatedAt` to both the `value` object and its dependency array. If `readStoredNumber` becomes unused, delete it to avoid an unused-symbol lint error.

- [ ] **Step 2: Update the AppStateContext test**

Open `AppStateContext.test.tsx`. Remove/replace any assertions referencing `refreshCadenceSec` or `setRefreshCadenceSec` (e.g. default value 5, persistence). Add a minimal test:

```ts
it('records the flights-updated time', () => {
  const { result } = renderHook(() => useAppState(), { wrapper });
  const now = new Date();
  act(() => result.current.setFlightsUpdatedAt(now));
  expect(result.current.flightsUpdatedAt).toBe(now);
});
```

(Match the file's existing `wrapper`/render style.)

- [ ] **Step 3: Delete the superseded polling hook + test**

```bash
git rm src/web/atcsim-shell/src/features/flight-data/useFlightPolling.ts src/web/atcsim-shell/src/features/flight-data/__tests__/useFlightPolling.test.ts
```

- [ ] **Step 4: Run the full frontend suite + build**

Run: `cd src/web/atcsim-shell; npm run test`
Expected: PASS (no references to removed symbols remain — fix any that surface).
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/web/atcsim-shell/src/state/AppStateContext.tsx src/web/atcsim-shell/src/state/__tests__/AppStateContext.test.tsx src/web/atcsim-shell/src/app/BottomRibbon.tsx src/web/atcsim-shell/src/app/__tests__/BottomRibbon.test.tsx src/web/atcsim-shell/src/features/flight-data/AircraftMapPage.tsx src/web/atcsim-shell/src/i18n/locales
git commit -m "feat(flight): replace refresh cadence with last-updated; remove polling"
```

---

## Feature 2 — Backend: scenario catalog, mock turn, capabilities, speech token

### Task 6: Scenario contracts + `MockScenarioService` catalog + `GET /api/voice/scenarios`

**Files:**

- Create: `src/apis/AtcSim.VoiceAgentApi/Contracts/ScenarioContracts.cs`
- Create: `src/apis/AtcSim.VoiceAgentApi/Services/MockScenarioService.cs`
- Modify: `src/apis/AtcSim.VoiceAgentApi/Program.cs`
- Test: `tests/apis/AtcSim.VoiceAgentApi.Tests/MockScenarioServiceTests.cs`

- [ ] **Step 1: Define the contracts**

```csharp
namespace AtcSim.VoiceAgentApi.Contracts;

/// <summary>One catalog scenario, localized title keyed by language code.</summary>
public sealed record ScenarioSummary(
    string Id,
    IReadOnlyDictionary<string, string> Title,
    string AircraftClass,
    IReadOnlyList<string> ExpectedCommands);

/// <summary>A single ATC turn against a scenario.</summary>
public sealed record ScenarioTurnRequest(string ScenarioId, string AtcTranscript);

/// <summary>Result of a mock turn: the accepted command + grounded read-back.</summary>
public sealed record ScenarioTurnResponse(
    bool Accepted,
    string? Command,
    string ReadBackText,
    IReadOnlyList<string> PhraseologyFlags);
```

- [ ] **Step 2: Write the failing test**

```csharp
using AtcSim.VoiceAgentApi.Contracts;
using AtcSim.VoiceAgentApi.Services;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class MockScenarioServiceTests
{
    private static MockScenarioService NewService() =>
        new(new SimCommandValidator(), new FunctionCallHandler(new SimCommandValidator(), new MockSimulatorAdapter()), new TranscriptHub());

    [Fact]
    public void Catalog_has_the_four_seeded_examples()
    {
        var ids = NewService().List().Select(s => s.Id).ToArray();
        Assert.Equal(new[] { "EX-01", "EX-02", "EX-03", "EX-04" }, ids);
    }

    [Fact]
    public void Turn_maps_heading_to_a_validated_command_with_readback()
    {
        var svc = NewService();
        var r = svc.Turn(new ScenarioTurnRequest("EX-01", "Swiss 456, turn right heading 290 degrees."));
        Assert.True(r.Accepted);
        Assert.Equal("SET_HEADING", r.Command);
        Assert.Contains("290", r.ReadBackText);
    }

    [Fact]
    public void Turn_rejects_out_of_range_heading()
    {
        var svc = NewService();
        var r = svc.Turn(new ScenarioTurnRequest("EX-01", "Swiss 456, turn right heading 400 degrees."));
        Assert.False(r.Accepted);
    }

    [Fact]
    public void Turn_on_unknown_scenario_is_rejected()
    {
        var r = NewService().Turn(new ScenarioTurnRequest("EX-99", "anything"));
        Assert.False(r.Accepted);
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj`
Expected: FAIL — `MockScenarioService` does not exist.

- [ ] **Step 4: Implement `MockScenarioService`**

The service holds the four-scenario catalog, parses a small set of deterministic instruction patterns (heading / flight level / altitude / QNH / report / traffic) out of the ATC transcript, runs each candidate through the existing `SimCommandValidator`, dispatches accepted commands via `FunctionCallHandler`/`MockSimulatorAdapter`, publishes ATC + Pilot transcript events, and returns a grounded read-back mirroring the dispatched command.

```csharp
using System.Globalization;
using System.Text.RegularExpressions;
using AtcSim.VoiceAgentApi.Contracts;

namespace AtcSim.VoiceAgentApi.Services;

public sealed class MockScenarioService(
    SimCommandValidator validator,
    FunctionCallHandler handler,
    TranscriptHub hub)
{
    private static readonly IReadOnlyList<ScenarioSummary> Catalog = new[]
    {
        new ScenarioSummary("EX-01",
            new Dictionary<string, string> { ["en"] = "Instruction to airliner", ["de"] = "Anweisung an Verkehrsflugzeug", ["fr"] = "Instruction à un avion de ligne", ["it"] = "Istruzione a un aereo di linea" },
            "airliner", new[] { "SET_HEADING", "SET_FLIGHT_LEVEL" }),
        new ScenarioSummary("EX-02",
            new Dictionary<string, string> { ["en"] = "Waypoint instruction to light aircraft", ["de"] = "Wegpunktanweisung an Kleinflugzeug", ["fr"] = "Instruction de point de report à un avion léger", ["it"] = "Istruzione di waypoint a velivolo leggero" },
            "light", new[] { "REPORT_POINT" }),
        new ScenarioSummary("EX-03",
            new Dictionary<string, string> { ["en"] = "Traffic info", ["de"] = "Traffic Info", ["fr"] = "Information de trafic", ["it"] = "Informazioni sul traffico" },
            "any", new[] { "TRAFFIC_INFO" }),
        new ScenarioSummary("EX-04",
            new Dictionary<string, string> { ["en"] = "Traffic info to IFR", ["de"] = "Traffic Info an IFR", ["fr"] = "Information de trafic à un IFR", ["it"] = "Informazioni sul traffico a un IFR" },
            "IFR", new[] { "TRAFFIC_INFO" }),
    };

    public IReadOnlyList<ScenarioSummary> List() => Catalog;

    private static bool Exists(string id) => Catalog.Any(s => s.Id == id);

    public ScenarioTurnResponse Turn(ScenarioTurnRequest request)
    {
        if (!Exists(request.ScenarioId))
        {
            return new ScenarioTurnResponse(false, null, string.Empty, new[] { "unknown scenario" });
        }

        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        hub.Publish(new TranscriptEvent("atc", request.AtcTranscript, now));

        var (name, parameters, readBack, flags) = Interpret(request.AtcTranscript);
        if (name is null)
        {
            var miss = new ScenarioTurnResponse(false, null, "Say again.", new[] { "no recognizable instruction" });
            hub.Publish(new TranscriptEvent("pilot", miss.ReadBackText, now + 1));
            return miss;
        }

        var command = new SimCommand(name, parameters);
        var result = validator.Validate(command);
        if (!result.Accepted)
        {
            var rej = new ScenarioTurnResponse(false, name, "Unable.", new[] { result.Reason ?? "rejected" });
            hub.Publish(new TranscriptEvent("pilot", rej.ReadBackText, now + 1));
            return rej;
        }

        // Deterministic dispose through the shared boundary.
        handler.Handle(name, ToJson(parameters));
        hub.Publish(new TranscriptEvent("pilot", readBack, now + 1));
        return new ScenarioTurnResponse(true, name, readBack, flags);
    }

    private static string ToJson(IReadOnlyDictionary<string, double> p) =>
        "{" + string.Join(",", p.Select(kv => $"\"{kv.Key}\":{kv.Value.ToString(CultureInfo.InvariantCulture)}")) + "}";

    // Minimal deterministic phrase → command interpreter (demo scope; no LLM).
    private static (string? Name, IReadOnlyDictionary<string, double> Params, string ReadBack, string[] Flags)
        Interpret(string transcript)
    {
        var t = transcript.ToLowerInvariant();

        var heading = Regex.Match(t, @"heading\s+(\d{1,3})");
        if (heading.Success)
        {
            var deg = double.Parse(heading.Groups[1].Value, CultureInfo.InvariantCulture);
            return ("SET_HEADING", new Dictionary<string, double> { ["heading"] = deg },
                $"Turning heading {deg:0} degrees.", new[] { "heading read-back" });
        }

        var fl = Regex.Match(t, @"flight level\s+(\d{1,3})");
        if (fl.Success)
        {
            var v = double.Parse(fl.Groups[1].Value, CultureInfo.InvariantCulture);
            return ("SET_FLIGHT_LEVEL", new Dictionary<string, double> { ["flightLevel"] = v },
                $"Climbing flight level {v:0}.", new[] { "level read-back" });
        }

        var qnh = Regex.Match(t, @"qnh\s+(\d{3,4})");
        if (qnh.Success)
        {
            var v = double.Parse(qnh.Groups[1].Value, CultureInfo.InvariantCulture);
            return ("SET_QNH", new Dictionary<string, double> { ["qnh"] = v },
                $"QNH {v:0}.", new[] { "QNH read-back" });
        }

        if (t.Contains("report"))
        {
            return ("REPORT_POINT", new Dictionary<string, double>(),
                "Wilco, will report.", new[] { "conditional report" });
        }

        if (t.Contains("traffic"))
        {
            return ("TRAFFIC_INFO", new Dictionary<string, double>(),
                "Looking out for traffic.", new[] { "traffic look-out" });
        }

        return (null, new Dictionary<string, double>(), string.Empty, Array.Empty<string>());
    }
}
```

- [ ] **Step 5: Register the service + endpoints in Program.cs**

Add registration after the existing `AddSingleton<TranscriptHub>();`:

```csharp
builder.Services.AddSingleton<MockScenarioService>();
```

Add endpoints (before `app.Run();`):

```csharp
app.MapGet("/api/voice/scenarios", (MockScenarioService svc) => Results.Ok(svc.List()));

app.MapPost("/api/voice/scenario/turn", (ScenarioTurnRequest request, MockScenarioService svc) =>
    Results.Ok(svc.Turn(request)));
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj`
Expected: PASS (existing 12 + 4 new).

- [ ] **Step 7: Commit**

```bash
git add src/apis/AtcSim.VoiceAgentApi/Contracts/ScenarioContracts.cs src/apis/AtcSim.VoiceAgentApi/Services/MockScenarioService.cs src/apis/AtcSim.VoiceAgentApi/Program.cs tests/apis/AtcSim.VoiceAgentApi.Tests/MockScenarioServiceTests.cs
git commit -m "feat(voice): add mock scenario catalog + deterministic turn endpoint"
```

### Task 7: `GET /api/voice/capabilities`

**Files:**

- Modify: `src/apis/AtcSim.VoiceAgentApi/Program.cs`
- Test: `tests/apis/AtcSim.VoiceAgentApi.Tests/CapabilitiesEndpointTests.cs`

- [ ] **Step 1: Write the failing test**

Follow the pattern in `VoiceAgentHealthEndpointTests.cs` (uses `WebApplicationFactory<Program>`).

```csharp
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class CapabilitiesEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Reports_mock_available_and_live_unavailable_by_default()
    {
        var res = await factory.CreateClient().GetFromJsonAsync<Capabilities>("/api/voice/capabilities");
        Assert.NotNull(res);
        Assert.True(res!.MockAvailable);
        Assert.False(res.LiveAvailable); // no AgentId/ProjectId configured in tests
    }

    private sealed record Capabilities(bool LiveAvailable, bool MockAvailable);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj`
Expected: FAIL — 404 on `/api/voice/capabilities`.

- [ ] **Step 3: Implement the endpoint**

Add to `Program.cs` (uses the already-registered `IOptions<VoiceLiveOptions>`):

```csharp
app.MapGet("/api/voice/capabilities", (Microsoft.Extensions.Options.IOptions<VoiceLiveOptions> voiceLive) =>
{
    var o = voiceLive.Value;
    var liveAvailable = !string.IsNullOrWhiteSpace(o.AgentId) && !string.IsNullOrWhiteSpace(o.ProjectId);
    return Results.Ok(new { liveAvailable, mockAvailable = true });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/apis/AtcSim.VoiceAgentApi/Program.cs tests/apis/AtcSim.VoiceAgentApi.Tests/CapabilitiesEndpointTests.cs
git commit -m "feat(voice): add capabilities endpoint driving the engine toggle"
```

### Task 8: `SpeechTokenService` + `GET /api/voice/speech/token`

**Design note:** In production the token is minted from the Azure AI Speech resource using the voice-api Managed Identity (no key in the browser). For the demo/tests, the service is abstracted behind an interface so a fake returns a deterministic token; the real implementation calls the Speech `issueToken` STS with an AAD token from `DefaultAzureCredential`.

**Files:**

- Create: `src/apis/AtcSim.VoiceAgentApi/Options/SpeechOptions.cs`
- Create: `src/apis/AtcSim.VoiceAgentApi/Services/SpeechTokenService.cs`
- Modify: `src/apis/AtcSim.VoiceAgentApi/Program.cs`
- Test: `tests/apis/AtcSim.VoiceAgentApi.Tests/SpeechTokenServiceTests.cs`

- [ ] **Step 1: Add the options type**

```csharp
namespace AtcSim.VoiceAgentApi.Options;

public sealed class SpeechOptions
{
    public string Region { get; init; } = "switzerlandnorth";
    public string? ResourceId { get; init; } // Azure AI Speech resource id (for AAD token exchange)
}
```

- [ ] **Step 2: Write the failing test**

```csharp
using AtcSim.VoiceAgentApi.Services;
using Microsoft.Extensions.Options;
using AtcSim.VoiceAgentApi.Options;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class SpeechTokenServiceTests
{
    [Fact]
    public async Task Returns_region_and_a_token()
    {
        var opts = Options.Create(new SpeechOptions { Region = "switzerlandnorth" });
        var svc = new SpeechTokenService(opts, new FakeTokenSource("tok-123"));
        var result = await svc.IssueAsync(CancellationToken.None);
        Assert.Equal("switzerlandnorth", result.Region);
        Assert.Equal("tok-123", result.Token);
    }

    private sealed class FakeTokenSource(string token) : ISpeechStsClient
    {
        public Task<string> IssueTokenAsync(SpeechOptions options, CancellationToken ct) => Task.FromResult(token);
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj`
Expected: FAIL — types missing.

- [ ] **Step 4: Implement the service + STS abstraction**

```csharp
using AtcSim.VoiceAgentApi.Options;
using Microsoft.Extensions.Options;

namespace AtcSim.VoiceAgentApi.Services;

public sealed record SpeechToken(string Token, string Region);

/// <summary>Exchanges the API's Managed Identity for a short-lived Speech token.</summary>
public interface ISpeechStsClient
{
    Task<string> IssueTokenAsync(SpeechOptions options, CancellationToken ct);
}

public sealed class SpeechTokenService(IOptions<SpeechOptions> options, ISpeechStsClient sts)
{
    public async Task<SpeechToken> IssueAsync(CancellationToken ct)
    {
        var o = options.Value;
        var token = await sts.IssueTokenAsync(o, ct);
        return new SpeechToken(token, o.Region);
    }
}
```

Also create the production STS client `AadSpeechStsClient` (registered only outside tests):

```csharp
using System.Net.Http.Headers;
using Azure.Core;
using Azure.Identity;
using AtcSim.VoiceAgentApi.Options;

namespace AtcSim.VoiceAgentApi.Services;

/// <summary>
/// Mints a Speech token via AAD: gets an ARM-scoped token for the API's
/// Managed Identity, then POSTs to the Speech STS issueToken endpoint.
/// </summary>
public sealed class AadSpeechStsClient(IHttpClientFactory httpFactory, TokenCredential credential) : ISpeechStsClient
{
    public async Task<string> IssueTokenAsync(SpeechOptions options, CancellationToken ct)
    {
        var aad = await credential.GetTokenAsync(
            new TokenRequestContext(new[] { "https://cognitiveservices.azure.com/.default" }), ct);
        using var http = httpFactory.CreateClient();
        using var req = new HttpRequestMessage(HttpMethod.Post,
            $"https://{options.Region}.api.cognitive.microsoft.com/sts/v1.0/issueToken");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", aad.Token);
        req.Content = new StringContent(string.Empty);
        var res = await http.SendAsync(req, ct);
        res.EnsureSuccessStatusCode();
        return await res.Content.ReadAsStringAsync(ct);
    }
}
```

- [ ] **Step 5: Register + expose the endpoint in Program.cs**

```csharp
builder.Services.Configure<SpeechOptions>(builder.Configuration.GetSection("Speech"));
builder.Services.AddHttpClient();
builder.Services.AddSingleton<Azure.Core.TokenCredential>(_ => new Azure.Identity.DefaultAzureCredential());
builder.Services.AddSingleton<ISpeechStsClient, AadSpeechStsClient>();
builder.Services.AddSingleton<SpeechTokenService>();
```

```csharp
app.MapGet("/api/voice/speech/token", async (SpeechTokenService svc, CancellationToken ct) =>
{
    var t = await svc.IssueAsync(ct);
    return Results.Ok(new { token = t.Token, region = t.Region });
});
```

Add the NuGet package if not already referenced: `Azure.Identity` (in the VoiceAgentApi csproj). Run `dotnet add src/apis/AtcSim.VoiceAgentApi/AtcSim.VoiceAgentApi.csproj package Azure.Identity` only if the build reports it missing.

- [ ] **Step 6: Run tests + build**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj`
Expected: PASS.
Run: `dotnet build src/apis/AtcSim.VoiceAgentApi/AtcSim.VoiceAgentApi.csproj`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/apis/AtcSim.VoiceAgentApi/Options/SpeechOptions.cs src/apis/AtcSim.VoiceAgentApi/Services/SpeechTokenService.cs src/apis/AtcSim.VoiceAgentApi/Services/AadSpeechStsClient.cs src/apis/AtcSim.VoiceAgentApi/Program.cs tests/apis/AtcSim.VoiceAgentApi.Tests/SpeechTokenServiceTests.cs
git commit -m "feat(voice): mint short-lived Azure Speech token via managed identity"
```

---

## Feature 2 — Frontend: scenario picker, gating, mock voice loop, toggle

### Task 9: Scenario API client + types

**Files:**

- Create: `src/web/atcsim-shell/src/features/simulator/types.ts`
- Create: `src/web/atcsim-shell/src/features/simulator/scenarioApi.ts`
- Test: `src/web/atcsim-shell/src/features/simulator/__tests__/scenarioApi.test.ts`

- [ ] **Step 1: Define types**

```ts
export interface ScenarioSummary {
  id: string;
  title: Record<string, string>; // language code -> localized title
  aircraftClass: string;
  expectedCommands: string[];
}

export interface ScenarioTurnResponse {
  accepted: boolean;
  command: string | null;
  readBackText: string;
  phraseologyFlags: string[];
}

export interface Capabilities {
  liveAvailable: boolean;
  mockAvailable: boolean;
}

export interface SpeechTokenResponse {
  token: string;
  region: string;
}
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchScenarios, postScenarioTurn } from '../scenarioApi';

describe('scenarioApi', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('fetches scenarios', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => [{ id: 'EX-01', title: { en: 'x' }, aircraftClass: 'airliner', expectedCommands: [] }],
    }));
    const list = await fetchScenarios('');
    expect(list[0].id).toBe('EX-01');
  });

  it('posts a scenario turn', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ accepted: true, command: 'SET_HEADING', readBackText: 'ok', phraseologyFlags: [] }),
    }));
    const r = await postScenarioTurn('', 'EX-01', 'heading 290');
    expect(r.accepted).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd src/web/atcsim-shell; npm run test -- src/features/simulator/__tests__/scenarioApi.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement the client**

```ts
import type { Capabilities, ScenarioSummary, ScenarioTurnResponse, SpeechTokenResponse } from './types';

function base(voiceBaseUrl: string): string {
  return voiceBaseUrl.replace(/\/$/, '');
}

export async function fetchScenarios(voiceBaseUrl: string): Promise<ScenarioSummary[]> {
  const res = await fetch(`${base(voiceBaseUrl)}/api/voice/scenarios`, { credentials: 'include' });
  if (!res.ok) throw new Error(`scenarios_${res.status}`);
  return res.json();
}

export async function fetchCapabilities(voiceBaseUrl: string): Promise<Capabilities> {
  const res = await fetch(`${base(voiceBaseUrl)}/api/voice/capabilities`, { credentials: 'include' });
  if (!res.ok) throw new Error(`capabilities_${res.status}`);
  return res.json();
}

export async function fetchSpeechToken(voiceBaseUrl: string): Promise<SpeechTokenResponse> {
  const res = await fetch(`${base(voiceBaseUrl)}/api/voice/speech/token`, { credentials: 'include' });
  if (!res.ok) throw new Error(`speech_token_${res.status}`);
  return res.json();
}

export async function postScenarioTurn(
  voiceBaseUrl: string,
  scenarioId: string,
  atcTranscript: string,
): Promise<ScenarioTurnResponse> {
  const res = await fetch(`${base(voiceBaseUrl)}/api/voice/scenario/turn`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId, atcTranscript }),
  });
  if (!res.ok) throw new Error(`scenario_turn_${res.status}`);
  return res.json();
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd src/web/atcsim-shell; npm run test -- src/features/simulator/__tests__/scenarioApi.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/web/atcsim-shell/src/features/simulator/types.ts src/web/atcsim-shell/src/features/simulator/scenarioApi.ts src/web/atcsim-shell/src/features/simulator/__tests__/scenarioApi.test.ts
git commit -m "feat(simulator): add scenario/capabilities/speech-token API client"
```

### Task 10: `selectedScenario` in AppState

**Files:**

- Modify: `src/web/atcsim-shell/src/state/AppStateContext.tsx`
- Modify test: `src/web/atcsim-shell/src/state/__tests__/AppStateContext.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `AppStateContext.test.tsx`:

```ts
it('holds and resets the selected scenario', () => {
  const { result } = renderHook(() => useAppState(), { wrapper });
  act(() => result.current.setSelectedScenario({ id: 'EX-01', title: { en: 'x' }, aircraftClass: 'airliner', expectedCommands: [] }));
  expect(result.current.selectedScenario?.id).toBe('EX-01');
  // Changing the airport clears the scenario (gating reset).
  act(() => result.current.setAirport('GVA'));
  expect(result.current.selectedScenario).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/web/atcsim-shell; npm run test -- src/state/__tests__/AppStateContext.test.tsx`
Expected: FAIL — `setSelectedScenario` undefined.

- [ ] **Step 3: Implement**

Import the type at the top of `AppStateContext.tsx`:

```ts
import type { ScenarioSummary } from '../features/simulator/types';
```

In the `AppState` interface add:

```ts
  selectedScenario: ScenarioSummary | null;
  setSelectedScenario: (s: ScenarioSummary | null) => void;
```

Add state + callback:

```ts
  const [selectedScenario, setSelectedScenarioState] = useState<ScenarioSummary | null>(null);
  const setSelectedScenario = useCallback((s: ScenarioSummary | null) => setSelectedScenarioState(s), []);
```

Reset the scenario when the airport changes: inside the existing `setAirport` callback, next to `setSelectedFlightState(null);`, add `setSelectedScenarioState(null);`. Also reset it when the selected flight is cleared: in `setSelectedFlight`, if `flight` is `null`, call `setSelectedScenarioState(null)`. Add `selectedScenario` + `setSelectedScenario` to the `value` object and both dependency arrays.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src/web/atcsim-shell; npm run test -- src/state/__tests__/AppStateContext.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/web/atcsim-shell/src/state/AppStateContext.tsx src/web/atcsim-shell/src/state/__tests__/AppStateContext.test.tsx
git commit -m "feat(simulator): track selected scenario in app state with reset gating"
```

### Task 11: `ScenarioPicker` component

**Files:**

- Create: `src/web/atcsim-shell/src/features/simulator/ScenarioPicker.tsx`
- Test: `src/web/atcsim-shell/src/features/simulator/__tests__/ScenarioPicker.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { AppStateProvider } from '../../../state/AppStateContext';
import { ScenarioPicker } from '../ScenarioPicker';
import '../../../i18n';

vi.mock('../scenarioApi', () => ({
  fetchScenarios: vi.fn().mockResolvedValue([
    { id: 'EX-01', title: { en: 'Instruction to airliner' }, aircraftClass: 'airliner', expectedCommands: [] },
  ]),
}));

beforeAll(() => {
  // Fluent listbox needs these browser APIs (copy from BottomRibbon.test.tsx).
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } } as unknown as typeof IntersectionObserver;
  if (!window.matchMedia) {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } })) as unknown as typeof window.matchMedia;
  }
});

describe('ScenarioPicker', () => {
  it('renders a searchable combobox labelled Scenario', async () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <AppStateProvider>
          <ScenarioPicker voiceBaseUrl="" />
        </AppStateProvider>
      </FluentProvider>,
    );
    expect(await screen.findByRole('combobox', { name: /scenario/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/web/atcsim-shell; npm run test -- src/features/simulator/__tests__/ScenarioPicker.test.tsx`
Expected: FAIL — component missing.

- [ ] **Step 3: Implement `ScenarioPicker`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Combobox, Field, Option, makeStyles, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../../state/AppStateContext';
import { fetchScenarios } from './scenarioApi';
import type { ScenarioSummary } from './types';

const useStyles = makeStyles({
  root: { paddingBottom: tokens.spacingVerticalS },
});

export interface ScenarioPickerProps {
  voiceBaseUrl: string;
}

/** Localized title for the current UI language, falling back to English. */
function titleFor(scenario: ScenarioSummary, lang: string): string {
  return scenario.title[lang] ?? scenario.title[lang.split('-')[0]] ?? scenario.title.en ?? scenario.id;
}

/**
 * Searchable dropdown of simulator scenarios. Placed on the Chat/simulator
 * view between the selected-flight header and the mic. Selecting a scenario is
 * a prerequisite for arming the microphone (gating: aircraft → scenario → mic).
 */
export function ScenarioPicker({ voiceBaseUrl }: ScenarioPickerProps) {
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const { selectedScenario, setSelectedScenario } = useAppState();
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);

  useEffect(() => {
    let active = true;
    void fetchScenarios(voiceBaseUrl)
      .then((list) => { if (active) setScenarios(list); })
      .catch(() => { if (active) setScenarios([]); });
    return () => { active = false; };
  }, [voiceBaseUrl]);

  const lang = i18n.language;
  const selectedText = useMemo(
    () => (selectedScenario ? titleFor(selectedScenario, lang) : ''),
    [selectedScenario, lang],
  );

  return (
    <div className={styles.root}>
      <Field label={t('scenario.label')}>
        <Combobox
          aria-label={t('scenario.label')}
          placeholder={t('scenario.placeholder')}
          value={selectedText}
          selectedOptions={selectedScenario ? [selectedScenario.id] : []}
          onOptionSelect={(_, data) => {
            const next = scenarios.find((s) => s.id === data.optionValue) ?? null;
            setSelectedScenario(next);
          }}
        >
          {scenarios.map((s) => (
            <Option key={s.id} value={s.id} text={titleFor(s, lang)}>
              {titleFor(s, lang)}
            </Option>
          ))}
        </Combobox>
      </Field>
    </div>
  );
}
```

- [ ] **Step 4: Add `scenario.label` + `scenario.placeholder` to all four locales**

`en.json`: `"scenario": { "label": "Scenario", "placeholder": "Search scenarios…" }`.
`de.json`: `"scenario": { "label": "Szenario", "placeholder": "Szenarien suchen…" }`.
`fr.json`: `"scenario": { "label": "Scénario", "placeholder": "Rechercher des scénarios…" }`.
`it.json`: `"scenario": { "label": "Scenario", "placeholder": "Cerca scenari…" }`.

- [ ] **Step 5: Run test + build**

Run: `cd src/web/atcsim-shell; npm run test -- src/features/simulator/__tests__/ScenarioPicker.test.tsx`
Expected: PASS.
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/web/atcsim-shell/src/features/simulator/ScenarioPicker.tsx src/web/atcsim-shell/src/features/simulator/__tests__/ScenarioPicker.test.tsx src/web/atcsim-shell/src/i18n/locales
git commit -m "feat(simulator): add searchable scenario picker"
```

### Task 12: Speech client wrapper (thin, mockable)

**Design note:** Wrap `microsoft-cognitiveservices-speech-sdk` behind a tiny interface so components depend on `recognizeOnce`/`speak`, not the SDK. This keeps tests SDK-free and confines the third-party dependency to one file.

**Files:**

- Create: `src/web/atcsim-shell/src/features/chat/speechClient.ts`
- Test: `src/web/atcsim-shell/src/features/chat/__tests__/speechClient.test.ts`

- [ ] **Step 1: Add the dependency**

Run: `cd src/web/atcsim-shell; npm install microsoft-cognitiveservices-speech-sdk`
Note: the repo `.npmrc` sets `min-release-age=7`; if install is blocked by age policy, pin to the latest version older than 7 days (`npm install microsoft-cognitiveservices-speech-sdk@<version>`).

- [ ] **Step 2: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createSpeechClient } from '../speechClient';

vi.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechConfig: { fromAuthorizationToken: vi.fn(() => ({ speechRecognitionLanguage: '', speechSynthesisVoiceName: '' })) },
  AudioConfig: { fromDefaultMicrophoneInput: vi.fn(() => ({})), fromDefaultSpeakerOutput: vi.fn(() => ({})) },
  SpeechRecognizer: vi.fn(() => ({ recognizeOnceAsync: (cb: (r: unknown) => void) => cb({ text: 'heading 290' }), close: vi.fn() })),
  SpeechSynthesizer: vi.fn(() => ({ speakTextAsync: (_t: string, cb: () => void) => cb(), close: vi.fn() })),
  ResultReason: { RecognizedSpeech: 3 },
}));

describe('speechClient', () => {
  it('recognizes a single utterance', async () => {
    const client = createSpeechClient({ token: 't', region: 'switzerlandnorth', language: 'en-US', voice: 'en-US-JennyNeural' });
    const text = await client.recognizeOnce();
    expect(text).toBe('heading 290');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd src/web/atcsim-shell; npm run test -- src/features/chat/__tests__/speechClient.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement the wrapper**

```ts
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

export interface SpeechClientOptions {
  token: string;
  region: string;
  language: string; // e.g. 'en-US', 'de-CH'
  voice: string; // e.g. 'en-US-JennyNeural'
}

export interface SpeechClient {
  recognizeOnce: () => Promise<string>;
  speak: (text: string) => Promise<void>;
}

/**
 * Thin wrapper over Azure AI Speech STT/TTS. Audio is handled in-country
 * (Switzerland North) using a short-lived authorization token from the broker
 * — no key in the browser, no third-party audio path.
 */
export function createSpeechClient(options: SpeechClientOptions): SpeechClient {
  const config = sdk.SpeechConfig.fromAuthorizationToken(options.token, options.region);
  config.speechRecognitionLanguage = options.language;
  config.speechSynthesisVoiceName = options.voice;

  return {
    recognizeOnce: () =>
      new Promise<string>((resolve, reject) => {
        const recognizer = new sdk.SpeechRecognizer(config, sdk.AudioConfig.fromDefaultMicrophoneInput());
        recognizer.recognizeOnceAsync(
          (result) => {
            recognizer.close();
            resolve(result.text ?? '');
          },
          (err) => {
            recognizer.close();
            reject(new Error(String(err)));
          },
        );
      }),
    speak: (text: string) =>
      new Promise<void>((resolve, reject) => {
        const synth = new sdk.SpeechSynthesizer(config, sdk.AudioConfig.fromDefaultSpeakerOutput());
        synth.speakTextAsync(
          text,
          () => { synth.close(); resolve(); },
          (err) => { synth.close(); reject(new Error(String(err))); },
        );
      }),
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd src/web/atcsim-shell; npm run test -- src/features/chat/__tests__/speechClient.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/web/atcsim-shell/src/features/chat/speechClient.ts src/web/atcsim-shell/src/features/chat/__tests__/speechClient.test.ts src/web/atcsim-shell/package.json src/web/atcsim-shell/package-lock.json
git commit -m "feat(voice): add Azure Speech STT/TTS client wrapper"
```

### Task 13: `MicControl` gating + mock loop + engine toggle

**Files:**

- Modify: `src/web/atcsim-shell/src/features/chat/MicControl.tsx`
- Modify test: `src/web/atcsim-shell/src/features/chat/__tests__/MicControl.test.tsx`

- [ ] **Step 1: Write the failing gating test**

Add to `MicControl.test.tsx` (wrap in `AppStateProvider`; mock `../../simulator/scenarioApi` and `../speechClient`):

```tsx
it('disables the mic until a flight and scenario are both selected', () => {
  // Render MicControl inside AppStateProvider with no selection.
  // Expect the Talk button to be disabled.
  expect(screen.getByRole('button', { name: /talk/i })).toBeDisabled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/web/atcsim-shell; npm run test -- src/features/chat/__tests__/MicControl.test.tsx`
Expected: FAIL — button not disabled (gating not implemented).

- [ ] **Step 3: Implement gating + engine toggle + mock loop**

Extend `MicControl` to read `selectedFlight` + `selectedScenario` from `useAppState()`, add a Mock/Live `Switch`, and run the mock loop (fetch capabilities on mount; fetch speech token; recognize → `postScenarioTurn` → speak read-back). Full component:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Switch, Text, makeStyles, tokens } from '@fluentui/react-components';
import { Mic24Regular, MicOff24Regular, Speaker224Regular } from '@fluentui/react-icons';
import { startVoiceSession, type VoiceSession } from '../../voice/voiceLiveClient';
import { useAppState } from '../../state/AppStateContext';
import { fetchCapabilities, fetchSpeechToken, postScenarioTurn } from '../simulator/scenarioApi';
import { createSpeechClient } from './speechClient';

type Status = 'idle' | 'connecting' | 'connected' | 'listening' | string;

const DEFAULT_BROKER_BASE_URL = import.meta.env.VITE_VOICE_API_BASE_URL ?? '';

const VOICE_BY_LANG: Record<string, { language: string; voice: string }> = {
  en: { language: 'en-US', voice: 'en-US-JennyNeural' },
  de: { language: 'de-CH', voice: 'de-CH-LeniNeural' },
  fr: { language: 'fr-CH', voice: 'fr-CH-ArianeNeural' },
  it: { language: 'it-IT', voice: 'it-IT-ElsaNeural' },
};

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalS },
  status: { color: tokens.colorNeutralForeground2 },
  disclosure: { display: 'flex', alignItems: 'center', columnGap: tokens.spacingHorizontalXS, color: tokens.colorNeutralForeground3 },
});

export interface MicControlProps {
  brokerBaseUrl?: string;
}

export function MicControl({ brokerBaseUrl = DEFAULT_BROKER_BASE_URL }: MicControlProps) {
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const { selectedFlight, selectedScenario } = useAppState();
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [liveAvailable, setLiveAvailable] = useState(false);
  const [useLive, setUseLive] = useState(false);

  const armed = selectedFlight !== null && selectedScenario !== null;

  useEffect(() => {
    let active = true;
    void fetchCapabilities(brokerBaseUrl)
      .then((c) => { if (active) setLiveAvailable(c.liveAvailable); })
      .catch(() => { if (active) setLiveAvailable(false); });
    return () => { active = false; };
  }, [brokerBaseUrl]);

  const runMockTurn = useCallback(async () => {
    if (!selectedScenario) return;
    setStatus('listening');
    const { token, region } = await fetchSpeechToken(brokerBaseUrl);
    const langKey = i18n.language.split('-')[0];
    const voice = VOICE_BY_LANG[langKey] ?? VOICE_BY_LANG.en;
    const speech = createSpeechClient({ token, region, ...voice });
    const atcTranscript = await speech.recognizeOnce();
    const turn = await postScenarioTurn(brokerBaseUrl, selectedScenario.id, atcTranscript);
    if (turn.readBackText) await speech.speak(turn.readBackText);
    setStatus('connected');
  }, [brokerBaseUrl, selectedScenario, i18n.language]);

  const handleClick = useCallback(async () => {
    if (!armed) return;
    if (useLive) {
      if (session) { session.stop(); setSession(null); setStatus('idle'); return; }
      setStatus('connecting');
      try {
        const next = await startVoiceSession(brokerBaseUrl);
        setSession(next);
        setStatus('connected');
      } catch (err) {
        setStatus(err instanceof Error ? err.message : String(err));
      }
      return;
    }
    try {
      await runMockTurn();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }, [armed, useLive, session, brokerBaseUrl, runMockTurn]);

  const active = session !== null;

  return (
    <div className={styles.root}>
      <Switch
        label={t('voice.engineLive')}
        checked={useLive}
        disabled={!liveAvailable}
        onChange={(_, d) => setUseLive(d.checked)}
      />
      <Button
        appearance="primary"
        disabled={!armed}
        icon={active ? <MicOff24Regular /> : <Mic24Regular />}
        onClick={() => { void handleClick(); }}
      >
        {t('chat.talk')}
      </Button>
      <Text className={styles.status}>{armed ? status : t('chat.selectScenarioFirst')}</Text>
      <div role="note" className={styles.disclosure}>
        <Speaker224Regular aria-hidden="true" />
        <Text>{t('chat.syntheticDisclosure')}</Text>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add new i18n keys to all four locales**

`chat.selectScenarioFirst` and `voice.engineLive`.
`en.json`: `"selectScenarioFirst": "Select an aircraft and a scenario to begin"` (under `chat`); `"voice": { "engineLive": "Live voice engine (preview)" }`.
`de.json`: `"selectScenarioFirst": "Flugzeug und Szenario auswählen, um zu beginnen"`; `"voice": { "engineLive": "Live-Sprach-Engine (Vorschau)" }`.
`fr.json`: `"selectScenarioFirst": "Sélectionnez un avion et un scénario pour commencer"`; `"voice": { "engineLive": "Moteur vocal en direct (préversion)" }`.
`it.json`: `"selectScenarioFirst": "Seleziona un aereo e uno scenario per iniziare"`; `"voice": { "engineLive": "Motore vocale live (anteprima)" }`.

- [ ] **Step 5: Run tests + build**

Run: `cd src/web/atcsim-shell; npm run test -- src/features/chat/__tests__/MicControl.test.tsx`
Expected: PASS.
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/web/atcsim-shell/src/features/chat/MicControl.tsx src/web/atcsim-shell/src/features/chat/__tests__/MicControl.test.tsx src/web/atcsim-shell/src/i18n/locales
git commit -m "feat(voice): gate mic on aircraft+scenario, add mock loop and live toggle"
```

### Task 14: Wire `ScenarioPicker` into `ChatPage`

**Files:**

- Modify: `src/web/atcsim-shell/src/features/chat/ChatPage.tsx`
- Modify test: `src/web/atcsim-shell/src/features/chat/__tests__/ChatPage.test.tsx`

- [ ] **Step 1: Add the picker between the header and the columns**

Import and render `ScenarioPicker` right after `<SelectedFlightHeader />`:

```tsx
import { ScenarioPicker } from '../simulator/ScenarioPicker';
```

```tsx
      <SelectedFlightHeader />
      <ScenarioPicker voiceBaseUrl={VOICE_BASE_URL} />
      <div className={styles.columns}>
```

- [ ] **Step 2: Update the ChatPage test**

In `ChatPage.test.tsx`, mock `../simulator/scenarioApi` (`fetchScenarios` → `[]`, `fetchCapabilities` → `{ liveAvailable: false, mockAvailable: true }`) so the render doesn't hit the network, and keep the existing assertions. Add the Fluent observer shims in `beforeAll` if not already present.

- [ ] **Step 3: Run tests + build**

Run: `cd src/web/atcsim-shell; npm run test -- src/features/chat/__tests__/ChatPage.test.tsx`
Expected: PASS.
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/web/atcsim-shell/src/features/chat/ChatPage.tsx src/web/atcsim-shell/src/features/chat/__tests__/ChatPage.test.tsx
git commit -m "feat(simulator): place scenario picker on the chat view"
```

### Task 15: Full frontend + backend suite green

- [ ] **Step 1: Run the whole frontend suite**

Run: `cd src/web/atcsim-shell; npm run test`
Expected: all tests PASS (no lingering `useFlightPolling`/`refreshCadenceSec` references).

- [ ] **Step 2: Run the backend suites (one project each)**

Run: `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj`
Run: `dotnet test tests/apis/AtcSim.FlightDataApi.Tests/AtcSim.FlightDataApi.Tests.csproj`
Expected: both PASS.

- [ ] **Step 3: Frontend build**

Run: `cd src/web/atcsim-shell; npm run build`
Expected: build succeeds.

---

## Infra, API contract & docs

### Task 16: API-first — update `api/openapi.yaml` + `docs/DATA.md`

**Files:**

- Modify: `api/openapi.yaml`
- Modify: `docs/DATA.md`

- [ ] **Step 1: Document the four broker endpoints**

Add paths (under the demo/broker section, matching existing style) for `GET /voice/capabilities`, `GET /voice/scenarios`, `GET /voice/speech/token`, and `POST /voice/scenario/turn`, with request/response schemas mirroring the DTOs in Task 6/7/8. Keep `personalData: false`, public/synthetic notes.

- [ ] **Step 2: Sync `docs/DATA.md` §5**

Add the four contracts to the data-contracts table with the same field lists; note residency (Switzerland North) for the speech token, and that `scenario/turn` runs the deterministic validator/dispatcher and emits transcript events.

- [ ] **Step 3: Lint the docs**

Run: `npx markdownlint-cli2 docs/DATA.md`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add api/openapi.yaml docs/DATA.md
git commit -m "docs(api): add scenario/capabilities/speech-token/turn contracts"
```

### Task 17: ADR-0007 + runbook + spec cross-reference

**Files:**

- Create: `docs/adr/ADR-0007-mock-scenario-voice-loop.md`
- Modify: `docs/runbooks/poc-e2e-validation-runbook.md`
- Modify: `docs/specs/2026-07-20-simulator-scenarios-efficient-flightload-design.md` (mark ADR-0007 accepted; add plan link)

- [ ] **Step 1: Write ADR-0007**

Follow the format of `docs/adr/ADR-0004-voice-live-foundry-agent.md`. Decision: the mock scenario voice loop uses Azure AI Speech STT/TTS (Switzerland North) via a broker-minted MI token plus the existing deterministic command boundary; rejected alternative: browser Web Speech API (routes audio to a third party, violates CON-03/residency). Consequences: works without the Foundry agent; live path unchanged.

- [ ] **Step 2: Extend the E2E runbook**

Add a section covering: startup one-shot Switzerland load + manual refresh; scenario select → armed mic → spoken exercise for EX-01..EX-04 with both sides transcribed; mock↔live toggle behaviour (live disabled until capabilities report it available).

- [ ] **Step 3: Cross-link the spec**

In the design spec, change "proposed ADR-0007" references to link to the new file and add a line linking this implementation plan.

- [ ] **Step 4: Lint**

Run: `npx markdownlint-cli2 docs/adr/ADR-0007-mock-scenario-voice-loop.md docs/runbooks/poc-e2e-validation-runbook.md docs/specs/2026-07-20-simulator-scenarios-efficient-flightload-design.md`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add docs/adr/ADR-0007-mock-scenario-voice-loop.md docs/runbooks/poc-e2e-validation-runbook.md docs/specs/2026-07-20-simulator-scenarios-efficient-flightload-design.md
git commit -m "docs: ADR-0007 mock scenario voice loop + runbook + spec links"
```

### Task 18: Bicep — Azure AI Speech account + role assignment

**Files:**

- Modify: `infra/` (locate the module that defines the voice-api + its managed identity; add a Cognitive Services (kind `SpeechServices`) account in Switzerland North and a `Cognitive Services User` role assignment for the voice-api MI). Inspect `infra/main.bicep` and `infra/shared/` first to follow the existing module/param pattern.

- [ ] **Step 1: Inspect the existing infra layout**

Run: `Get-ChildItem -Recurse infra -Filter *.bicep | Select-Object -ExpandProperty FullName`
Read the module that provisions `voice-agent-api` and its identity.

- [ ] **Step 2: Add the Speech account + role assignment**

Add a `Microsoft.CognitiveServices/accounts` resource (`kind: 'SpeechServices'`, `location: 'switzerlandnorth'`, SKU `S0`), output its endpoint/region, and add a role assignment granting the voice-api MI the `Cognitive Services User` role (`a97b65f3-24c7-4388-baec-2e87135dc908`). Wire `Speech__Region` (and `Speech__ResourceId`) app settings into the voice-api.

- [ ] **Step 3: Build the Bicep**

Run: `az bicep build --file infra/main.bicep`
Expected: compiles with no errors. Delete the generated `infra/main.json` afterward (build artifact — not committed; see repo convention).

- [ ] **Step 4: Commit**

```bash
git add infra
git commit -m "infra: add Azure AI Speech account (Switzerland North) + MI role for voice-api"
```

### Task 19: Seed scenario JSON fixtures (traceability with the sample schema)

**Files:**

- Create: `data/scenarios/examples/EX-01.json` … `EX-04.json`

- [ ] **Step 1: Author the four fixtures**

Each file is schema-consistent with `data/scenarios/sample-scenario.json` (`metadata.scope="demo"`, `personalData=false`, `operationalUse=false`), reusing golden refs: EX-01→G-01 (`SET_HEADING`,`SET_FLIGHT_LEVEL`), EX-02→G-02 (`REPORT_POINT`), EX-03→G-04 (`TRAFFIC_INFO`), EX-04→G-04 (`TRAFFIC_INFO`, IFR). Include localized `metadata.name`/title fields for en/de/fr/it and the `expectedCommands` array. These fixtures are the authoring source of truth referenced by the backend catalog (the backend `MockScenarioService` hardcodes the same ids/titles for the demo; the fixtures document the full scenario for the later persistence sprint).

- [ ] **Step 2: Validate JSON parses**

Run: `Get-ChildItem data/scenarios/examples/*.json | ForEach-Object { Get-Content $_ -Raw | ConvertFrom-Json | Out-Null; "$($_.Name) OK" }`
Expected: `EX-01.json OK` … `EX-04.json OK`.

- [ ] **Step 3: Commit**

```bash
git add data/scenarios/examples
git commit -m "feat(simulator): seed EX-01..EX-04 scenario fixtures"
```

---

## Open points (human-gated — carried into this sprint, not code)

These are tracked in the sprint GitHub issue and completed by a human; the agent must not perform merges/promotions:

- **Publish the Foundry virtual-pilot agent** and set `VoiceLive__AgentId` / `VoiceLive__ProjectId` on `voice-agent-api` (SIT). Once set, `GET /api/voice/capabilities` returns `liveAvailable: true` and the Live toggle enables automatically — no code change needed.
- **Approve the PROD promotion gate** in the pipeline.
- **Delete the merged `feat/zrh-realflight-ux` branch** (local + remote): `git branch -d feat/zrh-realflight-ux; git push origin --delete feat/zrh-realflight-ux` (human-run).

---

## Self-Review

**Spec coverage:**

- D1 one-shot load + manual refresh → Tasks 1–5. ✅
- D2 mock voice via Azure Speech → Tasks 8, 12, 13. ✅
- D3 both engines + toggle → Task 7 (capabilities) + Task 13 (toggle). ✅
- D4 picker placement + gating aircraft→scenario→mic → Tasks 10, 11, 13, 14. ✅
- D5 open points → Open points section (human-gated). ✅
- D6 no persistence → nothing stored; fixtures are static authoring files (Task 19), no runtime storage. ✅
- §5 four endpoints → Tasks 6, 7, 8 + openapi/DATA (Task 16). ✅
- §6 ADR-0007 + residency → Task 17 + Task 18. ✅
- §9 testing (frontend Vitest, backend xUnit, infra bicep, E2E runbook) → per-task tests + Tasks 15, 17. ✅
- §7 traceability (US-013/024/025/052) → recorded in the sprint issue + PRs.

**Placeholder scan:** No TBD/TODO. The only intentionally-descriptive steps are Task 16/17/18/19 authoring steps (openapi paths, ADR prose, Bicep resource, JSON fixtures) which specify exact resource types, ids, schema source, and validation commands.

**Type consistency:** `ScenarioSummary` shape is identical in `types.ts` (frontend) and `ScenarioContracts.cs` (backend: `Id`, `Title` map, `AircraftClass`, `ExpectedCommands`). `ScenarioTurnResponse` fields (`accepted`, `command`, `readBackText`, `phraseologyFlags`) match front/back. `useFlightData` returns `{ aircraft, error, loading, lastUpdated, refresh }` — consumed identically in Task 3/4. `flightsUpdatedAt`/`setFlightsUpdatedAt` and `selectedScenario`/`setSelectedScenario` names are consistent across Tasks 4/5/10/13. `createSpeechClient` / `recognizeOnce` / `speak` names consistent Task 12↔13.

---

## Execution Handoff

Plan complete. Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task with review between tasks.
2. **Inline Execution** — execute tasks in this session with checkpoints.
