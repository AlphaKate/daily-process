import React, { useState } from 'react';
import { Task } from '../types';
import {
  X,
  Brain,
  Sparkles,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Layers
} from 'lucide-react';
import { getTodayDateString } from '../services/storage';

interface CurriculumImportModalProps {
  isOpen: boolean;
  currentDate: string;
  onClose: () => void;
  onImportTasks: (newTasks: Task[]) => void;
}

const DEFAULT_ASSERTIVE_STAGES = [
  {
    title: 'שלב 1: מיפוי זכויות אישיות וזיהוי דפוסי תקשורת',
    description: 'הגדרת זכויות אישיות (Assertiveness Bill of Rights) וזיהוי מצבים ביום-יום בהם קשה לעמוד על שלך מתוך המחברת ב-NotebookLM.',
    durationMinutes: 20
  },
  {
    title: 'שלב 2: תרגול אמירת "לא" ברורה וללא התנצלות מוגזמת',
    description: 'טכניקת סירוב אדיב וישיר (Saying No with Clarity) תוך שמירה על יחסים וכבוד הדדי, על פי עקרונות התוכנית.',
    durationMinutes: 20
  },
  {
    title: 'שלב 3: שימוש במסרי "אני" וניסוח צרכים ישיר',
    description: 'מעבר מהאשמות ("אתה תמיד...") לניסוח תחושות וצרכים ברורים ("אני מרגישה ש... ואשמח אם...") בעזרת דוגמאות ב-NotebookLM.',
    durationMinutes: 20
  },
  {
    title: 'שלב 4: טכניקות עמידה בלחץ וערפול מול ביקורת',
    description: 'תרגול טכניקת התקליט השבור (Broken Record) וערפול (Fogging) כדי לשמור על קור רוח ואיפוק מול לחץ או שיפוטיות.',
    durationMinutes: 25
  },
  {
    title: 'שלב 5: הצבת גבולות בסביבה אישית ועסקית',
    description: 'הגדרת קווים אדומים, תיאום ציפיות מקצועי והצבת גבולות ברורים בעבודה ומול קולגות/משפחה.',
    durationMinutes: 25
  },
  {
    title: 'שלב 6: שפת גוף, קשר עין וטון אסרטיבי',
    description: 'חיזוק מרכיבי התקשורת הלא-מילולית: יציבה בטוחה, קשר עין ישיר ודיבור רגוע ושקול בזמן העברת מסרים.',
    durationMinutes: 20
  },
  {
    title: 'שלב 7: סקירת התקדמות, תובנות והטמעה',
    description: 'סיכום השבוע, כתיבת תובנות במחברת NotebookLM, זיהוי הצלחות והגדרת עקרונות להמשך תרגול שוטף.',
    durationMinutes: 30
  }
];

export const CurriculumImportModal: React.FC<CurriculumImportModalProps> = ({
  isOpen,
  currentDate,
  onClose,
  onImportTasks,
}) => {
  const [planTitle, setPlanTitle] = useState('Daily Assertive Practice Plan');
  const [notebookUrl, setNotebookUrl] = useState('https://notebooklm.link.google/0Uhj6QVmB40d');
  const [milestoneTitle, setMilestoneTitle] = useState('Daily Assertive Practice (GoogleLM)');
  const [startDate, setStartDate] = useState(currentDate || getTodayDateString());
  const [distributionMode, setDistributionMode] = useState<'daily' | 'bank'>('daily');
  const [stages, setStages] = useState(DEFAULT_ASSERTIVE_STAGES);
  const [newStageText, setNewStageText] = useState('');

  if (!isOpen) return null;

  const handleLoadAssertiveTemplate = () => {
    setPlanTitle('Daily Assertive Practice Plan');
    setNotebookUrl('https://notebooklm.link.google/0Uhj6QVmB40d');
    setMilestoneTitle('Daily Assertive Practice (GoogleLM)');
    setStages(DEFAULT_ASSERTIVE_STAGES);
  };

  const handleAddStage = () => {
    if (!newStageText.trim()) return;
    setStages(prev => [
      ...prev,
      {
        title: newStageText.trim(),
        description: `מתוך תוכנית העבודה במחברת ${planTitle}`,
        durationMinutes: 20
      }
    ]);
    setNewStageText('');
  };

  const handleRemoveStage = (index: number) => {
    setStages(prev => prev.filter((_, i) => i !== index));
  };

  const handleExecuteImport = () => {
    if (stages.length === 0) return;

    const now = new Date().toISOString();
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);

    const generatedTasks: Task[] = stages.map((stage, idx) => {
      let taskDate = 'backlog';

      if (distributionMode === 'daily') {
        const d = new Date(startYear, startMonth - 1, startDay);
        d.setDate(d.getDate() + idx);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        taskDate = `${y}-${m}-${dayNum}`;
      }

      return {
        id: `import-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        title: stage.title,
        description: stage.description,
        category: 'goals',
        completed: false,
        date: taskDate,
        durationMinutes: stage.durationMinutes || 20,
        milestoneTitle: milestoneTitle.trim() || planTitle.trim(),
        link: notebookUrl.trim() || undefined,
        createdAt: now,
        updatedAt: now
      };
    });

    onImportTasks(generatedTasks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-md">
              <Brain className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-200 block">
                Google LM & Docs Importer
              </span>
              <h3 className="text-base sm:text-lg font-bold leading-tight">
                פירוק וייבוא תוכנית למידה מ-NotebookLM / Docs
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm">
          {/* Quick Preset Banner */}
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-900/50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="text-xs font-semibold">
                תוכנית לדוגמה: <strong>Daily Assertive Practice Plan (7 ימים)</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleLoadAssertiveTemplate}
              className="px-2.5 py-1 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              אפס לתבנית זו
            </button>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                שם התוכנית / קורס
              </label>
              <input
                type="text"
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                placeholder="למשל: Daily Assertive Practice Plan"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                אבן דרך (Milestone)
              </label>
              <input
                type="text"
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="למשל: Daily Assertive Practice (GoogleLM)"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>
          </div>

          {/* Notebook / Doc URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>קישור למחברת ב-NotebookLM או למסמך מקור</span>
              {notebookUrl && (
                <a
                  href={notebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-1 text-[11px]"
                >
                  <span>בדוק קישור</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </label>
            <input
              type="url"
              value={notebookUrl}
              onChange={(e) => setNotebookUrl(e.target.value)}
              placeholder="https://notebooklm.link.google/..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 font-mono"
            />
          </div>

          {/* Scheduling Configuration */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                אופן החלוקה בלוח הזמנים
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDistributionMode('daily')}
                  className={`py-1.5 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    distributionMode === 'daily'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  משימה בכל יום 📅
                </button>
                <button
                  type="button"
                  onClick={() => setDistributionMode('bank')}
                  className={`py-1.5 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    distributionMode === 'bank'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  לבנק יעדים 🏦
                </button>
              </div>
            </div>

            {distributionMode === 'daily' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  תאריך התחלה (ליום הראשון)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Stages Breakdown List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>שלבי התוכנית לפירוק ({stages.length} שלבים)</span>
              </span>
              <span className="text-[11px] text-slate-400">
                כל שלב יהפוך ליעד יומי עצמאי עם קישור ישיר למחברת
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {stages.map((stage, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700 flex items-start justify-between gap-2 shadow-2xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs">
                        {stage.title}
                      </span>
                      {stage.durationMinutes && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                          ⏱️ {stage.durationMinutes} דק׳
                        </span>
                      )}
                    </div>
                    {stage.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 mr-7 line-clamp-1">
                        {stage.description}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveStage(i)}
                    className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors"
                    title="הסר שלב"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick add extra stage */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newStageText}
                onChange={(e) => setNewStageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddStage();
                  }
                }}
                placeholder="הוסף שלב נוסף לתוכנית..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
              <button
                type="button"
                onClick={handleAddStage}
                disabled={!newStageText.trim()}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>הוסף שלב</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            יופקו <strong>{stages.length}</strong> משימות עם קישורים למחברת
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={stages.length === 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>שבץ {stages.length} יעדים בלוח הזמנים 🚀</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
