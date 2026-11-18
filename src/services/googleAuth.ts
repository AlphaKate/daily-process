export const GOOGLE_CLIENT_ID = '1090829284866-j6lbc9vcqdufd6mr8h62vm4dpnq2djjm.apps.googleusercontent.com';
export const GOOGLE_DRIVE_FOLDER_ID = '1skpegshPUHuIYPVuxHQdpSpXeIwGmDBd';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/documents'
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

// Parse access token from URL hash (from official OAuth Redirect Flow)
export const checkUrlForAuthToken = (): GoogleAuthToken | null => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token=')) return null;

  try {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const expiresIn = Number(params.get('expires_in')) || 3599;

    if (accessToken) {
      const token: GoogleAuthToken = {
        access_token: accessToken,
        expires_at: Date.now() + expiresIn * 1000
      };
      saveStoredToken(token);
      
      const defaultUser: GoogleUser = {
        email: 'מחובר ל-Google',
        name: 'משתמש Google'
      };
      saveStoredGoogleUser(defaultUser);

      // Clean hash from URL for a clean look and reliable SPA routing
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      // Fetch user profile info asynchronously
      fetchAndSaveUserInfo(token.access_token).catch(() => {});
      return token;
    }
  } catch (e) {
    console.warn('Error parsing token from URL hash', e);
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
            expires_at: Date.now() + (Number(response.expires_in) || 3599) * 1000
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

export const logoutGoogle = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('google_drive_tasks_file_id');
};
