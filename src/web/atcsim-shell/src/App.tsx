import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { RouterProvider } from 'react-router-dom';
import { msalConfig } from './auth/msalConfig';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { router } from './app/router';

const msal = new PublicClientApplication(msalConfig);

export function App() {
  return (
    <MsalProvider instance={msal}>
      <ProtectedRoute>
        <RouterProvider router={router} />
      </ProtectedRoute>
    </MsalProvider>
  );
}
