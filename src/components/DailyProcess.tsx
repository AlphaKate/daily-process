import React, { useState } from 'react';
import { Task, TaskCategory } from '../types';
import { TaskItem } from './TaskItem';
import { GoalsTimelineModal } from './GoalsTimelineModal';
import { getStoredTasks, saveStoredTasks, getTodayDateString } from '../services/storage';
import {
  SuperListItem,
  getSuperListItems,
  addSuperListItem,
  toggleSuperListItem,
  deleteSuperListItem,
  importSuperItemToCasual,
  syncSuperListWithDrive,
  SUPER_LIST_INVITE_URL
} from '../services/superListStorage';
import { getStoredToken, GOOGLE_DRIVE_FOLDER_ID } from '../services/googleAuth';
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
  ExternalLink,
  Trash2,
  RefreshCw,
  ArrowDownToLine,
  ShoppingBag,
  Sunrise,
  Inbox
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
  overdueTasksCount?: number;
  onOpenMorningReview?: () => void;
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
  overdueTasksCount,
  onOpenMorningReview,
}) => {
  const [showDoneSection, setShowDoneSection] = useState(true);
  const [goalsViewMode, setGoalsViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [casualViewMode, setCasualViewMode] = useState<'today' | 'super'>('today');
  const [allTasksExpanded, setAllTasksExpanded] = useState<boolean | undefined>(undefined);
  const [weekDraggedTaskId, setWeekDraggedTaskId] = useState<string | null>(null);
  const [weekDragOverDate, setWeekDragOverDate] = useState<string | null>(null);
  const [showWeekBacklog, setShowWeekBacklog] = useState(false);
  const [superItems, setSuperItems] = useState<SuperListItem[]>(() => getSuperListItems());
  const [newSuperText, setNewSuperText] = useState('');
  const [isSuperSyncing, setIsSuperSyncing] = useState(false);
  const [superSyncMessage, setSuperSyncMessage] = useState<{ text: string; isError?: boolean } | null>(null);
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
  const backlogGoals = allGoals.filter(t => !t.date || t.date === 'backlog');

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

  // Operational Super List (To Do) handlers
  const activeSuperItems = superItems.filter(i => !i.completed);
  const completedSuperItems = superItems.filter(i => i.completed);

  const handleAddSuperItemInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuperText.trim()) return;
    addSuperListItem(newSuperText.trim());
    setNewSuperText('');
    setSuperItems(getSuperListItems());
  };

  const handleToggleSuperItemInline = (id: string) => {
    const updated = toggleSuperListItem(id);
    setSuperItems(updated);
  };

  const handleDeleteSuperItemInline = (id: string) => {
    const updated = deleteSuperListItem(id);
    setSuperItems(updated);
  };

  const handleImportSuperInline = (item: SuperListItem) => {
    const newTask = importSuperItemToCasual(item, currentDate);
    if (_onTasksSynced) {
      _onTasksSynced([newTask], []);
    }
    setLocalTasksVersion(v => v + 1);
    setSuperSyncMessage({ text: `"${item.text}" נוסף לסידורים של היום!` });
    setTimeout(() => setSuperSyncMessage(null), 3000);
  };

  const handleSyncSuperInline = async () => {
    setIsSuperSyncing(true);
    setSuperSyncMessage(null);
    try {
      const token = getStoredToken();
      if (!token?.access_token) {
        const loaded = getSuperListItems();
        setSuperItems(loaded);
        setSuperSyncMessage({ text: 'הרשימה רועננה מקומית' });
      } else {
        const res = await syncSuperListWithDrive(GOOGLE_DRIVE_FOLDER_ID, token.access_token);
        setSuperItems(res.items);
        setSuperSyncMessage({ text: `סונכרנו ${res.items.length} פריטים מול הענן!` });
      }
    } catch {
      setSuperSyncMessage({ text: 'שגיאה בסנכרון מול הענן', isError: true });
    } finally {
      setIsSuperSyncing(false);
      setTimeout(() => setSuperSyncMessage(null), 3500);
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
      {/* Morning Rollover Notification Banner */}
      {overdueTasksCount !== undefined && overdueTasksCount > 0 && currentDate === getTodayDateString() && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sunrise className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                נמצאו {overdueTasksCount} משימות מיום קודם שטרם הושלמו
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                העבירי אותן לתכנון של היום או סמני מה שכבר בוצע
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenMorningReview}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs shrink-0 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sunrise className="w-3.5 h-3.5" />
            <span>סקור משימות</span>
          </button>
        </div>
      )}

      {/* GLOBAL VIEW CONTROLS (הרחב / כווץ הכל) */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-slate-400 font-medium">
          {activeTasks.length} משימות מתוכננות להיום
        </span>
        <button
          type="button"
          onClick={() => setAllTasksExpanded(prev => (prev === true ? false : true))}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 transition-colors shadow-2xs cursor-pointer"
        >
          {allTasksExpanded ? <ChevronUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{allTasksExpanded ? 'כווץ הכל' : 'הרחב הכל'}</span>
        </button>
      </div>

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
                forceExpanded={allTasksExpanded}
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
                    forceExpanded={allTasksExpanded}
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
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  יעדים שתוכננו לשבוע זה: {weekGoals.length} (הושלמו {weekCompletedGoals.length})
                </span>
                {weekTotalMinutes > 0 && (
                  <span className="text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                    ⏱️ {weekCompletedMinutes} / {weekTotalMinutes} דק׳ הושקעו
                  </span>
                )}
              </div>

              {/* Toggle Backlog Drawer in Week */}
              <button
                type="button"
                onClick={() => setShowWeekBacklog(prev => !prev)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showWeekBacklog
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                }`}
              >
                <Inbox className="w-3.5 h-3.5 text-amber-500" />
                <span>בנק יעדים ({backlogGoals.length})</span>
                {showWeekBacklog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Backlog Drawer for Week View */}
            {showWeekBacklog && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setWeekDragOverDate('backlog');
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    if (weekDragOverDate === 'backlog') setWeekDragOverDate(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('text/plain') || weekDraggedTaskId;
                  if (id) {
                    const task = allGoals.find(t => t.id === id);
                    if (task && task.date !== 'backlog') {
                      handleReschedule(task, 'backlog');
                    }
                  }
                  setWeekDragOverDate(null);
                  setWeekDraggedTaskId(null);
                }}
                className={`p-2.5 rounded-xl border transition-all ${
                  weekDragOverDate === 'backlog'
                    ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-500 ring-2 ring-amber-400'
                    : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                    <Inbox className="w-3.5 h-3.5 text-amber-600" />
                    <span>בנק יעדים ({backlogGoals.length} ממתינים)</span>
                  </div>
                  <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80">
                    גרור/י יעד ליום מסוים, או גרור/י לכאן להחזרה לבנק
                  </span>
                </div>
                {backlogGoals.length === 0 ? (
                  <div className="text-center py-2 text-xs text-amber-700/70 dark:text-amber-400 italic">
                    בנק היעדים ריק. כל היעדים שובצו!
                  </div>
                ) : (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {backlogGoals.map(bg => (
                      <div
                        key={bg.id}
                        draggable={!bg.completed}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', bg.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setWeekDraggedTaskId(bg.id);
                        }}
                        onDragEnd={() => {
                          setWeekDraggedTaskId(null);
                          setWeekDragOverDate(null);
                        }}
                        className={`p-1.5 px-2 rounded-lg border text-xs min-w-[170px] max-w-[210px] shrink-0 bg-white dark:bg-slate-850 border-amber-200 dark:border-amber-800 flex items-center justify-between gap-1.5 cursor-grab active:cursor-grabbing ${
                          weekDraggedTaskId === bg.id ? 'opacity-40 scale-95 ring-2 ring-amber-400' : ''
                        }`}
                      >
                        <span className="truncate font-medium flex-1 text-slate-800 dark:text-slate-100" title={bg.title}>
                          {bg.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleReschedule(bg, currentDate)}
                          className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold shrink-0 hover:bg-emerald-200 cursor-pointer"
                          title="שבץ להיום"
                        >
                          להיום
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Horizontal 7-Day Timeline Strip (Drag Targets) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
              {currentWeekDates.map((day) => {
                let dayGoals = allGoals.filter(g => g.date === day.dateStr);
                if (milestoneFilter !== 'all') {
                  dayGoals = dayGoals.filter(g => g.milestoneTitle?.trim() === milestoneFilter);
                }

                const isTarget = weekDragOverDate === day.dateStr;

                return (
                  <div
                    key={day.dateStr}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (weekDragOverDate !== day.dateStr) setWeekDragOverDate(day.dateStr);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        if (weekDragOverDate === day.dateStr) setWeekDragOverDate(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData('text/plain') || weekDraggedTaskId;
                      if (id) {
                        const task = allGoals.find(t => t.id === id);
                        if (task && task.date !== day.dateStr) {
                          handleReschedule(task, day.dateStr);
                        }
                      }
                      setWeekDragOverDate(null);
                      setWeekDraggedTaskId(null);
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between min-h-[110px] transition-all ${
                      isTarget
                        ? 'border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-50/80 dark:bg-emerald-950/50 shadow-md scale-[1.01]'
                        : day.isToday
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 shadow-2xs ring-1 ring-emerald-500/20'
                        : 'bg-white dark:bg-slate-850 border-slate-200/70 dark:border-slate-700/70'
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
                            draggable={!g.completed}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', g.id);
                              e.dataTransfer.effectAllowed = 'move';
                              setWeekDraggedTaskId(g.id);
                            }}
                            onDragEnd={() => {
                              setWeekDraggedTaskId(null);
                              setWeekDragOverDate(null);
                            }}
                            className={`p-1.5 rounded-lg border text-[11px] leading-tight transition-colors cursor-grab active:cursor-grabbing ${
                              weekDraggedTaskId === g.id
                                ? 'opacity-40 scale-95 ring-2 ring-emerald-500 bg-emerald-100'
                                : g.completed
                                ? 'bg-slate-50 dark:bg-slate-850/60 text-slate-400 line-through border-slate-200 dark:border-slate-700'
                                : 'bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                            }`}
                          >
                            <div className="flex items-start gap-1">
                              <button
                                type="button"
                                onClick={() => onToggleComplete(g)}
                                className={`w-3.5 h-3.5 rounded mt-0.5 flex items-center justify-center border shrink-0 cursor-pointer ${
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

                            {/* Reschedule actions */}
                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-[9px]">
                              {!day.isToday ? (
                                <button
                                  type="button"
                                  onClick={() => handleReschedule(g, currentDate)}
                                  className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                  title="העבר לתאריך של היום"
                                >
                                  <ArrowRightLeft className="w-2 h-2" />
                                  <span>להיום</span>
                                </button>
                              ) : <span />}

                              <button
                                type="button"
                                onClick={() => handleReschedule(g, 'backlog')}
                                className="text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                                title="החזר לבנק היעדים"
                              >
                                <span>לבנק 🏦</span>
                              </button>
                            </div>
                          </div>
                        ))}

                        {dayGoals.length === 0 && (
                          <div className={`text-[10px] text-center py-2 italic rounded-lg border border-dashed ${
                            isTarget ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'text-slate-400 border-transparent'
                          }`}>
                            {isTarget ? 'שחרר כאן ⬇' : 'אין יעדים'}
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
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                סידורים אישיים וקניות מתוך רשימת "סופר" (Microsoft To Do)
              </p>
            </div>
          </div>

          {/* Sub-view switcher & actions */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCasualViewMode('today')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  casualViewMode === 'today'
                    ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>להיום</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  {casualTasks.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCasualViewMode('super')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  casualViewMode === 'super'
                    ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5 text-sky-500" />
                <span>רשימת סופר</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  {activeSuperItems.length}
                </span>
              </button>
            </div>

            {/* Quick Add Casual Task */}
            {casualViewMode === 'today' && (
              <button
                type="button"
                onClick={() => onQuickAddTask('casual')}
                className="p-1.5 text-xs text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                title="הוסף סידור שוטף חדש"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">הוסף</span>
              </button>
            )}
          </div>
        </div>

        {/* Sync message alert banner */}
        {superSyncMessage && (
          <div
            className={`p-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
              superSyncMessage.isError
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <span>{superSyncMessage.text}</span>
            <button
              onClick={() => setSuperSyncMessage(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          </div>
        )}

        {/* === VIEW 1: TODAY'S CASUAL TASKS === */}
        {casualViewMode === 'today' && (
          <div className="space-y-2.5">
            {/* Quick helper banner linking to "סופר" */}
            {activeSuperItems.length > 0 && (
              <div className="p-2.5 px-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 flex items-center justify-between text-xs transition-colors">
                <div className="flex items-center gap-2 text-sky-900 dark:text-sky-200">
                  <ShoppingBag className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>
                    ברשימת "סופר" (To Do) ממתינים <strong>{activeSuperItems.length}</strong> פריטים לקנייה/ביצוע
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCasualViewMode('super')}
                  className="px-2.5 py-1 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <span>בחר לרשימה</span>
                  <ArrowRightLeft className="w-3 h-3" />
                </button>
              </div>
            )}

            {casualTasks.length === 0 ? (
              <div className="text-center py-6 px-4 bg-white/60 dark:bg-slate-850/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-2.5">
                <p>אין סידורים מתוכננים להיום.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCasualViewMode('super')}
                    className="text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>ייבא מרשימת סופר 🛒</span>
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => onQuickAddTask('casual')}
                    className="text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                  >
                    הוסף סידור חדש +
                  </button>
                </div>
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
                    forceExpanded={allTasksExpanded}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* === VIEW 2: EMBEDDED OPERATIONAL TO DO LIST ("סופר") === */}
        {casualViewMode === 'super' && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-850 border border-sky-200/80 dark:border-sky-900/60 shadow-xs space-y-3.5">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <ListTodo className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>רשימת "סופר" (To Do)</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {activeSuperItems.length} פתוחים • {completedSuperItems.length} הושלמו
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Sync Button */}
                <button
                  type="button"
                  onClick={handleSyncSuperInline}
                  disabled={isSuperSyncing}
                  className="px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 rounded-xl border border-sky-200 dark:border-sky-800 flex items-center gap-1 transition-colors disabled:opacity-50"
                  title="סנכרן רשימת סופר מול Drive"
                >
                  <RefreshCw className={`w-3 h-3 ${isSuperSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSuperSyncing ? 'מסנכרן...' : 'סנכרן'}</span>
                </button>

                {/* External link to Microsoft To Do */}
                <a
                  href={SUPER_LIST_INVITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1 font-medium"
                  title="פתח באפליקציית Microsoft To Do"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="hidden sm:inline">ב-To Do</span>
                </a>
              </div>
            </div>

            {/* Quick Add Bar */}
            <form onSubmit={handleAddSuperItemInline} className="flex gap-2">
              <input
                type="text"
                value={newSuperText}
                onChange={(e) => setNewSuperText(e.target.value)}
                placeholder="הוסף מצרך או סידור לרשימת סופר..."
                className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={!newSuperText.trim()}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors shrink-0 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>הוסף</span>
              </button>
            </form>

            {/* Active Items */}
            <div className="space-y-1.5">
              {activeSuperItems.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-xs italic">
                  אין פריטים פתוחים ברשימת סופר
                </div>
              ) : (
                activeSuperItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 sm:p-2.5 bg-slate-50/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2 text-xs sm:text-sm group hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleSuperItemInline(item.id)}
                        className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 hover:border-sky-500 flex items-center justify-center shrink-0 transition-colors"
                        title="סמן כבוצע"
                      >
                        {item.completed && <Check className="w-3 h-3 text-sky-600" />}
                      </button>
                      <span className="truncate text-slate-800 dark:text-slate-100 font-medium">
                        {item.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleImportSuperInline(item)}
                        className="px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-100/80 hover:bg-sky-200/90 dark:bg-sky-950/80 dark:hover:bg-sky-900 rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                        title="ייבא כסידור להיום"
                      >
                        <ArrowDownToLine className="w-3 h-3" />
                        <span>להיום</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSuperItemInline(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="מחק פריט"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Completed Items */}
            {completedSuperItems.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  הושלמו ({completedSuperItems.length})
                </div>
                {completedSuperItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-1.5 px-2 bg-slate-50/40 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleSuperItemInline(item.id)}
                        className="w-3.5 h-3.5 rounded bg-sky-500 border-sky-500 text-white flex items-center justify-center shrink-0"
                        title="החזר לפעיל"
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </button>
                      <span className="truncate text-slate-400 line-through">
                        {item.text}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSuperItemInline(item.id)}
                      className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                      title="מחק"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                  forceExpanded={allTasksExpanded}
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
