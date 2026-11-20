import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

interface AppPrivacyShieldProps {
  enabled?: boolean;
}

export const AppPrivacyShield: React.FC<AppPrivacyShieldProps> = ({ enabled = true }) => {
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
      // In mobile PWA and modern browsers, blur indicates loss of focus / app switcher opening
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

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white select-none transition-opacity duration-150 animate-fadeIn"
      dir="rtl"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center max-w-sm text-center space-y-4">
        {/* Shield Icon Badge */}
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center shadow-2xl shadow-emerald-500/10">
          <Shield className="w-10 h-10 text-emerald-400 stroke-[1.8] animate-pulse" />
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-white">Daily Process</h2>
          <p className="text-xs font-medium text-emerald-300/90 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full inline-block">
            🛡️ מסך פרטיות מוגן
          </p>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
          התוכן הוסתר אוטומטית למניעת הצצה בעת מעבר בין אפליקציות או חוסר מיקוד.
        </p>
      </div>
    </div>
  );
};
