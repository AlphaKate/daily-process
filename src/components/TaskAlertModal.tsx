import React from 'react';
import { Task } from '../types';
import {
  BellRing,
  Clock,
  Video,
  Check,
  X,
  ExternalLink,
  FileText,
  Volume2
} from 'lucide-react';
import { playNotificationChime } from '../services/notificationService';

interface TaskAlertModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleComplete: (task: Task) => void;
  onSnooze: (task: Task, minutes: number) => void;
}

export const TaskAlertModal: React.FC<TaskAlertModalProps> = ({
  task,
  isOpen,
  onClose,
  onToggleComplete,
  onSnooze,
}) => {
  if (!isOpen || !task) return null;

  // Detect video meeting link if present
  let meetingUrl: string | null = null;
  let platformLabel = 'פגישת וידאו';

  const fullText = `${task.link || ''} ${task.description || ''}`;
  const meetMatch = fullText.match(/https:\/\/meet\.google\.com\/[a-z0-9-]+/i);
  const zoomMatch = fullText.match(/https:\/\/[a-z0-9-]+\.zoom\.us\/[^\s"')]+/i);
  const teamsMatch = fullText.match(/https:\/\/teams\.microsoft\.com\/[^\s"')]+/i);

  if (meetMatch) {
    meetingUrl = meetMatch[0];
    platformLabel = 'Google Meet';
  } else if (zoomMatch) {
    meetingUrl = zoomMatch[0];
    platformLabel = 'Zoom';
  } else if (teamsMatch) {
    meetingUrl = teamsMatch[0];
    platformLabel = 'Microsoft Teams';
  }

  const categoryName =
    task.category === 'must_do'
      ? 'Must Do'
      : task.category === 'goals'
      ? 'יעד התפתחות'
      : 'סידור יומי';

  const categoryColor =
    task.category === 'must_do'
      ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
      : task.category === 'goals'
      ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
      : 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800';

  const docUrl =
    task.link ||
    (task.goalDocumentId
      ? `https://docs.google.com/document/d/${task.goalDocumentId}/edit`
      : undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-500 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Banner with pulsing Bell */}
        <div className="p-5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center animate-bounce shadow-md">
              <BellRing className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-100 block">
                התרעת משימה • {task.time || 'עכשיו'}
              </span>
              <h3 className="text-base sm:text-lg font-extrabold leading-tight">
                הגיע זמן המשימה!
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={playNotificationChime}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="השמע צליל שוב"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${categoryColor}`}>
                {categoryName}
              </span>
              {task.time && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{task.time}</span>
                </span>
              )}
              {task.durationMinutes && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  • {task.durationMinutes} דקות
                </span>
              )}
            </div>

            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {task.title}
            </h4>

            {task.description && (
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                {task.description}
              </p>
            )}
          </div>

          {/* Direct Meeting Join Button if available */}
          {meetingUrl && (
            <a
              href={meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all"
            >
              <Video className="w-4 h-4 stroke-[2.5]" />
              <span>הצטרף עכשיו לפגישה ב-{platformLabel}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          )}

          {/* Document Link if available */}
          {docUrl && !meetingUrl && (
            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>פתח מסמך יעד מקושר</span>
              <ExternalLink className="w-3 h-3 opacity-75" />
            </a>
          )}

          {/* Action Buttons */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onToggleComplete(task);
                onClose();
              }}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>סמן כבוצע ✓</span>
            </button>

            <button
              type="button"
              onClick={() => onSnooze(task, 10)}
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="דחה התרעה ב-10 דקות"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>דחה ב-10 דק׳</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
