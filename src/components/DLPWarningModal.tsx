import React from 'react';
import { 
  ShieldAlert, 
  CreditCard, 
  UserCheck, 
  Building2, 
  AlertTriangle, 
  ArrowRight, 
  X 
} from 'lucide-react';
import { DLPFinding } from '../services/dlpService';

interface DLPWarningModalProps {
  isOpen: boolean;
  findings: DLPFinding[];
  onClose: () => void;
  onConfirmSaveAnyway: () => void;
}

export const DLPWarningModal: React.FC<DLPWarningModalProps> = ({
  isOpen,
  findings,
  onClose,
  onConfirmSaveAnyway
}) => {
  if (!isOpen || findings.length === 0) return null;

  const getFindingIcon = (type: DLPFinding['type']) => {
    switch (type) {
      case 'id_number':
        return <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'credit_card':
        return <CreditCard className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'bank_account':
        return <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn"
      dir="rtl"
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-950 dark:text-amber-100">אזהרת פרטיות ומידע רגיש (DLP)</h3>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">זוהה מידע שאינו מומלץ לשמירה</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs sm:text-sm">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            המערכת זיהתה בטקסט שהזנת פרטים בעלי רגישות גבוהה:
          </p>

          {/* Findings List */}
          <div className="space-y-2">
            {findings.map((finding, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3"
              >
                <div className="p-2 rounded-xl bg-white dark:bg-slate-700/80 shadow-xs shrink-0 mt-0.5">
                  {getFindingIcon(finding.type)}
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{finding.label}</span>
                    <span className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60">
                      {finding.snippet}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{finding.details}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Privacy Guidance Alert */}
          <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            💡 <strong>עקרון פרטיות:</strong> כדי להגן על המידע האישי שלך במקרה של שיתוף מסך או גישה למכשיר, מומלץ שלא לשמור מספרי ת״ז, אשראי או חשבונות בנק באפליקציה.
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2 shrink-0">
          <button
            onClick={onConfirmSaveAnyway}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors order-2 sm:order-1"
          >
            אישור חריג: שמור בכל זאת
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 order-1 sm:order-2"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>חזור וערוך משימה</span>
          </button>
        </div>
      </div>
    </div>
  );
};
