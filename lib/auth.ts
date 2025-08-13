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

    // Get user details from Microsoft Graph to check roles
    const token = await msalInstance.acquireTokenSilent({
      scopes: ['User.Read', 'Directory.Read.All']
    });

    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user details');
    }

    const userData = await response.json();
    
    // Check if user has admin role by looking at their email domain or specific admin emails
    // The NEXT_PUBLIC_ADMIN_EMAILS environment variable is available at build time
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    const userEmail = userData.mail || userData.userPrincipalName || account.username;
    
    // Check if user is admin based on email
    const isAdmin = adminEmails.includes(userEmail) || 
                   userEmail?.endsWith('@collectif.nyc'); // Collectif domain users are admin
    
    // Debug logging
    console.log('Auth Debug:', {
      userEmail,
      adminEmails,
      isAdmin,
      adminEmailsIncludes: adminEmails.includes(userEmail),
      endsWithCollectif: userEmail?.endsWith('@collectif.nyc'),
      envVar: process.env.NEXT_PUBLIC_ADMIN_EMAILS
    });

    return {
      id: account.localAccountId,
      name: account.name || '',
      email: userEmail || '',
      isAdmin: isAdmin,
      isBasic: true, // All authenticated users get basic access
    };
  } catch (error) {
    console.error('Get auth user error:', error);
    // Fallback to basic user if Graph API fails
    const account = msalInstance.getActiveAccount();
    const userEmail = account?.username;
    
    // Even in fallback, check if user should be admin
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    const isAdmin = adminEmails.includes(userEmail || '') || 
                   userEmail?.endsWith('@collectif.nyc');
    
    console.log('Auth Fallback Debug:', {
      accountEmail: userEmail,
      accountName: account?.name,
      adminEmails,
      isAdmin
    });
    
    return {
      id: account?.localAccountId || '',
      name: account?.name || '',
      email: userEmail || '',
      isAdmin: isAdmin,
      isBasic: true,
    };
  }
} 