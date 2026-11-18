import React from 'react';
import { Task } from '../types';
import { Clock, ExternalLink, Milestone, RotateCcw, Edit2, Trash2, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDeleteRequest: (task: Task) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDeleteRequest,
}) => {
  const handleToggle = () => {
    // If completing a Goal or Must Do, celebrate with a light confetti effect!
    if (!task.completed && (task.category === 'goals' || task.category === 'must_do')) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: task.category === 'goals' ? ['#10b981', '#06b6d4', '#3b82f6'] : ['#f43f5e', '#fb923c', '#e11d48']
        });
      } catch {
        // Safe fallback
      }
    }
    onToggleComplete(task);
  };

  const getCategoryStyles = () => {
    switch (task.category) {
      case 'must_do':
        return {
          border: 'border-r-4 border-r-rose-500',
          badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          badgeText: 'Must Do',
          checkboxBorder: 'border-rose-400 dark:border-rose-600',
          checkboxActive: 'bg-rose-500 text-white'
        };
      case 'goals':
        return {
          border: 'border-r-4 border-r-emerald-500',
          badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          badgeText: 'Goal',
          checkboxBorder: 'border-emerald-400 dark:border-emerald-600',
          checkboxActive: 'bg-emerald-500 text-white'
        };
      case 'casual':
      default:
        return {
          border: 'border-r-4 border-r-sky-500',
          badgeBg: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
          badgeText: 'Casual',
          checkboxBorder: 'border-sky-400 dark:border-sky-600',
          checkboxActive: 'bg-sky-500 text-white'
        };
    }
  };

  const categoryStyle = getCategoryStyles();

  return (
    <div
      className={`group relative bg-white dark:bg-slate-800/90 rounded-2xl p-4 shadow-sm hover:shadow-md border border-slate-200/80 dark:border-slate-700/80 transition-all duration-200 ${categoryStyle.border} ${
        task.completed ? 'opacity-70 bg-slate-50/70 dark:bg-slate-850' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Custom Accessible Checkbox */}
        <button
          type="button"
          onClick={handleToggle}
          className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
            task.completed
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
              : `bg-transparent ${categoryStyle.checkboxBorder} hover:scale-105`
          }`}
          aria-label={task.completed ? "סמן כלא בוצע" : "סמן כבוצע"}
        >
          {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
        </button>

        {/* Content details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            {/* Category tag */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryStyle.badgeBg}`}>
              {categoryStyle.badgeText}
            </span>

            {/* Rollover badge if moved from previous day */}
            {task.rolledOverFrom && !task.completed && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <RotateCcw className="w-2.5 h-2.5" />
                נדחה מ-{task.rolledOverFrom}
              </span>
            )}

            {/* Time badge */}
            {task.time && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/70 px-2 py-0.5 rounded-md">
                <Clock className="w-3 h-3 text-slate-400" />
                {task.time}
                {task.durationMinutes ? ` (${task.durationMinutes} דק׳)` : ''}
              </span>
            )}
          </div>

          {/* Task Title */}
          <h3
            className={`text-sm sm:text-base font-semibold leading-snug transition-colors ${
              task.completed
                ? 'line-through text-slate-400 dark:text-slate-500'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {task.title}
          </h3>

          {/* Optional Description */}
          {task.description && (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Metadata footer: Milestone & Link */}
          {(task.milestoneTitle || task.link) && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center gap-3 text-xs">
              {task.milestoneTitle && (
                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                  <Milestone className="w-3.5 h-3.5" />
                  <span>{task.milestoneTitle}</span>
                </div>
              )}
              {task.link && (
                <a
                  href={task.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>קישור למסמך / מקור</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Action buttons (Edit & Delete) */}
        <div className="flex items-center gap-1 sm:opacity-90 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
            title="ערוך משימה"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDeleteRequest(task)}
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
            title="מחק משימה (מחייב אישור)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
