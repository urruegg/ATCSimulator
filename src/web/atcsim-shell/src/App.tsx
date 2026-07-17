import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { FluentProvider } from '@fluentui/react-components';
import { RouterProvider } from 'react-router-dom';
import { msalConfig } from './auth/msalConfig';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppStateProvider, useAppState } from './state/AppStateContext';
import { atcSimulatorDarkTheme, atcSimulatorLightTheme } from './theme/atcsimulatorTheme';
import { router } from './app/router';

const msal = new PublicClientApplication(msalConfig);

// Reads the theme mode from app state so the light/dark toggle re-themes live.
function ThemedShell() {
  const { themeMode } = useAppState();
  const theme = themeMode === 'dark' ? atcSimulatorDarkTheme : atcSimulatorLightTheme;
  return (
    <FluentProvider theme={theme} style={{ minHeight: '100vh' }}>
      <ProtectedRoute>
        <RouterProvider router={router} />
      </ProtectedRoute>
    </FluentProvider>
  );
}

export function App() {
  return (
    <MsalProvider instance={msal}>
      <AppStateProvider>
        <ThemedShell />
      </AppStateProvider>
    </MsalProvider>
  );
}
