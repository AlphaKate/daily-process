export const GOOGLE_CLIENT_ID = '1090829284866-j6lbc9vcqdufd6mr8h62vm4dpnq2djjm.apps.googleusercontent.com';

/**
 * Key for storing user's private Google Drive folder ID in local device storage.
 * Completely decoupled from repository source code for privacy and multi-user support.
 */
const DRIVE_FOLDER_KEY = 'google_drive_folder_id_v1';

/**
 * Extracts a clean Drive folder ID from full URLs or raw IDs.
 * Handles:
 * - https://drive.google.com/drive/folders/1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvW?usp=sharing
 * - https://drive.google.com/drive/u/0/folders/1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvW
 * - ?id=1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvW
 * - 1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvW
 */
export const extractDriveFolderId = (input?: string | null): string => {
  if (!input) return '';
  const trimmed = input.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }
  return trimmed.split('?')[0].replace(/[^a-zA-Z0-9_-]/g, '');
};

export const getStoredDriveFolderId = (): string => {
  try {
    return localStorage.getItem(DRIVE_FOLDER_KEY) || '';
  } catch {
    return '';
  }
};

export const saveStoredDriveFolderId = (folderIdOrUrl?: string | null): string => {
  const cleanId = extractDriveFolderId(folderIdOrUrl);
  try {
    if (cleanId) {
      localStorage.setItem(DRIVE_FOLDER_KEY, cleanId);
    } else {
      localStorage.removeItem(DRIVE_FOLDER_KEY);
    }
  } catch (e) {
    console.warn('Failed to save drive folder id:', e);
  }
  return cleanId;
};

export const clearStoredDriveFolderId = (): void => {
  try {
    localStorage.removeItem(DRIVE_FOLDER_KEY);
  } catch (e) {
    console.warn('Failed to clear drive folder id:', e);
  }
};

/**
 * Legacy getter helper for backward compatibility
 */
export const getEffectiveDriveFolderId = (): string => {
  return getStoredDriveFolderId();
};

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/contacts.readonly'
].join(' ');

const TOKEN_KEY = 'google_oauth_token_v1';
const USER_KEY = 'google_user_info_v1';

export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleAuthToken {
  access_token: string;
  expires_at: number;
  scope?: string;
}

declare global {
  interface Window {
    google?: any;
    __onGoogleGsiLoaded?: () => void;
  }
}

let tokenClient: any = null;
let savedOnSuccess: ((token: GoogleAuthToken) => void) | null = null;
let savedOnError: ((err: any) => void) | null = null;

type UserListener = (user: GoogleUser) => void;
const userListeners: UserListener[] = [];

export const onUserProfileUpdated = (callback: UserListener): (() => void) => {
  userListeners.push(callback);
  return () => {
    const idx = userListeners.indexOf(callback);
    if (idx !== -1) userListeners.splice(idx, 1);
  };
};

const notifyUserProfileListeners = (user: GoogleUser) => {
  userListeners.forEach(cb => {
    try {
      cb(user);
    } catch (e) {
      console.warn('User listener error', e);
    }
  });
};

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const getOAuthRedirectUri = (): string => {
  if (typeof window === 'undefined') return '';
  let path = window.location.pathname;
  if (!path.endsWith('/')) {
    path = path + '/';
  }
  return window.location.origin + path;
};

export const getGoogleOAuthUrl = (): string => {
  const redirectUri = getOAuthRedirectUri();
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    GOOGLE_CLIENT_ID
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=token&scope=${encodeURIComponent(
    GOOGLE_SCOPES
  )}&prompt=consent`;
};

/**
 * Completely scrubs OAuth tokens and sensitive auth parameters from URL hash and search query.
 * Prevents tokens from leaking into browser history, referrer headers, or UI screenshots.
 */
export const scrubTokensFromUrl = (): void => {
  if (typeof window === 'undefined') return;

  try {
    const url = new URL(window.location.href);
    let changed = false;

    if (url.hash && (url.hash.includes('access_token=') || url.hash.includes('id_token='))) {
      url.hash = '';
      changed = true;
    }

    const sensitiveParams = [
      'access_token',
      'id_token',
      'code',
      'token_type',
      'expires_in',
      'authuser',
      'prompt',
      'scope'
    ];

    sensitiveParams.forEach(param => {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        changed = true;
      }
    });

    if (changed) {
      const cleanUrl =
        url.pathname +
        (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') +
        url.hash;
      window.history.replaceState(null, document.title, cleanUrl);
    }
  } catch (e) {
    try {
      window.history.replaceState(null, document.title, window.location.pathname);
    } catch (_) {}
  }
};

// Parse access token from URL hash or query params (from official OAuth Redirect Flow)
export const checkUrlForAuthToken = (): GoogleAuthToken | null => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  const search = window.location.search;
  
  const hasTokenInHash = hash && hash.includes('access_token=');
  const hasTokenInSearch = search && search.includes('access_token=');
  if (!hasTokenInHash && !hasTokenInSearch) return null;

  try {
    const params = new URLSearchParams(
      hasTokenInHash ? hash.substring(1) : search.substring(1)
    );
    // Do not interfere with Microsoft OAuth redirect
    if (params.get('state') === 'ms_auth') return null;
    const accessToken = params.get('access_token');
    const expiresIn = Number(params.get('expires_in')) || 3599;
    const scope = params.get('scope') || undefined;

    if (accessToken) {
      const token: GoogleAuthToken = {
        access_token: accessToken,
        expires_at: Date.now() + expiresIn * 1000,
        scope
      };
      saveStoredToken(token);
      
      const defaultUser: GoogleUser = {
        email: 'מחובר ל-Google',
        name: 'משתמש Google'
      };
      saveStoredGoogleUser(defaultUser);

      // Immediately scrub sensitive tokens from URL for security and clean history
      scrubTokensFromUrl();

      // Fetch user profile info asynchronously
      fetchAndSaveUserInfo(token.access_token).catch(() => {});
      return token;
    }
  } catch (e) {
    console.warn('Error parsing token from URL', e);
  } finally {
    scrubTokensFromUrl();
  }
  return null;
};

export const initGoogleTokenClient = (
  onSuccess: (token: GoogleAuthToken) => void,
  onError?: (err: any) => void
) => {
  savedOnSuccess = onSuccess;
  if (onError) savedOnError = onError;

  // First check if token is already present in URL hash from redirect
  const urlToken = checkUrlForAuthToken();
  if (urlToken) {
    onSuccess(urlToken);
    return null;
  }

  if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
    return null;
  }

  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: (response: any) => {
        if (response.error) {
          console.error('Google OAuth callback error', response);
          if (savedOnError) savedOnError(response);
          return;
        }

        if (response.access_token) {
          const token: GoogleAuthToken = {
            access_token: response.access_token,
            expires_at: Date.now() + (Number(response.expires_in) || 3599) * 1000,
            scope: response.scope || undefined
          };

          saveStoredToken(token);
          saveStoredGoogleUser({ email: 'מחובר ל-Google', name: 'משתמש Google' });

          if (savedOnSuccess) {
            savedOnSuccess(token);
          }

          fetchAndSaveUserInfo(token.access_token).catch(() => {});
        }
      },
    });
  } catch (err) {
    console.error('Failed to init Google token client', err);
  }

  return tokenClient;
};

/**
 * Triggers Google Login:
 * - On desktop: immediately redirects to official Google OAuth consent URL,
 *   completely bypassing popup blockers and Chrome cross-window postMessage issues.
 * - On mobile: uses tokenClient popup if available (ideal for iOS standalone PWA),
 *   or falls back to direct redirect.
 */
export const triggerGoogleLogin = (
  onSuccess?: (token: GoogleAuthToken) => void,
  onError?: (err: any) => void,
  forceRedirect: boolean = false
): boolean => {
  if (onSuccess) savedOnSuccess = onSuccess;
  if (onError) savedOnError = onError;

  const isMobile = isMobileDevice();

  if (isMobile && !forceRedirect) {
    if (!tokenClient && window.google?.accounts?.oauth2) {
      initGoogleTokenClient(savedOnSuccess || (() => {}), savedOnError || undefined);
    }
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
      return true;
    }
  }

  // Desktop or fallback direct OAuth redirect
  const oauthUrl = getGoogleOAuthUrl();
  window.location.href = oauthUrl;
  return true;
};

export const getStoredToken = (): GoogleAuthToken | null => {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    const token: GoogleAuthToken = JSON.parse(raw);
    if (Date.now() > token.expires_at) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
};

export const saveStoredToken = (token: GoogleAuthToken): void => {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
};

export const isGoogleConnected = (): boolean => {
  const token = getStoredToken();
  return Boolean(token?.access_token);
};

export const hasCalendarWriteScope = (): boolean => {
  const token = getStoredToken();
  if (!token?.access_token) return false;
  if (token.scope) {
    return token.scope.includes('calendar.events');
  }
  return true;
};

export const getStoredGoogleUser = (): GoogleUser | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveStoredGoogleUser = (user: GoogleUser): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyUserProfileListeners(user);
};

export const fetchAndSaveUserInfo = async (accessToken: string): Promise<GoogleUser | null> => {
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        const user: GoogleUser = {
          email: data.user.emailAddress || 'מחובר ל-Google',
          name: data.user.displayName || 'משתמש Google',
          picture: data.user.photoLink
        };
        saveStoredGoogleUser(user);
        return user;
      }
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Revokes Google OAuth Access Token on Google's authorization servers.
 * Uses both Google Identity Services SDK (if loaded) and OAuth2 revoke endpoint.
 */
export const revokeGoogleAccess = async (token?: string): Promise<boolean> => {
  const currentToken = token || getStoredToken()?.access_token;
  if (!currentToken) return true;

  try {
    if (window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(currentToken, () => {
        // SDK revocation callback completed
      });
    }

    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(currentToken)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).catch(() => {});

    return true;
  } catch (err) {
    console.warn('Google revoke token error:', err);
    return false;
  }
};

import { clearStoredMicPermission } from './microphoneService';

/**
 * Logs out of Google, revoking access token if requested, and cleans local Google keys.
 */
export const logoutGoogle = async (revokeOnServer: boolean = true): Promise<void> => {
  const token = getStoredToken();
  if (token?.access_token && revokeOnServer) {
    await revokeGoogleAccess(token.access_token);
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('google_drive_tasks_file_id');
  clearStoredMicPermission();
};
