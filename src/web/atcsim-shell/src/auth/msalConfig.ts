import { Configuration, LogLevel } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID as string,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_ENTRA_TENANT_ID as string}`,
    redirectUri: '/',
  },
  system: {
    loggerOptions: {
      loggerCallback: (_, message) => console.debug(message),
      piiLoggingEnabled: false,
      logLevel: LogLevel.Warning,
    },
  },
};

export const loginRequest = {
  scopes: [import.meta.env.VITE_API_SCOPE as string],
};
