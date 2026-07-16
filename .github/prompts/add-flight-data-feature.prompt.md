---
mode: agent
description: 'Add or change an ATCSimulator flight-data feature (FR24) end-to-end with tests.'
---

# Add a flight-data feature

Implement the requested flight-data change across the API and the shell feature,
following the [flight-data conventions](../instructions/flight-data.instructions.md)
and [SKILL](../../docs/skills/flight-data-fr24/SKILL.md).

Checklist:

1. Confirm scope and the `FR-##`/`NFR-##` + `US-###` it satisfies.
2. TDD: write/extend the failing test first.
   - Backend: `tests/apis/AtcSim.FlightDataApi.Tests` (mock the HTTP handler; assert the `/api/...` path, `Authorization` + `Accept-Version` headers, and FR24 field mapping incl. `reg`).
   - Frontend: `src/web/atcsim-shell/src/features/flight-data` (mock `fetch`; respect `VITE_FLIGHT_API_BASE_URL`).
3. Implement the minimal change in `Fr24FlightFeedService` / `AircraftResponse` / the shell client.
4. Run: `dotnet test tests/apis/AtcSim.FlightDataApi.Tests/AtcSim.FlightDataApi.Tests.csproj` and `npm run test --prefix src/web/atcsim-shell`.
5. Keep guardrails: public data only (`CON-03`), no operational-ATC (`CON-01`), token only via Key Vault / GitHub secret.
6. Report evidence and a traceability line; commit with a Conventional Commit referencing the sprint issue.
