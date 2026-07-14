import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { BrowserRouter } from 'react-router-dom';
import { Text } from '@fluentui/react-components';
import { msalConfig } from './auth/msalConfig';
import { ProtectedRoute } from './auth/ProtectedRoute';

const msal = new PublicClientApplication(msalConfig);

export function App() {
  return (
    <MsalProvider instance={msal}>
      <BrowserRouter>
        <ProtectedRoute>
          <Text>ATCSim shared shell</Text>
        </ProtectedRoute>
      </BrowserRouter>
    </MsalProvider>
  );
}
