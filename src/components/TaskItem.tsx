import React, { useState } from 'react';
import { Task } from '../types';
import {
  Clock,
  ExternalLink,
  Milestone,
  RotateCcw,
  Edit2,
  Trash2,
  Check,
  FileText,
  Sparkles,
  Video,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDeleteRequest: (task: Task) => void;
}

interface MeetingInfo {
  url: string;
  platform: 'meet' | 'zoom' | 'teams' | 'general';
  platformLabel: string;
  actionLabel: string;
}

const getMeetingInfo = (task: Task): MeetingInfo | null => {
  const isGcal = task.id.startsWith('gcal-');
  const videoRegex = /https?:\/\/(?:meet\.google\.com\/[a-zA-Z0-9_-]+|[\w-]+\.zoom\.us\/[^\s"'>]+|teams\.(?:microsoft|live)\.com\/[^\s"'>]+)/i;

  let url: string | undefined = undefined;
  let platform: 'meet' | 'zoom' | 'teams' | 'general' = 'general';

  // 1. Check direct task.link
  if (task.link) {
    if (task.link.includes('meet.google.com')) {
      url = task.link;
      platform = 'meet';
    } else if (task.link.includes('zoom.us')) {
      url = task.link;
      platform = 'zoom';
    } else if (task.link.includes('teams.microsoft.com') || task.link.includes('teams.live.com')) {
      url = task.link;
      platform = 'teams';
    }
  }

  // 2. Check task.description for meeting URLs
  if (!url && task.description) {
    const match = task.description.match(videoRegex);
    if (match) {
      url = match[0];
      if (url.includes('meet.google.com')) {
        platform = 'meet';
      } else if (url.includes('zoom.us')) {
        platform = 'zoom';
      } else if (url.includes('teams.')) {
        platform = 'teams';
      }
    }
  }

  // 3. Fallback for Google Calendar imported tasks (gcal-)
  if (!url && isGcal) {
    if (task.link && !task.link.includes('docs.google.com')) {
      url = task.link;
      platform = task.link.includes('meet.google.com') ? 'meet' : 'general';
    } else {
      url = 'https://calendar.google.com';
      platform = 'general';
    }
  }

  if (!url) return null;

  let platformLabel = 'Google Meet';
  if (platform === 'zoom') {
    platformLabel = 'Zoom';
  } else if (platform === 'teams') {
    platformLabel = 'Teams';
  } else if (platform === 'general') {
    platformLabel = isGcal ? 'יומן Google' : 'וידאו';
  }

  return {
    url,
    platform,
    platformLabel,
    actionLabel: platform === 'meet' ? 'הצטרף ל-Google Meet' : 'הצטרף לפגישה'
  };
};

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDeleteRequest,
}) => {
  const [justCompleted, setJustCompleted] = useState(false);

  const handleToggle = () => {
    // If completing a Goal or Must Do, celebrate with confetti effect!
    if (!task.completed) {
      if (task.category === 'goals') {
        try {
          confetti({
            particleCount: 55,
            spread: 70,
            origin: { y: 0.75 },
            colors: ['#10b981', '#06b6d4', '#3b82f6', '#34d399', '#fbbf24']
          });
        } catch {
          // Safe fallback
        }
        setJustCompleted(true);
        setTimeout(() => {
          setJustCompleted(false);
        }, 3200);
      } else if (task.category === 'must_do') {
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#f43f5e', '#fb923c', '#e11d48']
          });
        } catch {
          // Safe fallback
        }
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
  const isGoal = task.category === 'goals';
  const isCalendarTask = task.id.startsWith('gcal-');
  const meetingInfo = getMeetingInfo(task);

  // Compute direct Google Doc URL if present
  const docUrl =
    task.link ||
    (task.goalDocumentId ? `https://docs.google.com/document/d/${task.goalDocumentId}/edit` : undefined);
  const isGoogleDoc = Boolean(
    task.goalDocumentId || (docUrl && docUrl.includes('docs.google.com'))
  );
  // Don't duplicate docUrl if it is already displayed in meeting quick action
  const shouldShowDocUrl = docUrl && (!meetingInfo || meetingInfo.url !== docUrl);

  return (
    <div
      className={`group relative bg-white dark:bg-slate-800/90 rounded-2xl p-4 shadow-sm hover:shadow-md border border-slate-200/80 dark:border-slate-700/80 transition-all duration-200 ${
        categoryStyle.border
      } ${
        task.completed
          ? 'opacity-80 bg-slate-50/70 dark:bg-slate-850'
          : isGoal
          ? 'hover:border-emerald-300 dark:hover:border-emerald-700'
          : ''
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
          aria-label={task.completed ? 'סמן כלא בוצע' : 'סמן כבוצע'}
        >
          {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
        </button>

        {/* Content details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1.5">
            {/* Category tag */}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryStyle.badgeBg}`}
            >
              {categoryStyle.badgeText}
            </span>

            {/* Google Calendar badge */}
            {isCalendarTask && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs">
                <Calendar className="w-3 h-3 text-blue-500" />
                <span>יומן Google</span>
              </span>
            )}

            {/* Calendar meeting time pill (e.g. '14:00 (45 דק׳)' or 'כל היום') */}
            {isCalendarTask && (
              task.time ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-blue-50/90 text-blue-800 dark:bg-blue-950/80 dark:text-blue-200 border border-blue-200/90 dark:border-blue-800 shadow-2xs">
                  <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>
                    {task.time}
                    {task.durationMinutes ? ` (${task.durationMinutes} דק׳)` : ''}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>כל היום</span>
                </span>
              )
            )}

            {/* Non-calendar duration pill (⏱️ 45 דק׳) */}
            {!isCalendarTask && task.durationMinutes && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80">
                <span>⏱️</span>
                <span>{task.durationMinutes} דק׳</span>
              </span>
            )}

            {/* Rollover badge if moved from previous day */}
            {task.rolledOverFrom && !task.completed && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <RotateCcw className="w-2.5 h-2.5" />
                נדחה מ-{task.rolledOverFrom}
              </span>
            )}

            {/* Non-calendar time badge */}
            {!isCalendarTask && task.time && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/70 px-2 py-0.5 rounded-md">
                <Clock className="w-3 h-3 text-slate-400" />
                {task.time}
              </span>
            )}

            {/* Completed celebration & Google Doc update indicator */}
            {task.completed && isGoal && (
              <>
                {justCompleted ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 animate-pulse shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-300" />
                    <span>מתעדכן במסמך Google Docs...</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200/70 dark:border-emerald-800/70">
                    <Check className="w-3 h-3 text-emerald-500 stroke-[2.5]" />
                    <span>סונכרן למסמך Google Docs</span>
                  </span>
                )}
              </>
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

          {/* Google Meet / Video Conference Quick Action Button */}
          {meetingInfo && (
            <div className="mt-2.5">
              <a
                href={meetingInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 shadow-xs hover:shadow active:scale-95 group/meet ${
                  meetingInfo.platform === 'zoom'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                    : meetingInfo.platform === 'teams'
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                }`}
                title={`פתח קישור לפגישה (${meetingInfo.platformLabel}) בכרטיסייה חדשה`}
              >
                <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center shrink-0 group-hover/meet:scale-110 transition-transform">
                  <Video className="w-3.5 h-3.5 text-white" />
                </div>
                <span>{meetingInfo.actionLabel}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/15 text-white/90">
                  {meetingInfo.platformLabel}
                </span>
                <ExternalLink className="w-3 h-3 text-white/70 group-hover/meet:text-white transition-colors" />
              </a>
            </div>
          )}

          {/* Metadata footer: Milestone Badge & Direct Google Doc / Link */}
          {(task.milestoneTitle || shouldShowDocUrl) && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center gap-2 text-xs">
              {/* Milestone badge (e.g. 'Machine Learning / GoogleLM') */}
              {task.milestoneTitle && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold shadow-xs">
                  <Milestone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[240px] sm:max-w-none">{task.milestoneTitle}</span>
                </div>
              )}

              {/* Direct Link to Google Doc or External Link */}
              {shouldShowDocUrl && (
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shadow-xs ${
                    isGoogleDoc
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/70 hover:bg-blue-100 dark:hover:bg-blue-900/60 hover:text-blue-900 dark:hover:text-blue-100'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title={isGoogleDoc ? 'פתח מסמך ב-Google Docs (נפתח בכרטיסייה חדשה)' : 'פתח קישור מקור'}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{isGoogleDoc ? 'פתח ב-Google Docs' : 'קישור למסמך'}</span>
                  <ExternalLink className="w-3 h-3 opacity-75" />
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
