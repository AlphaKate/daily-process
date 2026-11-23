import React, { useEffect, useState } from 'react';
import { Shield, Settings, Eye } from 'lucide-react';

interface AppPrivacyShieldProps {
  enabled?: boolean;
  onDisablePermanently?: () => void;
  onOpenSettings?: () => void;
}

export const AppPrivacyShield: React.FC<AppPrivacyShieldProps> = ({
  enabled = true,
  onDisablePermanently,
  onOpenSettings
}) => {
  const [isShieldActive, setIsShieldActive] = useState<boolean>(false);

  useEffect(() => {
    if (!enabled) {
      setIsShieldActive(false);
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsShieldActive(true);
      } else {
        setIsShieldActive(false);
      }
    };

    const handleBlur = () => {
      // In mobile PWA and browsers, blur indicates loss of focus / app switcher opening
      setIsShieldActive(true);
    };

    const handleFocus = () => {
      setIsShieldActive(false);
    };

    const handlePageHide = () => {
      setIsShieldActive(true);
    };

    const handlePageShow = () => {
      setIsShieldActive(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [enabled]);

  if (!enabled || !isShieldActive) {
    return null;
  }

  const handleDismiss = () => {
    setIsShieldActive(false);
  };

  const handleDisablePermanently = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShieldActive(false);
    if (onDisablePermanently) {
      onDisablePermanently();
    }
  };

  const handleOpenSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShieldActive(false);
    if (onOpenSettings) {
      onOpenSettings();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-5 sm:p-6 text-white transition-opacity duration-150 animate-fadeIn cursor-pointer"
      dir="rtl"
      onClick={handleDismiss}
      title="לחצי כדי לחזור לאפליקציה"
    >
      <div 
        className="flex flex-col items-center max-w-sm text-center space-y-4 bg-slate-900/90 dark:bg-slate-900/90 p-6 rounded-3xl border border-slate-700/80 shadow-2xl cursor-default"
        onClick={e => e.stopPropagation()}
      >
        {/* Shield Icon Badge */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center shadow-2xl shadow-emerald-500/10 shrink-0">
          <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 stroke-[1.8] animate-pulse" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-xl font-black tracking-tight text-white">Daily</h2>
          <p className="text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-3 py-1 rounded-full inline-block">
            🛡️ מסך פרטיות מוגן
          </p>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
          התוכן הוסתר אוטומטית למניעת הצצה בעת מעבר בין אפליקציות או חוסר מיקוד.
        </p>

        {/* Clear Instructions on where and how to disable */}
        <div className="w-full bg-slate-800/80 border border-slate-700/90 rounded-2xl p-3.5 text-center space-y-1.5 shadow-inner">
          <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-bold">
            <Settings className="w-3.5 h-3.5" />
            <span>איפה מבטלים אפשרות זו?</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            בסרגל העליון לחצי על <strong>גלגל השיניים ⚙️</strong> (הגדרות תצוגה) &gt; וכבי את המתג <strong>"הסתרת מסך פרטיות"</strong>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full pt-1 flex flex-col gap-2">
          {onDisablePermanently && (
            <button
              type="button"
              onClick={handleDisablePermanently}
              className="w-full py-2.5 px-4 bg-rose-600/90 hover:bg-rose-600 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>בטל הסתרת מסך זו לצמיתות</span>
            </button>
          )}

          <div className="flex gap-2 w-full">
            {onOpenSettings && (
              <button
                type="button"
                onClick={handleOpenSettingsClick}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold rounded-xl border border-slate-600 transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <Settings className="w-3 h-3" />
                <span>פתח הגדרות ⚙️</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <span>חזור לאפליקציה</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
