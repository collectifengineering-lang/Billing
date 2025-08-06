import { PublicClientApplication, Configuration, AuthenticationResult } from '@azure/msal-browser';

// Check if required environment variables are set
const clientId = process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID;
const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID;

if (!clientId || !tenantId) {
  console.warn('Azure AD environment variables are not set. Authentication will not work.');
  console.warn('Please set NEXT_PUBLIC_AZURE_AD_CLIENT_ID and NEXT_PUBLIC_AZURE_AD_TENANT_ID in your .env.local file');
}

const msalConfig: Configuration = {
  auth: {
    clientId: clientId || 'dummy-client-id',
    authority: `https://login.microsoftonline.com/${tenantId || 'dummy-tenant-id'}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  }
};

export const msalInstance = new PublicClientApplication(msalConfig);

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isBasic: boolean;
}

export const loginRequest = {
  scopes: ['User.Read']
};

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me'
};

export async function signIn(): Promise<AuthenticationResult | null> {
  try {
    // Check if environment variables are set
    if (!clientId || !tenantId) {
      throw new Error('Azure AD environment variables are not configured. Please set NEXT_PUBLIC_AZURE_AD_CLIENT_ID and NEXT_PUBLIC_AZURE_AD_TENANT_ID in your .env.local file');
    }
    
    // Use redirect flow instead of popup to avoid cross-origin issues
    await msalInstance.loginRedirect(loginRequest);
    return null; // Redirect will handle the flow
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

export async function signOut(): Promise<void> {
  try {
    await msalInstance.logoutPopup();
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const account = msalInstance.getActiveAccount();
    if (!account) return null;

    // For now, set basic access for all authenticated users
    return {
      id: account.localAccountId,
      name: account.name || '',
      email: account.username || '',
      isAdmin: true,
      isBasic: true,
    };
  } catch (error) {
    console.error('Get auth user error:', error);
    return null;
  }
} 