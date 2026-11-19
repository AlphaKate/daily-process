// Storage and management for GoogleLM / NotebookLM learning notebooks and their curriculum stages

export interface NotebookStage {
  id: string;
  title: string;
  description?: string;
  durationMinutes?: number;
}

export interface LearningNotebook {
  id: string;
  title: string; // e.g. "Daily Assertive Practice Plan"
  url: string; // e.g. "https://notebooklm.link.google/0Uhj6QVmB40d"
  milestoneTitle: string; // e.g. "Daily Assertive Practice (GoogleLM)"
  description?: string;
  stages: NotebookStage[];
  createdAt: string;
  updatedAt: string;
}

const NOTEBOOKS_STORAGE_KEY = 'daily_proc_learning_notebooks_v1';

export const INITIAL_ASSERTIVE_NOTEBOOK: LearningNotebook = {
  id: 'notebook-assertive-default',
  title: 'Daily Assertive Practice Plan',
  url: 'https://notebooklm.link.google/0Uhj6QVmB40d',
  milestoneTitle: 'Daily Assertive Practice (GoogleLM)',
  description: 'תוכנית תרגול יומית לתקשורת אסרטיבית, הצבת גבולות, עמידה בלחצים והטמעה מעשית.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  stages: [
    {
      id: 'stg-1',
      title: 'שלב 1: מיפוי זכויות אישיות וזיהוי דפוסי תקשורת',
      description: 'הגדרת זכויות אישיות (Assertiveness Bill of Rights) וזיהוי מצבים ביום-יום בהם קשה לעמוד על שלך מתוך המחברת ב-NotebookLM.',
      durationMinutes: 20
    },
    {
      id: 'stg-2',
      title: 'שלב 2: תרגול אמירת "לא" ברורה וללא התנצלות מוגזמת',
      description: 'טכניקת סירוב אדיב וישיר (Saying No with Clarity) תוך שמירה על יחסים וכבוד הדדי, על פי עקרונות התוכנית.',
      durationMinutes: 20
    },
    {
      id: 'stg-3',
      title: 'שלב 3: שימוש במסרי "אני" וניסוח צרכים ישיר',
      description: 'מעבר מהאשמות ("אתה תמיד...") לניסוח תחושות וצרכים ברורים ("אני מרגישה ש... ואשמח אם...") בעזרת דוגמאות ב-NotebookLM.',
      durationMinutes: 20
    },
    {
      id: 'stg-4',
      title: 'שלב 4: טכניקות עמידה בלחץ וערפול מול ביקורת',
      description: 'תרגול טכניקת התקליט השבור (Broken Record) וערפול (Fogging) כדי לשמור על קור רוח ואיפוק מול לחץ או שיפוטיות.',
      durationMinutes: 25
    },
    {
      id: 'stg-5',
      title: 'שלב 5: הצבת גבולות בסביבה אישית ועסקית',
      description: 'הגדרת קווים אדומים, תיאום ציפיות מקצועי והצבת גבולות ברורים בעבודה ומול קולגות/משפחה.',
      durationMinutes: 25
    },
    {
      id: 'stg-6',
      title: 'שלב 6: שפת גוף, קשר עין וטון אסרטיבי',
      description: 'חיזוק מרכיבי התקשורת הלא-מילולית: יציבה בטוחה, קשר עין ישיר ודיבור רגוע ושקול בזמן העברת מסרים.',
      durationMinutes: 20
    },
    {
      id: 'stg-7',
      title: 'שלב 7: סקירת התקדמות, תובנות והטמעה',
      description: 'סיכום השבוע, כתיבת תובנות במחברת NotebookLM, זיהוי הצלחות והגדרת עקרונות להמשך תרגול שוטף.',
      durationMinutes: 30
    }
  ]
};

export const getStoredNotebooks = (): LearningNotebook[] => {
  try {
    const raw = localStorage.getItem(NOTEBOOKS_STORAGE_KEY);
    if (!raw) {
      const initial = [INITIAL_ASSERTIVE_NOTEBOOK];
      saveStoredNotebooks(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse learning notebooks', e);
  }
  const fallback = [INITIAL_ASSERTIVE_NOTEBOOK];
  saveStoredNotebooks(fallback);
  return fallback;
};

export const saveStoredNotebooks = (notebooks: LearningNotebook[]): void => {
  localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(notebooks));
};

export const addLearningNotebook = (notebook: Omit<LearningNotebook, 'id' | 'createdAt' | 'updatedAt'>): LearningNotebook => {
  const current = getStoredNotebooks();
  const now = new Date().toISOString();
  const created: LearningNotebook = {
    ...notebook,
    id: `nb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: now,
    updatedAt: now
  };
  const updated = [created, ...current];
  saveStoredNotebooks(updated);
  return created;
};

export const updateLearningNotebook = (id: string, updates: Partial<LearningNotebook>): LearningNotebook[] => {
  const current = getStoredNotebooks();
  const now = new Date().toISOString();
  const updated = current.map(nb => (nb.id === id ? { ...nb, ...updates, updatedAt: now } : nb));
  saveStoredNotebooks(updated);
  return updated;
};

export const deleteLearningNotebook = (id: string): LearningNotebook[] => {
  const current = getStoredNotebooks();
  const updated = current.filter(nb => nb.id !== id);
  saveStoredNotebooks(updated);
  return updated;
};

// Helper: parse raw pasted stages text into NotebookStage items
// Supports lines like: "1. Stage Name", "- Stage Name (30m)", "Stage: Description"
export const parseRawStagesText = (rawText: string): NotebookStage[] => {
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  return lines.map((line, idx) => {
    // Strip leading numbers or bullets (e.g. "1.", "1)", "-", "*")
    const cleanLine = line.replace(/^(\d+[\.\)]|\-|\*|\•)\s*/, '').trim();

    // Look for duration pattern e.g. "(30 דק')", "(45m)", "60 דקות"
    let durationMinutes = 20;
    const durMatch = cleanLine.match(/(\d+)\s*(דק'|דקות|דקה|m|mins?|minutes)/i);
    if (durMatch && durMatch[1]) {
      durationMinutes = parseInt(durMatch[1], 10);
    }

    // Split title and description if separated by ":" or "-"
    let title = cleanLine;
    let description: string | undefined = undefined;

    if (cleanLine.includes(' - ')) {
      const parts = cleanLine.split(' - ');
      title = parts[0].trim();
      description = parts.slice(1).join(' - ').trim();
    } else if (cleanLine.includes(': ')) {
      const parts = cleanLine.split(': ');
      title = parts[0].trim();
      description = parts.slice(1).join(': ').trim();
    }

    return {
      id: `stg-${idx + 1}-${Date.now()}`,
      title,
      description,
      durationMinutes
    };
  });
};

// Decompose plan into sub-tasks based on the link, title, and optional pasted notes
export const decomposeNotebookPlan = (
  url: string,
  planTitle: string,
  rawContent?: string
): NotebookStage[] => {
  // If raw content was pasted, parse it directly
  if (rawContent && rawContent.trim()) {
    const parsed = parseRawStagesText(rawContent.trim());
    if (parsed.length > 0) return parsed;
  }

  // If this is the Daily Assertive Practice Plan (or matching link)
  if (
    url.includes('0Uhj6QVmB40d') ||
    planTitle.toLowerCase().includes('assertive') ||
    planTitle.includes('אסרטיב')
  ) {
    return INITIAL_ASSERTIVE_NOTEBOOK.stages;
  }

  // Dynamic pedagogical breakdown for any GoogleLM topic
  const baseTitle = planTitle.trim() || 'תוכנית למידה';
  return [
    {
      id: `stg-1-${Date.now()}`,
      title: `שלב 1: מבוא ועקרונות יסוד ב-${baseTitle}`,
      description: `קריאת חומרי הפתיחה ומיפוי מטרות מתוך הקובץ במחברת NotebookLM.`,
      durationMinutes: 20
    },
    {
      id: `stg-2-${Date.now() + 1}`,
      title: `שלב 2: סקירת מושגי מפתח ותרגול ראשוני`,
      description: `העמקה בפרקים הראשונים של התוכנית ותרגול מודרך.`,
      durationMinutes: 20
    },
    {
      id: `stg-3-${Date.now() + 2}`,
      title: `שלב 3: יישום מעשי ופתרון דוגמאות מתוך המחברת`,
      description: `שאילת שאלות ב-NotebookLM וקבלת הסברים מעמיקים על מקרי בוחן.`,
      durationMinutes: 25
    },
    {
      id: `stg-4-${Date.now() + 3}`,
      title: `שלב 4: תרגול מתקדם והתמודדות עם שאלות מורכבות`,
      description: `מעבר על החלק המתקדם בתוכנית העבודה ותרגול עצמאי.`,
      durationMinutes: 25
    },
    {
      id: `stg-5-${Date.now() + 4}`,
      title: `שלב 5: יישום בעולם האמיתי ובסביבת העבודה`,
      description: `חיבור החומר הנלמד למשימות יומיומיות ותרגול מעשי.`,
      durationMinutes: 30
    },
    {
      id: `stg-6-${Date.now() + 5}`,
      title: `שלב 6: חזרה, חידוד דגשים ומשוב ב-NotebookLM`,
      description: `שיחה עם המודל במחברת לצורך בדיקת הבנה וקבלת משוב על התרגול.`,
      durationMinutes: 25
    },
    {
      id: `stg-7-${Date.now() + 6}`,
      title: `שלב 7: סקירת התקדמות, כתיבת תובנות והטמעה`,
      description: `סיכום שבועי של התוכנית וכתיבת נקודות מפתח להמשך.`,
      durationMinutes: 30
    }
  ];
};
