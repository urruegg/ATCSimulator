import { PropsWithChildren } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { Button } from '@fluentui/react-components';
import { loginRequest } from './msalConfig';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const authenticated = useIsAuthenticated();
  const { instance } = useMsal();

  if (!authenticated) {
    return (
      <Button onClick={() => instance.loginRedirect(loginRequest)}>
        Sign in
      </Button>
    );
  }

  return <>{children}</>;
}
