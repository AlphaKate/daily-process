import React, { useEffect, useRef } from 'react';
import { Task } from '../types';
import {
  X,
  Calendar,
  ArrowDownToLine,
  Inbox,
  ArrowRightLeft,
  Sun
} from 'lucide-react';

interface QuickRescheduleSheetProps {
  isOpen: boolean;
  task: Task | null;
  currentDate: string; // YYYY-MM-DD
  onClose: () => void;
  onReschedule: (task: Task, targetDate: string) => void;
}

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export const QuickRescheduleSheet: React.FC<QuickRescheduleSheetProps> = ({
  isOpen,
  task,
  currentDate,
  onClose,
  onReschedule,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  // Compute Today, Tomorrow & Current Week Days
  const [refY, refM, refD] = currentDate.split('-').map(Number);
  const todayObj = new Date(refY, refM - 1, refD);

  const tomorrowObj = new Date(refY, refM - 1, refD);
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = `${tomorrowObj.getFullYear()}-${String(tomorrowObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowObj.getDate()).padStart(2, '0')}`;

  // Find Sunday of the current week
  const dayOfWeek = todayObj.getDay(); // 0 = Sunday
  const sundayObj = new Date(todayObj);
  sundayObj.setDate(todayObj.getDate() - dayOfWeek);

  const weekDays: { dateStr: string; dayName: string; dayNum: number; isToday: boolean; isCurrentTaskDate: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sundayObj);
    d.setDate(sundayObj.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${da}`;
    weekDays.push({
      dateStr,
      dayName: HEBREW_DAYS[d.getDay()],
      dayNum: d.getDate(),
      isToday: dateStr === currentDate,
      isCurrentTaskDate: task.date === dateStr,
    });
  }

  const handleSelectDate = (targetDate: string) => {
    onReschedule(task, targetDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop overlay */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Bottom Sheet on Mobile / Centered Dialog on Desktop */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-reschedule-title"
        className="relative z-10 w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200/90 dark:border-slate-800 shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[90vh] flex flex-col safe-area-bottom animate-in slide-in-from-bottom duration-250"
      >
        {/* Mobile Drag Indicator Bar */}
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 id="quick-reschedule-title" className="text-base font-bold text-slate-900 dark:text-white truncate">
                שיבוץ מהיר בטאץ'
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[260px]" title={task.title}>
                {task.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sheet Body */}
        <div className="py-3.5 space-y-3 overflow-y-auto">
          {/* Quick 1-Tap Actions: Today & Tomorrow */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleSelectDate(currentDate)}
              className={`p-3 rounded-2xl border text-right transition-all flex items-center gap-2.5 active:scale-98 ${
                task.date === currentDate
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-emerald-400'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ArrowDownToLine className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">שבץ להיום 📌</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">היום הנוכחי</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDate(tomorrowStr)}
              className={`p-3 rounded-2xl border text-right transition-all flex items-center gap-2.5 active:scale-98 ${
                task.date === tomorrowStr
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-emerald-400'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">שבץ למחר 🌅</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">יום הבא</div>
              </div>
            </button>
          </div>

          {/* Days of the Week (Sunday to Saturday) */}
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>ימי השבוע (א' - ש'):</span>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {weekDays.map(d => (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => handleSelectDate(d.dateStr)}
                  className={`p-1.5 sm:p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 ${
                    d.isCurrentTaskDate
                      ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                      : d.isToday
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-[11px] font-bold">{d.dayName.charAt(0)}'</span>
                  <span className="text-[10px] opacity-80">{d.dayNum}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Move to Backlog Bank Option */}
          <button
            type="button"
            onClick={() => handleSelectDate('backlog')}
            className={`w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between active:scale-98 ${
              task.date === 'backlog'
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 font-bold'
                : 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 hover:bg-amber-100/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Inbox className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">החזר לבנק היעדים 🏦</div>
                <div className="text-[10px] text-amber-800/80 dark:text-amber-300/80">
                  הסר מהלוח השבועי ושמור בבנק להמשך
                </div>
              </div>
            </div>
            {task.date === 'backlog' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
                כרגע בבנק
              </span>
            )}
          </button>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[10px] text-slate-400">
            תומך במחוות מגע מהירות ומותאם למסכי מובייל ואייפון
          </p>
        </div>
      </div>
    </div>
  );
};
