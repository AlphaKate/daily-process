import React, { useState } from 'react';
import { Task } from '../types';
import { Sunrise, ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';

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
  onConfirmRollover,
  onClose,
}) => {
  // By default, select all overdue tasks to roll over to today
  const [selectedToRollover, setSelectedToRollover] = useState<string[]>(
    overdueTasks.map(t => t.id)
  );
  const [markedAsCompleted, setMarkedAsCompleted] = useState<string[]>([]);

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

  const handleFinish = () => {
    onConfirmRollover(selectedToRollover, markedAsCompleted);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Morning Banner */}
        <div className="bg-gradient-to-l from-amber-500 to-orange-500 p-6 text-white text-right">
          <div className="flex items-center gap-2 mb-2">
            <Sunrise className="w-6 h-6 stroke-[2.5]" />
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              בוקר טוב & פתיחת יום
            </span>
          </div>
          <h2 className="text-xl font-black">סקירת משימות שנגררו</h2>
          <p className="text-xs text-amber-100 mt-1">
            נמצאו {overdueTasks.length} משימות שלא הושלמו בימים הקודמים. בחר/י מה להעביר לתכנון היומי של היום:
          </p>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {overdueTasks.map(task => {
            const isCompleted = markedAsCompleted.includes(task.id);
            const isRollover = selectedToRollover.includes(task.id);

            return (
              <div
                key={task.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                    : isRollover
                    ? 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1 text-[10px]">
                      <span className="font-semibold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {task.category === 'must_do' ? 'Must Do' : task.category === 'goals' ? 'Goal' : 'Casual'}
                      </span>
                      <span className="text-slate-400">מתאריך: {task.date}</span>
                    </div>
                    <h4 className={`text-sm font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {task.title}
                    </h4>
                    {task.milestoneTitle && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                        יעד: {task.milestoneTitle}
                      </p>
                    )}
                  </div>

                  {/* Actions for this item */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleCompleted(task.id)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1 transition-colors ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>הושלמה</span>
                    </button>

                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => toggleRollover(task.id)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1 transition-colors ${
                          isRollover
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isRollover ? 'יועבר להיום' : 'השאר בעבר'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            דלג לפעם הבאה
          </button>
          <button
            onClick={handleFinish}
            className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md shadow-emerald-600/25 transition-all"
          >
            <span>עדכן והתחל יום</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
