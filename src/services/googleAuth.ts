export const GOOGLE_CLIENT_ID = '1090829284866-j6lbc9vcqdufd6mr8h62vm4dpnq2djjm.apps.googleusercontent.com';
export const GOOGLE_DRIVE_FOLDER_ID = '1skpegshPUHuIYPVuxHQdpSpXeIwGmDBd';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.readonly'
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
  }
}

let tokenClient: any = null;
let savedOnSuccess: ((token: GoogleAuthToken) => void) | null = null;
let savedOnError: ((err: any) => void) | null = null;

export const initGoogleTokenClient = (
  onSuccess: (token: GoogleAuthToken) => void,
  onError?: (err: any) => void
) => {
  savedOnSuccess = onSuccess;
  if (onError) savedOnError = onError;

  if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
    return null;
  }

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES,
    callback: async (response: any) => {
      if (response.error) {
        console.error('Google OAuth callback error', response);
        if (savedOnError) savedOnError(response);
        return;
      }

      if (!response.access_token) {
        console.warn('No access_token returned by Google popup', response);
        return;
      }

      const token: GoogleAuthToken = {
        access_token: response.access_token,
        expires_at: Date.now() + (Number(response.expires_in) || 3599) * 1000
      };

      saveStoredToken(token);

      // Default user info so UI updates instantly
      const fallbackUser: GoogleUser = {
        email: 'מחובר ל-Google',
        name: 'משתמש Google'
      };
      saveStoredGoogleUser(fallbackUser);

      // Notify parent immediately
      if (savedOnSuccess) {
        savedOnSuccess(token);
      }

      // Try fetching accurate user info in the background without blocking
      fetchAndSaveUserInfo(token.access_token).catch(() => {});
    },
  });

  return tokenClient;
};

export const ensureTokenClient = async (
  onSuccess: (token: GoogleAuthToken) => void,
  onError?: (err: any) => void
): Promise<any> => {
  if (tokenClient) return tokenClient;

  let retries = 25;
  while (retries > 0 && (!window.google || !window.google.accounts?.oauth2)) {
    await new Promise(res => setTimeout(res, 200));
    retries--;
  }

  if (window.google?.accounts?.oauth2) {
    return initGoogleTokenClient(onSuccess, onError);
  }

  throw new Error('Google Identity script failed to load. Please check your internet connection or ad-blocker.');
};

export const requestGoogleLogin = async (
  onSuccess?: (token: GoogleAuthToken) => void,
  onError?: (err: any) => void
) => {
  const client = await ensureTokenClient(
    onSuccess || savedOnSuccess || (() => {}),
    onError || savedOnError || undefined
  );
  if (!client) {
    throw new Error('Could not initialize Google client');
  }
  client.requestAccessToken({ prompt: 'consent' });
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
};

const fetchAndSaveUserInfo = async (accessToken: string): Promise<GoogleUser | null> => {
  try {
    // Attempt to get user info from Google Drive about API or userinfo
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
};
