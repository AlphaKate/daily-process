export const DEFAULT_MICROSOFT_CLIENT_ID = 'ea91a78b-3023-424f-ba7e-75f822a16d00';

export const MS_TOKEN_KEY = 'ms_oauth_token_v1';
export const MS_USER_KEY = 'ms_user_info_v1';
export const MS_CLIENT_ID_KEY = 'ms_client_id_v1';

export interface MicrosoftUser {
  email: string;
  name: string;
  picture?: string;
}

export interface MicrosoftAuthToken {
  access_token: string;
  expires_at: number;
}

type MicrosoftUserListener = (user: MicrosoftUser | null) => void;
const msUserListeners: MicrosoftUserListener[] = [];

export const onMicrosoftUserUpdated = (callback: MicrosoftUserListener): (() => void) => {
  msUserListeners.push(callback);
  return () => {
    const idx = msUserListeners.indexOf(callback);
    if (idx !== -1) msUserListeners.splice(idx, 1);
  };
};

const notifyMicrosoftUserListeners = (user: MicrosoftUser | null) => {
  msUserListeners.forEach(cb => {
    try {
      cb(user);
    } catch (e) {
      console.warn('Microsoft user listener error', e);
    }
  });
};

export const getStoredMicrosoftClientId = (): string => {
  if (typeof window === 'undefined') return DEFAULT_MICROSOFT_CLIENT_ID;
  const stored = localStorage.getItem(MS_CLIENT_ID_KEY);
  return stored && stored.trim() ? stored.trim() : DEFAULT_MICROSOFT_CLIENT_ID;
};

export const saveMicrosoftClientId = (id: string): void => {
  if (typeof window === 'undefined') return;
  if (id && id.trim()) {
    localStorage.setItem(MS_CLIENT_ID_KEY, id.trim());
  } else {
    localStorage.removeItem(MS_CLIENT_ID_KEY);
  }
};

export const getOAuthRedirectUri = (): string => {
  if (typeof window === 'undefined') return '';
  let path = window.location.pathname;
  if (!path.endsWith('/')) {
    path = path + '/';
  }
  return window.location.origin + path;
};

export const getMicrosoftOAuthUrl = (): string => {
  const clientId = getStoredMicrosoftClientId();
  const redirectUri = getOAuthRedirectUri();
  const scopes = 'Tasks.ReadWrite User.Read offline_access';

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(
    clientId
  )}&response_type=token&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(
    scopes
  )}&response_mode=fragment&state=ms_auth`;
};

/**
 * Parses access token from URL hash for Microsoft OAuth redirect flow.
 * Only handles the hash when state=ms_auth is present, preventing interference with Google tokens.
 */
export const checkUrlForMicrosoftToken = (): MicrosoftAuthToken | null => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token=')) return null;

  try {
    const params = new URLSearchParams(hash.substring(1));
    const state = params.get('state');

    // Only process if state is ms_auth to avoid interfering with Google or other auth tokens
    if (state !== 'ms_auth') {
      return null;
    }

    if (params.get('error')) {
      console.error('Microsoft OAuth error:', params.get('error_description') || params.get('error'));
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return null;
    }

    const accessToken = params.get('access_token');
    const expiresIn = Number(params.get('expires_in')) || 3599;

    if (accessToken) {
      const token: MicrosoftAuthToken = {
        access_token: accessToken,
        expires_at: Date.now() + expiresIn * 1000
      };
      saveStoredMicrosoftToken(token);

      const defaultUser: MicrosoftUser = {
        email: 'מחובר ל-Microsoft',
        name: 'משתמש Microsoft'
      };
      saveStoredMicrosoftUser(defaultUser);

      // Clean hash from URL for a clean SPA URL state without affecting search params
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      // Asynchronously fetch user profile details
      fetchAndSaveMicrosoftUserInfo(token.access_token).catch(() => {});
      return token;
    }
  } catch (e) {
    console.warn('Error parsing Microsoft token from URL hash', e);
  }
  return null;
};

export const triggerMicrosoftLogin = (): boolean => {
  if (typeof window === 'undefined') return false;
  const oauthUrl = getMicrosoftOAuthUrl();
  window.location.href = oauthUrl;
  return true;
};

export const getStoredMicrosoftToken = (): MicrosoftAuthToken | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(MS_TOKEN_KEY);
  if (!raw) return null;
  try {
    const token: MicrosoftAuthToken = JSON.parse(raw);
    if (Date.now() > token.expires_at) {
      localStorage.removeItem(MS_TOKEN_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
};

export const saveStoredMicrosoftToken = (token: MicrosoftAuthToken): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MS_TOKEN_KEY, JSON.stringify(token));
};

export const getStoredMicrosoftUser = (): MicrosoftUser | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(MS_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveStoredMicrosoftUser = (user: MicrosoftUser): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MS_USER_KEY, JSON.stringify(user));
  notifyMicrosoftUserListeners(user);
};

export const fetchAndSaveMicrosoftUserInfo = async (accessToken: string): Promise<MicrosoftUser | null> => {
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      const user: MicrosoftUser = {
        email: data.mail || data.userPrincipalName || 'מחובר ל-Microsoft',
        name: data.displayName || data.givenName || 'משתמש Microsoft'
      };

      // Try fetching photo if available
      try {
        const photoRes = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (photoRes.ok) {
          const blob = await photoRes.blob();
          user.picture = URL.createObjectURL(blob);
        }
      } catch {
        // Photo is optional, ignore failure
      }

      saveStoredMicrosoftUser(user);
      return user;
    }
    return null;
  } catch {
    return null;
  }
};

export const isMicrosoftAuthenticated = (): boolean => {
  return getStoredMicrosoftToken() !== null;
};

export const logoutMicrosoft = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MS_TOKEN_KEY);
  localStorage.removeItem(MS_USER_KEY);
  localStorage.removeItem('ms_selected_list_v1');
  notifyMicrosoftUserListeners(null);
};
