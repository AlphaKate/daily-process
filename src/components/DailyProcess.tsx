import React, { useState } from 'react';
import { Task, TaskCategory } from '../types';
import { TaskItem } from './TaskItem';
import { ChevronDown, ChevronUp, Plus, Flame, Target, Coffee, CheckCheck } from 'lucide-react';

interface DailyProcessProps {
  tasks: Task[];
  currentDate: string;
  onToggleComplete: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteRequest: (task: Task) => void;
  onQuickAddTask: (category: TaskCategory) => void;
}

export const DailyProcess: React.FC<DailyProcessProps> = ({
  tasks,
  onToggleComplete,
  onEditTask,
  onDeleteRequest,
  onQuickAddTask,
}) => {
  const [showDoneSection, setShowDoneSection] = useState(true);

  // Filter tasks for current active view
  const activeTasks = tasks.filter(t => !t.completed);
  const doneTasks = tasks.filter(t => t.completed);

  const mustDoTasks = activeTasks.filter(t => t.category === 'must_do');
  const goalsTasks = activeTasks.filter(t => t.category === 'goals');
  const casualTasks = activeTasks.filter(t => t.category === 'casual');

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
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Must Do</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                  {mustDoTasks.length}
                </span>
              </h2>
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

      {/* 2. GOALS SECTION (התפתחות אישית ויעדים קטנים) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Goals (התפתחות אישית)</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  {goalsTasks.length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                יעדים קטנים מתוך מסמכי ההתפתחות ב-Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={() => onQuickAddTask('goals')}
            className="p-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg flex items-center gap-1 font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">הוסף</span>
          </button>
        </div>

        {goalsTasks.length === 0 ? (
          <div className="text-center py-6 px-4 bg-white/60 dark:bg-slate-850/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            לא תוכננו יעדי התפתחות להיום. הוסף/י יעד קטן ומקדם!
          </div>
        ) : (
          <div className="space-y-2.5">
            {goalsTasks.map(task => (
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

      {/* 3. CASUAL SECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Coffee className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Casual (שוטף & סידורים)</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300">
                  {casualTasks.length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                סידורים אישיים, קניות ומשימות שוטפות (רשימת Microsoft To Do)
              </p>
            </div>
          </div>
          <button
            onClick={() => onQuickAddTask('casual')}
            className="p-1.5 text-xs text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg flex items-center gap-1 font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">הוסף</span>
          </button>
        </div>

        {casualTasks.length === 0 ? (
          <div className="text-center py-6 px-4 bg-white/60 dark:bg-slate-850/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            אין משימות שוטפות כרגע.
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
    </div>
  );
};
