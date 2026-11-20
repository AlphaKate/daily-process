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
import {
  getStoredMicPermission,
  setStoredMicPermission,
  requestExplicitMicPermission
} from '../services/microphoneService';
import { getStoredToken } from '../services/googleAuth';

interface VoiceTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: {
    title: string;
    date: string;
    time?: string;
    category: 'must_do';
    addToCalendar?: boolean;
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
  const [addToCalendar, setAddToCalendar] = useState<boolean>(false);
  const [isMicPermitted, setIsMicPermitted] = useState<boolean>(() => getStoredMicPermission());
  const [dlpFindings, setDlpFindings] = useState<DLPFinding[]>([]);
  const [isDlpModalOpen, setIsDlpModalOpen] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);

  // Helper to instantiate clean speech recognition on demand
  const setupRecognition = () => {
    const win = window as IWindowSpeechRecognition;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setIsSupported(false);
      setErrorMsg('הדפדפן אינו תומך בהקלטה קולית (Web Speech API). באפשרותך להקליד ישירות את המשימה.');
      return null;
    }

    setIsSupported(true);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'he-IL';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
        setStoredMicPermission(true);
        setIsMicPermitted(true);
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
          if (parsed.addToCalendar) {
            setAddToCalendar(true);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        const storedApproved = getStoredMicPermission();
        if (event.error === 'not-allowed') {
          // If user previously approved, DO NOT revoke!
          // iOS triggers not-allowed when backgrounded or when auto-start lacks user touch gesture.
          if (!storedApproved) {
            setIsMicPermitted(false);
            setErrorMsg('גישה למיקרופון טרם אושרה. לחצי על "אשר ושמור גישה למיקרופון" למטה.');
          } else {
            setIsMicPermitted(true);
            setErrorMsg(null);
          }
        } else if (event.error === 'no-speech' || event.error === 'aborted') {
          // Normal, silent timeout
        } else {
          setErrorMsg(`שגיאת זיהוי קולי: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      return recognition;
    } catch (e) {
      console.error('Failed to init SpeechRecognition:', e);
      setIsSupported(false);
      return null;
    }
  };

  const startListening = () => {
    setErrorMsg(null);
    const recognition = setupRecognition();
    if (!recognition) return;
    try {
      recognition.start();
    } catch (e) {
      console.warn('Recognition start exception:', e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    }
    setIsListening(false);
  };

  // Synchronize microphone permission and handle background transitions
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopListening();
      } else if (document.visibilityState === 'visible') {
        // App returned from background - refresh permission flag from localStorage
        setIsMicPermitted(getStoredMicPermission());
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Initialize Speech Recognition when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setInterimTranscript('');
      setErrorMsg(null);
      setAddToCalendar(false);
      return;
    }

    // Refresh stored permission status
    setIsMicPermitted(getStoredMicPermission());

    const recognition = setupRecognition();
    if (recognition) {
      // Auto-start listening on modal open
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {
          console.warn('Could not auto-start recognition:', e);
        }
      }, 150);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, [isOpen, currentDate]);

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
    const parsed = parseVoiceTask(text, currentDate);
    if (parsed.addToCalendar && !addToCalendar) {
      setAddToCalendar(true);
    }
  };

  const handleRequestMicPermission = async () => {
    const granted = await requestExplicitMicPermission();
    if (granted) {
      setIsMicPermitted(true);
      setErrorMsg(null);
      startListening();
    } else {
      setErrorMsg('הגישה למיקרופון לא אושרה. נא לוודא שהמיקרופון מורשה בהגדרות הדפדפן.');
    }
  };

  const performAddVoiceTask = () => {
    stopListening();
    onAddTask({
      title: parsedTitle.trim(),
      date: parsedDate || currentDate || getTodayDateString(),
      time: parsedTime || undefined,
      category: 'must_do',
      addToCalendar
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
              isListening ? 'bg-orange-500 animate-pulse shadow-orange-500/30' : 'bg-slate-700 dark:bg-slate-800'
            }`}>
              <Mic className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>הוספת משימה קולית ל-Must Do</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
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

        {/* Form enclosing scrollable content and sticky footer */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Content Body */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {/* Voice Visualizer / Controls */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-center relative overflow-hidden">
            {/* Pulsing rings when listening */}
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-28 h-28 rounded-full bg-orange-500/10 animate-ping" />
                <div className="w-40 h-40 rounded-full bg-orange-500/5 animate-pulse" />
              </div>
            )}

            <button
              type="button"
              disabled={!isSupported}
              onClick={isListening ? stopListening : startListening}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-white transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/40 ring-4 ring-orange-300 dark:ring-orange-900/60 animate-pulse'
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
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {isListening ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                    <span>מקשיב עכשיו... (דברי חופשי)</span>
                  </>
                ) : (
                  <span>ההקלטה נעצרה. לחצי על המיקרופון כדי להקליט שוב</span>
                )}
              </span>
            </div>

            {/* Microphone Permission Status Badge / Prompt */}
            <div className="mt-2.5">
              {isMicPermitted ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                  <span>אישור מיקרופון נשמר באייפון זה ✓</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestMicPermission}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-100 hover:bg-orange-200 dark:bg-orange-950 dark:hover:bg-orange-900 text-orange-800 dark:text-orange-200 border border-orange-300 dark:border-orange-800 transition-colors cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>אשר ושמור גישה למיקרופון באייפון זה</span>
                </button>
              )}
            </div>

            {/* Hint examples */}
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 max-w-sm">
              דוגמה: <em>"פגישה עם דני מחר בשעה ארבע"</em> או <em>"רופא שיניים ביום שלישי בעשר בבוקר"</em>
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{errorMsg}</span>
              </div>
              {!isMicPermitted && (
                <button
                  type="button"
                  onClick={handleRequestMicPermission}
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg transition-colors shrink-0 cursor-pointer"
                >
                  אשר מיקרופון
                </button>
              )}
            </div>
          )}

          {/* Live Heard Transcript */}
          {(transcript || interimTranscript) && (
            <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 text-xs">
              <div className="text-[11px] font-bold text-orange-700 dark:text-orange-300 mb-1 flex items-center gap-1">
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                required
              />
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-orange-500" />
                  <span>תאריך יעד:</span>
                  {dateBadge && (
                    <span className="text-[10px] bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 px-1.5 py-0.2 rounded font-bold mr-1">
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
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
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                    <span>שעה (אופציונלי):</span>
                  </div>
                  {parsedTime && (
                    <button
                      type="button"
                      onClick={() => setParsedTime('')}
                      className="text-[10px] text-slate-400 hover:text-orange-500 underline"
                    >
                      נקה שעה
                    </button>
                  )}
                </label>
                <input
                  type="time"
                  value={parsedTime}
                  onChange={e => setParsedTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {parsedTime ? `תיקבע תזכורת אוטומטית לשעה ${parsedTime}` : 'לא הוגדרה שעה ספציפית'}
                </p>
              </div>
            </div>

            {/* Google Calendar Sync Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setAddToCalendar(!addToCalendar)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  addToCalendar
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                      addToCalendar
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                    }`}
                  >
                    {addToCalendar && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <Calendar className={`w-4 h-4 ${addToCalendar ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  <span>סנכרן והוסף ליומן Google Calendar</span>
                </div>
                {addToCalendar && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300 font-bold">
                    פעיל 📅
                  </span>
                )}
              </button>

              {addToCalendar && !getStoredToken()?.access_token && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    חשבון Google אינו מחובר. המשימה תישמר ב-Must Do, אך לא תסונכרן ליומן עד להתחברות לחשבון Google.
                  </span>
                </div>
              )}

              {addToCalendar && Boolean(getStoredToken()?.access_token) && (
                <div className="mt-2 p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-200 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>מחובר ל-Google: המשימה תיווצר ישירות ביומן Google Calendar שלך</span>
                </div>
              )}
            </div>
          </div>

          </div>

          {/* Sticky Footer Action Buttons - Always visible and thumb-accessible */}
          <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
            <button
              type="button"
              onClick={handleResetRecording}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
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
                className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                ביטול
              </button>

              <button
                type="submit"
                disabled={!parsedTitle.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-600/20 disabled:opacity-50 transition-all cursor-pointer"
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
