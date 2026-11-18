import React, { useState } from 'react';
import { Task } from '../types';
import {
  X,
  Calendar,
  Milestone,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  FileText,
  Plus,
  ArrowRightLeft,
  Filter,
  Check
} from 'lucide-react';

interface GoalsTimelineModalProps {
  isOpen: boolean;
  currentDate: string;
  allTasks: Task[];
  onClose: () => void;
  onToggleComplete: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onQuickAddGoal: () => void;
  onRescheduleGoal: (task: Task, newDate: string) => void;
}

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export const GoalsTimelineModal: React.FC<GoalsTimelineModalProps> = ({
  isOpen,
  currentDate,
  allTasks,
  onClose,
  onToggleComplete,
  onEditTask,
  onQuickAddGoal,
  onRescheduleGoal,
}) => {
  const [activeTab, setActiveTab] = useState<'week' | 'milestones' | 'month'>('week');
  const [filterMilestone, setFilterMilestone] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  if (!isOpen) return null;

  // Filter only goals that are not soft-deleted
  const allGoals = allTasks.filter(t => !t.isDeleted && t.category === 'goals');

  // Compute reference week based on currentDate + weekOffset
  const [refY, refM, refD] = currentDate.split('-').map(Number);
  const baseDate = new Date(refY, refM - 1, refD);
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);

  const baseDayOfWeek = baseDate.getDay(); // 0 is Sunday
  const sunday = new Date(baseDate);
  sunday.setDate(baseDate.getDate() - baseDayOfWeek);

  const weekDays: { dateStr: string; dayName: string; dayNum: number; monthName: string; isToday: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yr}-${mo}-${da}`;
    weekDays.push({
      dateStr,
      dayName: HEBREW_DAYS[d.getDay()],
      dayNum: d.getDate(),
      monthName: HEBREW_MONTHS[d.getMonth()],
      isToday: dateStr === currentDate,
    });
  }

  // Current Month calculation
  const currentMonthPrefix = currentDate.substring(0, 7); // YYYY-MM
  const monthGoals = allGoals.filter(g => g.date.startsWith(currentMonthPrefix));

  // Extract unique milestones
  const milestoneList = Array.from(
    new Set(allGoals.map(g => g.milestoneTitle?.trim()).filter(Boolean) as string[])
  );

  // Filtered goals for week view
  const weekDatesList = weekDays.map(w => w.dateStr);
  const weekGoals = allGoals.filter(g => weekDatesList.includes(g.date));

  const totalWeekMinutes = weekGoals.reduce((sum, g) => sum + (g.durationMinutes || 0), 0);
  const completedWeekGoals = weekGoals.filter(g => g.completed);
  const completedWeekMinutes = completedWeekGoals.reduce((sum, g) => sum + (g.durationMinutes || 0), 0);

  // Group goals by milestone for Milestone view
  const milestoneMap = new Map<string, Task[]>();
  allGoals.forEach(g => {
    const ms = g.milestoneTitle?.trim() || 'ללא אבן דרך מוגדרת';
    const list = milestoneMap.get(ms) || [];
    list.push(g);
    milestoneMap.set(ms, list);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Calendar className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>לוח זמנים ותכנון יעדים (Goals Timeline)</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                  {allGoals.length} יעדים סה״כ
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                מעקב יומי, שבועי וחודשי אחר אבני הדרך ויעדי ההתפתחות האישית
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onQuickAddGoal}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">יעד חדש</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Bar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'week'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              📅 לוח שבועי
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('milestones')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'milestones'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🎯 אבני דרך והתקדמות
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'month'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              📊 סקירה חודשית
            </button>
          </div>

          {/* Filters & Status */}
          <div className="flex items-center gap-2 text-xs">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-xs font-medium focus:outline-none dark:text-slate-200"
              >
                <option value="all">כל הסטטוסים</option>
                <option value="pending">ממתינים לביצוע</option>
                <option value="completed">הושלמו בלבד</option>
              </select>
            </div>

            {/* Milestone Filter */}
            {milestoneList.length > 0 && (
              <select
                value={filterMilestone}
                onChange={(e) => setFilterMilestone(e.target.value)}
                className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none dark:text-slate-200"
              >
                <option value="all">כל אבני הדרך</option>
                {milestoneList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. WEEK VIEW */}
          {activeTab === 'week' && (
            <div className="space-y-4">
              {/* Week Navigation & Summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWeekOffset((prev) => prev - 1)}
                    className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
                    title="שבוע קודם"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {weekDays[0].dayNum} ב{weekDays[0].monthName} – {weekDays[6].dayNum} ב{weekDays[6].monthName}
                  </span>
                  <button
                    onClick={() => setWeekOffset((prev) => prev + 1)}
                    className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
                    title="שבוע הבא"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {weekOffset !== 0 && (
                    <button
                      onClick={() => setWeekOffset(0)}
                      className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 underline mr-1"
                    >
                      חזור לשבוע הנוכחי
                    </button>
                  )}
                </div>

                {/* Progress bar constraint indicator */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    הושלמו <strong className="text-emerald-600 dark:text-emerald-400">{completedWeekGoals.length}</strong> מתוך{' '}
                    <strong>{weekGoals.length}</strong> יעדים
                  </span>
                  {totalWeekMinutes > 0 && (
                    <span className="text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                      ⏱️ {completedWeekMinutes} / {totalWeekMinutes} דק׳
                    </span>
                  )}
                </div>
              </div>

              {/* 7 Days Columns / Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {weekDays.map((day) => {
                  let dayGoals = allGoals.filter((g) => g.date === day.dateStr);
                  if (filterMilestone !== 'all') {
                    dayGoals = dayGoals.filter((g) => g.milestoneTitle?.trim() === filterMilestone);
                  }
                  if (statusFilter === 'pending') {
                    dayGoals = dayGoals.filter((g) => !g.completed);
                  } else if (statusFilter === 'completed') {
                    dayGoals = dayGoals.filter((g) => g.completed);
                  }

                  const dayMinutes = dayGoals.reduce((sum, g) => sum + (g.durationMinutes || 0), 0);

                  return (
                    <div
                      key={day.dateStr}
                      className={`rounded-2xl p-3 border transition-all flex flex-col min-h-[160px] ${
                        day.isToday
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600 shadow-sm ring-1 ring-emerald-500/30'
                          : 'bg-white dark:bg-slate-850 border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700/60">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              יום {day.dayName}
                            </span>
                            {day.isToday && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500 text-white">
                                היום
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {day.dayNum} ב{day.monthName}
                          </span>
                        </div>
                        {dayMinutes > 0 && (
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            {dayMinutes} דק׳
                          </span>
                        )}
                      </div>

                      {/* Day Goals List */}
                      <div className="flex-1 space-y-2">
                        {dayGoals.length === 0 ? (
                          <div className="text-center py-4 text-[11px] text-slate-400 italic">
                            אין יעדים
                          </div>
                        ) : (
                          dayGoals.map((goal) => {
                            const docUrl =
                              goal.link ||
                              (goal.goalDocumentId
                                ? `https://docs.google.com/document/d/${goal.goalDocumentId}/edit`
                                : undefined);

                            return (
                              <div
                                key={goal.id}
                                className={`p-2 rounded-xl border text-xs transition-all ${
                                  goal.completed
                                    ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 opacity-70'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-400 shadow-2xs'
                                }`}
                              >
                                <div className="flex items-start gap-1.5">
                                  <button
                                    onClick={() => onToggleComplete(goal)}
                                    className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                                      goal.completed
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                                    }`}
                                  >
                                    {goal.completed && <Check className="w-3 h-3 stroke-[3]" />}
                                  </button>

                                  <div className="flex-1 min-w-0">
                                    <p
                                      onClick={() => onEditTask(goal)}
                                      className={`font-semibold cursor-pointer leading-tight truncate hover:text-emerald-600 transition-colors ${
                                        goal.completed
                                          ? 'line-through text-slate-400'
                                          : 'text-slate-800 dark:text-slate-100'
                                      }`}
                                      title={goal.title}
                                    >
                                      {goal.title}
                                    </p>

                                    {/* Milestone & Duration */}
                                    <div className="flex items-center flex-wrap gap-1 mt-1 text-[9px]">
                                      {goal.milestoneTitle && (
                                        <span className="font-semibold text-emerald-700 dark:text-emerald-300 truncate max-w-[90px]">
                                          {goal.milestoneTitle}
                                        </span>
                                      )}
                                      {goal.durationMinutes && (
                                        <span className="text-amber-700 dark:text-amber-300 font-medium">
                                          ⏱️{goal.durationMinutes}דק׳
                                        </span>
                                      )}
                                    </div>

                                    {/* Actions: Doc link & Reschedule */}
                                    <div className="flex items-center gap-1.5 mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                                      {docUrl && (
                                        <a
                                          href={docUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                                          title="פתח ב-Google Docs"
                                        >
                                          <FileText className="w-2.5 h-2.5" />
                                          <span>Docs</span>
                                        </a>
                                      )}

                                      {/* Quick reschedule button */}
                                      {!day.isToday && (
                                        <button
                                          onClick={() => onRescheduleGoal(goal, currentDate)}
                                          className="mr-auto text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                                          title="העבר לתאריך של היום"
                                        >
                                          <ArrowRightLeft className="w-2.5 h-2.5" />
                                          <span>להיום</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. MILESTONES & PROGRESS VIEW */}
          {activeTab === 'milestones' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                  התקדמות אבני הדרך במסמכי ה-Drive
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  כל יעד קטן שמושלם מקדם את אבן הדרך הכללית ומסמן התקדמות במסמך Google Docs המקושר
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from(milestoneMap.entries()).map(([milestone, goals]) => {
                  let filteredList = goals;
                  if (statusFilter === 'pending') {
                    filteredList = filteredList.filter((g) => !g.completed);
                  } else if (statusFilter === 'completed') {
                    filteredList = filteredList.filter((g) => g.completed);
                  }

                  const total = goals.length;
                  const completed = goals.filter((g) => g.completed).length;
                  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                  const totalMinutes = goals.reduce((sum, g) => sum + (g.durationMinutes || 0), 0);

                  return (
                    <div
                      key={milestone}
                      className="bg-white dark:bg-slate-850 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Milestone className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {milestone}
                            </h4>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {completed} מתוך {total} הושלמו ({percent}%)
                            </span>
                          </div>
                        </div>

                        {totalMinutes > 0 && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            ⏱️ {totalMinutes} דק׳
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      {/* Sub-goals list */}
                      <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto">
                        {filteredList.map((g) => (
                          <div
                            key={g.id}
                            className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                onClick={() => onToggleComplete(g)}
                                className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                  g.completed
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {g.completed && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>
                              <span
                                className={`truncate ${
                                  g.completed ? 'line-through text-slate-400' : 'font-medium text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {g.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                              <span>{g.date}</span>
                              {g.durationMinutes && <span>⏱️{g.durationMinutes}דק׳</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. MONTH VIEW */}
          {activeTab === 'month' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    יעדי חודש {HEBREW_MONTHS[Number(currentMonthPrefix.split('-')[1]) - 1]}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    תמונה כוללת על כל היעדים המתוזמנים בחודש הנוכחי
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block">סה״כ יעדים</span>
                    <strong className="text-sm text-slate-900 dark:text-white">{monthGoals.length}</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block">הושלמו</span>
                    <strong className="text-sm text-emerald-600 dark:text-emerald-400">
                      {monthGoals.filter((g) => g.completed).length}
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block">סה״כ שעות</span>
                    <strong className="text-sm text-amber-600 dark:text-amber-400">
                      {(monthGoals.reduce((sum, g) => sum + (g.durationMinutes || 0), 0) / 60).toFixed(1)} ש׳
                    </strong>
                  </div>
                </div>
              </div>

              {/* Monthly list */}
              <div className="space-y-2">
                {monthGoals
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((goal) => (
                    <div
                      key={goal.id}
                      className="p-3 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => onToggleComplete(goal)}
                          className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors shrink-0 ${
                            goal.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {goal.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <div className="min-w-0">
                          <p
                            onClick={() => onEditTask(goal)}
                            className={`text-xs sm:text-sm font-semibold cursor-pointer truncate ${
                              goal.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {goal.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              {goal.milestoneTitle || 'התפתחות אישית'}
                            </span>
                            <span>•</span>
                            <span>{goal.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {goal.durationMinutes && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            ⏱️ {goal.durationMinutes} דק׳
                          </span>
                        )}
                        {goal.link && (
                          <a
                            href={goal.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                            title="פתח מסמך מקור"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
