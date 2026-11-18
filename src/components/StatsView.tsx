import React from 'react';
import { Task } from '../types';
import { calculateDayStats, getTodayDateString } from '../services/storage';
import { BarChart2, Target, Award } from 'lucide-react';

interface StatsViewProps {
  tasks: Task[];
  currentDate: string;
}

export const StatsView: React.FC<StatsViewProps> = ({ tasks, currentDate }) => {
  const stats = calculateDayStats(currentDate, tasks);
  const isToday = currentDate === getTodayDateString();

  const totalPercentage = stats.totalPlanned > 0
    ? Math.round((stats.completedCount / stats.totalPlanned) * 100)
    : 0;

  const mustDoPercentage = stats.mustDoTotal > 0
    ? Math.round((stats.mustDoCompleted / stats.mustDoTotal) * 100)
    : 0;

  const goalsPercentage = stats.goalsTotal > 0
    ? Math.round((stats.goalsCompleted / stats.goalsTotal) * 100)
    : 0;

  const casualPercentage = stats.casualTotal > 0
    ? Math.round((stats.casualCompleted / stats.casualTotal) * 100)
    : 0;

  // Group goals by milestone title to track personal development milestones
  const allGoals = tasks.filter(t => t.category === 'goals');
  const milestonesMap: Record<string, { total: number; completed: number }> = {};
  
  allGoals.forEach(g => {
    const key = g.milestoneTitle || 'יעד כללי ללא אבן דרך';
    if (!milestonesMap[key]) {
      milestonesMap[key] = { total: 0, completed: 0 };
    }
    milestonesMap[key].total += 1;
    if (g.completed) {
      milestonesMap[key].completed += 1;
    }
  });

  const allCompletedEver = tasks.filter(t => t.completed).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Overview Top Card */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-200" />
            <h2 className="text-lg font-black tracking-wide">
              {isToday ? 'ביצועי היום הנוכחי' : `ביצועים לתאריך ${currentDate}`}
            </h2>
          </div>
          <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">
            {stats.completedCount} מתוך {stats.totalPlanned} הושלמו
          </span>
        </div>

        {/* Progress Big Display */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-white/20"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-white transition-all duration-1000 ease-out"
                strokeDasharray={`${totalPercentage}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black">{totalPercentage}%</span>
              <span className="text-[10px] text-emerald-100 font-medium">השלמה</span>
            </div>
          </div>

          <div className="flex-1 w-full space-y-3">
            <p className="text-xs text-emerald-100 leading-relaxed">
              {totalPercentage >= 80
                ? '🌟 יום מעולה! השגת את מרבית המשימות שתכננת.'
                : totalPercentage >= 50
                ? '👍 קצב טוב! התקדמות משמעותית ביעדים.'
                : '🎯 כל צעד קטן מקדם אותך. המשך/י להתקדם בקצב שלך.'}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/10 rounded-xl p-2.5">
                <span className="text-emerald-200 block text-[10px]">סך הכל משימות שבוצעו</span>
                <span className="text-base font-bold">{allCompletedEver} משימות</span>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5">
                <span className="text-emerald-200 block text-[10px]">יעדי התפתחות פעילים</span>
                <span className="text-base font-bold">{Object.keys(milestonesMap).length} אבני דרך</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>התפלגות לפי רמות משימה</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Must Do */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-rose-200/80 dark:border-rose-900/40 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Must Do</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {stats.mustDoCompleted} / {stats.mustDoTotal}
              </span>
            </div>
            <div className="w-full bg-rose-100 dark:bg-rose-950/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${mustDoPercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 block">
              {mustDoPercentage}% הצלחה במשימות קריטיות
            </span>
          </div>

          {/* Goals */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-emerald-200/80 dark:border-emerald-900/40 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Goals (התפתחות)</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {stats.goalsCompleted} / {stats.goalsTotal}
              </span>
            </div>
            <div className="w-full bg-emerald-100 dark:bg-emerald-950/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${goalsPercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 block">
              {goalsPercentage}% התקדמות ביעדים אישיים
            </span>
          </div>

          {/* Casual */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-sky-200/80 dark:border-sky-900/40 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400">Casual (שוטף)</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {stats.casualCompleted} / {stats.casualTotal}
              </span>
            </div>
            <div className="w-full bg-sky-100 dark:bg-sky-950/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${casualPercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 block">
              {casualPercentage}% ביצוע משימות שוטפות
            </span>
          </div>
        </div>
      </div>

      {/* Milestones Progress Breakdown (Goals vs Milestones) */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>התקדמות אבני דרך בהתפתחות אישית (מתוך מסמכי היעדים)</span>
        </h3>

        {Object.keys(milestonesMap).length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
            טרם הוגדרו אבני דרך ביעדים. בהוספת משימת Goals ניתן לשייך אותה לאבן דרך.
          </p>
        ) : (
          <div className="space-y-3">
            {Object.entries(milestonesMap).map(([title, item]) => {
              const pct = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
              return (
                <div key={title} className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{title}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {item.completed} מתוך {item.total} משימות ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
