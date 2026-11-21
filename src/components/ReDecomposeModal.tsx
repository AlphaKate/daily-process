import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Sparkles,
  FileText,
  ExternalLink,
  Layers,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Inbox,
  ClipboardPaste,
  ChevronRight
} from 'lucide-react';
import { LearningNotebook, NotebookStage, Task } from '../types';
import { parsePlanContentToStages } from '../services/notebookStorage';
import { reDecomposeProgram } from '../services/notebookPlanService';

export interface ReDecomposeModalProps {
  isOpen: boolean;
  notebook: LearningNotebook | null;
  onClose: () => void;
  onConfirm?: (params: {
    notebookId: string;
    newStages: NotebookStage[];
    mode: 'replace' | 'append';
    newText?: string;
    newDocUrl?: string;
  }) => void;
  onSuccess?: (updatedNotebook: LearningNotebook, updatedTasks: Task[]) => void;
  allTasks?: Task[];
}

export const ReDecomposeModal: React.FC<ReDecomposeModalProps> = ({
  isOpen,
  notebook,
  onClose,
  onConfirm,
  onSuccess,
  allTasks = []
}) => {
  const [docUrl, setDocUrl] = useState('');
  const [planText, setPlanText] = useState('');
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [scheduleMode, setScheduleMode] = useState<'spread' | 'backlog'>('spread');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initial state when modal opens or notebook changes
  useEffect(() => {
    if (notebook) {
      setDocUrl(notebook.url || '');
      setPlanText('');
      setMode('replace');
      setScheduleMode('spread');
      setErrorMsg(null);
    }
  }, [notebook, isOpen]);

  // Real-time parsing of detected stages from text
  const detectedStages = useMemo(() => {
    if (!planText.trim()) return [];
    return parsePlanContentToStages(planText.trim());
  }, [planText]);

  // Calculate total detected duration
  const totalMinutes = useMemo(() => {
    return detectedStages.reduce((sum, s) => sum + (s.durationMinutes || 20), 0);
  }, [detectedStages]);

  // Calculate completed tasks that will be safely preserved
  const completedTasksCount = useMemo(() => {
    if (!notebook) return 0;
    const nbMilestone = (notebook.milestoneTitle || notebook.title || '').trim().toLowerCase();
    return allTasks.filter(t => {
      if (t.isDeleted || !t.completed) return false;
      if (t.goalDocumentId && t.goalDocumentId === notebook.id) return true;
      if (t.milestoneTitle && t.milestoneTitle.trim().toLowerCase() === nbMilestone) return true;
      if (notebook.stages.some(s => s.title.trim().toLowerCase() === t.title.trim().toLowerCase())) return true;
      return false;
    }).length;
  }, [notebook, allTasks]);

  // Uncompleted tasks that will be replaced in 'replace' mode
  const pendingTasksCount = useMemo(() => {
    if (!notebook) return 0;
    const nbMilestone = (notebook.milestoneTitle || notebook.title || '').trim().toLowerCase();
    return allTasks.filter(t => {
      if (t.isDeleted || t.completed) return false;
      if (t.goalDocumentId && t.goalDocumentId === notebook.id) return true;
      if (t.milestoneTitle && t.milestoneTitle.trim().toLowerCase() === nbMilestone) return true;
      if (notebook.stages.some(s => s.title.trim().toLowerCase() === t.title.trim().toLowerCase())) return true;
      return false;
    }).length;
  }, [notebook, allTasks]);

  if (!isOpen || !notebook) return null;

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPlanText(text);
        }
      }
    } catch {
      // Ignore clipboard permission failures
    }
  };

  const handleConfirm = () => {
    if (detectedStages.length === 0 && !planText.trim()) {
      setErrorMsg('יש להזין או להדביק טקסט שלבים מהמסמך או מ-NotebookLM.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const result = reDecomposeProgram({
        notebookId: notebook.id,
        newText: planText,
        newDocUrl: docUrl.trim() || undefined,
        mode,
        scheduleMode
      });

      if (onConfirm) {
        onConfirm({
          notebookId: notebook.id,
          newStages: detectedStages.length > 0 ? detectedStages : result.notebook.stages,
          mode,
          newText: planText,
          newDocUrl: docUrl.trim() || undefined
        });
      }

      if (onSuccess) {
        onSuccess(result.notebook, result.updatedTasks);
      }

      onClose();
    } catch (err: unknown) {
      console.error('Failed to re-decompose program:', err);
      setErrorMsg(err instanceof Error ? err.message : 'אירעה שגיאה בעדכון התוכנית');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatHoursMinutes = (mins: number) => {
    if (mins < 60) return `${mins} דק'`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} שעות ו-${m} דק'` : `${h} שעות`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold leading-tight">
                  פירוק מחדש ועדכון שלבים
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-purple-100 font-medium">
                  {notebook.title}
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-0.5">
                עדכון סילבוס ותוכנית עבודה מ-NotebookLM או Google Docs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 overscroll-contain">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Link & Source */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>קישור למסמך מקור (Google Docs או NotebookLM)</span>
              {docUrl && (
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-normal"
                >
                  <span>פתח מסמך</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </label>
            <div className="relative">
              <input
                type="url"
                value={docUrl}
                onChange={e => setDocUrl(e.target.value)}
                placeholder="https://docs.google.com/... או https://notebooklm.google.com/..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
          </div>

          {/* Section 2: Textarea for Plan Content */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>הדבקת תוכן התוכנית / ראשי פרקים מעודכנים</span>
              </label>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="text-[11px] text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
              >
                <ClipboardPaste className="w-3 h-3" />
                <span>הדבק מלוח ההעתקה</span>
              </button>
            </div>
            <textarea
              rows={5}
              value={planText}
              onChange={e => setPlanText(e.target.value)}
              placeholder={`הדבק כאן את הטקסט מ-NotebookLM או מ-Google Docs, לדוגמה:
1. שלב 1: מבוא ועקרונות יסוד (20 דק')
2. שלב 2: תרגול מעשי והטמעה (30 דקות)
3. שלב 3: מודול מתקדם ובדיקת תובנות (45m)`}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono transition-all leading-relaxed"
            />
          </div>

          {/* Section 3: Mode Selection (Replace Future vs Append) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              אופן עדכון השלבים בתוכנית:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Replace Option */}
              <button
                type="button"
                onClick={() => setMode('replace')}
                className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  mode === 'replace'
                    ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      החלפת שלבים עתידיים
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                      מומלץ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    מסיר שלבים עתידיים שטרם הושלמו ומחליף אותם בסילבוס החדש.
                  </p>
                </div>
                {completedTasksCount > 0 && (
                  <div className="mt-2 pt-2 border-t border-purple-200/60 dark:border-purple-900/40 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>משמר {completedTasksCount} שלבים שכבר ביצעת!</span>
                  </div>
                )}
              </button>

              {/* Append Option */}
              <button
                type="button"
                onClick={() => setMode('append')}
                className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  mode === 'append'
                    ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <PlusCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      הוספת שלבים חדשים
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      מיזוג
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    משאיר את כל השלבים הקיימים ומוסיף את השלבים החדשים בסוף התוכנית.
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {notebook.stages.length} שלבים קיימים יישמרו
                </div>
              </button>
            </div>
          </div>

          {/* Section 4: Schedule Target Option */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              שיבוץ השלבים החדשים:
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="scheduleMode"
                  checked={scheduleMode === 'spread'}
                  onChange={() => setScheduleMode('spread')}
                  className="accent-purple-600"
                />
                <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>פזר בימי השבוע הקרובים (שלב ליום)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="scheduleMode"
                  checked={scheduleMode === 'backlog'}
                  onChange={() => setScheduleMode('backlog')}
                  className="accent-purple-600"
                />
                <Inbox className="w-3.5 h-3.5 text-slate-500" />
                <span>הוסף לבנק היעדים (ללא תאריך)</span>
              </label>
            </div>
          </div>

          {/* Section 5: Smart Detected Stages Preview */}
          {detectedStages.length > 0 && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>זוהו {detectedStages.length} שלבים חדשים</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-normal">
                  <Clock className="w-3.5 h-3.5" />
                  <span>סך הכל: {formatHoursMinutes(totalMinutes)}</span>
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {detectedStages.map((stg, i) => (
                  <div
                    key={stg.id || i}
                    className="p-2 bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {stg.title}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold shrink-0">
                      {stg.durationMinutes || 20} דק'
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {mode === 'replace' ? (
              <span>
                {pendingTasksCount > 0 ? `${pendingTasksCount} משימות עתידיות יוחלפו • ` : ''}
                {completedTasksCount} הושלמו ונשמרות
              </span>
            ) : (
              <span>{detectedStages.length} שלבים יתווספו לסוף התוכנית</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || (detectedStages.length === 0 && !planText.trim())}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>{mode === 'replace' ? 'החלף שלבים עתידיים' : 'הוסף שלבים לתוכנית'}</span>
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
