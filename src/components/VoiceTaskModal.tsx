import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Sparkles,
  Calendar,
  Clock,
  Check,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { parseVoiceTask, formatDate } from '../services/voiceTaskParser';
import { getTodayDateString } from '../services/storage';
import { scanTextForSensitiveData, DLPFinding } from '../services/dlpService';
import { DLPWarningModal } from './DLPWarningModal';

interface VoiceTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: {
    title: string;
    date: string;
    time?: string;
    category: 'must_do';
  }) => void;
  currentDate: string;
}

// Browser Web Speech API type definition
interface IWindowSpeechRecognition extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export const VoiceTaskModal: React.FC<VoiceTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  currentDate
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Parsed fields
  const [parsedTitle, setParsedTitle] = useState('');
  const [parsedDate, setParsedDate] = useState(currentDate || getTodayDateString());
  const [parsedTime, setParsedTime] = useState<string>('');
  const [dateBadge, setDateBadge] = useState<string | undefined>();
  const [dlpFindings, setDlpFindings] = useState<DLPFinding[]>([]);
  const [isDlpModalOpen, setIsDlpModalOpen] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setInterimTranscript('');
      setErrorMsg(null);
      return;
    }

    const win = window as IWindowSpeechRecognition;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setIsSupported(false);
      setErrorMsg('הדפדפן שלך אינו תומך בהקלטה קולית (Web Speech API). באפשרותך להקליד ישירות את המשימה.');
      return;
    }

    setIsSupported(true);
    setErrorMsg(null);

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'he-IL';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript + ' ';
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }

        const fullText = (finalStr + ' ' + interimStr).trim();
        setTranscript(finalStr);
        setInterimTranscript(interimStr);

        if (fullText) {
          const parsed = parseVoiceTask(fullText, currentDate);
          setParsedTitle(parsed.title);
          setParsedDate(parsed.date);
          setParsedTime(parsed.time || '');
          setDateBadge(parsed.dateLabel);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMsg('גישה למיקרופון נחסמה. נא לאשר גישה למיקרופון בהגדרות הדפדפן.');
        } else if (event.error === 'no-speech') {
          // No speech detected, wait or let user retry
        } else {
          setErrorMsg(`שגיאת זיהוי קולי: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;

      // Automatically start listening upon opening modal
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {
          console.warn('Could not auto-start recognition:', e);
        }
      }, 200);
    } catch (e) {
      console.error('Failed to init SpeechRecognition:', e);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, [isOpen, currentDate]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setErrorMsg(null);
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.warn('Failed to start speech recognition:', e);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        // Immediate hardware release via abort
        recognitionRef.current.abort();
      } catch (_) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    }
    setIsListening(false);
  };

  const handleResetRecording = () => {
    stopListening();
    setTranscript('');
    setInterimTranscript('');
    setParsedTitle('');
    setParsedDate(currentDate || getTodayDateString());
    setParsedTime('');
    setDateBadge(undefined);
    setErrorMsg(null);
    setTimeout(() => {
      startListening();
    }, 250);
  };

  const handleTextChange = (text: string) => {
    setParsedTitle(text);
  };

  const performAddVoiceTask = () => {
    stopListening();
    onAddTask({
      title: parsedTitle.trim(),
      date: parsedDate || currentDate || getTodayDateString(),
      time: parsedTime || undefined,
      category: 'must_do'
    });
    onClose();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedTitle.trim()) {
      setErrorMsg('נא לציין או להקליט את שם המשימה');
      return;
    }

    // Scan for sensitive data (ID, Credit Card, Bank)
    const scanResult = scanTextForSensitiveData(parsedTitle);
    if (scanResult.hasSensitiveData) {
      stopListening();
      setDlpFindings(scanResult.findings);
      setIsDlpModalOpen(true);
      return;
    }

    performAddVoiceTask();
  };

  // Quick date helper buttons
  const setDateRelative = (daysOffset: number, label: string) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    setParsedDate(formatDate(d));
    setDateBadge(label);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-rose-500/10 via-purple-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
              isListening ? 'bg-rose-500 animate-pulse shadow-rose-500/30' : 'bg-slate-700 dark:bg-slate-800'
            }`}>
              <Mic className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>הוספת משימה קולית ל-Must Do</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  Must Do
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                אמרי את שם המשימה, התאריך והשעה — המערכת תפרק אותם אוטומטית
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopListening();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Voice Visualizer / Controls */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-center relative overflow-hidden">
            {/* Pulsing rings when listening */}
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-28 h-28 rounded-full bg-rose-500/10 animate-ping" />
                <div className="w-40 h-40 rounded-full bg-rose-500/5 animate-pulse" />
              </div>
            )}

            <button
              type="button"
              disabled={!isSupported}
              onClick={isListening ? stopListening : startListening}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-white transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/40 ring-4 ring-rose-300 dark:ring-rose-900/60 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              }`}
              title={!isSupported ? 'זיהוי קולי אינו נתמך בדפדפן זה' : isListening ? 'לחצי לעצירת ההקלטה' : 'לחצי להתחלת הקלטה'}
            >
              {isListening ? (
                <Mic className="w-9 h-9 stroke-[2.5]" />
              ) : (
                <MicOff className="w-8 h-8 stroke-[2]" />
              )}
            </button>

            <div className="mt-3 relative z-10">
              <span className={`text-xs font-bold inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${
                isListening
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {isListening ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>מקשיב עכשיו... (דברי חופשי)</span>
                  </>
                ) : (
                  <span>ההקלטה נעצרה. לחצי על המיקרופון כדי להקליט שוב</span>
                )}
              </span>
            </div>

            {/* Hint examples */}
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 max-w-sm">
              דוגמה: <em>"פגישה עם דני מחר בשעה ארבע"</em> או <em>"רופא שיניים ביום שלישי בעשר בבוקר"</em>
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Live Heard Transcript */}
          {(transcript || interimTranscript) && (
            <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-xs">
              <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>מה שנשמע:</span>
              </div>
              <p className="text-slate-800 dark:text-slate-200 italic font-medium">
                "{transcript} {interimTranscript}"
              </p>
            </div>
          )}

          {/* Parsed Output Fields (User can inspect & tweak) */}
          <div className="space-y-3 pt-1">
            {/* Task Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                שם המשימה (Must Do):
              </label>
              <input
                type="text"
                value={parsedTitle}
                onChange={e => handleTextChange(e.target.value)}
                placeholder="למשל: פגישה עם דני, לקנות תרופות..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
                required
              />
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                  <span>תאריך יעד:</span>
                  {dateBadge && (
                    <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-1.5 py-0.2 rounded font-bold mr-1">
                      {dateBadge}
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={parsedDate}
                  onChange={e => {
                    setParsedDate(e.target.value);
                    setDateBadge(undefined);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
                  required
                />
                {/* Quick Date Pills */}
                <div className="flex gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setDateRelative(0, 'היום')}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    היום
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateRelative(1, 'מחר')}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    מחר
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateRelative(2, 'מחרתיים')}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    מחרתיים
                  </button>
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    <span>שעה (אופציונלי):</span>
                  </div>
                  {parsedTime && (
                    <button
                      type="button"
                      onClick={() => setParsedTime('')}
                      className="text-[10px] text-slate-400 hover:text-rose-500 underline"
                    >
                      נקה שעה
                    </button>
                  )}
                </label>
                <input
                  type="time"
                  value={parsedTime}
                  onChange={e => setParsedTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {parsedTime ? `תיקבע תזכורת אוטומטית לשעה ${parsedTime}` : 'לא הוגדרה שעה ספציפית'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleResetRecording}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>הקלט שוב</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  onClose();
                }}
                className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                ביטול
              </button>

              <button
                type="submit"
                disabled={!parsedTitle.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>הוסף לרשימת Must Do</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* DLP Warning Modal */}
      <DLPWarningModal
        isOpen={isDlpModalOpen}
        findings={dlpFindings}
        onClose={() => setIsDlpModalOpen(false)}
        onConfirmSaveAnyway={() => {
          setIsDlpModalOpen(false);
          performAddVoiceTask();
        }}
      />
    </div>
  );
};
