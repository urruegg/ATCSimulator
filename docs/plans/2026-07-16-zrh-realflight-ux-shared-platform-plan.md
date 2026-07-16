# ZRH Real-Flight UX + Shared Platform Implementation Plan

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | ZRH Real-Flight UX + Shared Platform — Implementation Plan |
| Type | Plan |
| Version | 0.1 (Draft) |
| Date | 2026-07-16 |
| Author | ATCSimulator team |
| Status | Draft — ready to execute |
| Classification | Public — anonymized demo |

**GitHub issue:** [#5](https://github.com/urruegg/ATCSimulator/issues/5) · **Design:** [spec](../specs/2026-07-16-zrh-realflight-ux-shared-platform-design.md) · **Sprint:** [doc](../sprints/2026-07-16-sprint-zrh-realflight-ux.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do work in a `.worktrees/` worktree on a `feat/` branch; merge `--no-ff`; push only on request.

**Goal:** Ship the ZRH real-flight Teams-like experience (extended Map + live Chat, EN/DE/FR/IT, brandkit) and the shared platform (Azure Maps, Azure DNS delegation of `swissshub.com`, shared Azure Front Door, custom domains + TLS), demo plane only.

**Architecture:** One React SPA (`atcsim-shell`) with a Teams-like shell, `AppStateContext` for cross-view selection, `react-i18next` for four languages, keyless Azure Maps via a backend token endpoint, and the existing Voice Live broker for the live chat. Shared services (`swissshub` RG): Azure DNS + Azure Front Door front all public hostnames. Build UI-first in four phases; DNS/domain cutover last.

**Tech Stack:** React 18 + TypeScript + Vite + Fluent UI v9 + `@fluentui/react-icons` + `react-i18next` + `azure-maps-control` + MSAL; ASP.NET Core 8 minimal APIs + xUnit; Bicep (subscription- and RG-scoped) + Azure Front Door + Azure DNS + Azure Maps; GitHub Actions.

---

## File structure

### Frontend (`src/web/atcsim-shell/`)

- `public/brand/*`, `public/favicons/*` — brand assets (from `docs/brandkit`).
- `index.html` — favicon/logo links.
- `src/theme/atcsimulatorTheme.ts`, `src/theme/tokens.css` — Fluent v9 brand theme.
- `src/i18n/index.ts`, `src/i18n/locales/{en,de,fr,it}.json` — i18n.
- `src/state/AppStateContext.tsx` — shared selection/settings state.
- `src/app/AppShell.tsx`, `src/app/AppRail.tsx`, `src/app/Header.tsx`, `src/app/router.tsx`.
- `src/app/header/{LanguagePicker,AirportPicker,UserMenu}.tsx`.
- `src/features/flight-data/{AircraftMapPage,SelectedFlightHeader,useFlightPolling,mapAuth,airports}.ts(x)`.
- `src/features/chat/{ChatPage,MicControl,useLiveTranscript}.ts(x)`.

### Backend

- `src/apis/AtcSim.FlightDataApi/` — add `Services/MapsTokenService.cs`, `Options/MapsOptions.cs`, `airports` bbox map; endpoint `/api/maps/token`.
- `src/apis/AtcSim.VoiceAgentApi/` — add transcript streaming (`/api/voice/transcript/stream` SSE) to the broker.

### Infra

- `infra/modules/maps.bicep` — Azure Maps account + RBAC (solution RG).
- `infra/shared/main.bicep` — shared RG deployment: `dns.bicep` (zone `swissshub.com`) + `frontdoor.bicep` (`fdswissshub`).
- `infra/main.bicep` — instantiate `maps.bicep`; expose Maps account name; app settings.
- `.github/workflows/cd.yml` + `.github/actions/deploy-environment/action.yml` — deploy shared RG + Front Door routes.

### Docs

- `docs/adr/ADR-0005-shared-platform-frontdoor-dns.md`, `docs/adr/ADR-0006-azure-maps-keyless-auth.md`.
- Update `docs/BOM.md`, `docs/SD.md`; extend `docs/runbooks/poc-e2e-validation-runbook.md`.

---

## Phase 1 — App shell, i18n, theming

## Task 1: Place brand artifacts

**Files:** copy into `src/web/atcsim-shell/public/brand/`, `public/favicons/`, `src/theme/`.

- [ ] **Step 1: Copy assets**

```powershell
$app = 'src/web/atcsim-shell'
New-Item -ItemType Directory -Force -Path "$app/public/brand","$app/public/favicons","$app/src/theme" | Out-Null
Copy-Item docs/brandkit/logo/atcsimulator-logo.svg,docs/brandkit/logo/atcsimulator-symbol.svg,docs/brandkit/logo/atcsimulator-logo-tagline.svg,docs/brandkit/icon/atcsimulator-icon.svg "$app/public/brand/"
Copy-Item docs/brandkit/icon/favicons/atcsimulator-16.png,docs/brandkit/icon/favicons/atcsimulator-32.png,docs/brandkit/icon/favicons/atcsimulator-48.png,docs/brandkit/icon/favicons/atcsimulator-180.png,docs/brandkit/icon/favicons/atcsimulator-192.png,docs/brandkit/icon/favicons/atcsimulator-512.png "$app/public/favicons/"
Copy-Item docs/brandkit/color/atcsimulator-theme.ts "$app/src/theme/atcsimulatorTheme.ts"
Copy-Item docs/brandkit/color/atcsimulator-tokens.css "$app/src/theme/tokens.css"
```

- [ ] **Step 2: Link favicon + title in `index.html`** — add `<link rel="icon" href="/favicons/atcsimulator-32.png">`, apple-touch-icon `180`, and keep `<title>ATCSim PoCs</title>` → `ATCSimulator`.
- [ ] **Step 3: Verify the theme file has no `docs/`-relative imports** — if `atcsimulatorTheme.ts` imports tokens, fix the path to `./tokens` or inline. Run `npm run build --prefix src/web/atcsim-shell` and confirm it compiles.
- [ ] **Step 4: Commit**

```bash
git add src/web/atcsim-shell/public src/web/atcsim-shell/src/theme src/web/atcsim-shell/index.html
git commit -m "feat(web): add brandkit assets + Fluent theme to the shell"
```

## Task 2: i18n (EN/DE/FR/IT)

**Files:** `src/i18n/index.ts`, `src/i18n/locales/{en,de,fr,it}.json`, test `src/i18n/__tests__/i18n.test.ts`.

- [ ] **Step 1: Add deps** — `npm install --prefix src/web/atcsim-shell i18next react-i18next i18next-browser-languagedetector`.
- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import i18n from '../index';

describe('i18n', () => {
  it('translates the app title in DE', async () => {
    await i18n.changeLanguage('de');
    expect(i18n.t('app.title')).toBe('ATCSimulator');
    expect(i18n.t('nav.map')).toBe('Karte');
  });
});
```

- [ ] **Step 3: Run to fail** — `npm run test --prefix src/web/atcsim-shell -- i18n` → FAIL (module missing).
- [ ] **Step 4: Implement** `src/i18n/index.ts`

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import it from './locales/it.json';

export const SUPPORTED = ['en', 'de', 'fr', 'it'] as const;

void i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: { en: { translation: en }, de: { translation: de }, fr: { translation: fr }, it: { translation: it } },
  fallbackLng: 'en',
  supportedLngs: SUPPORTED as unknown as string[],
  detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  interpolation: { escapeValue: false },
});

export default i18n;
```

Create the four locale files with keys `app.title`, `nav.map`, `nav.chat`, `header.language`, `header.airport`, `header.signOut`, `header.switchAccount`, `map.selectAdvisory`, `chat.atc`, `chat.pilot`, `chat.talk`, `chat.syntheticDisclosure`, `settings.refresh`. DE `nav.map` = "Karte", `nav.chat` = "Chat"; FR "Carte"/"Chat"; IT "Mappa"/"Chat".

- [ ] **Step 5: Run to pass** — `npm run test --prefix src/web/atcsim-shell -- i18n`.
- [ ] **Step 6: Commit** — `git commit -m "feat(web): add i18n with EN/DE/FR/IT bundles"`.

## Task 3: AppStateContext

**Files:** `src/state/AppStateContext.tsx`, test `src/state/__tests__/AppStateContext.test.tsx`.

- [ ] **Step 1: Failing test** — render a probe component in the provider, call `setAirport('GVA')` guarded (GVA disabled → stays ZRH), `setSelectedFlight({callsign:'SWR123'})`, assert `localStorage` persists `refreshCadence` default 5.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement** — context with `{ airport, selectedFlight, language, refreshCadenceSec }` + setters; `airport` fixed to `'ZRH'` (setter rejects disabled airports); persist `refreshCadenceSec` and `language` to `localStorage`; changing `airport` resets `selectedFlight`.
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(web): add shared AppStateContext (airport/flight/lang/cadence)"`.

## Task 4: Header (logo + pickers + user menu)

**Files:** `src/app/Header.tsx`, `src/app/header/{LanguagePicker,AirportPicker,UserMenu}.tsx`, test `src/app/header/__tests__/Header.test.tsx`.

- [ ] **Step 1: Failing test** — render `Header`; assert the brand logo `img[alt="ATCSimulator"]` renders, the airport dropdown shows `ZRH` and a disabled `GVA — coming soon`, and the user menu exposes `Sign out` + `Sign in with another account`.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement** — Fluent `Dropdown`/`Menu`, `@fluentui/react-icons` (`Globe24Regular`, `Location24Regular`, `Person24Regular`); logo `<img src="/brand/atcsimulator-logo.svg">` top-left; LanguagePicker calls `i18n.changeLanguage` + context; UserMenu reads MSAL `accounts[0]`, wires `instance.logoutRedirect()` and `instance.loginRedirect()`.
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(web): app header with logo, language/airport pickers, user menu"`.

## Task 5: AppShell + AppRail + router

**Files:** `src/app/AppShell.tsx`, `src/app/AppRail.tsx`, `src/app/router.tsx`, `src/App.tsx`, `src/main.tsx`, test `src/app/__tests__/AppShell.test.tsx`.

- [ ] **Step 1: Failing test** — render the shell at `/`; assert the rail exposes `Map` and `Chat` items (Fluent icons + labels) and the shell root has `min-height: 100vh` with a flex-fill content region.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement** — `AppShell` = full-height flex (`100vh`): `Header` on top, `AppRail` left (`NavDrawer`/custom rail with `Map24Regular`/`Chat24Regular` + labels), content `<Outlet/>` flex-fills (`flex:1; min-height:0`). `router.tsx` nests `/` (Map) and `/chat` (Chat) under `AppShell`. `App.tsx` wraps `MsalProvider` → `FluentProvider theme={atcSimulatorLightTheme}` → `I18nextProvider` → `AppStateProvider` → `RouterProvider`. `main.tsx` imports `./theme/tokens.css` and `./i18n`.
- [ ] **Step 4: Run to pass; then** `npm run build --prefix src/web/atcsim-shell`.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): teams-like full-height shell with icon rail + routing"`.

---

## Phase 2 — Map view

## Task 6: Maps token endpoint + airport bbox (backend, TDD)

**Files:** `src/apis/AtcSim.FlightDataApi/Options/MapsOptions.cs`, `Services/MapsTokenService.cs`, `Program.cs`; test `tests/apis/AtcSim.FlightDataApi.Tests/MapsTokenTests.cs`.

- [ ] **Step 1: Failing test** — `MapsTokenService.GetTokenAsync` returns a non-empty token using an injected `TokenCredential` stub (scope `https://atlas.microsoft.com/.default`); an `Airports.BoundingBox("ZRH")` helper returns the ZRH box `47.7,47.2,8.3,8.8` (N,S,W,E) and throws for unknown codes.
- [ ] **Step 2: Run to fail** — `dotnet test tests/apis/AtcSim.FlightDataApi.Tests/AtcSim.FlightDataApi.Tests.csproj --filter MapsToken`.
- [ ] **Step 3: Implement** — `MapsTokenService(TokenCredential cred)` calls `cred.GetTokenAsync(new(["https://atlas.microsoft.com/.default"]), ct)`; `MapsOptions { ClientId }`; register `DefaultAzureCredential` + service; endpoint `app.MapGet("/api/maps/token", async (MapsTokenService s, CancellationToken ct) => Results.Ok(new { token = (await s.GetTokenAsync(ct)) }));`. Add `Airports` static bbox map (ZRH enabled; GVA present but flagged coming-soon).
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(flight-data): keyless Azure Maps token endpoint + airport bbox"`.

## Task 7: mapAuth + flight polling hook (frontend, TDD)

**Files:** `src/features/flight-data/mapAuth.ts`, `useFlightPolling.ts`, `airports.ts`, tests under `__tests__/`.

- [ ] **Step 1: Failing tests** — `fetchMapsToken(base)` GETs `${base}/api/maps/token` and returns `token`; `useFlightPolling` calls `fetchAircraft` immediately and re-polls after `cadenceSec` (fake timers), stops on unmount.
- [ ] **Step 2: Run to fail** — `npm run test --prefix src/web/atcsim-shell -- flight-data`.
- [ ] **Step 3: Implement** — `mapAuth.fetchMapsToken`; `useFlightPolling(bounds, cadenceSec)` using `setInterval` + cleanup, returns `{ aircraft, error }`.
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(web): maps token client + flight polling hook"`.

## Task 8: SelectedFlightHeader (TDD)

**Files:** `src/features/flight-data/SelectedFlightHeader.tsx`, test.

- [ ] **Step 1: Failing test** — with no `selectedFlight` the header renders the advisory (`map.selectAdvisory`); with one it renders callsign/type/reg/FL/heading/speed/position.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement** — reads `AppStateContext.selectedFlight`; uses Fluent text + a `LiveRegular` icon; advisory otherwise.
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(web): selected-flight header with advisory state"`.

## Task 9: AircraftMapPage with Azure Maps

**Files:** `src/features/flight-data/AircraftMapPage.tsx`, minimal render test.

- [ ] **Step 1: Failing test** — render `AircraftMapPage`; assert a map host element (`#azure-map-host`) and the `SelectedFlightHeader` are present, and the refresh-cadence control (default 5s) renders.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement** — full-height map host; init `atlas.Map` with `authOptions` `authType: 'anonymous'`, `getToken` calling `fetchMapsToken`; center on ZRH; render markers from `useFlightPolling(Airports.bbox('ZRH'), cadence)`; `marker.onclick` sets `selectedFlight`; a Fluent `Dropdown`/`SpinButton` for cadence bound to context.
- [ ] **Step 4: Run to pass; then** `npm run build --prefix src/web/atcsim-shell`.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): ZRH Azure Maps view with selectable live flights"`.

---

## Phase 3 — Chat view

## Task 10: Broker transcript streaming (backend, TDD)

**Files:** `src/apis/AtcSim.VoiceAgentApi/Services/TranscriptHub.cs`, `Program.cs`; test `tests/apis/AtcSim.VoiceAgentApi.Tests/TranscriptHubTests.cs`.

- [ ] **Step 1: Failing test** — `TranscriptHub.Publish(new TranscriptEvent("atc","...",ts))` is delivered to a subscribed reader; role is preserved.
- [ ] **Step 2: Run to fail** — `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/... --filter TranscriptHub`.
- [ ] **Step 3: Implement** — an in-memory `Channel<TranscriptEvent>` hub (singleton); `POST /api/voice/transcript` publishes; add `GET /api/voice/transcript/stream` as SSE (`text/event-stream`) that yields events. No personal data logged (audit only).
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(voice): transcript hub + SSE stream for the chat view"`.

## Task 11: useLiveTranscript hook (frontend, TDD)

**Files:** `src/features/chat/useLiveTranscript.ts`, test.

- [ ] **Step 1: Failing test** — given a mocked `EventSource`, dispatched messages append role-tagged entries in order.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement** — subscribe to `${voiceBase}/api/voice/transcript/stream` via `EventSource`; expose `entries: {role, text, ts}[]`; cleanup on unmount.
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(web): live transcript hook (SSE)"`.

## Task 12: MicControl (TDD)

**Files:** `src/features/chat/MicControl.tsx`, test.

- [ ] **Step 1: Failing test** — renders a push-to-talk button (`Mic24Regular`), a status label, and the synthetic-voice disclosure text (`chat.syntheticDisclosure`); toggling calls `startVoiceSession`/`stop` (mocked).
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement** — wraps the existing `voice/voiceLiveClient` (`startVoiceSession`/`stop`); Fluent `Mic24Regular`/`MicOff24Regular`/`Speaker2 24Regular`; status from session state; disclosure always visible (`DP-16`).
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(web): mic control with synthetic-voice disclosure"`.

## Task 13: ChatPage (two columns)

**Files:** `src/features/chat/ChatPage.tsx`, test.

- [ ] **Step 1: Failing test** — renders `SelectedFlightHeader`, an ATC column (`Headset24Regular` + `chat.atc`) and a Pilot column (`Airplane24Regular` + `chat.pilot`), and role-tagged bubbles from `useLiveTranscript` (ATC left, Pilot right); full-height layout.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement** — full-height flex; two columns; bubbles aligned by role; `MicControl` bar at the bottom; passes `selectedFlight.callsign` into the voice session context.
- [ ] **Step 4: Run to pass; then** `npm run build --prefix src/web/atcsim-shell`.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): chat view with ATC/Pilot columns + live transcript"`.

---

## Phase 4 — Shared platform & infra

## Task 14: Azure Maps Bicep + RBAC

**Files:** `infra/modules/maps.bicep`, `infra/main.bicep`.

- [ ] **Step 1: Implement `maps.bicep`** — `Microsoft.Maps/accounts@2023-06-01` (SKU `G2`), output `name`; role assignment **Azure Maps Data Reader** (`id 423170ca-a8f6-4b0f-8487-9e4eb8f49bfc`) to the flight-data API principal id (param).
- [ ] **Step 2: Wire into `infra/main.bicep`** — instantiate `maps`, pass `flightDataApi.outputs.principalId`; add app setting `Maps__AccountName` on the flight-data app.
- [ ] **Step 3: Validate** — `az bicep build --file infra/main.bicep` (compiles; only version warning).
- [ ] **Step 4: Commit** — `git commit -m "feat(infra): Azure Maps account + keyless RBAC for flight-data"`.

## Task 15: Shared RG + Azure DNS zone

**Files:** `infra/shared/main.bicep` (subscription scope), `infra/shared/modules/dns.bicep`, `infra/shared/parameters/shared.bicepparam`.

- [ ] **Step 1: Implement `dns.bicep`** — `Microsoft.Network/dnsZones@2018-05-01` name `swissshub.com`; output `nameServers`.
- [ ] **Step 2: Implement `infra/shared/main.bicep`** (`targetScope = 'subscription'`) — create RG `swissshub`; module `dns` into it; output `nameServers`.
- [ ] **Step 3: Validate** — `az bicep build --file infra/shared/main.bicep`.
- [ ] **Step 4: Deploy (human/CD)** — `az deployment sub create --location swedencentral --template-file infra/shared/main.bicep`; capture `nameServers`.
- [ ] **Step 5: HUMAN GATE** — set those 4 nameservers at GoDaddy for `swissshub.com`; verify with `Resolve-DnsName -Type NS swissshub.com`.
- [ ] **Step 6: Commit** — `git commit -m "feat(infra): shared swissshub RG + Azure DNS zone"`.

## Task 16: Azure Front Door + custom domains

**Files:** `infra/shared/modules/frontdoor.bicep`, records added to `dns.bicep`.

- [ ] **Step 1: Implement `frontdoor.bicep`** — profile `fdswissshub` (`Microsoft.Cdn/profiles`, SKU `Standard_AzureFrontDoor`); one endpoint; origin groups for web + flight + voice (origins = App Service default hostnames per env); custom domains `app`/`appsit`/`api`/`apisit`.`atcsim.swissshub.com` with **Front Door-managed TLS**; routes: `app[sit]` → web; `api[sit]` with path rules `/api/aircraft*`,`/api/maps/*` → flight, `/api/voice/*` → voice; enable WebSocket on the voice route.
- [ ] **Step 2: DNS records in `dns.bicep`** — `_dnsauth` TXT + CNAME for each custom domain to the Front Door endpoint hostname (param-driven).
- [ ] **Step 3: Validate** — `az bicep build --file infra/shared/main.bicep`.
- [ ] **Step 4: Origin lock** — set App Service access restriction to the `fdswissshub` `X-Azure-FDID`.
- [ ] **Step 5: Commit** — `git commit -m "feat(infra): shared Azure Front Door + custom domains + managed TLS"`.

## Task 17: CD pipeline for shared + solution

**Files:** `.github/actions/deploy-environment/action.yml`, `.github/workflows/cd.yml`, `scripts/bootstrap-cicd.ps1`.

- [ ] **Step 1: Bootstrap** — add `Microsoft.Maps`, `Microsoft.Cdn`, `Microsoft.Network` RP registration; grant the deployer identity Contributor on the `swissshub` RG (create it in bootstrap).
- [ ] **Step 2: CD** — add a `deploy-shared` job (subscription/`swissshub` scope) that runs the shared template and configures Front Door custom-domain validation; keep `deploy-sit` (auto) → `deploy-prod` (reviewer). Front Door origins updated with the env App Service hostnames.
- [ ] **Step 3: Validate** — `az bicep build` for both templates; dry-run `what-if` on the shared template.
- [ ] **Step 4: Commit** — `git commit -m "ci: deploy shared platform (DNS + Front Door) and register RPs"`.

## Task 18: Wire the SPA to custom API host

**Files:** `.github/actions/deploy-environment/action.yml` (web build env), `src/web/atcsim-shell` API base usage.

- [ ] **Step 1** — set `VITE_FLIGHT_API_BASE_URL` / `VITE_VOICE_API_BASE_URL` to `https://api[sit].atcsim.swissshub.com` at build; the SPA calls the single `api` host (Front Door path-routes). Keep same-origin fallback for local dev.
- [ ] **Step 2: Commit** — `git commit -m "ci: point web build at the api.atcsim.swissshub.com Front Door host"`.

---

## Phase 5 — Docs & validation

## Task 19: ADRs + doc updates

- [ ] **Step 1** — `ADR-0005` (shared platform: Front Door + DNS + shared RG) and `ADR-0006` (Azure Maps keyless token auth), standard header tables.
- [ ] **Step 2** — update `docs/BOM.md` (add Azure Maps, Front Door, Azure DNS) and `docs/SD.md` (Scope-2 topology now via Front Door).
- [ ] **Step 3: Lint** — pre-commit markdownlint passes.
- [ ] **Step 4: Commit** — `git commit -m "docs: ADR-0005/0006 + BOM/SD updates for shared platform + maps"`.

## Task 20: Extend E2E runbook + full validation

- [ ] **Step 1** — extend [poc-e2e-validation-runbook.md](../runbooks/poc-e2e-validation-runbook.md): map with live ZRH flights, select → live chat read-back + rejection, language switch, custom-domain HTTPS reachability.
- [ ] **Step 2: Backend** — `dotnet test` both API test projects (all green, incl. new Maps + TranscriptHub tests).
- [ ] **Step 3: Frontend** — `npm run test --prefix src/web/atcsim-shell` and `npm run build --prefix src/web/atcsim-shell`.
- [ ] **Step 4: Infra** — `az bicep build` for `infra/main.bicep` and `infra/shared/main.bicep`.
- [ ] **Step 5: Docs lint** — `npx markdownlint-cli2 "**/*.md"` (or rely on the pre-commit hook).
- [ ] **Step 6: Commit** — `git commit -m "docs(test): extend E2E runbook for ZRH UX + shared platform"`.

---

## Traceability

Realizes issue [#5](https://github.com/urruegg/ATCSimulator/issues/5) and the [design spec](../specs/2026-07-16-zrh-realflight-ux-shared-platform-design.md). Phases map to spec §4–§7. Guardrails: no secrets (keyless Maps + Voice Live), deterministic server-side command boundary (ADR-0004), no personal data / no operational-ATC (`CON-01`/`CON-03`), synthetic-voice disclosure (`DP-16`). Human gates: GoDaddy NS delegation, Foundry agent publish, PROD approval. Golden-phraseology / command-mapping evals remain the merge gate.

## Self-review notes

- No placeholders; each task has files, bite-sized steps, and exact commands.
- Type/name consistency: `AppStateContext` fields (`airport`, `selectedFlight`, `language`, `refreshCadenceSec`), `fetchMapsToken`, `useFlightPolling`, `TranscriptHub`/`TranscriptEvent`, `fdswissshub`, zone `swissshub.com` used consistently across tasks.
- Scope: large but explicitly one combined phased plan (per D1); each phase is independently testable.
- The single `api` host is realized by Front Door path routing (Task 16) — consistent with the one-`api`-hostname requirement.
