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
  scopes: ['User.Read', 'Directory.Read.All']
};

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me'
};

// Admin check function - relies on environment variable configuration
export function checkAdminStatus(userEmail: string | null | undefined): boolean {
  if (!userEmail) {
    return false;
  }

  // Check against NEXT_PUBLIC_ADMIN_EMAILS environment variable
  try {
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    
    if (adminEmails.length > 0 && adminEmails.includes(userEmail)) {
      return true;
    }
  } catch (error) {
    // Silently fail if env var parsing fails
  }

  // Check localStorage for admin override (for development/testing only)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    try {
      const adminOverride = localStorage.getItem('adminOverride');
      if (adminOverride === userEmail) {
        return true;
      }
    } catch (error) {
      // Silently fail if localStorage is not available
    }
  }

  return false;
}

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
    if (!account) {
      console.log('getAuthUser: No active account found');
      return null;
    }

    // Get user details from Microsoft Graph to check roles
    let userData: any = null;
    try {
      const token = await msalInstance.acquireTokenSilent({
        scopes: ['User.Read', 'Directory.Read.All']
      });

      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user details from Graph API');
      }

      userData = await response.json();
      console.log('getAuthUser: Successfully fetched user data from Graph API');
    } catch (graphError) {
      console.warn('getAuthUser: Graph API failed, using fallback data:', graphError);
      // Fallback to account data if Graph API fails
      userData = {
        mail: account.username,
        userPrincipalName: account.username,
        displayName: account.name
      };
    }
    
    const userEmail = userData.mail || userData.userPrincipalName || account.username;
    
    // Use enhanced admin check function
    const isAdmin = checkAdminStatus(userEmail);
    
    // Debug logging
    console.log('getAuthUser Debug:', {
      userEmail,
      accountName: account.name,
      accountId: account.localAccountId,
      isAdmin,
      adminEmails: process.env.NEXT_PUBLIC_ADMIN_EMAILS,
      envVarAccessible: typeof process.env.NEXT_PUBLIC_ADMIN_EMAILS !== 'undefined'
    });

    return {
      id: account.localAccountId,
      name: userData.displayName || account.name || '',
      email: userEmail || '',
      isAdmin: isAdmin,
      isBasic: true, // All authenticated users get basic access
    };
  } catch (error) {
    console.error('getAuthUser error:', error);
    
    // Enhanced fallback with better error handling
    try {
      const account = msalInstance.getActiveAccount();
      if (!account) {
        console.log('getAuthUser: No account available for fallback');
        return null;
      }
      
      const userEmail = account.username;
      const isAdmin = checkAdminStatus(userEmail);
      
      console.log('getAuthUser Fallback Debug:', {
        accountEmail: userEmail,
        accountName: account.name,
        isAdmin
      });
      
      return {
        id: account.localAccountId || 'fallback-user',
        name: account.name || 'Unknown User',
        email: userEmail || '',
        isAdmin: isAdmin,
        isBasic: true,
      };
    } catch (fallbackError) {
      console.error('getAuthUser: Fallback also failed:', fallbackError);
      return null;
    }
  }
}

// Utility function to set admin override for development/testing
export function setAdminOverride(email: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('adminOverride', email);
      console.log('Admin override set for:', email);
    } catch (error) {
      console.error('Failed to set admin override:', error);
    }
  }
}

// Utility function to clear admin override
export function clearAdminOverride(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('adminOverride');
      console.log('Admin override cleared');
    } catch (error) {
      console.error('Failed to clear admin override:', error);
    }
  }
} 