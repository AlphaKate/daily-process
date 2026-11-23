import React, { useState } from 'react';
import { Shield, FileText, Code2, ExternalLink, X, Lock, CheckCircle2 } from 'lucide-react';

interface PrivacyLegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'privacy' | 'licenses';
}

const OPEN_SOURCE_PACKAGES = [
  {
    name: 'React & React DOM',
    version: '^18.3.1',
    license: 'MIT',
    purpose: 'ספריית תצוגה מבוססת רכיבים לממשק המשתמש',
    url: 'https://react.dev'
  },
  {
    name: 'Lucide React',
    version: '^1.16.0',
    license: 'ISC',
    purpose: 'אייקונים וקטוריים נגישים וקלים',
    url: 'https://lucide.dev'
  },
  {
    name: 'Canvas Confetti',
    version: '^1.9.4',
    license: 'ISC',
    purpose: 'אנימציית קונפטי קלה לחגיגת ביצוע משימות ויעדים',
    url: 'https://github.com/catdad/canvas-confetti'
  },
  {
    name: 'Tailwind CSS & PostCSS',
    version: '^3.4.17',
    license: 'MIT',
    purpose: 'מערכת עיצוב מודרנית מבוססת מחלקות עזר',
    url: 'https://tailwindcss.com'
  },
  {
    name: 'Vite',
    version: '^6.0.7',
    license: 'MIT',
    purpose: 'כלי בנייה ופיתוח מהיר ליישומי ווב',
    url: 'https://vitejs.dev'
  },
  {
    name: 'TypeScript',
    version: '^5.7.2',
    license: 'Apache-2.0',
    purpose: 'הוספת טיפוסים סטטיים לקוד לשיפור אמינות ואבטחה',
    url: 'https://www.typescriptlang.org'
  }
];

export const PrivacyLegalModal: React.FC<PrivacyLegalModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'privacy'
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'licenses'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn" 
      dir="rtl"
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">פרטיות ומידע משפטי</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">הצהרת פרטיות ורישיונות קוד פתוח</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 mx-5 mt-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'privacy'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>הצהרת פרטיות (Privacy Policy)</span>
          </button>
          <button
            onClick={() => setActiveTab('licenses')}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'licenses'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>רישיונות קוד פתוח (Open Source)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed">
          {activeTab === 'privacy' ? (
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
              {/* Highlight summary */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm">
                    ארכיטקטורת Zero-Knowledge ופרטיות מוחלטת
                  </h4>
                  <p className="text-[11px] sm:text-xs text-emerald-800/90 dark:text-emerald-300/90">
                    האפליקציה פועלת ללא שרת ביניים. המידע שלך אינו נשמר בשום מאגר נתונים חיצוני, אלא מוצפן במכשיר שלך ונשמר ישירות ב-Google Drive האישי שלך.
                  </p>
                </div>
              </div>

              {/* Section 1 */}
              <div className="space-y-1.5">
                <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>1. איסוף ואחסון המידע</span>
                </h5>
                <p className="text-slate-600 dark:text-slate-400 text-xs pr-5">
                  כלל המשימות, היעדים, הנתונים וההגדרות נשמרים מקומית בדפדפן תוך הצפנת AES-256-GCM. בעת התחברות לחשבון Google, קובץ הנתונים מסונכרן ישירות מול חשבון ה-Drive הפרטי של המשתמשת.
                </p>
              </div>

              {/* Section 2 */}
              <div className="space-y-1.5">
                <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>2. שימוש בהרשאות Google API</span>
                </h5>
                <p className="text-slate-600 dark:text-slate-400 text-xs pr-5">
                  האפליקציה מבקשת הרשאות גישה ל-Google Drive, Calendar ו-Docs אך ורק כדי לקרוא ולעדכן את המשימות והיעדים שביקשת לסנכרן. השימוש בהרשאות עומד בהנחיות המדיניות של Google API Services User Data Policy, כולל דרישות השימוש המוגבל (Limited Use).
                </p>
              </div>

              {/* Section 3 */}
              <div className="space-y-1.5">
                <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>3. אי-איסוף מידע רגיש (DLP)</span>
                </h5>
                <p className="text-slate-600 dark:text-slate-400 text-xs pr-5">
                  המערכת כוללת מנגנון מובנה למניעת דליפת מידע (DLP), המתריע וממליץ שלא לשמור מספרי תעודת זהות, פרטי כרטיסי אשראי או חשבונות בנק באפליקציה.
                </p>
              </div>

              {/* Section 4 */}
              <div className="space-y-1.5">
                <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>4. זכויות המשתמשת ומחיקת מידע</span>
                </h5>
                <p className="text-slate-600 dark:text-slate-400 text-xs pr-5">
                  באפשרותך בכל עת לבצע ניתוק מלא של שירותי הענן (כולל Revoke Token בשרתי Google), או להפעיל "מחיקת חירום ואיפוס מכשיר" המנקה לצמיתות את כל המידע המקומי ומפתחות ההצפנה מהמכשיר.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                אפליקציה זו עושה שימוש בחבילות קוד פתוח מובילות בהתאם לתנאי הרישיון שלהן. להלן רשימת הרכיבים והרישיונות:
              </p>

              <div className="space-y-2">
                {OPEN_SOURCE_PACKAGES.map((pkg, i) => (
                  <div 
                    key={i}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{pkg.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{pkg.version}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                          {pkg.license}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-xs">{pkg.purpose}</p>
                    </div>
                    <a
                      href={pkg.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors shrink-0"
                      title="עבור לאתר הפרויקט"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">יומי & התפתחות • 2026</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
