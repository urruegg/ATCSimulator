// E2E-only harness entry. Renders the REAL AircraftMapPage WITHOUT the MSAL
// ProtectedRoute gate so Playwright can validate the map end-to-end. This entry
// is served by the Vite dev server for the E2E run only; `vite build` (which
// uses index.html) does NOT include it, so it never ships in the app bundle.
import '../theme/tokens.css';
import '../i18n';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider } from '@fluentui/react-components';
import { AppStateProvider } from '../state/AppStateContext';
import { atcSimulatorLightTheme } from '../theme/atcsimulatorTheme';
import { AircraftMapPage } from '../features/flight-data/AircraftMapPage';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FluentProvider theme={atcSimulatorLightTheme} style={{ height: '100vh', width: '100vw' }}>
      <AppStateProvider>
        <div style={{ position: 'absolute', inset: 0 }}>
          <AircraftMapPage />
        </div>
      </AppStateProvider>
    </FluentProvider>
  </React.StrictMode>,
);
