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

// Smart parser for any plan content (Hebrew, English, Markdown, Lists, Checklists)
export const parsePlanContentToStages = (rawText: string): NotebookStage[] => {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.trim();
  const stages: NotebookStage[] = [];
  const lines = text.split(/\r?\n/);

  interface RawBlock {
    titleLine: string;
    bodyLines: string[];
  }
  const blocks: RawBlock[] = [];
  let currentBlock: RawBlock | null = null;

  const isHeadingLine = (l: string): boolean => {
    const trimmed = l.trim();
    if (!trimmed) return false;
    // Markdown headers: # , ## , ### , ####
    if (/^#{1,4}\s+/.test(trimmed)) return true;
    // Stage / Day / Week prefix in Hebrew or English: e.g. "שלב 1:", "יום 2:", "Day 1:", "Week 1:"
    if (/^(?:שלב|יום|חלק|פרק|שבוע|מודול|נושא|day|step|week|part|module|chapter|topic)\s*\d+[:\.\-–—\s]/i.test(trimmed)) return true;
    // Checkbox items: "- [ ]", "* [ ]"
    if (/^(?:[-*•]\s*)?\[[ xXvV✓✔]?\]\s+/i.test(trimmed)) return true;
    // Standard numbered lists: "1. ", "2) "
    if (/^\d+[\.\)]\s+/.test(trimmed)) return true;
    // Bullet items if formatted: "- ", "* ", "• "
    if (/^[-*•]\s+/.test(trimmed)) return true;
    return false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check if line represents a document title rather than a step (e.g. first line with # Document Title)
    if (blocks.length === 0 && !currentBlock && /^#\s+/.test(line)) {
      continue;
    }

    if (isHeadingLine(line)) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        titleLine: line,
        bodyLines: []
      };
    } else {
      if (currentBlock) {
        currentBlock.bodyLines.push(line);
      } else {
        currentBlock = {
          titleLine: line,
          bodyLines: []
        };
      }
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  blocks.forEach((block, idx) => {
    let rawTitle = block.titleLine;
    let description = block.bodyLines.join(' ').trim() || undefined;

    // 1. Remove markdown header symbols
    rawTitle = rawTitle.replace(/^#{1,4}\s+/, '').trim();

    // 2. Remove checkbox markers
    rawTitle = rawTitle.replace(/^(?:[-*•]\s*)?\[[ xXvV✓✔]?\]\s*/i, '').trim();

    // 3. Remove leading bullet or list numbers
    rawTitle = rawTitle.replace(/^[-*•]\s+/, '').trim();
    rawTitle = rawTitle.replace(/^\d+[\.\)]\s+/, '').trim();

    // 4. Extract duration from title or description
    let durationMinutes = 20;
    const durMatch = (rawTitle + ' ' + (description || '')).match(
      /(?:⏱️\s*)?\(?\s*(\d+(?:\.\d+)?)\s*(?:דק'|דקות|דקה|m|mins?|minutes|שעות|שעה|hours|hr|h)\s*\)?/i
    );
    if (durMatch && durMatch[1]) {
      const val = parseFloat(durMatch[1]);
      if (/שעות|שעה|hours|hr|h/i.test(durMatch[0])) {
        durationMinutes = Math.round(val * 60);
      } else {
        durationMinutes = Math.round(val);
      }
      rawTitle = rawTitle.replace(durMatch[0], '').trim();
    }

    // 5. If title has inline description separated by " - " or ": "
    if (!description) {
      if (rawTitle.includes(' - ')) {
        const parts = rawTitle.split(' - ');
        rawTitle = parts[0].trim();
        description = parts.slice(1).join(' - ').trim();
      } else if (rawTitle.includes(': ') && rawTitle.indexOf(': ') > 3) {
        const colonIdx = rawTitle.indexOf(': ');
        const prefix = rawTitle.substring(0, colonIdx);
        if (!/^(?:שלב|יום|חלק|פרק|שבוע|מודול|day|step|part|module)\s*\d+$/i.test(prefix)) {
          rawTitle = prefix.trim();
          description = rawTitle.substring(colonIdx + 2).trim();
        }
      }
    }

    rawTitle = rawTitle.replace(/^[:\-–—]\s*/, '').replace(/\s*[:\-–—]$/, '').trim();

    if (rawTitle) {
      stages.push({
        id: `stg-${idx + 1}-${Date.now()}`,
        title: rawTitle,
        description,
        durationMinutes
      });
    }
  });

  return stages;
};

// Backward-compatible alias
export const parseRawStagesText = parsePlanContentToStages;

export const generateGenericStages = (planTitle: string): NotebookStage[] => {
  const baseTitle = planTitle.trim() || 'תוכנית למידה';
  return [
    {
      id: `stg-1-${Date.now()}`,
      title: `שלב 1: מבוא ועקרונות יסוד ב-${baseTitle} (לדוגמה)`,
      description: `קריאת חומרי הפתיחה ומיפוי מטרות מתוך הקובץ במחברת NotebookLM.`,
      durationMinutes: 20
    },
    {
      id: `stg-2-${Date.now() + 1}`,
      title: `שלב 2: סקירת מושגי מפתח ותרגול ראשוני (לדוגמה)`,
      description: `העמקה בפרקים הראשונים של התוכנית ותרגול מודרך.`,
      durationMinutes: 20
    },
    {
      id: `stg-3-${Date.now() + 2}`,
      title: `שלב 3: יישום מעשי ופתרון דוגמאות מתוך המחברת (לדוגמה)`,
      description: `שאילת שאלות ב-NotebookLM וקבלת הסברים מעמיקים על מקרי בוחן.`,
      durationMinutes: 25
    },
    {
      id: `stg-4-${Date.now() + 3}`,
      title: `שלב 4: תרגול מתקדם והתמודדות עם שאלות מורכבות (לדוגמה)`,
      description: `מעבר על החלק המתקדם בתוכנית העבודה ותרגול עצמאי.`,
      durationMinutes: 25
    },
    {
      id: `stg-5-${Date.now() + 4}`,
      title: `שלב 5: יישום בעולם האמיתי ובסביבת העבודה (לדוגמה)`,
      description: `חיבור החומר הנלמד למשימות יומיומיות ותרגול מעשי.`,
      durationMinutes: 30
    },
    {
      id: `stg-6-${Date.now() + 5}`,
      title: `שלב 6: חזרה, חידוד דגשים ומשוב ב-NotebookLM (לדוגמה)`,
      description: `שיחה עם המודל במחברת לצורך בדיקת הבנה וקבלת משוב על התרגול.`,
      durationMinutes: 25
    }
  ];
};

// Decompose plan into sub-tasks based on link, title, optional pasted notes, and fallback option
export const decomposeNotebookPlan = (
  url: string,
  planTitle: string,
  rawContent?: string,
  allowGenericFallback: boolean = false
): NotebookStage[] => {
  // If raw content was pasted, parse it directly with the smart parser
  if (rawContent && rawContent.trim()) {
    const parsed = parsePlanContentToStages(rawContent.trim());
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

  // If fallback allowed, return clearly marked generic stages; otherwise return empty
  if (allowGenericFallback) {
    return generateGenericStages(planTitle);
  }

  return [];
};
