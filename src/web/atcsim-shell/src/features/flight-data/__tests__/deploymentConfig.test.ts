import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(process.cwd(), '..', '..', '..');

describe('Azure Maps deployment configuration', () => {
  it('exports Vite build variables from Bicep outputs for azd web packaging', () => {
    const mainBicep = readFileSync(resolve(repoRoot, 'infra', 'main.bicep'), 'utf8');

    expect(mainBicep).toMatch(/output\s+VITE_MAPS_CLIENT_ID\s+string\s*=\s*maps\.outputs\.clientId/);
    expect(mainBicep).toMatch(
      /output\s+VITE_FLIGHT_API_BASE_URL\s+string\s*=\s*'https:\/\/\$\{flightDataApi\.outputs\.defaultHostName\}'/,
    );
  });
});
