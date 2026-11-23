import React, { useState } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  LogOut, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  HardDrive,
  Info,
  FileText
} from 'lucide-react';
import { GoogleUser } from '../services/googleAuth';

interface SecurityDisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleUser: GoogleUser | null;
  tasksCount: number;
  onDisconnectOnly: () => Promise<void>;
  onEmergencyWipe: () => Promise<void>;
  onOpenPrivacyLegal?: () => void;
}

export const SecurityDisconnectModal: React.FC<SecurityDisconnectModalProps> = ({
  isOpen,
  onClose,
  googleUser,
  tasksCount,
  onDisconnectOnly,
  onEmergencyWipe,
  onOpenPrivacyLegal
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [confirmWipeStep, setConfirmWipeStep] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDisconnect = async () => {
    setIsProcessing(true);
    try {
      await onDisconnectOnly();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWipe = async () => {
    setIsProcessing(true);
    try {
      await onEmergencyWipe();
      // Emergency wipe will reload or reset state
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn" dir="rtl">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transition-all text-slate-800 dark:text-slate-100 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">אבטחה, ניתוק ומחיקת חירום</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">ניהול גישה לענן וסילוק מידע מהמכשיר</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Status Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">חיבור Google ענן:</span>
              <span className="font-medium flex items-center gap-1.5">
                {googleUser ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    <span className="text-emerald-700 dark:text-emerald-400 truncate max-w-[180px] sm:max-w-[220px]" title={googleUser.email}>
                      {googleUser.email}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400">לא מחובר</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">נתונים שמורים במכשיר זה:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                {tasksCount} משימות / יעדים מקומיים
              </span>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">מסך פרטיות במעבר אפליקציות:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                פעיל ומוגן (מסתיר משימות ברקע)
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">הצפנת נתונים במכשיר (Data-at-Rest):</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                AES-256-GCM (Web Crypto) פעיל
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">הגנת סייבר ורשת (CSP & Anti-XSS):</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                פעיל (מדיניות CSP וסניטציה מלאה)
              </span>
            </div>
          </div>

          {!confirmWipeStep ? (
            <>
              {/* Option 1: Standard Disconnect */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">התנתקות בלבד (Revoke & Disconnect)</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 leading-relaxed">
                      מבטל את הרשאת הגישה הרשמית מול שרתי Google (Revoke Token) ומנתק את הגישה ל-Drive, Docs, Calendar ו-Google Contacts. המשימות יישארו שמורות במכשירך לצפייה אופליין.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleDisconnect}
                    disabled={isProcessing || !googleUser}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>התנתק מגוגל וענן</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Emergency Local Wipe */}
              <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">מחיקת חירום ואיפוס מכשיר (Emergency Wipe)</h4>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 rounded">חירום</span>
                    </div>
                    <p className="text-rose-700/80 dark:text-rose-300/80 text-xs mt-0.5 leading-relaxed">
                      מבטל מיידית את ההרשאות בגוגל ומוחק לחלוטין את כל המידע המקומי, המשימות, ההגדרות והטוקנים ממכשיר זה. מתאים למקרה של אובדן מכשיר או עבודה על מחשב ציבורי.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-[11px]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span><strong>הגנת נתונים:</strong> הקבצים שלך ב-Google Drive האישי שלמים ובטוחים ולא יימחקו.</span>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => setConfirmWipeStep(true)}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>מחק נתונים ואפס מכשיר</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Confirm Wipe Step */
            <div className="p-4 rounded-2xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/40 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>האם את/ה בטוח/ה לחלוטין?</span>
              </div>
              <p className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
                פעולה זו תמחק מיד את כל המשימות, היעדים וההגדרות שנשמרו במכשיר זה, ותבצע ניתוק מוחלט (Revoke) מול Google.
              </p>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>תוכלי לשחזר את הכל בעתיד פשוט ע״י התחברות מחדש לחשבון Google Drive שלך.</span>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmWipeStep(false)}
                  disabled={isProcessing}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={handleWipe}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'מוחק ומנתק...' : 'אישור: מחק הכל עכשיו'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>פרוטוקול אבטחה V1.0</span>
            </div>
            {onOpenPrivacyLegal && (
              <button
                type="button"
                onClick={onOpenPrivacyLegal}
                className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>הצהרת פרטיות וקוד פתוח ↗</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
