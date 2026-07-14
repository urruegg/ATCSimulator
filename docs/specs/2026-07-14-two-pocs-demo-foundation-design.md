# Two PoCs Demo Foundation Design

| Field | Value |
| --- | --- |
| Date | 2026-07-14 |
| Status | Draft approved for planning |
| Scope | Two PoCs plus reusable demo-app foundation |
| Subscription | `75102af9-fc92-45d4-99a8-5510a24b5421` |
| Directory | `Contoso (mngenvmcap164444.onmicrosoft.com)` |
| Target hosting posture | App Service first |
| Naming convention prefix | `atcsim` |

## 1. Objective

Define two proof-of-concept slices that validate the highest-risk demo-app assumptions while producing reusable architecture, identity, infrastructure, and delivery assets for the later Demo App.

The PoCs are intentionally not throwaway experiments. They should establish a shared React shell, Entra-first access model, reusable App Service-oriented IaC, and explicit backend service seams that can evolve into the Demo App.

## 2. Scope decisions captured

The following decisions were validated during brainstorming:

- PoC 1 drives sequencing.
- PoC 1 scope ends at read-only flight-data UX validation.
- PoC 2 must validate full voice-in and voice-out experience.
- The first reusable hosting baseline is App Service.
- The user-facing experience is one shared application shell.
- Access is Entra-first from the start using the MCAPS tenant.
- PoC 2 uses tool-first mock knowledge rather than deeper RAG.
- The preferred structural option is a shared frontend shell with modular backend services.

## 3. PoC definitions

### 3.1 PoC 1: Flight-data UX validation

Purpose:
Prove that the app can read live aircraft data from the Flightradar24 sandbox endpoint and present an effective map-based aircraft-selection experience in a React and Fluent UI web application.

In scope:

- React + Fluent UI shared shell.
- Azure Maps-based aircraft context and selection experience.
- Authenticated backend proxy to Flightradar24 sandbox APIs.
- Filtering by airport or visible map bounds.
- Aircraft rendering and selection details.
- Signed-in user experience under Microsoft Entra.

Out of scope:

- Scenario seed creation.
- Simulator handoff.
- Voice interaction.
- Production FR24 paid-tier behavior validation.

Success criteria:

- Authenticated users can sign in and access the aircraft selection screen.
- The backend can successfully read sandbox data from `fr24api.flightradar24.com`.
- Aircraft are rendered on Azure Maps with enough context for user selection.
- Selecting an aircraft displays live details from the normalized backend response.
- All provider credentials remain server-side and are stored via Azure Key Vault references.

### 3.2 PoC 2: Voice latency and UX validation

Purpose:
Prove that the same app shell can provide a real-time voice conversation experience with a Foundry-controlled agent path, including microphone input, model turn handling, and spoken response output.

In scope:

- Shared shell navigation into a voice experience screen.
- Voice capture from the browser.
- Backend orchestration for speech session handling.
- Foundry as the control plane.
- OpenAI model-backed response generation.
- Tool-first mock knowledge layer.
- Spoken response returned to the user.
- End-to-end latency instrumentation.

Out of scope:

- Deep RAG or enterprise knowledge design.
- Rich tool ecosystems.
- Production evaluation workflow.
- Operational ATC or simulator integration.

Success criteria:

- Signed-in users can start a voice conversation from the shared shell.
- User speech is processed and results in a spoken response.
- The backend path uses Foundry control-plane orchestration rather than direct ad hoc browser-only calls.
- The app captures latency across capture, backend, model/agent, and response stages.
- The perceived interaction quality is sufficient to judge whether the eventual Demo App UX is viable.

## 4. Recommended architecture

### 4.1 User-facing architecture

One shared React application shell hosted on Azure App Service.

The shell contains two feature areas:

- Aircraft Selection
- Voice Conversation

The shell owns:

- navigation
- layout
- Microsoft Entra session state
- Fluent UI design system
- shared configuration
- shared telemetry hooks

This keeps the Demo App path direct: the user experiences one application rather than disconnected experiments.

### 4.2 Backend architecture

The backend should not be built as a single undifferentiated application, even if the first deployment is compact. Service boundaries must be explicit from the start.

Recommended backend service seams:

- `flight-data-api`
  - handles FR24 sandbox and later paid-tier provider integration
  - normalizes aircraft responses for UI consumption
  - isolates provider-specific auth, throttling, and response-shape concerns
- `voice-agent-api`
  - handles speech session orchestration
  - coordinates Foundry control plane interactions
  - manages prompt/tool routing and spoken response flow
- shared platform concerns
  - Entra auth configuration
  - Key Vault references
  - Application Insights
  - deployment configuration

These seams may initially run as closely related App Service-hosted APIs, but their contracts should be treated as durable boundaries.

## 5. Core flows

### 5.1 PoC 1 flow

1. User signs in via Microsoft Entra.
2. User opens the aircraft-selection screen.
3. The frontend requests aircraft data using airport context or map bounds.
4. `flight-data-api` calls the FR24 sandbox endpoint server-side.
5. The API normalizes returned aircraft data.
6. The frontend renders aircraft on Azure Maps.
7. User selects an aircraft and sees detail proof.

Design rule:
PoC 1 is intentionally shallow on downstream business flow. It proves live data reading and selection UX only.

### 5.2 PoC 2 flow

1. User signs in via Microsoft Entra.
2. User opens the voice conversation screen.
3. The browser starts a microphone session.
4. `voice-agent-api` handles session orchestration.
5. The backend invokes the Foundry-controlled agent path.
6. Tool-first mock knowledge supports the response path.
7. The response is returned as spoken output.
8. Latency and UX telemetry are recorded across each stage.

Design rule:
PoC 2 is intentionally shallow on knowledge depth. It proves voice loop responsiveness and experience quality first.

## 6. Infrastructure baseline

### 6.1 Hosting model

App Service first is the required baseline for the web application and backend APIs.

Rationale:

- aligns with the user decision
- keeps the early platform understandable
- is sufficient for both PoCs
- can still be reused later for agents or adjacent services

Residual risk:
PoC 2 may later expose runtime constraints that suggest different hosting for some agent-oriented workloads, but that should not prevent App Service-first proof work.

### 6.2 Identity model

Microsoft Entra should be used from the start, using the MCAPS tenant and target subscription already identified by the user.

Rationale:

- avoids building a fake public-access posture that must be replaced later
- aligns app, infrastructure, and downstream service expectations
- creates reusable identity scaffolding for the Demo App

### 6.3 Secrets and configuration

The baseline should include:

- Key Vault for FR24 sandbox credentials and later paid credentials
- Key Vault for Foundry and model configuration
- App Service configuration bound through secret references where possible

### 6.4 Observability

Application Insights should be part of the baseline from day one.

Minimum telemetry requirements:

- sign-in success/failure events
- FR24 backend call success/failure and response timing
- aircraft selection interaction timing
- voice session start/end events
- turn latency breakdown for PoC 2
- spoken response completion timing
- backend exceptions and degraded-service markers

## 7. IaC design

The IaC should be reusable by design and separated into small modules.

### 7.1 Naming convention

Use `atcsim` as the shared naming prefix for PoC and reusable demo-foundation resources.

Recommended pattern:

- `atcsim-<workload>-<env>-<region>-<nn>` for resources that allow hyphens
- `atcsim<workload><env><region><nn>` for resources with stricter naming rules

Examples:

- `atcsim-web-dev-we-01`
- `atcsim-api-dev-we-01`
- `atcsim-kv-dev-we-01`
- `atcsiminsightsdevwe01`

Guidelines:

- keep the prefix stable across both PoCs and the later demo-app baseline
- use short workload tokens such as `web`, `api`, `flight`, and `voice`
- encode environment consistently, for example `dev`, `test`, `poc1`, `poc2`
- account for Azure service-specific naming constraints, especially for globally unique resources
- prefer predictable names for human-operated resources and deterministic suffixing only where uniqueness is required

Suggested module boundaries:

- identity module
  - app registrations, auth settings, tenant bindings
- web hosting module
  - shared frontend App Service and app settings
- api hosting module
  - backend App Service resources, managed identity, configuration
- secrets/config module
  - Key Vault and references
- observability module
  - Application Insights and diagnostic settings

The initial deployment may be compact, but the IaC structure should reflect the future Demo App rather than the narrowest possible PoC implementation.

## 8. Boundaries and non-goals

To keep the work reviewable and reusable, the following should remain out of scope for these PoCs:

- operational ATC connectivity of any kind
- simulator command execution
- personal trainee data
- full knowledge architecture design
- production-grade multi-agent decomposition beyond what is required for the PoC proof points
- broad infrastructure generalization beyond the modules needed for the shared shell and APIs

## 9. Risks and controls

### 9.1 FR24 sandbox realism gap

Risk:
Sandbox behavior may not fully represent paid-tier endpoint shape, limits, or completeness.

Control:

- isolate provider access behind `flight-data-api`
- define provider normalization contract explicitly
- plan one paid-tier rehearsal validation before later demo hardening

### 9.2 App Service suitability for voice path

Risk:
Voice-in and voice-out latency may reveal pressure points for browser/session orchestration or backend response handling.

Control:

- capture stage-by-stage latency from the start
- treat the hosting decision as the initial reusable baseline, not an irrevocable final runtime decision

### 9.3 False complexity from early over-engineering

Risk:
Trying to make the PoCs fully production-like could slow learning.

Control:

- keep PoC 1 shallow on downstream flow
- keep PoC 2 shallow on knowledge sophistication
- deepen only the validation target of each PoC

## 10. Design recommendation

Recommended shape:

- one shared React + Fluent UI shell
- App Service-first hosting for frontend and backend APIs
- Entra-first access model from the beginning
- explicit backend service seams for `flight-data-api` and `voice-agent-api`
- PoC 1 first, validating FR24 sandbox-backed map UX
- PoC 2 second, validating full voice-in and voice-out latency and experience with tool-first mock knowledge
- reusable IaC and observability baseline created alongside the app

This approach balances speed, realism, and future reuse better than either a monolithic throwaway app or an over-fragmented first iteration.

## 11. Planning implications

The implementation plan should be organized around the following workstreams:

- shared shell and Entra foundation
- PoC 1 flight-data UX slice
- PoC 2 voice-agent slice
- reusable IaC modules and deployment pipeline
- telemetry and validation evidence

The plan should also preserve a sequence where PoC 1 de-risks the shared shell and app platform before PoC 2 adds real-time voice complexity.
