import React, { useState } from 'react';
import { Task } from '../types';
import {
  X,
  Calendar,
  Milestone,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  ArrowRightLeft,
  Check,
  Inbox,
  GripVertical,
  ArrowDownToLine,
  Brain,
  Search,
  Gauge,
  Trash2,
  Target,
  AlertTriangle
} from 'lucide-react';
import { QuickRescheduleSheet } from './QuickRescheduleSheet';

interface GoalsTimelineModalProps {
  isOpen: boolean;
  currentDate: string;
  allTasks: Task[];
  onClose: () => void;
  onToggleComplete: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onQuickAddGoal: () => void;
  onRescheduleGoal: (task: Task, newDate: string) => void;
  onDeleteMilestone?: (milestone: string, mode: 'purge' | 'unlink') => void;
}

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const RECOMMENDED_DAILY_BUDGET_MINUTES = 60;
const RECOMMENDED_WEEKLY_BUDGET_MINUTES = 300;

export const GoalsTimelineModal: React.FC<GoalsTimelineModalProps> = ({
  isOpen,
  currentDate,
  allTasks,
  onClose,
  onToggleComplete,
  onEditTask,
  onQuickAddGoal,
  onRescheduleGoal,
  onDeleteMilestone,
}) => {
  const [activeTab, setActiveTab] = useState<'week' | 'bank' | 'milestones' | 'month'>('week');
  const [filterMilestone, setFilterMilestone] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [durationFilter, setDurationFilter] = useState<'all' | 'quick' | 'deep'>('all');
  const [backlogSearch, setBacklogSearch] = useState<string>('');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [isBacklogDrawerOpen, setIsBacklogDrawerOpen] = useState<boolean>(true);
  const [collapsedMilestones, setCollapsedMilestones] = useState<Record<string, boolean>>({});
  const [rescheduleSheetTask, setRescheduleSheetTask] = useState<Task | null>(null);
  const [milestoneToDelete, setMilestoneToDelete] = useState<{
    name: string;
    count: number;
    goals: Task[];
  } | null>(null);
  const [deleteMode, setDeleteMode] = useState<'purge' | 'unlink'>('purge');

  const handleConfirmDeleteMilestone = () => {
    if (!milestoneToDelete) return;
    const { name } = milestoneToDelete;
    if (onDeleteMilestone) {
      onDeleteMilestone(name, deleteMode);
    }
    setMilestoneToDelete(null);
  };

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

  // Calculate tomorrow's date string
  const tomorrowObj = new Date(refY, refM - 1, refD);
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = `${tomorrowObj.getFullYear()}-${String(tomorrowObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowObj.getDate()).padStart(2, '0')}`;

  // Current Month calculation
  const currentMonthPrefix = currentDate.substring(0, 7); // YYYY-MM
  const monthGoals = allGoals.filter(g => g.date && g.date.startsWith(currentMonthPrefix));

  // Extract unique milestones
  const milestoneList = Array.from(
    new Set(allGoals.map(g => g.milestoneTitle?.trim()).filter(Boolean) as string[])
  );

  // Backlog goals (unassigned date or 'backlog')
  const rawBacklogGoals = allGoals.filter(g => !g.date || g.date === 'backlog');
  let backlogGoals = rawBacklogGoals;
  if (filterMilestone !== 'all') {
    backlogGoals = backlogGoals.filter(g => g.milestoneTitle?.trim() === filterMilestone);
  }
  if (statusFilter === 'pending') {
    backlogGoals = backlogGoals.filter(g => !g.completed);
  } else if (statusFilter === 'completed') {
    backlogGoals = backlogGoals.filter(g => g.completed);
  }
  // Duration filter
  if (durationFilter === 'quick') {
    backlogGoals = backlogGoals.filter(g => (g.durationMinutes || 20) <= 30);
  } else if (durationFilter === 'deep') {
    backlogGoals = backlogGoals.filter(g => (g.durationMinutes || 20) > 30);
  }
  // Search filter
  if (backlogSearch.trim()) {
    const q = backlogSearch.toLowerCase().trim();
    backlogGoals = backlogGoals.filter(
      g =>
        g.title.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q)) ||
        (g.milestoneTitle && g.milestoneTitle.toLowerCase().includes(q))
    );
  }

  const totalBacklogMinutes = backlogGoals.reduce((sum, g) => sum + (g.durationMinutes || 0), 0);

  // Group backlog by milestone
  const backlogByMilestone = new Map<string, Task[]>();
  backlogGoals.forEach(g => {
    const key = g.milestoneTitle?.trim() || 'יעדים שוטפים ללא אבן דרך';
    const list = backlogByMilestone.get(key) || [];
    list.push(g);
    backlogByMilestone.set(key, list);
  });

  const toggleMilestoneCollapse = (milestone: string) => {
    setCollapsedMilestones(prev => ({
      ...prev,
      [milestone]: !prev[milestone]
    }));
  };

  const expandAllMilestones = () => {
    setCollapsedMilestones({});
  };

  const collapseAllMilestones = () => {
    const allCollapsed: Record<string, boolean> = {};
    Array.from(backlogByMilestone.keys()).forEach(k => {
      allCollapsed[k] = true;
    });
    setCollapsedMilestones(allCollapsed);
  };

  // Filtered goals for week view
  const weekDatesList = weekDays.map(w => w.dateStr);
  const weekGoals = allGoals.filter(g => g.date && weekDatesList.includes(g.date));

  const totalWeekMinutes = weekGoals.reduce((sum, g) => sum + (g.durationMinutes || 0), 0);
  const completedWeekGoals = weekGoals.filter(g => g.completed);
  const completedWeekMinutes = completedWeekGoals.reduce((sum, g) => sum + (g.durationMinutes || 0), 0);
  const weekCapacityPercent = Math.min(100, Math.round((totalWeekMinutes / RECOMMENDED_WEEKLY_BUDGET_MINUTES) * 100));

  // Group goals by milestone for Milestone view
  const milestoneMap = new Map<string, Task[]>();
  allGoals.forEach(g => {
    const ms = g.milestoneTitle?.trim() || 'יעדים כלליים (ללא אבן דרך)';
    const list = milestoneMap.get(ms) || [];
    list.push(g);
    milestoneMap.set(ms, list);
  });

  // Drag & Drop event handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(task.id);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, target: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTarget !== target) {
      setDragOverTarget(target);
    }
  };

  const handleDragLeave = (e: React.DragEvent, target: string) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverTarget === target) {
        setDragOverTarget(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      const task = allGoals.find(t => t.id === taskId);
      if (task && task.date !== targetDate) {
        onRescheduleGoal(task, targetDate);
      }
    }
    setDragOverTarget(null);
    setDraggedTaskId(null);
  };

  // Helper for Daily Capacity Indicator Style
  const getCapacityStyle = (minutes: number) => {
    if (minutes === 0) {
      return {
        badge: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        bar: 'bg-slate-300 dark:bg-slate-700',
        label: 'פנוי',
        icon: '⚪'
      };
    }
    if (minutes <= RECOMMENDED_DAILY_BUDGET_MINUTES) {
      return {
        badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        bar: 'bg-emerald-500',
        label: 'מאוזן',
        icon: '🟢'
      };
    }
    if (minutes <= 90) {
      return {
        badge: 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        bar: 'bg-amber-500',
        label: 'עומס מתון',
        icon: '🟡'
      };
    }
    return {
      badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      bar: 'bg-rose-500',
      label: 'עומס גבוה',
      icon: '🔴'
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200 modal-viewport-lock safe-area-bottom">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[94vh] max-h-[94vh] max-w-full">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 max-w-full min-w-0 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="truncate">לוח זמנים ותכנון יעדים</span>
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 shrink-0">
                  {allGoals.length} יעדים
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">
                תכנון שבועי עם גרירה ומחוות מגע, מד עומס זמנים ובנק משימות מקובץ לפי נושאים
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onQuickAddGoal}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">יעד חדש</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              aria-label="סגור"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher & Filters Bar */}
        <div className="px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 max-w-full shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('week')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'week'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              📅 לוח שבועי
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bank')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'bank'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Inbox className="w-3.5 h-3.5 text-amber-500" />
              <span>בנק יעדים</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold">
                {rawBacklogGoals.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('milestones')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'milestones'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🎯 אבני דרך ({milestoneMap.size})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('month')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'month'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              📆 חודש
            </button>
          </div>

          {/* Weekly Capacity Overview Pill */}
          {activeTab === 'week' && (
            <div className="flex items-center gap-2 text-xs bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <Gauge className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                תקציב שבועי:
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {totalWeekMinutes} / {RECOMMENDED_WEEKLY_BUDGET_MINUTES} דק׳
              </span>
              <div className="w-16 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shrink-0">
                <div
                  className={`h-full rounded-full transition-all ${
                    weekCapacityPercent > 90 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${weekCapacityPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick Filters */}
          <div className="flex items-center gap-2 max-w-full flex-wrap">
            {/* Milestone Dropdown */}
            {milestoneList.length > 0 && (
              <select
                value={filterMilestone}
                onChange={(e) => setFilterMilestone(e.target.value)}
                className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">כל אבני הדרך</option>
                {milestoneList.map(ms => (
                  <option key={ms} value={ms}>{ms}</option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                הכל
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  statusFilter === 'pending'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                לביצוע
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  statusFilter === 'completed'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                הושלמו
              </button>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 max-w-full overflow-x-hidden">
          {/* ======================================================== */}
          {/* 1. WEEK TIMELINE VIEW WITH CAPACITY METERS */}
          {/* ======================================================== */}
          {activeTab === 'week' && (
            <div className="space-y-3.5 max-w-full">
              {/* Week Navigation Header */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWeekOffset(prev => prev - 1)}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="שבוע קודם"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekOffset(0)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      weekOffset === 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    שבוע נוכחי
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekOffset(prev => prev + 1)}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="שבוע הבא"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 pr-2">
                    {weekDays[0].dayNum} {weekDays[0].monthName} – {weekDays[6].dayNum} {weekDays[6].monthName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {completedWeekGoals.length}/{weekGoals.length} יעדים הושלמו ({completedWeekMinutes}/{totalWeekMinutes} דק׳)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsBacklogDrawerOpen(prev => !prev)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    <span>בנק משימות ({rawBacklogGoals.length})</span>
                    {isBacklogDrawerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Backlog Horizontal Quick Bar */}
              {isBacklogDrawerOpen && (
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-amber-200/60 dark:border-amber-800/50">
                    <div className="flex items-center gap-2">
                      <Inbox className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-bold text-amber-950 dark:text-amber-100">
                        בנק יעדים ומשימות להקצאה (גרור/י ליום הרצוי או לחץ/י לשיבוץ)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('bank')}
                      className="text-[11px] text-amber-700 dark:text-amber-300 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>ניהול מלא בבנק</span>
                      <ArrowRightLeft className="w-3 h-3" />
                    </button>
                  </div>

                  {rawBacklogGoals.length === 0 ? (
                    <div className="text-center py-2 text-xs text-amber-700/70 dark:text-amber-400 italic">
                      בנק היעדים ריק. כל היעדים שובצו לימים! (ניתן ללחוץ על שיבוץ מהיר כדי להחזיר יעד לבנק)
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {rawBacklogGoals.map((goal) => (
                        <div
                          key={goal.id}
                          draggable={!goal.completed}
                          onDragStart={(e) => handleDragStart(e, goal)}
                          onDragEnd={handleDragEnd}
                          className={`p-2 rounded-xl border min-w-[200px] max-w-[230px] shrink-0 text-xs transition-all cursor-grab active:cursor-grabbing ${
                            draggedTaskId === goal.id
                              ? 'opacity-40 scale-95 ring-2 ring-amber-400 bg-amber-100'
                              : 'bg-white dark:bg-slate-850 border-amber-200 dark:border-amber-800 hover:border-amber-400 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p
                                onClick={() => onEditTask(goal)}
                                className="font-semibold truncate text-slate-800 dark:text-slate-100 hover:text-emerald-600 transition-colors cursor-pointer"
                                title={goal.title}
                              >
                                {goal.title}
                              </p>
                              <div className="flex items-center gap-1 mt-1 text-[10px]">
                                {goal.milestoneTitle && (
                                  <span className="font-semibold text-emerald-700 dark:text-emerald-300 truncate max-w-[100px]">
                                    {goal.milestoneTitle}
                                  </span>
                                )}
                                {goal.durationMinutes && (
                                  <span className="text-amber-700 dark:text-amber-300 font-medium">
                                    ⏱️{goal.durationMinutes}דק׳
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                                <button
                                  type="button"
                                  onClick={() => onRescheduleGoal(goal, currentDate)}
                                  className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="שבץ להיום"
                                >
                                  <ArrowDownToLine className="w-2.5 h-2.5" />
                                  <span>להיום</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRescheduleSheetTask(goal)}
                                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                                  title="שיבוץ מהיר בטאץ'"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 7 Days Columns / Cards Grid with Daily Capacity Indicator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 max-w-full">
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
                  const isDropTarget = dragOverTarget === day.dateStr;
                  const capStyle = getCapacityStyle(dayMinutes);
                  const capPercent = Math.min(100, Math.round((dayMinutes / RECOMMENDED_DAILY_BUDGET_MINUTES) * 100));

                  return (
                    <div
                      key={day.dateStr}
                      onDragOver={(e) => handleDragOver(e, day.dateStr)}
                      onDragLeave={(e) => handleDragLeave(e, day.dateStr)}
                      onDrop={(e) => handleDrop(e, day.dateStr)}
                      className={`rounded-2xl p-2.5 border transition-all flex flex-col min-h-[180px] max-w-full overflow-hidden ${
                        isDropTarget
                          ? 'border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-50/80 dark:bg-emerald-950/50 shadow-md scale-[1.01]'
                          : day.isToday
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-600 shadow-2xs ring-1 ring-emerald-500/20'
                          : 'bg-white dark:bg-slate-850 border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {day.dayName}
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

                        {/* Daily Capacity Meter Indicator */}
                        <div className="mt-1 flex items-center justify-between gap-1 text-[9px]">
                          <span className={`px-1.5 py-0.2 rounded-md font-semibold border flex items-center gap-0.5 ${capStyle.badge}`}>
                            <span>{capStyle.icon}</span>
                            <span>{dayMinutes}/{RECOMMENDED_DAILY_BUDGET_MINUTES}דק׳</span>
                          </span>
                          <span className="text-slate-400 text-[9px] truncate">
                            {capStyle.label}
                          </span>
                        </div>
                        {/* Mini progress bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${capStyle.bar}`}
                            style={{ width: `${capPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Day Goals List */}
                      <div className="flex-1 space-y-1.5 min-w-0">
                        {dayGoals.length === 0 ? (
                          <div
                            className={`text-center py-5 text-[11px] rounded-xl border border-dashed transition-colors ${
                              isDropTarget
                                ? 'border-emerald-400 text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-100/40'
                                : 'border-slate-200 dark:border-slate-800 text-slate-400 italic'
                            }`}
                          >
                            {isDropTarget ? 'שחרר/י כאן ⬇' : 'שחרר/י יעד כאן'}
                          </div>
                        ) : (
                          dayGoals.map((goal) => {
                            const docUrl =
                              goal.link ||
                              (goal.goalDocumentId
                                ? `https://docs.google.com/document/d/${goal.goalDocumentId}/edit`
                                : undefined);

                            const isItemDragging = draggedTaskId === goal.id;

                            return (
                              <div
                                key={goal.id}
                                draggable={!goal.completed}
                                onDragStart={(e) => handleDragStart(e, goal)}
                                onDragEnd={handleDragEnd}
                                className={`p-2 rounded-xl border text-xs transition-all relative ${
                                  isItemDragging
                                    ? 'opacity-40 scale-95 ring-2 ring-emerald-500 bg-emerald-100'
                                    : goal.completed
                                    ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 opacity-70'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-400 shadow-2xs'
                                }`}
                              >
                                <div className="flex items-start gap-1.5">
                                  {/* Drag Grip Handle */}
                                  {!goal.completed && (
                                    <span title="גרור ליום אחר או לבנק" className="shrink-0 mt-0.5">
                                      <GripVertical
                                        className="w-3 h-3 text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing"
                                      />
                                    </span>
                                  )}

                                  {/* Toggle Complete */}
                                  <button
                                    type="button"
                                    onClick={() => onToggleComplete(goal)}
                                    className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
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

                                    {/* Actions & Touch Quick Reschedule Sheet Trigger */}
                                    <div className="flex items-center gap-1.5 mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                                      {docUrl && (
                                        <a
                                          href={docUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`text-[10px] hover:underline inline-flex items-center gap-0.5 ${
                                            docUrl.includes('notebooklm')
                                              ? 'text-purple-600 dark:text-purple-400 font-bold'
                                              : 'text-blue-600 dark:text-blue-400'
                                          }`}
                                          title={docUrl.includes('notebooklm') ? 'פתח ב-NotebookLM' : 'פתח ב-Google Docs'}
                                        >
                                          {docUrl.includes('notebooklm') ? (
                                            <Brain className="w-2.5 h-2.5" />
                                          ) : (
                                            <FileText className="w-2.5 h-2.5" />
                                          )}
                                          <span>{docUrl.includes('notebooklm') ? 'LM' : 'Docs'}</span>
                                        </a>
                                      )}

                                      {/* Move to today action */}
                                      {!day.isToday && (
                                        <button
                                          type="button"
                                          onClick={() => onRescheduleGoal(goal, currentDate)}
                                          className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                          title="העבר לתאריך של היום"
                                        >
                                          <span>להיום</span>
                                        </button>
                                      )}

                                      {/* Move to Bank button */}
                                      <button
                                        type="button"
                                        onClick={() => onRescheduleGoal(goal, 'backlog')}
                                        className="text-[9px] text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5 mr-auto cursor-pointer"
                                        title="החזר לבנק היעדים"
                                      >
                                        <span>לבנק 🏦</span>
                                      </button>

                                      {/* Quick Reschedule Touch Button */}
                                      <button
                                        type="button"
                                        onClick={() => setRescheduleSheetTask(goal)}
                                        className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded cursor-pointer"
                                        title="שיבוץ מהיר בטאץ'"
                                      >
                                        <ArrowRightLeft className="w-3 h-3" />
                                      </button>
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

          {/* ======================================================== */}
          {/* 2. DEDICATED FULL BACKLOG TAB - ACCORDIONS & FILTERS */}
          {/* ======================================================== */}
          {activeTab === 'bank' && (
            <div className="space-y-4 max-w-full">
              {/* Backlog Top Controls: Banner & Search & Filters */}
              <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
                      <span>בנק יעדים ומשימות (Goals Backlog)</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-bold">
                        {rawBacklogGoals.length}
                      </span>
                    </h3>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                      יעדי התפתחות אישית המחולקים לפי נושאים ואבני דרך. שבץ/י בקלות להיום, למחר או לכל יום בלוח.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {totalBacklogMinutes > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
                      ⏱️ סה״כ: {(totalBacklogMinutes / 60).toFixed(1)} שעות
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={onQuickAddGoal}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>יעד חדש לבנק</span>
                  </button>
                </div>
              </div>

              {/* Search & Duration Filters Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800">
                {/* Search Box */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={backlogSearch}
                    onChange={(e) => setBacklogSearch(e.target.value)}
                    placeholder="חפש/י יעד בבנק לפי שם או תיאור..."
                    className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  {backlogSearch && (
                    <button
                      type="button"
                      onClick={() => setBacklogSearch('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Duration Filter Pills */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-medium">משך:</span>
                  <button
                    type="button"
                    onClick={() => setDurationFilter('all')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                      durationFilter === 'all'
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    הכל
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationFilter('quick')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 ${
                      durationFilter === 'quick'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>⚡ מהירים (&le;30 דק׳)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationFilter('deep')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 ${
                      durationFilter === 'deep'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>⏳ יעדי עומק (30+ דק׳)</span>
                  </button>
                </div>

                {/* Accordion Expand/Collapse All */}
                <div className="flex items-center gap-1 mr-auto">
                  <button
                    type="button"
                    onClick={expandAllMilestones}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                  >
                    פתח הכל
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={collapseAllMilestones}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                  >
                    כווץ הכל
                  </button>
                </div>
              </div>

              {/* Grouped Accordions by Milestone */}
              {backlogGoals.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-2">
                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                    לא נמצאו יעדים בבנק התואמים את הסינון.
                  </p>
                  <p>באפשרותך לנקות את שורת החיפוש או להוסיף יעד חדש.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setBacklogSearch('');
                      setDurationFilter('all');
                      setStatusFilter('all');
                    }}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs"
                  >
                    אפס סינונים
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.from(backlogByMilestone.entries()).map(([milestone, items]) => {
                    const isCollapsed = Boolean(collapsedMilestones[milestone]);
                    const mTotalMins = items.reduce((sum, it) => sum + (it.durationMinutes || 0), 0);

                    return (
                      <div
                        key={milestone}
                        className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden transition-all"
                      >
                        {/* Accordion Header */}
                        <div
                          onClick={() => toggleMilestoneCollapse(milestone)}
                          className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 select-none transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <Milestone className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                {milestone}
                              </h4>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {items.length} יעדים בבנק {mTotalMins > 0 ? `• ⏱️ ${(mTotalMins / 60).toFixed(1)} שעות` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMilestoneToDelete({ name: milestone, count: items.length, goals: items });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer"
                              title="מחיקת אבן דרך"
                              aria-label={`מחק את אבן הדרך ${milestone}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleMilestoneCollapse(milestone)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              aria-label={isCollapsed ? 'פתח אבן דרך' : 'כווץ אבן דרך'}
                            >
                              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Accordion Content Grid */}
                        {!isCollapsed && (
                          <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-white dark:bg-slate-850">
                            {items.map((goal) => {
                              const docUrl =
                                goal.link ||
                                (goal.goalDocumentId
                                  ? `https://docs.google.com/document/d/${goal.goalDocumentId}/edit`
                                  : undefined);

                              return (
                                <div
                                  key={goal.id}
                                  className="p-3 bg-slate-50/60 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-2.5 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-2 flex-1 min-w-0">
                                        <button
                                          type="button"
                                          onClick={() => onToggleComplete(goal)}
                                          className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
                                            goal.completed
                                              ? 'bg-emerald-500 border-emerald-500 text-white'
                                              : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                                          }`}
                                        >
                                          {goal.completed && <Check className="w-3 h-3 stroke-[3]" />}
                                        </button>
                                        <div className="min-w-0">
                                          <h5
                                            onClick={() => onEditTask(goal)}
                                            className={`text-xs sm:text-sm font-bold cursor-pointer hover:text-emerald-600 transition-colors ${
                                              goal.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                                            }`}
                                          >
                                            {goal.title}
                                          </h5>
                                          {goal.description && (
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                              {goal.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      {goal.durationMinutes && (
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                                          ⏱️ {goal.durationMinutes} דק׳
                                        </span>
                                      )}
                                    </div>

                                    {docUrl && (
                                      <div className="mt-2 text-[10px]">
                                        <a
                                          href={docUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`hover:underline inline-flex items-center gap-1 font-semibold ${
                                            docUrl.includes('notebooklm')
                                              ? 'text-purple-600 dark:text-purple-400'
                                              : 'text-blue-600 dark:text-blue-400'
                                          }`}
                                        >
                                          {docUrl.includes('notebooklm') ? (
                                            <Brain className="w-3 h-3" />
                                          ) : (
                                            <FileText className="w-3 h-3" />
                                          )}
                                          <span>{docUrl.includes('notebooklm') ? 'NotebookLM' : 'מסמך מקור'}</span>
                                        </a>
                                      </div>
                                    )}
                                  </div>

                                  {/* Scheduling Actions Bar */}
                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setRescheduleSheetTask(goal)}
                                      className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded cursor-pointer"
                                      title="שיבוץ מהיר בטאץ'"
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5" />
                                    </button>

                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => onRescheduleGoal(goal, currentDate)}
                                        className="px-2 py-0.8 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[11px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                                        title="שבץ להיום"
                                      >
                                        <ArrowDownToLine className="w-3 h-3" />
                                        <span>להיום</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onRescheduleGoal(goal, tomorrowStr)}
                                        className="px-2 py-0.8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition-colors cursor-pointer"
                                        title="שבץ למחר"
                                      >
                                        <span>למחר</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. MILESTONES & PROGRESS VIEW */}
          {/* ======================================================== */}
          {activeTab === 'milestones' && (
            <div className="space-y-4 max-w-full">
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
                  if (filterMilestone !== 'all' && milestone !== filterMilestone) {
                    return null;
                  }

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
                  const displayTitle = milestone?.trim() || 'יעדים כלליים (ללא אבן דרך)';

                  return (
                    <div
                      key={milestone}
                      className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5 transition-all hover:border-emerald-300 dark:hover:border-emerald-600"
                    >
                      {/* Milestone Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-750 pb-3">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            <Target className="w-5 h-5 stroke-[2.2]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-0.5">
                              אבן דרך
                            </span>
                            <h4
                              className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug break-words"
                              title={displayTitle}
                            >
                              {displayTitle}
                            </h4>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                              {completed} מתוך {total} הושלמו ({percent}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {totalMinutes > 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                              ⏱️ {totalMinutes} דק׳
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setMilestoneToDelete({ name: milestone, count: total, goals })}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer"
                            aria-label={`מחק את אבן הדרך ${displayTitle}`}
                            title="מחיקת אבן דרך"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      {/* Sub-goals list */}
                      <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto pr-0.5">
                        {filteredList.map((g) => (
                          <div
                            key={g.id}
                            className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 hover:bg-slate-100/70 dark:hover:bg-slate-750 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={() => onToggleComplete(g)}
                                className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 cursor-pointer ${
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
                              <span>{g.date === 'backlog' || !g.date ? '🏦 בנק' : g.date}</span>
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

          {/* ======================================================== */}
          {/* 4. MONTH VIEW */}
          {/* ======================================================== */}
          {activeTab === 'month' && (
            <div className="space-y-4 max-w-full">
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
                          type="button"
                          onClick={() => onToggleComplete(goal)}
                          className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
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

      {/* Touch-Friendly Quick Reschedule Sheet */}
      {rescheduleSheetTask && (
        <QuickRescheduleSheet
          isOpen={Boolean(rescheduleSheetTask)}
          task={rescheduleSheetTask}
          currentDate={currentDate}
          onClose={() => setRescheduleSheetTask(null)}
          onReschedule={(t, newDate) => {
            onRescheduleGoal(t, newDate);
            setRescheduleSheetTask(null);
          }}
        />
      )}

      {/* Milestone Delete Confirmation Dialog */}
      {milestoneToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150 modal-viewport-lock">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 text-right space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  מחיקת אבן דרך
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {milestoneToDelete.name}
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              אבן דרך זו כוללת <strong>{milestoneToDelete.count} משימות</strong>.
              כיצד ברצונך לבצע את המחיקה?
            </div>

            <div className="space-y-2 text-xs">
              <label
                onClick={() => setDeleteMode('purge')}
                className={`p-3 rounded-2xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  deleteMode === 'purge'
                    ? 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 ring-1 ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                }`}
              >
                <input
                  type="radio"
                  name="milestoneDeleteMode"
                  checked={deleteMode === 'purge'}
                  onChange={() => setDeleteMode('purge')}
                  className="mt-0.5 accent-rose-600"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    מחיקה מלאה (מומלץ)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    מוחק את אבן הדרך ומסיר את כל {milestoneToDelete.count} המשימות מהתהליך היומי, מלוח הזמנים ומבנק היעדים.
                  </div>
                </div>
              </label>

              <label
                onClick={() => setDeleteMode('unlink')}
                className={`p-3 rounded-2xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  deleteMode === 'unlink'
                    ? 'border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-slate-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                }`}
              >
                <input
                  type="radio"
                  name="milestoneDeleteMode"
                  checked={deleteMode === 'unlink'}
                  onChange={() => setDeleteMode('unlink')}
                  className="mt-0.5 accent-slate-600"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    הסרת שיוך אבן הדרך בלבד
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    המשימות יישמרו בבנק היעדים כמשימות עצמאיות (ללא שיוך לאבן דרך זו).
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMilestoneToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMilestone}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>אישור מחיקה</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
