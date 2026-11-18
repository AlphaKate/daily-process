export const GOOGLE_CLIENT_ID = '1090829284866-j6lbc9vcqdufd6mr8h62vm4dpnq2djjm.apps.googleusercontent.com';
export const GOOGLE_DRIVE_FOLDER_ID = '1skpegshPUHuIYPVuxHQdpSpXeIwGmDBd';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
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
        if (savedOnError) savedOnError(response);
        return;
      }

      const token: GoogleAuthToken = {
        access_token: response.access_token,
        expires_at: Date.now() + (Number(response.expires_in) || 3599) * 1000
      };

      saveStoredToken(token);
      await fetchAndSaveUserInfo(token.access_token);
      if (savedOnSuccess) savedOnSuccess(token);
    },
  });

  return tokenClient;
};

export const ensureTokenClient = async (
  onSuccess: (token: GoogleAuthToken) => void,
  onError?: (err: any) => void
): Promise<any> => {
  if (tokenClient) return tokenClient;

  // If google script not yet available on window, wait up to 4 seconds
  let retries = 20;
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

const fetchAndSaveUserInfo = async (accessToken: string): Promise<GoogleUser | null> => {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user: GoogleUser = {
      email: data.email,
      name: data.name,
      picture: data.picture
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch (err) {
    console.error('Failed to fetch user info', err);
    return null;
  }
};

export const logoutGoogle = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
