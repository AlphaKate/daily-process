import React, { useState } from 'react';
import {
  FolderOpen,
  X,
  Check,
  Shield,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { extractDriveFolderId, saveStoredDriveFolderId, getStoredDriveFolderId } from '../services/googleAuth';

interface DriveFolderPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (folderId: string) => void;
}

export const DriveFolderPromptModal: React.FC<DriveFolderPromptModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [folderInput, setFolderInput] = useState<string>(() => getStoredDriveFolderId());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = extractDriveFolderId(folderInput);
    if (!cleanId) {
      setErrorMsg('נא להזין קישור תקין לתיקייה ב-Drive או מזהה תיקייה');
      return;
    }

    saveStoredDriveFolderId(cleanId);
    onSaved(cleanId);
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-md shadow-emerald-500/10 shrink-0">
              <FolderOpen className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                הגדרת תיקיית יעדים ב-Google Drive
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                סנכרון מסמכי היעדים, הלמידה ורשימת הסופר
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              קישור לתיקייה ב-Google Drive (או מזהה תיקייה):
            </label>
            <input
              type="text"
              value={folderInput}
              onChange={(e) => {
                setFolderInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="למשל: https://drive.google.com/drive/folders/1A2b3C4d5E..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-hidden text-left ltr"
              dir="ltr"
            />
            {errorMsg && (
              <p className="text-xs text-rose-500 font-semibold mt-1">
                {errorMsg}
              </p>
            )}
          </div>

          {/* Instructions Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>איך מוצאים את הקישור לתיקייה?</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] sm:text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              <li>פתחי את Google Drive בדפדפן וכנסי לתיקיית היעדים שלך.</li>
              <li>העתיקי את הכתובת המלאה משורת הכתובות של הדפדפן (URL).</li>
              <li>הדביקי כאן – המערכת תחלץ את מזהה התיקייה באופן אוטומטי!</li>
            </ol>
            <div className="pt-1">
              <a
                href="https://drive.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <span>פתח את Google Drive בדפדפן</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Privacy & Security Note */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-2.5 text-xs">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] sm:text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
              <span className="font-bold">פרטיות מלאה: </span>
              מזהה התיקייה נשמר אך ורק על המכשיר שלך (בדפדפן המקומי) ואינו מועלה לשום שרת או מאגר ציבורי.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleSkip}
              className="px-3.5 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              המשך ללא Drive כעת
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>שמור והפעל סנכרון 🚀</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
