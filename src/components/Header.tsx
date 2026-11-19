import React from 'react';
import {
  Sun,
  Moon,
  BarChart3,
  CheckSquare,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Plus,
  RefreshCw,
  LogIn,
  LogOut,
  ListTodo,
  Sunrise,
  Bell
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
  isSyncing: boolean;
  onConnectGoogle: () => void;
  onSyncGoogle: () => void;
  onLogoutGoogle: () => void;
  // Notifications
  onOpenNotificationSettings?: () => void;
  areNotificationsEnabled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onDateChange,
  activeView,
  onViewChange,
  isDark,
  onToggleTheme,
  onOpenAddTask,
  overdueTasksCount,
  onOpenMorningReview,
  googleUser,
  isSyncing,
  onConnectGoogle,
  onSyncGoogle,
  onLogoutGoogle,
  onOpenNotificationSettings,
  areNotificationsEnabled,
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
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5">
        {/* Top bar: Title & Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <CheckSquare className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                יומי & התפתחות
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                Daily Process & Goals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Google Sync Status / Connect Button */}
            {googleUser ? (
              <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-1 rounded-xl">
                <button
                  onClick={onSyncGoogle}
                  disabled={isSyncing}
                  className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 disabled:opacity-50"
                  title="סנכרן מול Google Drive & Calendar"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'מסנכרן...' : 'סנכרן'}</span>
                </button>
                <button
                  onClick={onLogoutGoogle}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  title="התנתקות מ-Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onConnectGoogle}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                title="התחברות לחשבון Google כדי לסנכרן יומן ומסמכי יעדים"
              >
                <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>התחבר ל-Google</span>
              </button>
            )}

            {/* Direct Link to "סופר" in Microsoft To Do */}
            <a
              href="https://to-do.microsoft.com/sharing?InvitationToken=cSHAtsnUNTW0E2q3AEdlYmuhB8FZ2Q3tILzClg0YBCn-KrWUF9s9KrPQZJrtOsYlCiEN015c05_7oQPJaeCRkA"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              title="פתח את רשימת סופר באפליקציית Microsoft To Do"
            >
              <ListTodo className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden md:inline">רשימת "סופר"</span>
              <span className="md:hidden">סופר</span>
            </a>

            {/* View switcher: Process vs Stats */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => onViewChange('process')}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  activeView === 'process'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="ניהול יום"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ניהול יום</span>
              </button>
              <button
                onClick={() => onViewChange('stats')}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  activeView === 'stats'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="סטטיסטיקה"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">סטטיסטיקה</span>
              </button>
            </div>

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

            {/* Dark / Light Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="החלף מצב תצוגה"
              title={isDark ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Quick Add Button */}
            <button
              onClick={onOpenAddTask}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden md:inline">משימה חדשה</span>
            </button>
          </div>
        </div>

        {/* Date Selector Navigation Bar */}
        {activeView === 'process' && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs sm:text-sm font-bold">
                  {formatDateDisplayHebrew(currentDate)}
                </span>
              </div>

              {/* Morning Review Quick Access Button */}
              {overdueTasksCount !== undefined && overdueTasksCount > 0 && isToday && (
                <button
                  type="button"
                  onClick={onOpenMorningReview}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-950/80 hover:bg-amber-200/90 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700/80 rounded-lg transition-all shadow-2xs animate-pulse"
                  title="נמצאו משימות שלא הושלמו מיום קודם - פתח סקירת בוקר"
                >
                  <Sunrise className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
                  <span>סקירת בוקר ({overdueTasksCount})</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!isToday && (
                <button
                  onClick={handleGoToday}
                  className="px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors ml-1"
                >
                  חזור להיום
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
