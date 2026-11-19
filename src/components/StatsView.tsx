import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { getTodayDateString } from '../services/storage';
import {
  BarChart2,
  Target,
  Award,
  Clock,
  RotateCcw,
  Sparkles,
  Flame,
  Coffee,
  TrendingUp,
  FileText
} from 'lucide-react';

interface StatsViewProps {
  tasks: Task[];
  currentDate: string;
}

type TimeRange = 'day' | 'week' | 'month' | 'all';

const HEBREW_DAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

const getNDaysAgo = (baseDateStr: string, n: number): string => {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() - n);
  const yr = dateObj.getFullYear();
  const mo = String(dateObj.getMonth() + 1).padStart(2, '0');
  const da = String(dateObj.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
};

export const StatsView: React.FC<StatsViewProps> = ({ tasks, currentDate }) => {
  const [range, setRange] = useState<TimeRange>('week');
  const today = getTodayDateString();

  // Active (non-deleted) tasks
  const activeTasks = useMemo(() => tasks.filter(t => !t.isDeleted), [tasks]);

  // Compute date bounds based on range
  const { filteredTasks, rangeLabel } = useMemo(() => {
    if (range === 'day') {
      return {
        filteredTasks: activeTasks.filter(t => t.date === currentDate),
        rangeLabel: currentDate === today ? 'היום' : `תאריך ${currentDate}`
      };
    }
    if (range === 'week') {
      const startDate = getNDaysAgo(currentDate, 6);
      return {
        filteredTasks: activeTasks.filter(t => t.date >= startDate && t.date <= currentDate),
        rangeLabel: '7 הימים האחרונים'
      };
    }
    if (range === 'month') {
      const startDate = getNDaysAgo(currentDate, 29);
      return {
        filteredTasks: activeTasks.filter(t => t.date >= startDate && t.date <= currentDate),
        rangeLabel: '30 הימים האחרונים'
      };
    }
    return {
      filteredTasks: activeTasks,
      rangeLabel: 'כל הזמנים'
    };
  }, [activeTasks, range, currentDate, today]);

  // General Completion Stats for the selected range
  const totalPlanned = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.completed);
  const completedCount = completedTasks.length;
  const totalPercentage = totalPlanned > 0 ? Math.round((completedCount / totalPlanned) * 100) : 0;

  // Breakdown by Category
  const mustDo = filteredTasks.filter(t => t.category === 'must_do');
  const mustDoCompleted = mustDo.filter(t => t.completed).length;
  const mustDoPct = mustDo.length > 0 ? Math.round((mustDoCompleted / mustDo.length) * 100) : 0;

  const goals = filteredTasks.filter(t => t.category === 'goals');
  const goalsCompleted = goals.filter(t => t.completed).length;
  const goalsPct = goals.length > 0 ? Math.round((goalsCompleted / goals.length) * 100) : 0;

  const casual = filteredTasks.filter(t => t.category === 'casual');
  const casualCompleted = casual.filter(t => t.completed).length;
  const casualPct = casual.length > 0 ? Math.round((casualCompleted / casual.length) * 100) : 0;

  // Goals Duration / Hours Invested
  const completedGoalMinutes = goals
    .filter(g => g.completed)
    .reduce((sum, g) => sum + (g.durationMinutes || 0), 0);
  const totalGoalMinutes = goals.reduce((sum, g) => sum + (g.durationMinutes || 0), 0);

  // Rollover tasks stats
  const rolloverTasks = filteredTasks.filter(t => t.rolledOverFrom);
  const rolloverCompleted = rolloverTasks.filter(t => t.completed).length;
  const rolloverPct = rolloverTasks.length > 0 ? Math.round((rolloverCompleted / rolloverTasks.length) * 100) : 0;

  // Last 7 days trend data for the daily bar chart
  const last7DaysData = useMemo(() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const dStr = getNDaysAgo(currentDate, i);
      const [y, m, d] = dStr.split('-').map(Number);
      const dObj = new Date(y, m - 1, d);
      const dayTasks = activeTasks.filter(t => t.date === dStr);
      const done = dayTasks.filter(t => t.completed).length;
      const planned = dayTasks.length;
      const pct = planned > 0 ? Math.round((done / planned) * 100) : 0;

      list.push({
        date: dStr,
        dayNum: d,
        dayName: HEBREW_DAYS_SHORT[dObj.getDay()],
        done,
        planned,
        pct,
        isToday: dStr === today
      });
    }
    return list;
  }, [activeTasks, currentDate, today]);

  // Group all goals by Milestone for Long-Term Tracking
  const milestonesMap = useMemo(() => {
    const allGoals = activeTasks.filter(t => t.category === 'goals');
    const map: Record<
      string,
      { total: number; completed: number; totalMinutes: number; completedMinutes: number; links: string[] }
    > = {};

    allGoals.forEach(g => {
      const key = g.milestoneTitle?.trim() || 'יעדים כלליים';
      if (!map[key]) {
        map[key] = { total: 0, completed: 0, totalMinutes: 0, completedMinutes: 0, links: [] };
      }
      map[key].total += 1;
      map[key].totalMinutes += g.durationMinutes || 0;
      if (g.completed) {
        map[key].completed += 1;
        map[key].completedMinutes += g.durationMinutes || 0;
      }
      if (g.link && !map[key].links.includes(g.link)) {
        map[key].links.push(g.link);
      }
    });

    return map;
  }, [activeTasks]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Range Switcher Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>סטטיסטיקה ועמידה ביעדים</span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            מעקב תכנון מול ביצוע והתקדמות באבני דרך אישיות
          </p>
        </div>

        {/* Time Period Selector Pills */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setRange('day')}
            className={`px-3 py-1 rounded-xl transition-all ${
              range === 'day'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            יומי
          </button>
          <button
            type="button"
            onClick={() => setRange('week')}
            className={`px-3 py-1 rounded-xl transition-all ${
              range === 'week'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            שבועי
          </button>
          <button
            type="button"
            onClick={() => setRange('month')}
            className={`px-3 py-1 rounded-xl transition-all ${
              range === 'month'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            חודשי
          </button>
          <button
            type="button"
            onClick={() => setRange('all')}
            className={`px-3 py-1 rounded-xl transition-all ${
              range === 'all'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            הכל
          </button>
        </div>
      </div>

      {/* Main Highlights Card */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-5 sm:p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-200" />
            <h3 className="text-base sm:text-lg font-black tracking-wide">
              סיכום ביצועים ({rangeLabel})
            </h3>
          </div>
          <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold shadow-2xs">
            {completedCount} מתוך {totalPlanned} הושלמו
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
              <span className="text-[10px] text-emerald-100 font-medium">ביצוע</span>
            </div>
          </div>

          <div className="flex-1 w-full space-y-3">
            <p className="text-xs text-emerald-100 leading-relaxed font-medium">
              {totalPercentage >= 80
                ? '🌟 קצב מעולה! השגת את מרבית המשימות שתכננת.'
                : totalPercentage >= 50
                ? '👍 התקדמות יפה! עמידה עקבית ביעדים.'
                : totalPlanned === 0
                ? 'טרם נוספו משימות לתקופה זו.'
                : '🎯 כל משימה מקדמת אותך. המשיכי בקצב שלך.'}
            </p>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
                <span className="text-emerald-200 block text-[10px] font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  זמן התפתחות
                </span>
                <span className="text-sm sm:text-base font-black">
                  {(completedGoalMinutes / 60).toFixed(1)} שעות
                </span>
                <span className="text-[9px] text-emerald-200 block opacity-80">
                  מתוך {(totalGoalMinutes / 60).toFixed(1)} שעות מתוכננות
                </span>
              </div>

              <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
                <span className="text-emerald-200 block text-[10px] font-medium flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  אבני דרך פעילות
                </span>
                <span className="text-sm sm:text-base font-black">
                  {Object.keys(milestonesMap).length} אבני דרך
                </span>
                <span className="text-[9px] text-emerald-200 block opacity-80">
                  מסמכי Google Drive
                </span>
              </div>

              <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs col-span-2 sm:col-span-1">
                <span className="text-emerald-200 block text-[10px] font-medium flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  משימות שנגררו
                </span>
                <span className="text-sm sm:text-base font-black">
                  {rolloverCompleted} / {rolloverTasks.length} ({rolloverPct}%)
                </span>
                <span className="text-[9px] text-emerald-200 block opacity-80">
                  הושלמו לאחר דחייה
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Days Daily Trend Bar Chart */}
      <div className="bg-white dark:bg-slate-850 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>מגמת ביצוע יומית (7 הימים האחרונים)</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">ביצוע מול תכנון</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2">
          {last7DaysData.map(day => (
            <div
              key={day.date}
              className={`p-2 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${
                day.isToday
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800'
              }`}
            >
              <div className="text-[10px] text-slate-400 font-medium">
                {day.dayName}
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {day.dayNum}
              </div>

              {/* Mini vertical progress pill */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-10 rounded-full my-1.5 flex flex-col justify-end overflow-hidden p-0.5">
                <div
                  className={`w-full rounded-full transition-all duration-700 ${
                    day.pct >= 80
                      ? 'bg-emerald-500'
                      : day.pct >= 40
                      ? 'bg-amber-500'
                      : day.planned > 0
                      ? 'bg-rose-400'
                      : 'bg-transparent'
                  }`}
                  style={{ height: `${day.planned > 0 ? Math.max(day.pct, 10) : 0}%` }}
                />
              </div>

              <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                {day.pct}%
              </div>
              <div className="text-[9px] text-slate-400">
                {day.done}/{day.planned}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>עמידה בתכנון לפי קטגוריות ({rangeLabel})</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Must Do */}
          <div className="bg-white dark:bg-slate-850 rounded-2xl p-4 border border-rose-200/80 dark:border-rose-900/50 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                <span>Must Do</span>
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {mustDoCompleted} / {mustDo.length}
              </span>
            </div>
            <div className="w-full bg-rose-100 dark:bg-rose-950/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${mustDoPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span>{mustDoPct}% הצלחה</span>
              <span>פגישות וחובות</span>
            </div>
          </div>

          {/* Goals */}
          <div className="bg-white dark:bg-slate-850 rounded-2xl p-4 border border-emerald-200/80 dark:border-emerald-900/50 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                <span>Goals (התפתחות)</span>
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {goalsCompleted} / {goals.length}
              </span>
            </div>
            <div className="w-full bg-emerald-100 dark:bg-emerald-950/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${goalsPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span>{goalsPct}% הצלחה</span>
              <span>{(completedGoalMinutes / 60).toFixed(1)} שעות שהושקעו</span>
            </div>
          </div>

          {/* Casual */}
          <div className="bg-white dark:bg-slate-850 rounded-2xl p-4 border border-sky-200/80 dark:border-sky-900/50 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5" />
                <span>Casual (שוטף & סופר)</span>
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {casualCompleted} / {casual.length}
              </span>
            </div>
            <div className="w-full bg-sky-100 dark:bg-sky-950/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${casualPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span>{casualPct}% הצלחה</span>
              <span>סידורים וקניות</span>
            </div>
          </div>
        </div>
      </div>

      {/* Long-Term Milestones Progress (Goals vs Milestones from Google Drive) */}
      <div className="bg-white dark:bg-slate-850 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                התקדמות אבני דרך ויעדים ארוכי טווח
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                מעקב רציף לפי מסמכי היעדים ב-Google Drive (Machine Learning, GoogleLM ועוד)
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl">
            {Object.keys(milestonesMap).length} אבני דרך
          </span>
        </div>

        {Object.keys(milestonesMap).length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            טרם סונכרנו או הוגדרו אבני דרך. בסנכרון עם Google Drive מסמכי היעדים שלך ייקראו אוטומטית.
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(milestonesMap).map(([title, item]) => {
              const pct = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
              const completedHours = (item.completedMinutes / 60).toFixed(1);
              const totalHours = (item.totalMinutes / 60).toFixed(1);

              return (
                <div
                  key={title}
                  className="p-3.5 bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-2 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{title}</span>
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {item.completed} / {item.total} משימות ({pct}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>
                        הושקעו {completedHours} מתוך {totalHours} שעות
                      </span>
                    </span>

                    {item.links.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {item.links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-semibold"
                            title="פתח מסמך יעד ב-Google Drive"
                          >
                            <FileText className="w-3 h-3" />
                            <span>מסמך מקור</span>
                          </a>
                        ))}
                      </div>
                    )}
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
