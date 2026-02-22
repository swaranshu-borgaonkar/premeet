import { encryptToken, decryptToken } from './token-encryption.js';
import { getIdentityAPI, getBrowser } from './browser-detection.js';
import { captureException } from './sentry.js';
import { getConfig } from './config.js';

/**
 * Sign in with Google via Chrome Identity API
 */
export async function signInWithGoogle() {
  try {
    const config = await getConfig();
    const identity = getIdentityAPI();

    // Get Google access token via Chrome Identity API
    const googleToken = await new Promise((resolve, reject) => {
      identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(token);
        }
      });
    });

    // Exchange Google access token for Supabase session via our edge function
    const response = await fetch(`${config.SUPABASE_URL}/functions/v1/auth-google-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ google_access_token: googleToken }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Auth failed: ${response.status} — ${errorBody}`);
    }

    const session = await response.json();

    if (session.error) {
      throw new Error(session.error);
    }

    // Encrypt and store refresh token
    const encryptedRefresh = await encryptToken(session.refresh_token, session.user.id);

    // Store Google access token separately for Calendar/Gmail API calls
    await chrome.storage.local.set({
      user: session.user,
      accessToken: session.access_token,
      googleToken: googleToken,
      encryptedRefreshToken: encryptedRefresh,
      tokenExpiresAt: Date.now() + (session.expires_in * 1000),
      calendarProvider: 'google',
    });

    // Set user profile defaults if new user
    await initializeUserProfile(session.user, config);

    return session.user;
  } catch (error) {
    captureException(error, { context: 'signInWithGoogle' });
    throw error;
  }
}

/**
 * Sign in with Microsoft via launchWebAuthFlow
 * (Phase 2.5 — full implementation)
 */
export async function signInWithMicrosoft() {
  try {
    const config = await getConfig();
    const browser = getBrowser();

    // Microsoft OAuth requires launchWebAuthFlow for extensions
    const redirectUrl = chrome.identity.getRedirectURL();
    const clientId = config.MICROSOFT_CLIENT_ID;

    if (!clientId) {
      throw new Error('Microsoft OAuth not configured');
    }

    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUrl);
    authUrl.searchParams.set('scope', 'openid profile email Calendars.Read Mail.Send Contacts.Read');
    authUrl.searchParams.set('response_mode', 'query');

    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl.toString(), interactive: true },
        (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(responseUrl);
          }
        }
      );
    });

    // Extract authorization code from response URL
    const url = new URL(responseUrl);
    const code = url.searchParams.get('code');

    if (!code) {
      throw new Error('No authorization code received from Microsoft');
    }

    // Exchange code for tokens via our edge function
    const tokenResponse = await fetch(`${config.SUPABASE_URL}/functions/v1/auth-microsoft-exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: redirectUrl }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Microsoft token exchange failed: ${tokenResponse.status}`);
    }

    const session = await tokenResponse.json();

    const encryptedRefresh = await encryptToken(session.refresh_token, session.user.id);

    await chrome.storage.local.set({
      user: session.user,
      accessToken: session.access_token,
      microsoftToken: session.microsoft_access_token,
      encryptedRefreshToken: encryptedRefresh,
      tokenExpiresAt: Date.now() + (session.expires_in * 1000),
      calendarProvider: 'microsoft',
    });

    await initializeUserProfile(session.user, config);

    return session.user;
  } catch (error) {
    captureException(error, { context: 'signInWithMicrosoft' });
    throw error;
  }
}

/**
 * Sign out and clear stored data
 */
export async function signOut() {
  try {
    const identity = getIdentityAPI();
    const { googleToken } = await chrome.storage.local.get('googleToken');

    // Revoke Chrome identity token
    if (googleToken) {
      identity.removeCachedAuthToken({ token: googleToken }, () => {});
    }

    // Clear local storage
    await chrome.storage.local.remove([
      'user', 'accessToken', 'googleToken', 'microsoftToken',
      'encryptedRefreshToken', 'tokenExpiresAt',
      'calendarProvider', 'pendingEventView', 'pendingNoteCapture',
    ]);
  } catch (error) {
    captureException(error, { context: 'signOut' });
    throw error;
  }
}

/**
 * Refresh tokens if they're about to expire
 */
export async function refreshTokensIfNeeded() {
  try {
    const { tokenExpiresAt, encryptedRefreshToken, user } =
      await chrome.storage.local.get(['tokenExpiresAt', 'encryptedRefreshToken', 'user']);

    if (!encryptedRefreshToken || !user) return;

    // Refresh if expiring within 15 minutes
    const fifteenMinutes = 15 * 60 * 1000;
    if (tokenExpiresAt && Date.now() < tokenExpiresAt - fifteenMinutes) return;

    const config = await getConfig();
    const refreshToken = await decryptToken(encryptedRefreshToken, user.id);

    const response = await fetch(`${config.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const session = await response.json();
    const encryptedRefresh = await encryptToken(session.refresh_token, user.id);

    await chrome.storage.local.set({
      accessToken: session.access_token,
      encryptedRefreshToken: encryptedRefresh,
      tokenExpiresAt: Date.now() + (session.expires_in * 1000),
    });

    // Also refresh Google token if using Google
    const { calendarProvider } = await chrome.storage.local.get('calendarProvider');
    if (calendarProvider === 'google') {
      await refreshGoogleToken();
    }
  } catch (error) {
    captureException(error, { context: 'refreshTokensIfNeeded' });
    // Don't throw - token refresh is best-effort
  }
}

/**
 * Refresh the Google OAuth token via Chrome Identity API
 */
async function refreshGoogleToken() {
  try {
    const identity = getIdentityAPI();
    const { googleToken } = await chrome.storage.local.get('googleToken');

    // Remove cached token to force refresh
    if (googleToken) {
      await new Promise((resolve) => {
        identity.removeCachedAuthToken({ token: googleToken }, resolve);
      });
    }

    // Get fresh token
    const newToken = await new Promise((resolve, reject) => {
      identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(token);
        }
      });
    });

    await chrome.storage.local.set({ googleToken: newToken });
  } catch (error) {
    // Non-interactive refresh failed, user may need to re-auth
    captureException(error, { context: 'refreshGoogleToken' });
  }
}

/**
 * Get the current valid access token for Supabase
 */
export async function getAccessToken() {
  await refreshTokensIfNeeded();
  const { accessToken } = await chrome.storage.local.get('accessToken');
  return accessToken;
}

/**
 * Get the Google OAuth token for Calendar/Gmail API calls
 */
export async function getGoogleToken() {
  const { googleToken } = await chrome.storage.local.get('googleToken');
  return googleToken;
}

/**
 * Get the Microsoft token for Graph API calls
 */
export async function getMicrosoftToken() {
  const { microsoftToken } = await chrome.storage.local.get('microsoftToken');
  return microsoftToken;
}

/**
 * Initialize user profile with defaults (called on first sign-in)
 */
async function initializeUserProfile(user, config) {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const response = await fetch(`${config.SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
      headers: {
        'apikey': config.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${user.access_token || ''}`,
      },
    });

    // If user doesn't exist yet, Supabase auth trigger should create them
    // We just update timezone
    await fetch(`${config.SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${user.access_token || ''}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ timezone }),
    });
  } catch (error) {
    // Non-critical initialization
    captureException(error, { context: 'initializeUserProfile' });
  }
}
