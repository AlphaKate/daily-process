import React, { useState } from 'react';
import { Task, TaskCategory } from '../types';
import { TaskItem } from './TaskItem';
import { GoalsTimelineModal } from './GoalsTimelineModal';
import { getStoredTasks, saveStoredTasks } from '../services/storage';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Flame,
  Target,
  Coffee,
  CheckCheck,
  Calendar,
  Filter,
  Check,
  FileText,
  ArrowRightLeft,
  Milestone as MilestoneIcon,
  ListTodo,
  ExternalLink
} from 'lucide-react';

interface DailyProcessProps {
  tasks: Task[];
  currentDate: string;
  allTasks?: Task[];
  onToggleComplete: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteRequest: (task: Task) => void;
  onQuickAddTask: (category: TaskCategory) => void;
  onRescheduleTask?: (task: Task, newDate: string) => void;
  onTasksSynced?: (newTasks: Task[], updatedTasks: Task[]) => void;
}

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export const DailyProcess: React.FC<DailyProcessProps> = ({
  tasks,
  currentDate,
  allTasks,
  onToggleComplete,
  onEditTask,
  onDeleteRequest,
  onQuickAddTask,
  onRescheduleTask,
  onTasksSynced: _onTasksSynced,
}) => {
  const [showDoneSection, setShowDoneSection] = useState(true);
  const [goalsViewMode, setGoalsViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [milestoneFilter, setMilestoneFilter] = useState<string>('all');
  const [, setLocalTasksVersion] = useState(0);
  // Fallback to getStoredTasks() if allTasks prop is not passed
  const masterTasks = allTasks || getStoredTasks();

  // Filter tasks for current active view
  const activeTasks = tasks.filter(t => !t.completed);
  const doneTasks = tasks.filter(t => t.completed);

  const mustDoTasks = activeTasks.filter(t => t.category === 'must_do');
  const goalsTasks = activeTasks.filter(t => t.category === 'goals');
  const casualTasks = activeTasks.filter(t => t.category === 'casual');

  // All goals across all dates (for week and month views)
  const allGoals = masterTasks.filter(t => !t.isDeleted && t.category === 'goals');

  // Compute week days for the current week containing currentDate
  const [y, m, d] = currentDate.split('-').map(Number);
  const currentObj = new Date(y, m - 1, d);
  const dayOfWeek = currentObj.getDay(); // 0 = Sunday
  const sunday = new Date(currentObj);
  sunday.setDate(currentObj.getDate() - dayOfWeek);

  const currentWeekDates: { dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const dayItem = new Date(sunday);
    dayItem.setDate(sunday.getDate() + i);
    const yr = dayItem.getFullYear();
    const mo = String(dayItem.getMonth() + 1).padStart(2, '0');
    const da = String(dayItem.getDate()).padStart(2, '0');
    const dateStr = `${yr}-${mo}-${da}`;
    currentWeekDates.push({
      dateStr,
      dayName: HEBREW_DAYS[dayItem.getDay()],
      dayNum: dayItem.getDate(),
      isToday: dateStr === currentDate,
    });
  }

  // Week goals calculations
  const weekDatesList = currentWeekDates.map(w => w.dateStr);
  const weekGoals = allGoals.filter(g => weekDatesList.includes(g.date));
  const weekTotalMinutes = weekGoals.reduce((sum, g) => sum + (g.durationMinutes || 0), 0);
  const weekCompletedGoals = weekGoals.filter(g => g.completed);
  const weekCompletedMinutes = weekCompletedGoals.reduce((sum, g) => sum + (g.durationMinutes || 0), 0);

  // Month goals calculations
  const currentMonthPrefix = currentDate.substring(0, 7);
  const monthGoals = allGoals.filter(g => g.date.startsWith(currentMonthPrefix));
  const monthTotalMinutes = monthGoals.reduce((sum, g) => sum + (g.durationMinutes || 0), 0);
  const monthCompletedGoals = monthGoals.filter(g => g.completed);

  // Unique milestones for filter
  const uniqueMilestones = Array.from(
    new Set(allGoals.map(g => g.milestoneTitle?.trim()).filter(Boolean) as string[])
  );

  // Reschedule handler
  const handleReschedule = (task: Task, targetDate: string) => {
    if (onRescheduleTask) {
      onRescheduleTask(task, targetDate);
    } else {
      const stored = getStoredTasks();
      const updated = stored.map(t =>
        t.id === task.id
          ? { ...t, date: targetDate, updatedAt: new Date().toISOString() }
          : t
      );
      saveStoredTasks(updated);
      setLocalTasksVersion(v => v + 1);
    }
  };

  // Google Calendar meetings count for today
  const calendarTasksForDay = tasks.filter(t => !t.isDeleted && t.id.startsWith('gcal-'));
  const calendarMeetingsCount = calendarTasksForDay.length;

  // Filter goals for display
  const filteredGoalsForDay =
    milestoneFilter === 'all'
      ? goalsTasks
      : goalsTasks.filter(g => g.milestoneTitle?.trim() === milestoneFilter);

  return (
    <div className="space-y-6 pb-24">
      {/* 1. MUST DO SECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Flame className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Must Do</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                    {mustDoTasks.length}
                  </span>
                </h2>
                {calendarMeetingsCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs"
                    title="פגישות שסונכרנו מיומן Google Calendar להיום"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>
                      {calendarMeetingsCount === 1
                        ? 'פגישה 1 מסונכרנת'
                        : `${calendarMeetingsCount} פגישות מסונכרנות`}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                פגישות, התחייבויות קריטיות ודברים שחייבים לקרות היום
              </p>
            </div>
          </div>
          <button
            onClick={() => onQuickAddTask('must_do')}
            className="p-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">הוסף</span>
          </button>
        </div>

        {mustDoTasks.length === 0 ? (
          <div className="text-center py-6 px-4 bg-white/60 dark:bg-slate-850/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            אין משימות Must Do להיום. הוסף/י משימה או פגישה בלחיצה על +
          </div>
        ) : (
          <div className="space-y-2.5">
            {mustDoTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onEdit={onEditTask}
                onDeleteRequest={onDeleteRequest}
              />
            ))}
          </div>
        )}
      </section>

      {/* 2. GOALS SECTION (התפתחות אישית & תכנון לוח זמנים: יום | שבוע | חודש) */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Goals (התפתחות אישית ויעדים)</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  {goalsViewMode === 'day'
                    ? goalsTasks.length
                    : goalsViewMode === 'week'
                    ? weekGoals.length
                    : monthGoals.length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                יעדים קטנים ואבני דרך מתוך מסמכי ההתפתחות ב-Google Drive
              </p>
            </div>
          </div>

          {/* Action Bar: Timeline View Switcher (Day | Week | Month) & Timeline Modal Button */}
          <div className="flex items-center flex-wrap gap-1.5 self-end sm:self-auto">
            {/* View Mode Segmented Control: יום | שבוע | חודש */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setGoalsViewMode('day')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  goalsViewMode === 'day'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                יום
              </button>
              <button
                type="button"
                onClick={() => setGoalsViewMode('week')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  goalsViewMode === 'week'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                שבוע
              </button>
              <button
                type="button"
                onClick={() => setGoalsViewMode('month')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  goalsViewMode === 'month'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                חודש
              </button>
            </div>

            {/* Open Full Timeline Planning Modal */}
            <button
              onClick={() => setIsTimelineModalOpen(true)}
              className="p-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 font-semibold transition-colors"
              title="פתח לוח זמנים מורחב ליעדים"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden md:inline">לוח זמנים</span>
            </button>

            {/* Quick Add Goal */}
            <button
              onClick={() => onQuickAddTask('goals')}
              className="p-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg flex items-center gap-1 font-semibold transition-colors"
              title="הוסף יעד חדש"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">הוסף</span>
            </button>
          </div>
        </div>

        {/* Milestone Quick Filter (if milestones exist) */}
        {uniqueMilestones.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
              <Filter className="w-3 h-3" />
              <span>סינון:</span>
            </span>
            <button
              type="button"
              onClick={() => setMilestoneFilter('all')}
              className={`text-[11px] px-2.5 py-0.5 rounded-full transition-colors whitespace-nowrap ${
                milestoneFilter === 'all'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              הכל
            </button>
            {uniqueMilestones.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMilestoneFilter(m)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full transition-colors whitespace-nowrap ${
                  milestoneFilter === m
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* === A. DAY VIEW === */}
        {goalsViewMode === 'day' && (
          <div>
            {filteredGoalsForDay.length === 0 ? (
              <div className="text-center py-6 px-4 bg-white/60 dark:bg-slate-850/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-2">
                <p>לא תוכננו יעדי התפתחות להיום.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setGoalsViewMode('week')}
                    className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                  >
                    צפה ביעדי השבוע 📅
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => onQuickAddTask('goals')}
                    className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                  >
                    הוסף יעד להיום +
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredGoalsForDay.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggleComplete={onToggleComplete}
                    onEdit={onEditTask}
                    onDeleteRequest={onDeleteRequest}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* === B. WEEK VIEW === */}
        {goalsViewMode === 'week' && (
          <div className="space-y-3 p-3.5 bg-slate-50/70 dark:bg-slate-850/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            {/* Week Progress Bar & Constraints */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                יעדים שתוכננו לשבוע זה: {weekGoals.length} (הושלמו {weekCompletedGoals.length})
              </span>
              {weekTotalMinutes > 0 && (
                <span className="text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                  ⏱️ {weekCompletedMinutes} / {weekTotalMinutes} דק׳ הושקעו
                </span>
              )}
            </div>

            {/* Horizontal 7-Day Timeline Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
              {currentWeekDates.map((day) => {
                let dayGoals = allGoals.filter(g => g.date === day.dateStr);
                if (milestoneFilter !== 'all') {
                  dayGoals = dayGoals.filter(g => g.milestoneTitle?.trim() === milestoneFilter);
                }

                return (
                  <div
                    key={day.dateStr}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between min-h-[110px] transition-all ${
                      day.isToday
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 shadow-2xs ring-1 ring-emerald-500/20'
                        : 'bg-white dark:bg-slate-800 border-slate-200/70 dark:border-slate-700/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-700/50">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                          {day.dayName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{day.dayNum}</span>
                      </div>

                      <div className="space-y-1.5">
                        {dayGoals.map((g) => (
                          <div
                            key={g.id}
                            className={`p-1.5 rounded-lg border text-[11px] leading-tight transition-colors ${
                              g.completed
                                ? 'bg-slate-50 dark:bg-slate-850/60 text-slate-400 line-through border-slate-200 dark:border-slate-700'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                            }`}
                          >
                            <div className="flex items-start gap-1">
                              <button
                                onClick={() => onToggleComplete(g)}
                                className={`w-3.5 h-3.5 rounded mt-0.5 flex items-center justify-center border shrink-0 ${
                                  g.completed
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {g.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </button>
                              <span
                                onClick={() => onEditTask(g)}
                                className="truncate cursor-pointer hover:text-emerald-600 block flex-1"
                                title={g.title}
                              >
                                {g.title}
                              </span>
                            </div>

                            {/* Move to today action */}
                            {!day.isToday && (
                              <button
                                onClick={() => handleReschedule(g, currentDate)}
                                className="mt-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                                title="העבר לתאריך של היום"
                              >
                                <ArrowRightLeft className="w-2 h-2" />
                                <span>להיום</span>
                              </button>
                            )}
                          </div>
                        ))}

                        {dayGoals.length === 0 && (
                          <div className="text-[10px] text-slate-400 text-center py-2 italic">
                            אין יעדים
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === C. MONTH VIEW === */}
        {goalsViewMode === 'month' && (
          <div className="space-y-3 p-3.5 bg-slate-50/70 dark:bg-slate-850/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                סקירת יעדים לחודש {HEBREW_MONTHS[Number(currentMonthPrefix.split('-')[1]) - 1]}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                הושלמו {monthCompletedGoals.length} מתוך {monthGoals.length} (סה״כ {(monthTotalMinutes / 60).toFixed(1)} שעות)
              </span>
            </div>

            {/* Milestone Breakdown Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {uniqueMilestones.map((milestone) => {
                const msGoals = monthGoals.filter(g => g.milestoneTitle?.trim() === milestone);
                if (msGoals.length === 0) return null;
                const msCompleted = msGoals.filter(g => g.completed).length;
                const msPercent = Math.round((msCompleted / msGoals.length) * 100);

                return (
                  <div
                    key={milestone}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <MilestoneIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{milestone}</span>
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {msCompleted}/{msGoals.length} ({msPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${msPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Monthly goals list */}
            <div className="space-y-1.5 pt-1 max-h-60 overflow-y-auto">
              {monthGoals.map((g) => (
                <div
                  key={g.id}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-xs"
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
                      onClick={() => onEditTask(g)}
                      className={`truncate cursor-pointer hover:text-emerald-600 ${
                        g.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'
                      }`}
                    >
                      {g.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 shrink-0">
                    <span>{g.date}</span>
                    {g.durationMinutes && (
                      <span className="text-amber-700 dark:text-amber-300">⏱️{g.durationMinutes}דק׳</span>
                    )}
                    {g.link && (
                      <a
                        href={g.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <FileText className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3. CASUAL SECTION */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Coffee className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Casual (שוטף & סידורים)</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300">
                    {casualTasks.length}
                  </span>
                </h2>
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shadow-2xs"
                  title="רשימת Microsoft To Do: סופר"
                >
                  <ListTodo className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>רשימת "סופר" ב-To Do</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                סידורים אישיים וקניות מתוך רשימת "סופר" ב-Microsoft To Do
              </p>
            </div>
          </div>

          {/* Action Bar: Direct Link to 'סופר' and 'הוסף' */}
          <div className="flex items-center flex-wrap gap-1.5 self-end sm:self-auto">
            {/* Direct 1-tap link to "סופר" in Microsoft To Do */}
            <a
              href="https://to-do.microsoft.com/sharing?InvitationToken=cSHAtsnUNTW0E2q3AEdlYmuhB8FZ2Q3tILzClg0YBCn-KrWUF9s9KrPQZJrtOsYlCiEN015c05_7oQPJaeCRkA"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded-xl border border-sky-200 dark:border-sky-800 flex items-center gap-1 font-semibold transition-colors shadow-2xs"
              title="פתח את רשימת סופר באפליקציית Microsoft To Do"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>פתח "סופר" ב-To Do</span>
            </a>

            {/* Quick Add Casual Task */}
            <button
              type="button"
              onClick={() => onQuickAddTask('casual')}
              className="p-1.5 text-xs text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg flex items-center gap-1 font-semibold transition-colors"
              title="הוסף סידור שוטף חדש"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">הוסף</span>
            </button>
          </div>
        </div>

        {casualTasks.length === 0 ? (
          <div className="text-center py-6 px-4 bg-white/60 dark:bg-slate-850/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            אין משימות שוטפות כרגע. לחץ/י על "סנכרן To Do" או על + להוספת סידור
          </div>
        ) : (
          <div className="space-y-2.5">
            {casualTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onEdit={onEditTask}
                onDeleteRequest={onDeleteRequest}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. DONE SECTION (משימות שבוצעו) */}
      {doneTasks.length > 0 && (
        <section className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <button
            onClick={() => setShowDoneSection(prev => !prev)}
            className="w-full flex items-center justify-between text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white py-1 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs sm:text-sm font-bold">
                הושלמו היום ({doneTasks.length})
              </span>
            </div>
            {showDoneSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDoneSection && (
            <div className="space-y-2.5 pt-1">
              {doneTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onEdit={onEditTask}
                  onDeleteRequest={onDeleteRequest}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 5. GOALS TIMELINE MODAL */}
      <GoalsTimelineModal
        isOpen={isTimelineModalOpen}
        currentDate={currentDate}
        allTasks={masterTasks}
        onClose={() => setIsTimelineModalOpen(false)}
        onToggleComplete={onToggleComplete}
        onEditTask={onEditTask}
        onQuickAddGoal={() => {
          setIsTimelineModalOpen(false);
          onQuickAddTask('goals');
        }}
        onRescheduleGoal={handleReschedule}
      />

    </div>
  );
};
