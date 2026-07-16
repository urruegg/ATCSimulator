import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { FluentProvider } from '@fluentui/react-components';
import { RouterProvider } from 'react-router-dom';
import { msalConfig } from './auth/msalConfig';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppStateProvider } from './state/AppStateContext';
import { atcSimulatorLightTheme } from './theme/atcsimulatorTheme';
import { router } from './app/router';

const msal = new PublicClientApplication(msalConfig);

export function App() {
  return (
    <MsalProvider instance={msal}>
      <FluentProvider theme={atcSimulatorLightTheme}>
        <AppStateProvider>
          <ProtectedRoute>
            <RouterProvider router={router} />
          </ProtectedRoute>
        </AppStateProvider>
      </FluentProvider>
    </MsalProvider>
  );
}
