import React, { useState } from 'react';
import {
  X,
  FileText,
  Brain,
  Wand2,
  Check,
  AlertCircle,
  Loader2,
  ArrowRightLeft,
  PlusCircle
} from 'lucide-react';
import { LearningNotebook, NotebookStage } from '../types';
import { parsePlanContentToStages } from '../services/notebookStorage';
import { fetchGoogleDoc } from '../services/googleDrive';
import { getStoredToken } from '../services/googleAuth';

export interface ReDecomposeModalProps {
  isOpen: boolean;
  notebook: LearningNotebook | null;
  onClose: () => void;
  onConfirm: (params: {
    notebookId: string;
    newStages: NotebookStage[];
    mode: 'replace' | 'append';
    newText?: string;
    newDocUrl?: string;
  }) => void;
}

export const ReDecomposeModal: React.FC<ReDecomposeModalProps> = ({
  isOpen,
  notebook,
  onClose,
  onConfirm
}) => {
  const [updateMode, setUpdateMode] = useState<'replace' | 'append'>('replace');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [rawPastedText, setRawPastedText] = useState('');
  const [previewStages, setPreviewStages] = useState<NotebookStage[]>([]);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  if (!isOpen || !notebook) return null;

  const handleParseText = (text: string) => {
    setRawPastedText(text);
    if (!text.trim()) {
      setPreviewStages([]);
      setNotice(null);
      return;
    }
    const stages = parsePlanContentToStages(text);
    setPreviewStages(stages);
    if (stages.length > 0) {
      setNotice({
        type: 'success',
        message: `זוהו בהצלחה ${stages.length} שלבים חדשים!`
      });
    } else {
      setNotice({
        type: 'info',
        message: 'לא זוהו שלבים מובנים. וודא/י שהטקסט כולל שורות או מספור שלבים.'
      });
    }
  };

  const handleFetchGoogleDoc = async () => {
    if (!newDocUrl.trim()) return;
    const docIdMatch = newDocUrl.match(/(?:document\/d\/|open\?id=)([a-zA-Z0-9-_]{20,})/);
    if (!docIdMatch) {
      setNotice({
        type: 'error',
        message: 'קישור Google Docs לא תקין. יש להזין קישור מלא למסמך.'
      });
      return;
    }

    const token = getStoredToken();
    if (!token?.access_token) {
      setNotice({
        type: 'error',
        message: 'אין חיבור פעיל ל-Google Drive. יש להתחבר מחדש בראש המסך.'
      });
      return;
    }

    setIsLoadingDoc(true);
    setNotice(null);
    try {
      const doc = await fetchGoogleDoc(docIdMatch[1], token.access_token);
      if (doc?.rawText) {
        setRawPastedText(doc.rawText);
        const stages = parsePlanContentToStages(doc.rawText);
        setPreviewStages(stages);
        setNotice({
          type: 'success',
          message: `מסמך "${doc.title || 'Docs'}" נטען בהצלחה! חולצו ${stages.length} שלבים.`
        });
      } else {
        setNotice({
          type: 'error',
          message: 'לא ניתן היה לקרוא תוכן טקסטואלי ממסמך ה-Docs.'
        });
      }
    } catch {
      setNotice({
        type: 'error',
        message: 'שגיאה בטעינת מסמך Google Docs. וודא/י הרשאות גישה.'
      });
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const handleSave = () => {
    if (previewStages.length === 0) {
      setNotice({
        type: 'error',
        message: 'יש להזין טקסט או לטעון מסמך עם שלבים לפני השמירה.'
      });
      return;
    }

    onConfirm({
      notebookId: notebook.id,
      newStages: previewStages,
      mode: updateMode,
      newText: rawPastedText,
      newDocUrl: newDocUrl || notebook.url
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200 modal-viewport-lock safe-area-bottom">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                עדכון שלבים ממסמך / NotebookLM
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                תוכנית: <span className="font-semibold text-purple-700 dark:text-purple-300">{notebook.title}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Strategy Selection: Replace Future vs Append */}
          <div>
            <label className="font-bold text-slate-800 dark:text-slate-200 block mb-2">
              אופן עדכון השלבים בתוכנית:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUpdateMode('replace')}
                className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 ${
                  updateMode === 'replace'
                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 dark:border-purple-600 text-purple-950 dark:text-purple-200 ring-1 ring-purple-500/30'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-purple-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold">החלפת שלבים עתידיים בלבד</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    מסיר שלבים שטרם בוצעו ומחליף אותם בשלבים החדשים. כל שלב שכבר סומן כהושלם נשמר במלואו!
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUpdateMode('append')}
                className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 ${
                  updateMode === 'append'
                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 dark:border-purple-600 text-purple-950 dark:text-purple-200 ring-1 ring-purple-500/30'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <PlusCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold">הוספת שלבים חדשים (Append)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    משאיר את כל השלבים הקיימים ומוסיף את השלבים החדשים בסוף התוכנית.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Option A: Fetch from Google Docs Link */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>טעינה ישירה מקישור Google Docs (אופציונלי):</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={newDocUrl}
                onChange={(e) => setNewDocUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
              <button
                type="button"
                onClick={handleFetchGoogleDoc}
                disabled={isLoadingDoc || !newDocUrl.trim()}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                {isLoadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                <span>טען שלבים</span>
              </button>
            </div>
          </div>

          {/* Option B: Paste updated content from NotebookLM */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-purple-600" />
              <span>או הדבק/י כאן את הטקסט המעודכן מתוך NotebookLM / מסמך:</span>
            </label>
            <textarea
              value={rawPastedText}
              onChange={(e) => handleParseText(e.target.value)}
              placeholder="הדבק/י כאן שלבי לימוד חדשים או מעודכנים מתוך NotebookLM..."
              rows={5}
              className="w-full p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 leading-relaxed font-mono text-[11px]"
            />
          </div>

          {/* Notice Feedback */}
          {notice && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 ${
                notice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                  : notice.type === 'error'
                  ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                  : 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200 border-blue-300 dark:border-blue-700'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{notice.message}</span>
            </div>
          )}

          {/* Preview of Detected Stages */}
          {previewStages.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  תצוגה מקדימה של השלבים שיחולצו ({previewStages.length}):
                </span>
                <span className="text-amber-700 dark:text-amber-300 font-semibold">
                  ⏱️ סה״כ: {previewStages.reduce((sum, s) => sum + (s.durationMinutes || 20), 0)} דק׳
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {previewStages.map((stg, idx) => (
                  <div
                    key={stg.id || idx}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {stg.title}
                      </p>
                      {stg.description && (
                        <p className="text-[10px] text-slate-500 truncate">{stg.description}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                      ⏱️ {stg.durationMinutes || 20} דק׳
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 transition-colors"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={previewStages.length === 0}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>החל עדכון בתוכנית</span>
          </button>
        </div>
      </div>
    </div>
  );
};
