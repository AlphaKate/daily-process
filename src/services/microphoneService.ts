// Microphone permission and state persistence service

const MIC_PERMISSION_KEY = 'daily_proc_mic_permitted_v1';

/**
 * Returns whether the user has previously granted microphone permission in this app.
 * Persists across backgrounding, app restarts, and refreshes on the current device.
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
 * Clears the stored microphone permission (called strictly on Google disconnection or panic wipe).
 */
export const clearStoredMicPermission = (): void => {
  try {
    localStorage.removeItem(MIC_PERMISSION_KEY);
  } catch (e) {
    console.error('Failed to clear mic permission', e);
  }
};

/**
 * Explicitly triggers browser microphone permission prompt via getUserMedia,
 * and if granted, saves the setting permanently for this device.
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
    // Never revoke permission here if user already granted it previously
  }
  return false;
};
