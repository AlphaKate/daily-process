import React, { useState } from 'react';
import {
  X,
  Bell,
  Volume2,
  Clock,
  Check,
  Smartphone,
  Mic
} from 'lucide-react';
import {
  NotificationPreferences,
  saveNotificationPreferences,
  requestSystemNotificationPermission,
  getSystemNotificationPermission,
  playNotificationChime,
  sendSystemNotification,
  isNotificationSupported
} from '../services/notificationService';
import {
  getStoredMicPermission,
  requestExplicitMicPermission
} from '../services/microphoneService';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  preferences: NotificationPreferences;
  onClose: () => void;
  onSavePreferences: (prefs: NotificationPreferences) => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  preferences,
  onClose,
  onSavePreferences,
}) => {
  const [enabled, setEnabled] = useState(preferences.enabled);
  const [soundEnabled, setSoundEnabled] = useState(preferences.soundEnabled);
  const [leadTimeMinutes, setLeadTimeMinutes] = useState(preferences.leadTimeMinutes);
  const [systemPermission, setSystemPermission] = useState<NotificationPermission>(() =>
    getSystemNotificationPermission()
  );
  const [testSent, setTestSent] = useState(false);
  const [micPermitted, setMicPermitted] = useState<boolean>(() => getStoredMicPermission());

  if (!isOpen) return null;

  const handleSave = () => {
    const updated: NotificationPreferences = {
      enabled,
      soundEnabled,
      leadTimeMinutes
    };
    saveNotificationPreferences(updated);
    onSavePreferences(updated);
    onClose();
  };

  const handleRequestPermission = async () => {
    const perm = await requestSystemNotificationPermission();
    setSystemPermission(perm);
    if (perm === 'granted') {
      sendSystemNotification('התרעות הופעלו בהצלחה! 🔔', 'תקבלי תזכורת בכל פעם שמגיע זמן של משימה או פגישה.');
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  const handleRequestMic = async () => {
    const granted = await requestExplicitMicPermission();
    setMicPermitted(granted);
  };

  const handleTestChime = () => {
    playNotificationChime();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                הגדרות התרעות ותזכורות
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                צליל והודעות קופצות כשמגיע זמן משימה
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* 1. Main Toggle */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                הפעל התרעות משימות
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                הצגת חלון קופץ באפליקציה כשמגיע זמן המשימה
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(prev => !prev)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
                  enabled ? 'translate-x-0.5' : '-translate-x-5'
                }`}
              />
            </button>
          </div>

          {/* 2. Sound Toggle & Test */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  צליל התראה (פעמון)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSoundEnabled(prev => !prev)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  soundEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
                    soundEnabled ? 'translate-x-0.5' : '-translate-x-5'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span>השמעת צליל קצר ועדין בהתרעה</span>
              <button
                type="button"
                onClick={handleTestChime}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                השמע צליל ניסיון 🔊
              </button>
            </div>
          </div>

          {/* 3. System Push Notification Permission */}
          {isNotificationSupported() && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    הודעות מערכת במסך (Desktop / Mobile)
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    systemPermission === 'granted'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                      : systemPermission === 'denied'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                  }`}
                >
                  {systemPermission === 'granted'
                    ? 'מאושר ✓'
                    : systemPermission === 'denied'
                    ? 'חסום בדפדפן'
                    : 'טרם אושר'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                מאפשר לקבל הודעה גם כשהדפדפן ברקע או כשהאפליקציה פועלת כמסך בית
              </p>
              {systemPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="w-full mt-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  אשר הודעות מערכת בדפדפן
                </button>
              )}
              {testSent && (
                <div className="text-[10px] text-emerald-600 font-bold text-center">
                  הודעת ניסיון נשלחה בהצלחה!
                </div>
              )}
            </div>
          )}

          {/* 4. Microphone Permission Setting */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  הרשאת מיקרופון (משימה קולית)
                </span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                micPermitted
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {micPermitted ? 'מאושר ושמור ✓' : 'טרם אושר'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              מאפשר הקלטת משימות קוליות באופן מיידי בלחיצה אחת
            </p>
            {!micPermitted && (
              <button
                type="button"
                onClick={handleRequestMic}
                className="w-full mt-1 py-1.5 px-3 bg-orange-600 hover:bg-orange-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                אשר ושמור גישה למיקרופון
              </button>
            )}
          </div>

          {/* 4. Lead Time Setting */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                מועד קבלת התזכורת
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { val: 0, label: 'בזמן בדיוק' },
                { val: 5, label: '5 דק׳ לפני' },
                { val: 10, label: '10 דק׳ לפני' }
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setLeadTimeMinutes(opt.val)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    leadTimeMinutes === opt.val
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>שמור הגדרות</span>
          </button>
        </div>
      </div>
    </div>
  );
};
