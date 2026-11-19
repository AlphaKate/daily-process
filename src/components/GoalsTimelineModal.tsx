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
  Filter,
  Check,
  Inbox,
  GripVertical,
  CalendarPlus,
  ArrowDownToLine,
  Brain
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
  const [activeTab, setActiveTab] = useState<'week' | 'bank' | 'milestones' | 'month'>('week');
  const [filterMilestone, setFilterMilestone] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [isBacklogDrawerOpen, setIsBacklogDrawerOpen] = useState<boolean>(true);
  const [quickMoveMenuTaskId, setQuickMoveMenuTaskId] = useState<string | null>(null);

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

  const totalBacklogMinutes = backlogGoals.reduce((sum, g) => sum + (g.durationMinutes || 0), 0);

  // Filtered goals for week view
  const weekDatesList = weekDays.map(w => w.dateStr);
  const weekGoals = allGoals.filter(g => g.date && weekDatesList.includes(g.date));

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>לוח זמנים ותכנון יעדים (Goals Timeline)</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                  {allGoals.length} יעדים סה״כ
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                תכנון שבועי עם גרירה ושחרור (Drag & Drop), בנק משימות ומעקב אבני דרך
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onQuickAddGoal}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">יעד חדש</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher & Filters Bar */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'milestones'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🎯 אבני דרך
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'month'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ======================================================== */}
          {/* 1. WEEK VIEW WITH DRAG & DROP AND BACKLOG DRAWER */}
          {/* ======================================================== */}
          {activeTab === 'week' && (
            <div className="space-y-4">
              {/* Week Navigation & Summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWeekOffset((prev) => prev - 1)}
                    className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="שבוע קודם"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {weekDays[0].dayNum} ב{weekDays[0].monthName} – {weekDays[6].dayNum} ב{weekDays[6].monthName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWeekOffset((prev) => prev + 1)}
                    className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="שבוע הבא"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {weekOffset !== 0 && (
                    <button
                      type="button"
                      onClick={() => setWeekOffset(0)}
                      className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 underline mr-1 cursor-pointer"
                    >
                      חזור לשבוע הנוכחי
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle Backlog Drawer in Week */}
                  <button
                    type="button"
                    onClick={() => setIsBacklogDrawerOpen(prev => !prev)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isBacklogDrawerOpen
                        ? 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    <Inbox className="w-3.5 h-3.5 text-amber-500" />
                    <span>בנק יעדים ({rawBacklogGoals.length})</span>
                    {isBacklogDrawerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {/* Progress Indicators */}
                  <div className="hidden sm:flex items-center gap-2 text-xs">
                    <span className="text-slate-600 dark:text-slate-400">
                      הושלמו <strong className="text-emerald-600 dark:text-emerald-400">{completedWeekGoals.length}</strong> מתוך <strong>{weekGoals.length}</strong>
                    </span>
                    {totalWeekMinutes > 0 && (
                      <span className="text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 text-[11px]">
                        ⏱️ {completedWeekMinutes} / {totalWeekMinutes} דק׳
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Backlog Drawer Dropzone (Integrated into Week View) */}
              {isBacklogDrawerOpen && (
                <div
                  onDragOver={(e) => handleDragOver(e, 'backlog')}
                  onDragLeave={(e) => handleDragLeave(e, 'backlog')}
                  onDrop={(e) => handleDrop(e, 'backlog')}
                  className={`p-3 rounded-2xl border transition-all ${
                    dragOverTarget === 'backlog'
                      ? 'bg-amber-100/90 dark:bg-amber-950/80 border-amber-500 ring-2 ring-amber-400 shadow-md scale-[1.005]'
                      : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-200/60 dark:border-amber-800/40 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <Inbox className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>בנק יעדים (Backlog)</span>
                      </span>
                      <span className="text-[11px] text-amber-700/80 dark:text-amber-400">
                        {rawBacklogGoals.length} יעדים ממתינים לשיבוץ • גרור/י יעד ליום המבוקש או שחרר/י כאן להחזרה לבנק
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
                    <div className="text-center py-3 text-xs text-amber-700/70 dark:text-amber-400 italic">
                      בנק היעדים ריק. כל היעדים שובצו לימים! (אפשר לגרור יעד לכאן כדי להחזירו לבנק)
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {rawBacklogGoals.map((goal) => (
                        <div
                          key={goal.id}
                          draggable={!goal.completed}
                          onDragStart={(e) => handleDragStart(e, goal)}
                          onDragEnd={handleDragEnd}
                          className={`p-2 rounded-xl border min-w-[210px] max-w-[230px] shrink-0 text-xs transition-all cursor-grab active:cursor-grabbing ${
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
                              <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => onRescheduleGoal(goal, currentDate)}
                                  className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="שבץ להיום"
                                >
                                  <ArrowDownToLine className="w-2.5 h-2.5" />
                                  <span>להיום</span>
                                </button>
                                <span className="text-[10px] text-slate-400">גרור ללוח ✋</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 7 Days Columns / Cards Grid (Drag Targets) */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5">
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

                  return (
                    <div
                      key={day.dateStr}
                      onDragOver={(e) => handleDragOver(e, day.dateStr)}
                      onDragLeave={(e) => handleDragLeave(e, day.dateStr)}
                      onDrop={(e) => handleDrop(e, day.dateStr)}
                      className={`rounded-2xl p-2.5 border transition-all flex flex-col min-h-[170px] ${
                        isDropTarget
                          ? 'border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-50/80 dark:bg-emerald-950/50 shadow-md scale-[1.01]'
                          : day.isToday
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600 shadow-2xs ring-1 ring-emerald-500/20'
                          : 'bg-white dark:bg-slate-850 border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-700/60">
                        <div>
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
                        {dayMinutes > 0 && (
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            {dayMinutes} דק׳
                          </span>
                        )}
                      </div>

                      {/* Day Goals List */}
                      <div className="flex-1 space-y-1.5">
                        {dayGoals.length === 0 ? (
                          <div className={`text-center py-5 text-[11px] rounded-xl border border-dashed transition-colors ${
                            isDropTarget
                              ? 'border-emerald-400 text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-100/40'
                              : 'border-slate-200 dark:border-slate-800 text-slate-400 italic'
                          }`}>
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
                            const isMenuOpen = quickMoveMenuTaskId === goal.id;

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

                                    {/* Actions & Reschedule Menu */}
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
                                          <span>{docUrl.includes('notebooklm') ? 'NotebookLM' : 'Docs'}</span>
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

                                      {/* Quick Move Picker (for mobile/touch) */}
                                      <button
                                        type="button"
                                        onClick={() => setQuickMoveMenuTaskId(isMenuOpen ? null : goal.id)}
                                        className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                                        title="שבץ ליום אחר..."
                                      >
                                        <CalendarPlus className="w-3 h-3" />
                                      </button>
                                    </div>

                                    {/* Touch Quick Move Popover */}
                                    {isMenuOpen && (
                                      <div className="mt-1.5 p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg space-y-1 animate-in fade-in duration-150 z-20">
                                        <div className="text-[9px] font-bold text-slate-500 pb-1 border-b border-slate-200 dark:border-slate-800">
                                          העבר יעד זה אל:
                                        </div>
                                        <div className="grid grid-cols-2 gap-1">
                                          {weekDays.map(w => (
                                            <button
                                              key={w.dateStr}
                                              type="button"
                                              onClick={() => {
                                                onRescheduleGoal(goal, w.dateStr);
                                                setQuickMoveMenuTaskId(null);
                                              }}
                                              className={`text-[9px] p-1 rounded-md text-right font-medium transition-colors ${
                                                w.dateStr === day.dateStr
                                                  ? 'bg-emerald-600 text-white font-bold'
                                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                              }`}
                                            >
                                              {w.dayName} ({w.dayNum})
                                            </button>
                                          ))}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              onRescheduleGoal(goal, 'backlog');
                                              setQuickMoveMenuTaskId(null);
                                            }}
                                            className="text-[9px] p-1 rounded-md text-right font-medium bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 col-span-2"
                                          >
                                            🏦 בנק יעדים (ללא תאריך)
                                          </button>
                                        </div>
                                      </div>
                                    )}
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
          {/* 2. DEDICATED FULL BACKLOG TAB (בנק יעדים) */}
          {/* ======================================================== */}
          {activeTab === 'bank' && (
            <div className="space-y-4">
              {/* Backlog Banner */}
              <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 flex flex-wrap items-center justify-between gap-3">
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
                      יעדי התפתחות אישית שטרם שובצו ליום קלנדרי ספציפי. שבץ/י אותם בקלות להיום, למחר או לכל תאריך.
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

              {/* Backlog List */}
              {backlogGoals.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-2">
                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                    אין יעדים בבנק התואמים את הסינון הנוכחי.
                  </p>
                  <p>
                    באפשרותך להוסיף יעד חדש לבנק או לפתוח את הלוח השבועי כדי לגרור משימות קיימות.
                  </p>
                  <button
                    type="button"
                    onClick={onQuickAddGoal}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                  >
                    הוסף יעד חדש לבנק +
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {backlogGoals.map((goal) => {
                    const docUrl =
                      goal.link ||
                      (goal.goalDocumentId
                        ? `https://docs.google.com/document/d/${goal.goalDocumentId}/edit`
                        : undefined);

                    return (
                      <div
                        key={goal.id}
                        className="p-3 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between gap-3 shadow-2xs hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
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
                                <h4
                                  onClick={() => onEditTask(goal)}
                                  className={`text-xs sm:text-sm font-bold cursor-pointer hover:text-emerald-600 transition-colors ${
                                    goal.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {goal.title}
                                </h4>
                                {goal.description && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                    {goal.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {goal.durationMinutes && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                                ⏱️ {goal.durationMinutes} דק׳
                              </span>
                            )}
                          </div>

                          <div className="flex items-center flex-wrap gap-1.5 mt-2 text-[10px]">
                            {goal.milestoneTitle && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                                {goal.milestoneTitle}
                              </span>
                            )}
                            {docUrl && (
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
                            )}
                          </div>
                        </div>

                        {/* Scheduling Actions Bar */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400 font-medium">שבץ יעד זה:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onRescheduleGoal(goal, currentDate)}
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="שבץ להיום"
                            >
                              <ArrowDownToLine className="w-3 h-3" />
                              <span>להיום</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onRescheduleGoal(goal, tomorrowStr)}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
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
          )}

          {/* ======================================================== */}
          {/* 3. MILESTONES & PROGRESS VIEW */}
          {/* ======================================================== */}
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
    </div>
  );
};