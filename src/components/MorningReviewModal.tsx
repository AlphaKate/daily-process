import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import {
  Sunrise,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Target,
  Flame,
  Coffee,
  X
} from 'lucide-react';

interface MorningReviewModalProps {
  isOpen: boolean;
  overdueTasks: Task[];
  todayDate: string;
  onConfirmRollover: (selectedTaskIds: string[], completedTaskIds: string[]) => void;
  onClose: () => void;
}

export const MorningReviewModal: React.FC<MorningReviewModalProps> = ({
  isOpen,
  overdueTasks,
  todayDate,
  onConfirmRollover,
  onClose,
}) => {
  // By default, select all overdue tasks to roll over to today
  const [selectedToRollover, setSelectedToRollover] = useState<string[]>([]);
  const [markedAsCompleted, setMarkedAsCompleted] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedToRollover(overdueTasks.map(t => t.id));
      setMarkedAsCompleted([]);
    }
  }, [isOpen, overdueTasks]);

  if (!isOpen || overdueTasks.length === 0) return null;

  const toggleRollover = (id: string) => {
    if (markedAsCompleted.includes(id)) return;
    setSelectedToRollover(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleCompleted = (id: string) => {
    setMarkedAsCompleted(prev => {
      const isAlready = prev.includes(id);
      if (isAlready) {
        return prev.filter(item => item !== id);
      } else {
        // remove from rollover if marked as completed
        setSelectedToRollover(curr => curr.filter(item => item !== id));
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    setMarkedAsCompleted([]);
    setSelectedToRollover(overdueTasks.map(t => t.id));
  };

  const handleClearAll = () => {
    setSelectedToRollover([]);
    setMarkedAsCompleted([]);
  };

  const handleFinish = () => {
    onConfirmRollover(selectedToRollover, markedAsCompleted);
    onClose();
  };

  const goalTasksCount = overdueTasks.filter(t => t.category === 'goals').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Morning Banner */}
        <div className="bg-gradient-to-l from-amber-500 via-orange-500 to-amber-600 p-5 sm:p-6 text-white text-right relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="סגור"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 mb-1.5">
            <Sunrise className="w-6 h-6 stroke-[2.5]" />
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              בוקר טוב & סקירת יום
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black">סקירת משימות שנגררו</h2>
          <p className="text-xs text-amber-100 mt-1 leading-relaxed">
            נמצאו <strong>{overdueTasks.length}</strong> משימות שלא הושלמו בימים הקודמים. בחר/י מה להעביר לתכנון היומי של היום ({todayDate}):
          </p>

          {goalTasksCount > 0 && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-lg">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{goalTasksCount} יעדי התפתחות יעודכנו אוטומטית בתוכנית ב-Google Drive</span>
            </div>
          )}
        </div>

        {/* Quick Batch Actions */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-850/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-500 dark:text-slate-400 font-medium">
            נבחרו להעברה: <strong className="text-amber-600 dark:text-amber-400">{selectedToRollover.length}</strong> • הושלמו: <strong className="text-emerald-600 dark:text-emerald-400">{markedAsCompleted.length}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-amber-700 dark:text-amber-300 hover:underline font-bold text-[11px]"
            >
              העבר הכל להיום
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 font-medium text-[11px]"
            >
              נקה בחירה
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {overdueTasks.map(task => {
            const isCompleted = markedAsCompleted.includes(task.id);
            const isRollover = selectedToRollover.includes(task.id);

            const categoryLabel =
              task.category === 'must_do'
                ? 'Must Do'
                : task.category === 'goals'
                ? 'יעד התפתחות'
                : 'סידור שוטף';

            const CategoryIcon =
              task.category === 'must_do'
                ? Flame
                : task.category === 'goals'
                ? Target
                : Coffee;

            return (
              <div
                key={task.id}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                    : isRollover
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-800/80 shadow-2xs ring-1 ring-amber-500/10'
                    : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] flex-wrap">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          task.category === 'must_do'
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                            : task.category === 'goals'
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                            : 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300'
                        }`}
                      >
                        <CategoryIcon className="w-3 h-3" />
                        <span>{categoryLabel}</span>
                      </span>
                      <span className="text-slate-400 font-medium">מתאריך: {task.date}</span>
                      {task.durationMinutes && (
                        <span className="text-slate-400 font-medium">⏱️ {task.durationMinutes} דק׳</span>
                      )}
                    </div>

                    <h4
                      className={`text-xs sm:text-sm font-bold leading-tight ${
                        isCompleted
                          ? 'line-through text-slate-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {task.title}
                    </h4>

                    {task.milestoneTitle && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        <span>אבן דרך: {task.milestoneTitle}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions for this item */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleCompleted(task.id)}
                      className={`px-2.5 py-1 text-xs rounded-xl font-semibold flex items-center gap-1 transition-colors ${
                        isCompleted
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600'
                      }`}
                      title="סמן כבוצעה (הושלמה אתמול)"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isCompleted ? 'הושלמה ✓' : 'בוצע'}</span>
                    </button>

                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => toggleRollover(task.id)}
                        className={`px-2.5 py-1 text-xs rounded-xl font-semibold flex items-center gap-1 transition-colors ${
                          isRollover
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        }`}
                        title="העבר לתכנון היומי של היום"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isRollover ? 'יועבר להיום ⬇' : 'השאר בעבר'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            דלג לפעם הבאה
          </button>
          
          <button
            type="button"
            onClick={handleFinish}
            className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md shadow-emerald-600/25 transition-all"
          >
            <span>עדכן והתחל יום ({selectedToRollover.length + markedAsCompleted.length})</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
