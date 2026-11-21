import React, { useState, useEffect } from 'react';
import { Task, TaskCategory } from '../types';
import { X, Link as LinkIcon, Milestone, AlertCircle, FileText, Clock, Calendar } from 'lucide-react';
import { scanTextForSensitiveData, DLPFinding } from '../services/dlpService';
import { DLPWarningModal } from './DLPWarningModal';
import { getStoredToken } from '../services/googleAuth';

interface TaskModalProps {
  isOpen: boolean;
  initialTask?: Task | null;
  defaultDate: string;
  defaultCategory?: TaskCategory;
  onClose: () => void;
  onSave: (taskData: Partial<Task> & { addToCalendar?: boolean }) => void;
}

const COMMON_MILESTONES = [
  'Machine Learning',
  'GoogleLM',
  'פיתוח אישי',
  'סיום קורס פייתון',
  'כושר ובריאות',
  'אנגלית מקצועית'
];

const DURATION_PRESETS = [15, 30, 45, 60, 90];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  initialTask,
  defaultDate,
  defaultCategory = 'must_do',
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>(defaultCategory);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [addToCalendar, setAddToCalendar] = useState<boolean>(false);
  const [dlpFindings, setDlpFindings] = useState<DLPFinding[]>([]);
  const [isDlpModalOpen, setIsDlpModalOpen] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setCategory(initialTask.category);
      setDate(initialTask.date);
      setTime(initialTask.time || '');
      setDurationMinutes(initialTask.durationMinutes ? String(initialTask.durationMinutes) : '');
      setMilestoneTitle(initialTask.milestoneTitle || '');
      setLink(initialTask.link || '');
      setAddToCalendar(Boolean(initialTask.id.startsWith('gcal-')));
    } else {
      setTitle('');
      setDescription('');
      setCategory(defaultCategory);
      setDate(defaultDate);
      setTime('');
      setDurationMinutes('');
      setMilestoneTitle('');
      setLink('');
      setAddToCalendar(false);
    }
    setError('');
  }, [initialTask, isOpen, defaultDate, defaultCategory]);

  if (!isOpen) return null;

  // Detect Google Doc ID if present
  let existingDocId = initialTask?.goalDocumentId;
  const matchDocId = link.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  if (matchDocId && matchDocId[1]) {
    existingDocId = matchDocId[1];
  }

  const googleDocPreviewUrl =
    link.includes('docs.google.com')
      ? link
      : existingDocId
      ? `https://docs.google.com/document/d/${existingDocId}/edit`
      : null;

  const performSave = () => {
    let resolvedGoalDocId = initialTask?.goalDocumentId;
    if (link) {
      const match = link.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        resolvedGoalDocId = match[1];
      }
    }

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      date,
      time: time || undefined,
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      milestoneTitle: milestoneTitle.trim() || undefined,
      link: link.trim() || undefined,
      goalDocumentId: resolvedGoalDocId,
      addToCalendar,
      contactId: initialTask?.contactId,
      contactName: initialTask?.contactName,
      contactPhone: initialTask?.contactPhone,
      birthdayGreeting: initialTask?.birthdayGreeting,
      birthdayAge: initialTask?.birthdayAge
    });
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('נא להזין כותרת למשימה');
      return;
    }

    // Scan for sensitive data (ID, Credit Card, Bank)
    const scanResult = scanTextForSensitiveData(`${title} ${description}`);
    if (scanResult.hasSensitiveData) {
      setDlpFindings(scanResult.findings);
      setIsDlpModalOpen(true);
      return;
    }

    performSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{initialTask ? 'עריכת משימה' : 'הוספת משימה חדשה'}</span>
            {category === 'goals' && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                יעד התפתחות
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              רמת משימה (קטגוריה)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCategory('must_do')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  category === 'must_do'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                🔴 Must Do
              </button>
              <button
                type="button"
                onClick={() => setCategory('goals')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  category === 'goals'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                🟢 Goals (יעדים)
              </button>
              <button
                type="button"
                onClick={() => setCategory('casual')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  category === 'casual'
                    ? 'bg-sky-50 border-sky-500 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                🔵 Casual (שוטף)
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              כותרת המשימה *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="לדוגמה: למידת פרק 3, פגישת בוקר, להזמין תור..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:text-white"
              autoFocus
            />
          </div>

          {/* Milestone for Goals */}
          {category === 'goals' && (
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <Milestone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>אבן דרך / נושא יעד (Milestone)</span>
                </div>
              </div>

              <input
                type="text"
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="למשל: Machine Learning / GoogleLM או שיפור כושר..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />

              {/* Quick suggestions chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">הצעות מהירות:</span>
                {COMMON_MILESTONES.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setMilestoneTitle(chip)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60 hover:bg-emerald-100/70 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time, Duration & Date */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    תאריך
                  </label>
                  {category === 'goals' && (
                    <button
                      type="button"
                      onClick={() => setDate(date === 'backlog' ? defaultDate : 'backlog')}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                        date === 'backlog'
                          ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300'
                          : 'text-slate-500 hover:text-emerald-600 hover:underline'
                      }`}
                    >
                      {date === 'backlog' ? '✓ בבנק היעדים' : 'העבר לבנק'}
                    </button>
                  )}
                </div>
                {date === 'backlog' ? (
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                    <span>🏦 יעד בבנק (ללא תאריך ספציפי)</span>
                    <button
                      type="button"
                      onClick={() => setDate(defaultDate)}
                      className="text-[10px] underline font-bold text-emerald-700 dark:text-emerald-400"
                    >
                      בחר תאריך
                    </button>
                  </div>
                ) : (
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  שעה (אופציונלי)
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>משך זמן (דקות)</span>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="למשל: 45"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Duration Preset Pills */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">משך זמן מהיר:</span>
              {DURATION_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(String(mins))}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                    durationMinutes === String(mins)
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  ⏱️ {mins} דק׳
                </button>
              ))}
            </div>

            {/* Google Calendar Sync Option */}
            <div className="pt-1.5">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/90 dark:border-slate-700/80 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={addToCalendar}
                  onChange={(e) => setAddToCalendar(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                />
                <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                    הוסף וסנכרן ליומן Google Calendar
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    ייצור אירוע מסונכרן ביומן Google ויתווסף ל-Must Do
                  </span>
                </div>
              </label>

              {addToCalendar && !getStoredToken()?.access_token && (
                <div className="mt-1.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>חשבון Google אינו מחובר. המשימה תישמר מקומית ב-Must Do אך לא תסונכרן ליומן עד להתחברות.</span>
                </div>
              )}

              {addToCalendar && Boolean(getStoredToken()?.access_token) && (
                <div className="mt-1.5 p-1.5 px-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-200 flex items-center gap-1.5">
                  <span className="text-xs">📅</span>
                  <span>מחובר ל-Google: המשימה תתווסף ישירות ליומן Google Calendar</span>
                </div>
              )}
            </div>
          </div>

          {/* Link to Google Doc or External Resource */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                קישור למסמך Google Docs או מקור המשימה
              </label>
              {googleDocPreviewUrl && (
                <a
                  href={googleDocPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  <FileText className="w-3 h-3" />
                  <span>פתח מסמך מקושר ↗</span>
                </a>
              )}
            </div>

            <div className="relative">
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
                className="w-full px-3 py-2 pl-8 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none"
              />
              <LinkIcon className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            </div>

            {existingDocId && (
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span>מזהה Google Doc מקושר:</span>
                <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[9px]">
                  {existingDocId}
                </code>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              תיאור או הערות נוספות
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="פירוט המשימה, דגשים חשובים..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none"
            />
          </div>

          {/* Submit buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md shadow-emerald-600/25 transition-all"
            >
              {initialTask ? 'שמור שינויים' : 'הוסף משימה'}
            </button>
          </div>
        </form>
      </div>

      {/* DLP Sensitive Data Soft Warning Modal */}
      <DLPWarningModal
        isOpen={isDlpModalOpen}
        findings={dlpFindings}
        onClose={() => setIsDlpModalOpen(false)}
        onConfirmSaveAnyway={() => {
          setIsDlpModalOpen(false);
          performSave();
        }}
      />
    </div>
  );
};
