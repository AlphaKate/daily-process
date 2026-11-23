import React, { useState } from 'react';
import {
  X,
  Sun,
  Moon,
  Laptop,
  Check,
  Type,
  Eye,
  Sparkles,
  Contrast,
  LayoutList,
  FolderOpen
} from 'lucide-react';
import { AppSettings, FontSizeSetting, ThemeSetting, FontFamilySetting } from '../types';
import { getStoredDriveFolderId, saveStoredDriveFolderId } from '../services/googleAuth';

interface DisplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

const FONT_SIZE_LEVELS: { id: FontSizeSetting; label: string; scaleRem: string; description: string }[] = [
  { id: 'normal', label: 'רגיל', scaleRem: '16px', description: 'גודל סטנדרטי (100%)' },
  { id: 'medium', label: 'נוח', scaleRem: '18px', description: 'מוגדל וקריא באייפון ובמובייל (112%)' },
  { id: 'large', label: 'גדול', scaleRem: '20px', description: 'גופן גדול ומודגש (125%)' },
  { id: 'xlarge', label: 'ענק', scaleRem: '22px', description: 'נגישות מוגברת (138%)' }
];

export const DisplaySettingsModal: React.FC<DisplaySettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeSetting>(settings.theme || 'system');
  const [currentFontSize, setCurrentFontSize] = useState<FontSizeSetting>(settings.fontSize || 'medium');
  const [currentFontFamily, setCurrentFontFamily] = useState<FontFamilySetting>(settings.fontFamily || 'assistant');
  const [highContrast, setHighContrast] = useState<boolean>(Boolean(settings.highContrast));
  const [cardDensity, setCardDensity] = useState<'comfortable' | 'compact'>(settings.cardDensity || 'comfortable');
  const [confettiEnabled, setConfettiEnabled] = useState<boolean>(settings.confettiEnabled !== false);
  const [driveFolderInput, setDriveFolderInput] = useState<string>(() => getStoredDriveFolderId());

  if (!isOpen) return null;

  // Convert font size to numeric slider index (0..3)
  const fontIndex = FONT_SIZE_LEVELS.findIndex(l => l.id === currentFontSize);
  const activeLevel = FONT_SIZE_LEVELS[fontIndex >= 0 ? fontIndex : 1];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (idx >= 0 && idx < FONT_SIZE_LEVELS.length) {
      setCurrentFontSize(FONT_SIZE_LEVELS[idx].id);
    }
  };

  const handleSave = () => {
    saveStoredDriveFolderId(driveFolderInput);
    const updated: AppSettings = {
      ...settings,
      theme: currentTheme,
      fontSize: currentFontSize,
      fontFamily: currentFontFamily,
      highContrast,
      cardDensity,
      confettiEnabled
    };
    onSaveSettings(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-md shadow-amber-500/10 shrink-0">
              <Type className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                הגדרות תצוגה וגופן
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                התאמת גודל טקסט, מצב יום/לילה, ניגודיות ומראה
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1">
          {/* 1. THEME SELECTOR (יום / לילה / אוטומטי) */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              מצב תצוגה (ערכת נושא):
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCurrentTheme('light')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  currentTheme === 'light'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 ring-2 ring-amber-400/40 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-bold">יום (בהיר)</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTheme('dark')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  currentTheme === 'dark'
                    ? 'bg-slate-800 border-emerald-500 text-white ring-2 ring-emerald-500/40 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Moon className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-bold">לילה (כהה)</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTheme('system')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  currentTheme === 'system'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 ring-2 ring-blue-400/40 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Laptop className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-bold">אוטומטי</span>
              </button>
            </div>
          </div>

          {/* 2. FONT SIZE SLIDER & STEPPER */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-amber-500" />
                <span>גודל גופן באפליקציה:</span>
              </label>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                {activeLevel.label} ({activeLevel.description})
              </span>
            </div>

            {/* Slider track with A- / A+ */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs font-bold text-slate-400 select-none">א</span>
              <input
                type="range"
                min="0"
                max="3"
                step="1"
                value={fontIndex >= 0 ? fontIndex : 1}
                onChange={handleSliderChange}
                className="flex-1 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-lg font-bold text-slate-700 dark:text-slate-200 select-none">א</span>
            </div>

            {/* Level selection pills */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {FONT_SIZE_LEVELS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setCurrentFontSize(level.id)}
                  className={`py-1.5 px-1 text-[11px] sm:text-xs font-bold rounded-xl border transition-all text-center ${
                    currentFontSize === level.id
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>

            {/* Live Preview Box */}
            <div className="mt-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 block">
                תצוגה מקדימה חיה:
              </span>
              <div style={{ fontSize: activeLevel.scaleRem }}>
                <p className="font-bold text-slate-900 dark:text-white leading-tight">
                  פגישת תכנון ויעדים אצל צימרמן 🎯
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  השעה 10:30 • משימת חובה (Must Do) • תזכורת פעילה
                </p>
              </div>
            </div>
          </div>

          {/* 3. ADDITIONAL RELEVANT DISPLAY SETTINGS */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              הגדרות תצוגה נוספות:
            </h3>

            {/* High Contrast Mode Toggle */}
            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5">
                <Contrast className="w-4 h-4 text-indigo-500" />
                <div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                    ניגודיות גבוהה (High Contrast)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    הדגשת מסגרות וטקסטים לקריאות מקסימלית בשמש
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={e => setHighContrast(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </label>

            {/* Card Density / Spacing */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <LayoutList className="w-4 h-4 text-emerald-500" />
                <div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                    צפיפות ומרווחי כרטיסים:
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    מרווח נוח לאגודל לעומת תצוגה קומפקטית
                  </span>
                </div>
              </div>
              <div className="flex bg-slate-200 dark:bg-slate-700 p-0.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCardDensity('comfortable')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    cardDensity === 'comfortable'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  מרווח
                </button>
                <button
                  type="button"
                  onClick={() => setCardDensity('compact')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    cardDensity === 'compact'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  קומפקטי
                </button>
              </div>
            </div>

            {/* Hebrew Font Family Selector */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-purple-500" />
                <div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                    גופן עברי (Font Family):
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    בחרי את סגנון הכתב המועדף עלייך
                  </span>
                </div>
              </div>
              <select
                value={currentFontFamily}
                onChange={e => setCurrentFontFamily(e.target.value as FontFamilySetting)}
                className="text-xs font-bold px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
              >
                <option value="assistant">Assistant (מודרני ונקי)</option>
                <option value="heebo">Heebo (בולט ומרובע)</option>
                <option value="system">גופן מערכת ברירת מחדל</option>
              </select>
            </div>

            {/* Confetti Celebration Toggle */}
            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                    אפקטי חגיגה וקונפטי
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    הצגת קונפטי משמח בעת סימון יעד כבוצע
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={confettiEnabled}
                onChange={e => setConfettiEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </label>

            {/* Google Drive Folder Settings Section */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <FolderOpen className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                      תיקיית יעדים ב-Google Drive
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      סנכרון ענן למסמכי יעדים, למידה ורשימת סופר
                    </span>
                  </div>
                </div>
                {driveFolderInput ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                    מוגדר ✓
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                    לא הוגדר
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <input
                  type="text"
                  value={driveFolderInput}
                  onChange={e => setDriveFolderInput(e.target.value)}
                  placeholder="הדביקי קישור לתיקיית Drive (https://drive.google.com/...)"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono ltr text-left focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  dir="ltr"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>🔒 נשמר מקומית במכשיר בלבד</span>
                  {driveFolderInput && (
                    <button
                      type="button"
                      onClick={() => setDriveFolderInput('')}
                      className="text-rose-500 hover:underline font-semibold cursor-pointer"
                    >
                      נקה תיקייה
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-850/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>שמור הגדרות</span>
          </button>
        </div>
      </div>
    </div>
  );
};
