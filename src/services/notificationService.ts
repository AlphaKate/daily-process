// Task Time Alerts and Notification Service
// Combines Web Notifications API, Web Audio API chime synthesis, and in-app visual alerts

export interface NotificationPreferences {
  enabled: boolean;
  soundEnabled: boolean;
  leadTimeMinutes: number; // 0 = at time, 5 = 5 min before, 10 = 10 min before
}

const NOTIFICATION_PREFS_KEY = 'daily_proc_notification_prefs_v1';
const ALERTED_TASKS_KEY = 'daily_proc_alerted_tasks_v1';

export const getNotificationPreferences = (): NotificationPreferences => {
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse notification preferences', e);
  }
  return {
    enabled: true,
    soundEnabled: true,
    leadTimeMinutes: 0
  };
};

export const saveNotificationPreferences = (prefs: NotificationPreferences): void => {
  localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
};

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getSystemNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
};

export const requestSystemNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.error('Error requesting notification permission', e);
    return 'denied';
  }
};

// Play a crystal two-tone chime (C5 -> G5) using Web Audio API synthesis
// Doesn't require any external audio files and works offline & inside PWA!
export const playNotificationChime = (): void => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // First tone (523.25 Hz - C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.18, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.45);

    // Second higher tone (783.99 Hz - G5) with a slight delay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.22, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.65);
  } catch (e) {
    console.warn('Web Audio chime playback failed or blocked by autoplay policy', e);
  }
};

// Send native system notification
export const sendSystemNotification = (
  title: string,
  body: string,
  onClick?: () => void
): void => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: './favicon.svg',
      tag: 'task-reminder'
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }
  } catch (e) {
    console.error('Failed to trigger native notification', e);
  }
};

// Track which tasks have already been alerted for a given date/time
export const getAlertedTaskKeys = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(ALERTED_TASKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read alerted tasks', e);
  }
  return {};
};

export const markTaskAsAlerted = (taskId: string, date: string, time: string): void => {
  try {
    const records = getAlertedTaskKeys();
    const key = `${date}_${taskId}_${time}`;
    records[key] = true;
    localStorage.setItem(ALERTED_TASKS_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to mark task as alerted', e);
  }
};

export const isTaskAlreadyAlerted = (taskId: string, date: string, time: string): boolean => {
  const records = getAlertedTaskKeys();
  const key = `${date}_${taskId}_${time}`;
  return Boolean(records[key]);
};
