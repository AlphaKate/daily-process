// Microphone permission and state persistence service

const MIC_PERMISSION_KEY = 'daily_proc_mic_permitted_v1';

/**
 * Returns whether the user has previously granted microphone permission in this app.
 */
export const getStoredMicPermission = (): boolean => {
  try {
    return localStorage.getItem(MIC_PERMISSION_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Persists the microphone approval state into localStorage.
 */
export const setStoredMicPermission = (granted: boolean): void => {
  try {
    localStorage.setItem(MIC_PERMISSION_KEY, granted ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to save mic permission', e);
  }
};

/**
 * Explicitly triggers browser microphone permission prompt via getUserMedia,
 * and if granted, saves the setting immediately.
 */
export const requestExplicitMicPermission = async (): Promise<boolean> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop audio tracks to release the hardware microphone
      stream.getTracks().forEach(track => track.stop());
      setStoredMicPermission(true);
      return true;
    }
  } catch (err: any) {
    console.warn('getUserMedia mic request error:', err);
    if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
      setStoredMicPermission(false);
    }
  }
  return false;
};
