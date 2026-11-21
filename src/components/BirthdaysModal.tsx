import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Copy,
  MessageCircle,
  Plus,
  Check,
  Calendar,
  Sparkles,
  RefreshCw,
  Trash2,
  LogIn,
  RotateCcw,
  CalendarDays
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Task } from '../types';
import {
  GoogleContactBirthday,
  getCachedContactsBirthdays,
  addCustomBirthday,
  deleteCustomBirthday,
  generateBirthdayGreetingVariants,
  formatWhatsAppBirthdayLink,
  getDefaultBirthdayGreeting,
  isBirthdayTaskCheck,
  extractBirthdayPersonName
} from '../services/googleContacts';
import { GoogleUser } from '../services/googleAuth';

interface BirthdaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: string;
  tasks: Task[];
  googleUser: GoogleUser | null;
  isGoogleConnected: boolean;
  onSyncGoogle: () => void;
  onConnectGoogle: () => void;
  onScheduleBirthdayTask: (task: Task) => void;
  onDateChange?: (date: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export interface UnifiedBirthdayItem {
  id: string;
  key: string;
  displayName: string;
  dateStr: string; // YYYY-MM-DD
  daysUntil: number; // e.g. 0 for today, 14 for in two weeks, -1 for yesterday
  displayDateText: string;
  birthYear?: number;
  age?: number;
  phone?: string;
  source: 'calendar' | 'contacts' | 'manual';
  sourceLabel: string;
  greeting: string;
  greetingVariants: string[];
  task?: Task;
  contact?: GoogleContactBirthday;
  isToday: boolean;
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export const BirthdaysModal: React.FC<BirthdaysModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  tasks,
  googleUser: _googleUser,
  isGoogleConnected,
  onSyncGoogle,
  onConnectGoogle,
  onScheduleBirthdayTask,
  onDateChange,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'generator'>('list');
  const [filterMode, setFilterMode] = useState<'upcoming' | 'all' | 'today'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [greetingIndices, setGreetingIndices] = useState<Record<string, number>>({});

  // Add Manual Birthday Form
  const [addName, setAddName] = useState('');
  const [addDay, setAddDay] = useState<number>(new Date().getDate());
  const [addMonth, setAddMonth] = useState<number>(new Date().getMonth() + 1);
  const [addYear, setAddYear] = useState<string>('');
  const [addPhone, setAddPhone] = useState('');

  // Generator Sandbox
  const [genName, setGenName] = useState('דני');
  const [genAge, setGenAge] = useState<string>('30');
  const [genPhone, setGenPhone] = useState('');

  // Refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const cachedContacts = useMemo(() => {
    // Read from cache whenever modal opens or trigger changes
    return getCachedContactsBirthdays();
  }, [isOpen, refreshTrigger]);

  const unifiedBirthdays = useMemo(() => {
    const items: UnifiedBirthdayItem[] = [];
    const seenKeys = new Set<string>();

    const [curY, curM, curD] = currentDate.split('-').map(Number);
    const curDateObj = new Date(curY, curM - 1, curD, 0, 0, 0);

    // 1. From active tasks in the app (Google Calendar & synced contacts)
    const birthdayTasks = (tasks || []).filter(t => !t.isDeleted && isBirthdayTaskCheck(t));
    for (const t of birthdayTasks) {
      const personName = extractBirthdayPersonName(t.title, t.contactName);
      const targetDate = t.date || currentDate;
      const key = `${personName.trim().toLowerCase()}_${targetDate}`;
      seenKeys.add(key);

      const [ty, tm, td] = targetDate.split('-').map(Number);
      const tDateObj = new Date(ty, tm - 1, td, 0, 0, 0);
      const diffDays = Math.round((tDateObj.getTime() - curDateObj.getTime()) / (1000 * 60 * 60 * 24));

      const variants = generateBirthdayGreetingVariants(personName, t.birthdayAge);
      const activeIdx = greetingIndices[t.id] ?? 0;
      const greeting = variants[activeIdx % variants.length] || t.birthdayGreeting || getDefaultBirthdayGreeting(personName, t.birthdayAge);

      const isCalendar = t.id.startsWith('gcal-');
      const isContact = t.id.startsWith('gcontact-');

      items.push({
        id: t.id,
        key: t.id,
        displayName: personName,
        dateStr: targetDate,
        daysUntil: diffDays,
        displayDateText: `${td} ב${HEBREW_MONTHS[tm - 1]}`,
        birthYear: t.birthdayAge && !isNaN(t.birthdayAge) ? ty - t.birthdayAge : undefined,
        age: t.birthdayAge,
        phone: t.contactPhone,
        source: isCalendar ? 'calendar' : isContact ? 'contacts' : 'manual',
        sourceLabel: isCalendar ? 'מיומן Google 📅' : isContact ? 'מ-Google Contacts 👥' : 'משימה ✍️',
        greeting,
        greetingVariants: variants,
        task: t,
        isToday: diffDays === 0
      });
    }

    // 2. From cached Google Contacts / custom birthdays (not already represented by a task)
    for (const c of cachedContacts) {
      const currentYear = curDateObj.getFullYear();
      let occDate = new Date(currentYear, c.birthMonth - 1, c.birthDay, 0, 0, 0);
      // If it already passed more than 7 days ago, show next year's occurrence
      if (occDate.getTime() < curDateObj.getTime() - 7 * 86400000) {
        occDate = new Date(currentYear + 1, c.birthMonth - 1, c.birthDay, 0, 0, 0);
      }
      const occYear = occDate.getFullYear();
      const dateStr = `${occYear}-${String(c.birthMonth).padStart(2, '0')}-${String(c.birthDay).padStart(2, '0')}`;
      const key = `${c.displayName.trim().toLowerCase()}_${dateStr}`;

      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const diffDays = Math.round((occDate.getTime() - curDateObj.getTime()) / (1000 * 60 * 60 * 24));
      const age = c.birthYear ? occYear - c.birthYear : undefined;
      const variants = generateBirthdayGreetingVariants(c.displayName, age);
      const activeIdx = greetingIndices[c.contactId] ?? 0;
      const greeting = variants[activeIdx % variants.length] || getDefaultBirthdayGreeting(c.displayName, age);
      const isCustom = c.resourceName.startsWith('custom/');

      items.push({
        id: c.contactId,
        key: `contact-${c.contactId}`,
        displayName: c.displayName,
        dateStr,
        daysUntil: diffDays,
        displayDateText: `${c.birthDay} ב${HEBREW_MONTHS[c.birthMonth - 1]}`,
        birthYear: c.birthYear,
        age,
        phone: c.phone,
        source: isCustom ? 'manual' : 'contacts',
        sourceLabel: isCustom ? 'הוספה ידנית ✍️' : 'מ-Google Contacts 👥',
        greeting,
        greetingVariants: variants,
        contact: c,
        isToday: diffDays === 0
      });
    }

    // Sort: upcoming first (daysUntil >= 0 sorted asc), then past (daysUntil < 0 sorted desc)
    return items.sort((a, b) => {
      if (a.daysUntil >= 0 && b.daysUntil >= 0) return a.daysUntil - b.daysUntil;
      if (a.daysUntil >= 0) return -1;
      if (b.daysUntil >= 0) return 1;
      return b.daysUntil - a.daysUntil;
    });
  }, [tasks, cachedContacts, currentDate, greetingIndices]);

  const filteredUnifiedBirthdays = useMemo(() => {
    return unifiedBirthdays.filter(item => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = item.displayName.toLowerCase().includes(q) || (item.phone && item.phone.includes(q));
        if (!matches) return false;
      }
      // Tab filter
      if (filterMode === 'today') {
        return item.isToday;
      }
      if (filterMode === 'upcoming') {
        return item.daysUntil >= 0 && item.daysUntil <= 45;
      }
      return true;
    });
  }, [unifiedBirthdays, searchQuery, filterMode]);

  const handleCycleItemGreeting = (item: UnifiedBirthdayItem) => {
    const variants = item.greetingVariants;
    if (variants.length <= 1) return;
    const currentIdx = greetingIndices[item.id] ?? 0;
    const nextIdx = (currentIdx + 1) % variants.length;
    setGreetingIndices(prev => ({ ...prev, [item.id]: nextIdx }));

    if (item.task) {
      const nextGreeting = variants[nextIdx];
      onScheduleBirthdayTask({ ...item.task, birthdayGreeting: nextGreeting });
    }
  };

  const getCountdownLabel = (daysUntil: number, dateText: string) => {
    if (daysUntil === 0) return 'היום! 🎉';
    if (daysUntil === 1) return 'מחר 🎈';
    if (daysUntil === 2) return `בעוד יומיים (${dateText})`;
    if (daysUntil === 7) return `בעוד שבוע (${dateText})`;
    if (daysUntil === 14) return `בעוד שבועיים (${dateText}) 📅`;
    if (daysUntil > 0) return `בעוד ${daysUntil} ימים (${dateText})`;
    return `לפני ${Math.abs(daysUntil)} ימים (${dateText})`;
  };

  if (!isOpen) return null;

  // Handle Copy to Clipboard
  const handleCopy = async (text: string, id: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedId(id);
      showToast('הברכה הועתקה בהצלחה ללוח! ✓', 'success');
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      showToast('שגיאה בהעתקה', 'error');
    }
  };

  // Quick Action: Add Demo Birthday for Today
  const handleAddSampleBirthday = () => {
    const now = new Date().toISOString();
    const demoTask: Task = {
      id: `gcontact-bday-demo-${Date.now()}`,
      title: '🎂 יום הולדת לדני כהן (חוגג 30)',
      description: 'יום הולדת מתוך Google Contacts 🎉\nטלפון: 050-1234567\n💌 הצעת ברכה לשליחה מוכנה!',
      category: 'must_do',
      completed: false,
      date: currentDate,
      durationMinutes: 10,
      contactName: 'דני כהן',
      contactPhone: '050-1234567',
      birthdayAge: 30,
      birthdayGreeting: 'מזל טוב דני היקר! 🎉🎂 המון בריאות, שמחה, אושר והגשמת כל המשאלות. שתהיה שנה מופלאה ומלאת רגעים יפים ומיוחדים! ✨',
      createdAt: now,
      updatedAt: now
    };

    onScheduleBirthdayTask(demoTask);
    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch {}
    showToast('משימת יום הולדת לדוגמה נוספה להיום! 🎉 תוכלי לראותה בסדר היום', 'success');
  };

  // Submit Manual Birthday
  const handleSaveManualBirthday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      showToast('נא להזין שם איש קשר', 'error');
      return;
    }

    const yearNum = addYear.trim() ? parseInt(addYear.trim(), 10) : undefined;
    const created = addCustomBirthday(addName.trim(), addMonth, addDay, yearNum, addPhone.trim());
    setRefreshTrigger(prev => prev + 1);

    // Also schedule into Must Do for the current or upcoming date
    const currentYear = new Date().getFullYear();
    const targetDateStr = `${currentYear}-${String(addMonth).padStart(2, '0')}-${String(addDay).padStart(2, '0')}`;
    const now = new Date().toISOString();
    const age = yearNum ? currentYear - yearNum : undefined;
    const greeting = getDefaultBirthdayGreeting(created.displayName, age);

    const task: Task = {
      id: `gcontact-bday-${created.contactId}-${currentYear}`,
      title: `🎂 יום הולדת ל${created.displayName}${age ? ` (${age})` : ''}`,
      description: `יום הולדת 🎉\n${addPhone.trim() ? `טלפון: ${addPhone.trim()}\n` : ''}💌 הצעת ברכה:\n"${greeting}"`,
      category: 'must_do',
      completed: false,
      date: targetDateStr,
      durationMinutes: 10,
      contactName: created.displayName,
      contactPhone: created.phone,
      birthdayGreeting: greeting,
      birthdayAge: age,
      createdAt: now,
      updatedAt: now
    };

    onScheduleBirthdayTask(task);
    showToast(`יום ההולדת של ${created.displayName} נוסף ונשמר בהצלחה! 🎂`, 'success');
    setAddName('');
    setAddPhone('');
    setAddYear('');
    setActiveTab('list');
  };

  // Schedule any unified birthday item directly to today's Must Do
  const handleScheduleItemToToday = (item: UnifiedBirthdayItem) => {
    const now = new Date().toISOString();
    const task: Task = {
      id: item.task ? `today-${item.task.id}-${Date.now()}` : `gcontact-bday-${item.id}-${new Date().getFullYear()}`,
      title: item.task?.title.startsWith('🎂') ? item.task.title : `🎂 יום הולדת ל${item.displayName}${item.age ? ` (${item.age})` : ''}`,
      description: item.task?.description || `יום הולדת 🎉\n${item.phone ? `טלפון: ${item.phone}\n` : ''}💌 הצעת ברכה:\n"${item.greeting}"`,
      category: 'must_do',
      completed: false,
      date: currentDate,
      durationMinutes: 10,
      contactName: item.displayName,
      contactPhone: item.phone,
      birthdayGreeting: item.greeting,
      birthdayAge: item.age,
      createdAt: now,
      updatedAt: now
    };

    onScheduleBirthdayTask(task);
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch {}
    showToast(`יום ההולדת של ${item.displayName} שובץ להיום בסדר היום! 🎂`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-xs">
              🎂
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                ניהול ימי הולדת וברכות
              </h2>
              <p className="text-xs text-white/80 font-medium">
                סנכרון מ-Google Contacts, ברכות אישיות בלחיצה ומשלוח בוואטסאפ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Fast-Track Bar */}
        <div className="px-4 py-2.5 bg-pink-50 dark:bg-pink-950/40 border-b border-pink-200 dark:border-pink-800/60 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-bold text-pink-900 dark:text-pink-200">
            <Sparkles className="w-4 h-4 text-pink-600" />
            <span>רוצה לראות את אייקון העוגה והברכה בסדר היום עכשיו?</span>
          </div>
          <button
            type="button"
            onClick={handleAddSampleBirthday}
            className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <span>🎉 צור משימת יום הולדת לדוגמה להיום</span>
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isGoogleConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {isGoogleConnected
                ? `מחובר ל-Google (${cachedContacts.length} אנשי קשר במאגר)`
                : 'תוקף חיבור Google פג — לחצי לחידוש הרשאת אנשי קשר'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {isGoogleConnected ? (
              <button
                type="button"
                onClick={onSyncGoogle}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-semibold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-emerald-600" />
                <span>סנכרן מחדש</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnectGoogle}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <LogIn className="w-3 h-3" />
                <span>חדש חיבור ל-Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 p-1.5 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-white dark:bg-slate-700 text-pink-700 dark:text-pink-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>ימי הולדת שמורים ({cachedContacts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'add'
                ? 'bg-white dark:bg-slate-700 text-pink-700 dark:text-pink-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>הוספת יום הולדת חדש</span>
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'generator'
                ? 'bg-white dark:bg-slate-700 text-pink-700 dark:text-pink-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>מחולל ברכות אישי</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: LIST OF BIRTHDAYS */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {/* Filter Pills & Search */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterMode('upcoming')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    filterMode === 'upcoming'
                      ? 'bg-pink-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>קרובים (חודש קדימה)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('today')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    filterMode === 'today'
                      ? 'bg-pink-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>היום 🎂</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
                    filterMode === 'all'
                      ? 'bg-pink-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>הכל ({unifiedBirthdays.length})</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="חיפוש איש קשר לפי שם או טלפון..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                />
              </div>

              {filteredUnifiedBirthdays.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 flex items-center justify-center text-2xl mx-auto">
                    🎂
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {searchQuery ? 'לא נמצאו ימי הולדת התואמים לחיפוש' : 'אין ימי הולדת להצגה בקטגוריה זו'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      ניתן לסנכרן אוטומטית מ-Google Calendar & Contacts, או להוסיף יום הולדת ידנית בלשונית "הוספת יום הולדת חדש".
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddSampleBirthday}
                      className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                    >
                      הוסף יום הולדת לדוגמה להיום 🚀
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('add')}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
                    >
                      הוסף ידנית ➕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUnifiedBirthdays.map(item => {
                    const waLink = formatWhatsAppBirthdayLink(item.phone, item.greeting);
                    const isCustom = item.source === 'manual';

                    return (
                      <div
                        key={item.key}
                        className={`p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border shadow-2xs hover:shadow-xs transition-all space-y-2.5 ${
                          item.isToday
                            ? 'border-pink-500 ring-2 ring-pink-500/20 bg-pink-50/15'
                            : item.daysUntil <= 14 && item.daysUntil > 0
                            ? 'border-purple-300 dark:border-purple-800/80 bg-purple-50/10'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 flex items-center justify-center text-xl font-bold shrink-0 shadow-2xs">
                              🎂
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                  {item.displayName}
                                </h4>
                                {item.age ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                    גיל {item.age}
                                  </span>
                                ) : null}
                                <span className={`text-[10px] font-extrabold px-2 py-0.2 rounded-full shadow-2xs ${
                                  item.isToday
                                    ? 'bg-emerald-600 text-white animate-pulse'
                                    : item.daysUntil <= 14 && item.daysUntil > 0
                                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}>
                                  {getCountdownLabel(item.daysUntil, item.displayDateText)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span>📅 {item.displayDateText}</span>
                                {item.birthYear ? <span>({item.birthYear})</span> : null}
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">• {item.sourceLabel}</span>
                                {item.phone ? <span>• 📞 {item.phone}</span> : null}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {onDateChange && !item.isToday && (
                              <button
                                type="button"
                                onClick={() => {
                                  onDateChange(item.dateStr);
                                  onClose();
                                }}
                                className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                                title="עבור לתאריך זה בסדר היום"
                              >
                                <CalendarDays className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">עבור ליום זה</span>
                              </button>
                            )}

                            {!item.isToday && (
                              <button
                                type="button"
                                onClick={() => handleScheduleItemToToday(item)}
                                className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                title="שבץ משימת יום הולדת זו להיום"
                              >
                                <span>שבץ להיום 🚀</span>
                              </button>
                            )}

                            {isCustom && (
                              <button
                                type="button"
                                onClick={() => {
                                  deleteCustomBirthday(item.id);
                                  setRefreshTrigger(prev => prev + 1);
                                  showToast('יום ההולדת נמחק', 'success');
                                }}
                                className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="מחק איש קשר זה"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Proposed Greeting Card with In-Place Cycle */}
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-50/80 to-purple-50/40 dark:from-pink-950/30 dark:to-purple-950/20 border border-pink-100 dark:border-pink-900/40 text-xs text-slate-800 dark:text-slate-200 leading-relaxed space-y-2.5">
                          <p className="font-medium italic leading-relaxed text-slate-900 dark:text-slate-100">
                            "{item.greeting}"
                          </p>
                          
                          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-pink-100 dark:border-pink-900/30 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              {item.greetingVariants.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleCycleItemGreeting(item)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1 transition-all cursor-pointer"
                                  title="החלף לנוסח ברכה אחר"
                                >
                                  <RotateCcw className="w-3 h-3 text-purple-600" />
                                  <span>ניסוח נוסף 🔄</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopy(item.greeting, item.key)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  copiedId === item.key
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white dark:bg-slate-800 hover:bg-pink-100 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800'
                                }`}
                              >
                                {copiedId === item.key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedId === item.key ? 'הועתק! ✓' : 'העתק ברכה 📋'}</span>
                              </button>
                            </div>

                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>שלח בוואטסאפ 💬</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADD MANUAL BIRTHDAY */}
          {activeTab === 'add' && (
            <form onSubmit={handleSaveManualBirthday} className="space-y-4 max-w-md mx-auto">
              <div className="p-3 bg-pink-50 dark:bg-pink-950/40 rounded-2xl border border-pink-200 dark:border-pink-800 text-xs text-pink-900 dark:text-pink-200">
                💡 יום הולדת שתוסיפי כאן יישמר במאגר ימי ההולדת ויוכל להשתבץ אוטומטית בסדר היום עם הצעת ברכה אישית ומשלוח וואטסאפ.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  שם איש/אשת הקשר *
                </label>
                <input
                  type="text"
                  required
                  placeholder="למשל: דני כהן / אמא"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    יום בחודש *
                  </label>
                  <select
                    value={addDay}
                    onChange={(e) => setAddDay(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    חודש *
                  </label>
                  <select
                    value={addMonth}
                    onChange={(e) => setAddMonth(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  >
                    {HEBREW_MONTHS.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m} ({idx + 1})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    שנת לידה (אופציונלי לחישוב גיל)
                  </label>
                  <input
                    type="number"
                    placeholder="למשל: 1994"
                    value={addYear}
                    onChange={(e) => setAddYear(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    טלפון נייד (לוואטסאפ)
                  </label>
                  <input
                    type="tel"
                    placeholder="050-1234567"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>שמור יום הולדת ושבץ לסדר היום 🎂</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: GREETING GENERATOR SANDBOX */}
          {activeTab === 'generator' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                    מחולל ברכות אישיות לכל איש קשר
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={genName}
                    onChange={(e) => setGenName(e.target.value)}
                    placeholder="שם החוגג/ת"
                    className="w-28 px-2.5 py-1 bg-white dark:bg-slate-800 border rounded-lg text-xs font-semibold"
                  />
                  <input
                    type="number"
                    value={genAge}
                    onChange={(e) => setGenAge(e.target.value)}
                    placeholder="גיל"
                    className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border rounded-lg text-xs font-semibold"
                  />
                  <input
                    type="tel"
                    value={genPhone}
                    onChange={(e) => setGenPhone(e.target.value)}
                    placeholder="טלפון לוואטסאפ"
                    className="w-28 px-2.5 py-1 bg-white dark:bg-slate-800 border rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {generateBirthdayGreetingVariants(genName, parseInt(genAge, 10) || undefined).map((g, idx) => {
                  const titles = [
                    'נוסח 1: חם ומרגש מהלב ❤️',
                    'נוסח 2: מעורר השראה וחגיגי 🌟',
                    'נוסח 3: קצר וקולע לוואטסאפ ⚡',
                    'נוסח 4: ציון דרך אישי / מיוחד 🎁',
                    'נוסח 5: שמח והומוריסטי 🥂'
                  ];
                  const waLink = formatWhatsAppBirthdayLink(genPhone, g);

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {titles[idx]}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(g, `gen-${idx}`)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              copiedId === `gen-${idx}`
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {copiedId === `gen-${idx}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedId === `gen-${idx}` ? 'הועתק!' : 'העתק'}</span>
                          </button>

                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>וואטסאפ</span>
                          </a>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 select-text">
                        "{g}"
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
