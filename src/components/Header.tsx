import React from 'react';
import { Sun, Moon, BarChart3, CheckSquare, Calendar, ChevronRight, ChevronLeft, Plus } from 'lucide-react';
import { formatDateDisplayHebrew, getTodayDateString } from '../services/storage';

interface HeaderProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  activeView: 'process' | 'stats';
  onViewChange: (view: 'process' | 'stats') => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAddTask: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onDateChange,
  activeView,
  onViewChange,
  isDark,
  onToggleTheme,
  onOpenAddTask
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
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="max-w-3xl mx-auto px-4 py-3">
        {/* Top bar: Title & Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <CheckSquare className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                יומי & התפתחות
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily Process & Goals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View switcher: Process vs Stats */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => onViewChange('process')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeView === 'process'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="ניהול יום"
              >
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">ניהול יום</span>
              </button>
              <button
                onClick={() => onViewChange('stats')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeView === 'stats'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="סטטיסטיקה"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">סטטיסטיקה</span>
              </button>
            </div>

            {/* Dark / Light Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="החלף מצב תצוגה"
              title={isDark ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>

            {/* Quick Add Button */}
            <button
              onClick={onOpenAddTask}
              className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-medium text-xs rounded-xl shadow-md shadow-emerald-600/25 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden xs:inline">משימה חדשה</span>
            </button>
          </div>
        </div>

        {/* Date Selector Navigation Bar */}
        {activeView === 'process' && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold">
                {formatDateDisplayHebrew(currentDate)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {!isToday && (
                <button
                  onClick={handleGoToday}
                  className="px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors ml-1"
                >
                  חזור להיום
                </button>
              )}
              {/* RTL: Next day button is pointing right/left depending on direction */}
              <button
                onClick={handlePrevDay}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                title="יום קודם"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextDay}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
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
