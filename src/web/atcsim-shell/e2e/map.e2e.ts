import { test, expect, type Route } from '@playwright/test';

// Two public cold-start aircraft (mirrors data/flight-feed/opensky-zrh-sample.json
// and the FlightDataApi bundled seed). Public/synthetic only — no personal data.
const AIRCRAFT_FEED = {
  source: 'snapshot',
  snapshotAt: '2026-07-22T09:00:00+00:00',
  aircraft: [
    { callsign: 'SWR14U', aircraftType: 'UNKNOWN', registration: null, latitude: 47.4582, longitude: 8.5634, altitudeFt: 6000, headingDeg: 270, groundSpeedKt: 250 },
    { callsign: 'EDW24', aircraftType: 'UNKNOWN', registration: null, latitude: 47.3621, longitude: 8.7342, altitudeFt: 13000, headingDeg: 83, groundSpeedKt: 400 },
  ],
};

const json = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

test.describe('AircraftMapPage', () => {
  test('loads the Azure map and renders >=2 aircraft markers', async ({ page, context }) => {
    let mapsTokenRequested = false;

    // Broker a fake Maps token — no real Azure Maps subscription needed.
    await context.route('**/api/maps/token', (route) => {
      mapsTokenRequested = true;
      return json(route, { token: 'e2e-fake-token' });
    });
    // Serve the two cold-start aircraft.
    await context.route('**/api/aircraft**', (route) => json(route, AIRCRAFT_FEED));
    // Stub ALL Azure Maps traffic (style, sprites, tiles) so the run is hermetic.
    await context.route(/https:\/\/([a-z0-9-]+\.)?atlas\.microsoft\.com\/.*/i, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );

    const consoleErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });

    await page.goto('/e2e.html', { waitUntil: 'load' });

    // 1) The Azure Maps control mounted its WebGL canvas.
    await expect(page.locator('#azure-map-host canvas')).toBeVisible({ timeout: 30_000 });

    // 2) At least two aircraft HTML markers rendered. Our own zoom controls live
    //    OUTSIDE #azure-map-host, so SVG pins inside the host are marker pins.
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const host = document.querySelector('#azure-map-host');
            if (!host) return 0;
            const markers = host.querySelectorAll('.azure-maps-html-marker').length;
            const svgs = host.querySelectorAll('svg').length;
            return Math.max(markers, svgs);
          }),
        { timeout: 30_000, message: 'expected >=2 aircraft markers on the map' },
      )
      .toBeGreaterThanOrEqual(2);

    // 3) The map requested a token via the API broker (keyless auth path).
    expect(mapsTokenRequested).toBe(true);

    // Attach a screenshot as CI evidence.
    await page.waitForTimeout(1500);
    await test.info().attach('map-evidence', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });

    expect(consoleErrors, `unexpected console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});
