import React from 'react';
import { Task } from '../types';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  task,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2">
          אישור מחיקת משימה
        </h3>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
          האם את/ה בטוח/ה שברצונך למחוק את המשימה:
          <br />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            "{task.title}"
          </span>
          ?
        </p>

        <p className="text-[11px] text-slate-500 dark:text-slate-500 mb-6 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          בהתאם להנחיות הפרטיות והבטיחות, שום משימה אינה נמחקת ללא אישורך המפורש.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            ביטול (השאר)
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-md shadow-rose-600/20 transition-all"
          >
            כן, מחק לצמיתות
          </button>
        </div>
      </div>
    </div>
  );
};
