import React from 'react';
import {
  Settings,
  BarChart3,
  CheckSquare,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  RefreshCw,
  LogIn,
  LogOut,
  Sunrise,
  Bell,
  Mic,
  Shield
} from 'lucide-react';
import { formatDateDisplayHebrew, getTodayDateString } from '../services/storage';
import { GoogleUser } from '../services/googleAuth';

interface HeaderProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  activeView: 'process' | 'stats';
  onViewChange: (view: 'process' | 'stats') => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAddTask: () => void;
  // Morning Review
  overdueTasksCount?: number;
  onOpenMorningReview?: () => void;
  // Google Auth & Sync
  googleUser: GoogleUser | null;
  isGoogleConnected?: boolean;
  isSyncing: boolean;
  onConnectGoogle: () => void;
  onSyncGoogle: () => void;
  onLogoutGoogle: () => void;
  // Notifications
  onOpenNotificationSettings?: () => void;
  areNotificationsEnabled?: boolean;
  // Voice Task
  onOpenVoiceTask?: () => void;
  // Security & Disconnect
  onOpenSecurityModal?: () => void;
  // Display & Font Settings
  onOpenDisplaySettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onDateChange,
  activeView,
  onViewChange,
  isDark: _isDark,
  onToggleTheme,
  onOpenAddTask,
  overdueTasksCount,
  onOpenMorningReview,
  googleUser,
  isGoogleConnected = true,
  isSyncing,
  onConnectGoogle,
  onSyncGoogle,
  onLogoutGoogle,
  onOpenNotificationSettings,
  areNotificationsEnabled,
  onOpenVoiceTask,
  onOpenSecurityModal,
  onOpenDisplaySettings,
}) => {
  const isToday = currentDate === getTodayDateString();

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleGoToday = () => {
    onDateChange(getTodayDateString());
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors w-full overflow-hidden">
      <div className="max-w-3xl mx-auto px-2.5 sm:px-4 py-2">
        {/* Row 1: Brand & Utility Controls */}
        <div className="flex items-center justify-between gap-1.5 min-w-0 w-full">
          {/* Logo & App Name */}
          <div className="flex items-center gap-1.5 min-w-0 shrink">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <CheckSquare className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight truncate tracking-tight">
                Daily
              </h1>
            </div>
          </div>

          {/* Utility Controls on Left (RTL) */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Google Sync Status / Connect Button */}
            {googleUser ? (
              isGoogleConnected ? (
                /* Connected & Token is Valid */
                <div className="flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 p-1 rounded-xl">
                  <button
                    onClick={onSyncGoogle}
                    disabled={isSyncing}
                    className="p-1 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 disabled:opacity-50 cursor-pointer"
                    title="סנכרן כעת מול Google Drive, Calendar & Contacts"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={onOpenSecurityModal || onLogoutGoogle}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="אבטחה והתנתקות מ-Google"
                  >
                    <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              ) : (
                /* Google User saved, but Token Expired -> One-click Reconnect without logging out */
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 px-2 py-1 rounded-xl shadow-xs">
                  <button
                    onClick={onConnectGoogle}
                    className="flex items-center gap-1 text-amber-800 dark:text-amber-200 hover:text-amber-900 dark:hover:text-amber-100 text-[11px] sm:text-xs font-bold transition-all cursor-pointer"
                    title="תוקף החיבור פג — לחצי כאן לחידוש החיבור והסנכרון בלחיצה אחת"
                  >
                    <LogIn className="w-3.5 h-3.5 stroke-[2.5] text-amber-600 dark:text-amber-400" />
                    <span>חדש חיבור</span>
                  </button>
                  <button
                    onClick={onOpenSecurityModal || onLogoutGoogle}
                    className="p-0.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="אבטחה והתנתקות מ-Google"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              )
            ) : (
              <button
                onClick={onConnectGoogle}
                className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] sm:text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                title="התחברות לחשבון Google כדי לסנכרן יומן ומסמכי יעדים"
              >
                <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">התחבר</span>
              </button>
            )}

            {/* View switcher: Process vs Stats */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => onViewChange('process')}
                className={`p-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeView === 'process'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="ניהול יום"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onViewChange('stats')}
                className={`p-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeView === 'stats'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="סטטיסטיקה"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Security, Disconnect & Emergency Wipe */}
            {onOpenSecurityModal && (
              <button
                type="button"
                onClick={onOpenSecurityModal}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors relative cursor-pointer"
                title="אבטחה, ניתוק ומחיקת חירום"
              >
                <Shield className="w-4 h-4 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors" />
              </button>
            )}

            {/* Notification Alerts Settings */}
            {onOpenNotificationSettings && (
              <button
                type="button"
                onClick={onOpenNotificationSettings}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors relative cursor-pointer"
                title="הגדרות התרעות משימות וצליל"
              >
                <Bell className={`w-4 h-4 ${areNotificationsEnabled ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400'}`} />
                {areNotificationsEnabled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1 right-1" />
                )}
              </button>
            )}

            {/* Display & Font Settings (גלגל שיניים) */}
            <button
              onClick={onOpenDisplaySettings || onToggleTheme}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer group"
              aria-label="הגדרות תצוגה, מצב יום/לילה וגודל גופן"
              title="הגדרות תצוגה, מצב יום/לילה וגודל גופן"
            >
              <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-transform group-hover:rotate-45" />
            </button>
          </div>
        </div>

        {/* Row 2: Action Deck - Enlarged, Thumb-Friendly Task Creation Bar */}
        <div className="mt-2 grid grid-cols-2 gap-2 w-full">
          {/* Enlarged Voice Task Button */}
          {onOpenVoiceTask && (
            <button
              type="button"
              onClick={onOpenVoiceTask}
              className="h-11 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-orange-500/25 transition-all cursor-pointer group"
              title="הקלטת משימה קולית ל-Must Do (דיבור טבעי עם תאריך ושעה)"
            >
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2.5] animate-pulse" />
              </div>
              <span className="truncate font-black">משימה קולית</span>
            </button>
          )}

          {/* Quick Add Button */}
          <button
            type="button"
            onClick={onOpenAddTask}
            className="h-11 flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white active:scale-[0.98] text-white dark:text-slate-900 font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all cursor-pointer group"
            title="הוספת משימה חדשה באופן ידני"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 dark:bg-slate-900/10 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </div>
            <span className="truncate font-black">משימה חדשה</span>
          </button>
        </div>

        {/* Date Selector Navigation Bar */}
        {activeView === 'process' && (
          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 w-full min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {/* Interactive Date Picker Chip */}
              <div
                className="relative group/date flex items-center gap-1 px-2 py-0.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 transition-all cursor-pointer min-w-0"
                title="לחץ לבחירת יום בלוח השנה"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover/date:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-bold truncate text-slate-800 dark:text-slate-100 select-none">
                  {formatDateDisplayHebrew(currentDate)}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 group-hover/date:text-slate-600 dark:group-hover/date:text-slate-200 transition-colors" />

                {/* Invisible HTML5 date input over the entire chip */}
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      onDateChange(e.target.value);
                    }
                  }}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  aria-label="בחר יום בלוח השנה"
                  title="בחר יום בלוח השנה"
                />
              </div>

              {/* Morning Review Quick Access Button */}
              {overdueTasksCount !== undefined && overdueTasksCount > 0 && isToday && (
                <button
                  type="button"
                  onClick={onOpenMorningReview}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700/80 rounded-lg shrink-0 animate-pulse"
                  title="נמצאו משימות שלא הושלמו מיום קודם - פתח סקירת בוקר"
                >
                  <Sunrise className="w-3 h-3 text-amber-600 stroke-[2.5]" />
                  <span>({overdueTasksCount})</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              {!isToday && (
                <button
                  onClick={handleGoToday}
                  className="px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors ml-0.5"
                >
                  היום
                </button>
              )}
              <button
                onClick={handlePrevDay}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                title="יום קודם"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextDay}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                title="יום הבא"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
