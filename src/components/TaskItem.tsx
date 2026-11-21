import React, { useState, useEffect } from 'react';
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
  Calendar,
  ListTodo,
  ChevronDown,
  ChevronUp,
  Brain,
  ArrowRightLeft,
  Copy,
  MessageCircle,
  RotateCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sanitizeUrl } from '../services/securitySanitizer';
import { QuickRescheduleSheet } from './QuickRescheduleSheet';
import {
  generateBirthdayGreetingVariants,
  getDefaultBirthdayGreeting,
  formatWhatsAppBirthdayLink,
  isBirthdayTaskCheck,
  extractBirthdayPersonName
} from '../services/googleContacts';

export interface TaskItemProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDeleteRequest: (task: Task) => void;
  onReschedule?: (task: Task, targetDate: string) => void;
  onUpdateTask?: (task: Task) => void;
  currentDate?: string;
  forceExpanded?: boolean;
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
  onReschedule,
  onUpdateTask,
  currentDate,
  forceExpanded
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(forceExpanded ?? false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [isRescheduleSheetOpen, setIsRescheduleSheetOpen] = useState(false);

  useEffect(() => {
    if (forceExpanded !== undefined) {
      setIsExpanded(forceExpanded);
    }
  }, [forceExpanded]);

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
      } else if (task.id.startsWith('mstodo-')) {
        setJustCompleted(true);
        setTimeout(() => {
          setJustCompleted(false);
        }, 3200);
      }
    }

    onToggleComplete(task);
  };

  const handleReschedule = (rescheduledTask: Task, targetDate: string) => {
    if (onReschedule) {
      onReschedule(rescheduledTask, targetDate);
    } else {
      // Fallback: update task date and call onEdit
      onEdit({
        ...rescheduledTask,
        date: targetDate,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const isBirthdayTask = isBirthdayTaskCheck(task);
  const derivedName = extractBirthdayPersonName(task.title, task.contactName);
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [customGreeting, setCustomGreeting] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const greetingOptions = React.useMemo(() => {
    if (!isBirthdayTask) return [];
    return generateBirthdayGreetingVariants(derivedName, task.birthdayAge);
  }, [isBirthdayTask, derivedName, task.birthdayAge]);

  const activeGreeting =
    customGreeting ||
    task.birthdayGreeting ||
    greetingOptions[greetingIndex] ||
    getDefaultBirthdayGreeting(derivedName, task.birthdayAge);

  const handleCycleGreeting = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (greetingOptions.length === 0) return;
    const nextIdx = (greetingIndex + 1) % greetingOptions.length;
    setGreetingIndex(nextIdx);
    const nextGreeting = greetingOptions[nextIdx];
    setCustomGreeting(nextGreeting);
    if (task.birthdayGreeting !== nextGreeting && onUpdateTask) {
      onUpdateTask({ ...task, birthdayGreeting: nextGreeting });
    }
  };

  const handleCopyGreeting = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(activeGreeting);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = activeGreeting;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  const whatsAppUrl = formatWhatsAppBirthdayLink(task.contactPhone, activeGreeting);

  const getCategoryStyles = () => {
    if (isBirthdayTask) {
      return {
        border: 'border-r-4 border-r-pink-500',
        badgeBg: 'bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-800',
        badgeText: '🎂 יום הולדת',
        checkboxBorder: 'border-pink-400 dark:border-pink-600',
        checkboxActive: 'bg-pink-500 text-white'
      };
    }
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
  const isMsToDo = task.id.startsWith('mstodo-');
  const meetingInfo = getMeetingInfo(task);

  // Compute direct Google Doc URL if present
  const docUrl =
    task.link ||
    (task.goalDocumentId ? `https://docs.google.com/document/d/${task.goalDocumentId}/edit` : undefined);
  const isGoogleDoc = Boolean(
    task.goalDocumentId || (docUrl && docUrl.includes('docs.google.com'))
  );
  const isNotebookLM = Boolean(
    docUrl && (docUrl.includes('notebooklm.link.google') || docUrl.includes('notebooklm.google.com'))
  );
  // Don't duplicate docUrl if it is already displayed in meeting quick action
  const shouldShowDocUrl = docUrl && (!meetingInfo || meetingInfo.url !== docUrl);

  const hasDetails = Boolean(
    task.description ||
    meetingInfo ||
    task.milestoneTitle ||
    shouldShowDocUrl ||
    isBirthdayTask
  );

  const effectiveCurrentDate = currentDate || task.date || new Date().toISOString().split('T')[0];

  return (
    <div
      className={`group relative bg-white dark:bg-slate-800/90 rounded-2xl p-3 sm:p-4 shadow-xs hover:shadow-md border border-slate-200/80 dark:border-slate-700/80 transition-all duration-200 max-w-full overflow-hidden ${
        categoryStyle.border
      } ${
        task.completed
          ? 'opacity-80 bg-slate-50/70 dark:bg-slate-850'
          : isGoal
          ? 'hover:border-emerald-300 dark:hover:border-emerald-700'
          : ''
      }`}
    >
      <div className="flex items-start gap-2.5 sm:gap-3 max-w-full min-w-0">
        {/* Custom Accessible Checkbox */}
        <button
          type="button"
          onClick={handleToggle}
          className={`mt-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shrink-0 ${
            task.completed
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
              : `bg-transparent ${categoryStyle.checkboxBorder} hover:scale-105`
          }`}
          aria-label={task.completed ? 'סמן כלא בוצע' : 'סמן כבוצע'}
        >
          {task.completed && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />}
        </button>

        {/* Content Details */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Top Line: Tags, Time & Quick Indicators */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-1">
            {/* Category Tag */}
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${categoryStyle.badgeBg}`}
            >
              {categoryStyle.badgeText}
            </span>

            {/* Google Calendar badge */}
            {isCalendarTask && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs shrink-0">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>יומן Google</span>
              </span>
            )}

            {/* Google Contacts Birthday badge */}
            {isBirthdayTask && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 dark:bg-pink-950/70 dark:text-pink-300 border border-pink-200 dark:border-pink-800 shadow-2xs shrink-0">
                <span>Google Contacts</span>
              </span>
            )}
            {isBirthdayTask && task.birthdayAge && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shrink-0">
                <span>חוגג/ת {task.birthdayAge} 🎉</span>
              </span>
            )}

            {/* Microsoft To Do badge */}
            {isMsToDo && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shadow-2xs shrink-0">
                <ListTodo className="w-3.5 h-3.5 text-sky-500" />
                <span>Microsoft To Do</span>
              </span>
            )}

            {/* Calendar meeting time pill (e.g. '14:00 (45 דק׳)' or 'כל היום') */}
            {isCalendarTask && (
              task.time ? (
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-md bg-blue-50/90 text-blue-800 dark:bg-blue-950/80 dark:text-blue-200 border border-blue-200/90 dark:border-blue-800 shadow-2xs shrink-0">
                  <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>
                    {task.time}
                    {task.durationMinutes ? ` (${task.durationMinutes} דק׳)` : ''}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300 border border-slate-200 dark:border-slate-600 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>כל היום</span>
                </span>
              )
            )}

            {/* Non-calendar duration pill (⏱️ 45 דק׳) */}
            {!isCalendarTask && task.durationMinutes && (
              <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 shrink-0">
                <span>⏱️</span>
                <span>{task.durationMinutes} דק׳</span>
              </span>
            )}

            {/* Rollover badge if moved from previous day */}
            {task.rolledOverFrom && !task.completed && (
              <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                <RotateCcw className="w-3 h-3" />
                נדחה מ-{task.rolledOverFrom}
              </span>
            )}

            {/* Non-calendar time badge */}
            {!isCalendarTask && task.time && (
              <span className="flex items-center gap-1 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/70 px-2.5 py-0.5 rounded-md shrink-0">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {task.time}
              </span>
            )}

            {/* Compact Indicator Icons (if collapsed and has attachments) */}
            {!isExpanded && (
              <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs shrink-0">
                {meetingInfo && (
                  <span
                    className="p-0.5 px-1.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[10px] font-semibold flex items-center gap-1"
                    title={`פגישת וידאו (${meetingInfo.platformLabel})`}
                  >
                    <Video className="w-3 h-3" />
                    <span className="hidden sm:inline">פגישה</span>
                  </span>
                )}
                {shouldShowDocUrl && (
                  <span
                    className={`p-0.5 px-1.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                      isNotebookLM
                        ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                    }`}
                    title={isNotebookLM ? 'מקושר למחברת ב-NotebookLM' : 'מקושר למסמך יעד ב-Google Docs'}
                  >
                    {isNotebookLM ? <Brain className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    <span className="hidden sm:inline">{isNotebookLM ? 'NotebookLM' : 'מסמך'}</span>
                  </span>
                )}
                {task.description && (
                  <span
                    className="p-0.5 rounded-md text-slate-400 dark:text-slate-500"
                    title="כולל הערות ופירוט"
                  >
                    <FileText className="w-3 h-3" />
                  </span>
                )}
              </div>
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

            {/* Completed celebration & Microsoft To Do status update indicator */}
            {task.completed && isMsToDo && (
              <>
                {justCompleted ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/80 dark:text-sky-200 border border-sky-300 dark:border-sky-700 animate-pulse shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
                    <Sparkles className="w-3 h-3 text-sky-600 dark:text-sky-300" />
                    <span>מתעדכן ב-Microsoft To Do...</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-md border border-sky-200/70 dark:border-sky-800/70">
                    <Check className="w-3 h-3 text-sky-500 stroke-[2.5]" />
                    <span>סונכרן ל-Microsoft To Do</span>
                  </span>
                )}
              </>
            )}
          </div>

          {/* Task Title (Clicking title expands/collapses if has details) */}
          <div
            onClick={() => hasDetails && setIsExpanded(prev => !prev)}
            className={`cursor-pointer select-none break-words ${hasDetails ? 'hover:text-emerald-600 dark:hover:text-emerald-400' : ''}`}
          >
            <h3
              className={`text-sm sm:text-base font-bold leading-snug transition-colors break-words flex items-center gap-1.5 flex-wrap ${
                task.completed
                  ? 'line-through text-slate-400 dark:text-slate-500 font-normal'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {isBirthdayTask && !task.title.includes('🎂') && (
                <span className="text-base sm:text-lg shrink-0">🎂</span>
              )}
              <span>{task.title}</span>
            </h3>
          </div>

          {/* Birthday Greeting Card - shown directly on all birthday tasks */}
          {isBirthdayTask && (
            <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-pink-50/95 via-rose-50/80 to-purple-50/90 dark:from-pink-950/45 dark:via-rose-950/35 dark:to-purple-950/45 border-2 border-pink-300 dark:border-pink-700 shadow-xs space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-bold text-pink-800 dark:text-pink-200">
                  <span className="text-sm">🎂</span>
                  <span>הצעת ברכה לשליחה ל{derivedName}:</span>
                  {task.birthdayAge && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-pink-200 dark:bg-pink-900 text-pink-900 dark:text-pink-100">
                      גיל {task.birthdayAge} 🎈
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCycleGreeting}
                  className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:text-purple-900 bg-white/90 dark:bg-slate-800/90 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center gap-1 hover:shadow-2xs transition-all cursor-pointer"
                  title="החלף לנוסח ברכה אחר"
                >
                  <RotateCw className="w-3 h-3 text-purple-500" />
                  <span>נוסח אחר ({greetingIndex + 1}/{greetingOptions.length || 5})</span>
                </button>
              </div>

              {/* The greeting text */}
              <div className="bg-white/95 dark:bg-slate-900/90 p-2.5 rounded-xl border border-pink-100 dark:border-pink-900/50 text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-medium select-text shadow-2xs">
                "{activeGreeting}"
              </div>

              {/* Quick Action buttons: Copy & WhatsApp */}
              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyGreeting}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-pink-600 hover:bg-pink-700 text-white shadow-pink-500/20'
                  }`}
                  title="העתק ברכה ללוח"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'הועתק בהצלחה! ✓' : 'העתק ברכה 📋'}</span>
                </button>

                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all shadow-emerald-500/20 cursor-pointer"
                  title="שלח ברכה ישירות בוואטסאפ"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>שלח בוואטסאפ 💬</span>
                </a>

                {task.contactPhone && (
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium bg-white/70 dark:bg-slate-800/70 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    📞 {task.contactPhone}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Expanded Content Area (Visible only when isExpanded is true) */}
          {isExpanded && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 space-y-2.5 animate-in fade-in duration-150">
              {/* Optional Description */}
              {task.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-slate-50/60 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 break-words">
                  {task.description}
                </p>
              )}

              {/* Google Meet / Video Conference Quick Action Button */}
              {meetingInfo && sanitizeUrl(meetingInfo.url) && (
                <div>
                  <a
                    href={sanitizeUrl(meetingInfo.url) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 shadow-xs hover:shadow active:scale-95 group/meet ${
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

              {/* Metadata Footer: Milestone Badge & Direct Google Doc / Link */}
              {(task.milestoneTitle || shouldShowDocUrl) && (
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  {/* Milestone Badge */}
                  {task.milestoneTitle && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold shadow-2xs">
                      <Milestone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[200px] sm:max-w-none">{task.milestoneTitle}</span>
                    </div>
                  )}

                  {/* Direct Link to Google Doc, NotebookLM or External Link */}
                  {shouldShowDocUrl && sanitizeUrl(docUrl) && (
                    <a
                      href={sanitizeUrl(docUrl) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors shadow-2xs ${
                        isNotebookLM
                          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 hover:bg-purple-100 dark:hover:bg-purple-900/60 hover:text-purple-900'
                          : isGoogleDoc
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/70 hover:bg-blue-100 dark:hover:bg-blue-900/60 hover:text-blue-900 dark:hover:text-blue-100'
                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      title={isNotebookLM ? 'פתח במחברת NotebookLM (נפתח בכרטיסייה חדשה)' : isGoogleDoc ? 'פתח מסמך ב-Google Docs (נפתח בכרטיסייה חדשה)' : 'פתח קישור מקור'}
                    >
                      {isNotebookLM ? (
                        <Brain className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                      <span>{isNotebookLM ? 'פתח ב-NotebookLM 🧠' : isGoogleDoc ? 'פתח ב-Google Docs' : 'קישור למסמך'}</span>
                      <ExternalLink className="w-3 h-3 opacity-75" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons (Edit, Delete, Reschedule & Expand Toggle) */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Quick Reschedule Button for Goal Tasks */}
          {isGoal && !task.completed && (
            <button
              type="button"
              onClick={() => setIsRescheduleSheetOpen(true)}
              className="p-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl transition-all cursor-pointer"
              title="שיבוץ מהיר בטאץ' (היום, מחר, בנק או יום אחר)"
              aria-label="שיבוץ מהיר"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit(task)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-colors cursor-pointer"
            title="ערוך משימה"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(task)}
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
            title="מחק משימה (מחייב אישור)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Chevron Expand/Collapse Toggle Button */}
          {hasDetails && (
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className="p-1.5 text-slate-400 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-transform cursor-pointer"
              title={isExpanded ? 'כווץ פרטים' : 'הרחב פרטים מלאים'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Quick Reschedule Bottom Sheet / Modal */}
      {isRescheduleSheetOpen && (
        <QuickRescheduleSheet
          isOpen={isRescheduleSheetOpen}
          task={task}
          currentDate={effectiveCurrentDate}
          onClose={() => setIsRescheduleSheetOpen(false)}
          onReschedule={handleReschedule}
        />
      )}
    </div>
  );
};
