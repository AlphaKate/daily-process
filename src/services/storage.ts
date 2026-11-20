import { Task, AppSettings, DayStats } from '../types';

const TASKS_STORAGE_KEY = 'daily_proc_tasks_v1';
const SETTINGS_STORAGE_KEY = 'daily_proc_settings_v1';

export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateDisplayHebrew = (dateStr: string): string => {
  if (!dateStr || dateStr === 'backlog') {
    return 'בנק יעדים (ללא תאריך)';
  }
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const today = getTodayDateString();
    
    const daysOfWeek = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
    const monthsHebrew = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    
    const dayName = daysOfWeek[date.getDay()];
    const formatted = `${dayName}, ${day} ב${monthsHebrew[month - 1]} ${year}`;
    
    if (dateStr === today) {
      return `היום (${formatted})`;
    }
    return formatted;
  } catch {
    return dateStr;
  }
};

export const getAppSettings = (): AppSettings => {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse settings', e);
    }
  }
  return {
    theme: 'system',
    lastActiveDate: getTodayDateString()
  };
};

export const saveAppSettings = (settings: AppSettings): void => {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

export const ensureAssertivePracticePlanSeeded = (): Task[] => {
  const tasks = getStoredTasks();
  const exists = tasks.some(
    t => t.link?.includes('0Uhj6QVmB40d') || t.milestoneTitle?.includes('Daily Assertive Practice')
  );
  if (!exists) {
    const today = getTodayDateString();
    const now = new Date().toISOString();
    const [y, m, d] = today.split('-').map(Number);
    const startDate = new Date(y, m - 1, d);

    const stages = [
      {
        title: 'שלב 1: מיפוי זכויות אישיות וזיהוי דפוסי תקשורת',
        description: 'הגדרת זכויות אישיות (Assertiveness Bill of Rights) וזיהוי מצבים ביום-יום בהם קשה לעמוד על שלך מתוך המחברת ב-NotebookLM.',
        duration: 20
      },
      {
        title: 'שלב 2: תרגול אמירת "לא" ברורה וללא התנצלות מוגזמת',
        description: 'טכניקת סירוב אדיב וישיר (Saying No with Clarity) תוך שמירה על יחסים וכבוד הדדי, על פי עקרונות התוכנית.',
        duration: 20
      },
      {
        title: 'שלב 3: שימוש במסרי "אני" וניסוח צרכים ישיר',
        description: 'מעבר מהאשמות ("אתה תמיד...") לניסוח תחושות וצרכים ברורים ("אני מרגישה ש... ואשמח אם...") בעזרת דוגמאות ב-NotebookLM.',
        duration: 20
      },
      {
        title: 'שלב 4: טכניקות עמידה בלחץ וערפול מול ביקורת',
        description: 'תרגול טכניקת התקליט השבור (Broken Record) וערפול (Fogging) כדי לשמור על קור רוח ואיפוק מול לחץ או שיפוטיות.',
        duration: 25
      },
      {
        title: 'שלב 5: הצבת גבולות בסביבה אישית ועסקית',
        description: 'הגדרת קווים אדומים, תיאום ציפיות מקצועי והצבת גבולות ברורים בעבודה ומול קולגות/משפחה.',
        duration: 25
      },
      {
        title: 'שלב 6: שפת גוף, קשר עין וטון אסרטיבי',
        description: 'חיזוק מרכיבי התקשורת הלא-מילולית: יציבה בטוחה, קשר עין ישיר ודיבור רגוע ושקול בזמן העברת מסרים.',
        duration: 20
      },
      {
        title: 'שלב 7: סקירת התקדמות, תובנות והטמעה',
        description: 'סיכום השבוע, כתיבת תובנות במחברת NotebookLM, זיהוי הצלחות והגדרת עקרונות להמשך תרגול שוטף.',
        duration: 30
      }
    ];

    const newTasks: Task[] = stages.map((stg, i) => {
      const taskDateObj = new Date(startDate);
      taskDateObj.setDate(startDate.getDate() + i);
      const yr = taskDateObj.getFullYear();
      const mo = String(taskDateObj.getMonth() + 1).padStart(2, '0');
      const da = String(taskDateObj.getDate()).padStart(2, '0');

      return {
        id: `assertive-plan-${i + 1}-${Date.now()}`,
        title: stg.title,
        description: stg.description,
        category: 'goals',
        completed: false,
        date: `${yr}-${mo}-${da}`,
        durationMinutes: stg.duration,
        milestoneTitle: 'Daily Assertive Practice (GoogleLM)',
        link: 'https://notebooklm.link.google/0Uhj6QVmB40d',
        createdAt: now,
        updatedAt: now
      };
    });

    const combined = [...newTasks, ...tasks];
    saveStoredTasks(combined);
    return combined;
  }
  return tasks;
};

export const getStoredTasks = (): Task[] => {
  const raw = localStorage.getItem(TASKS_STORAGE_KEY);
  if (!raw) {
    const seed = getInitialSeedTasks();
    saveStoredTasks(seed);
    return seed;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse tasks', e);
    return [];
  }
};

export const saveStoredTasks = (tasks: Task[]): void => {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
};

// Check for overdue unfinished tasks from previous days (ignoring backlog tasks without dates)
export const checkUnfinishedPreviousTasks = (currentDate: string): Task[] => {
  const allTasks = getStoredTasks();
  return allTasks.filter(
    t => !t.isDeleted && !t.completed && t.date && t.date !== 'backlog' && t.date < currentDate
  );
};

// Rollover tasks to current date
export const rolloverTasksToDate = (taskIds: string[], targetDate: string): void => {
  const allTasks = getStoredTasks();
  const updated = allTasks.map(task => {
    if (taskIds.includes(task.id)) {
      return {
        ...task,
        rolledOverFrom: task.rolledOverFrom || task.date,
        date: targetDate,
        updatedAt: new Date().toISOString()
      };
    }
    return task;
  });
  saveStoredTasks(updated);
};

export const calculateDayStats = (date: string, tasks: Task[]): DayStats => {
  const dayTasks = tasks.filter(t => !t.isDeleted && t.date === date);
  const completed = dayTasks.filter(t => t.completed);

  const mustDo = dayTasks.filter(t => t.category === 'must_do');
  const goals = dayTasks.filter(t => t.category === 'goals');
  const casual = dayTasks.filter(t => t.category === 'casual');

  return {
    date,
    totalPlanned: dayTasks.length,
    completedCount: completed.length,
    mustDoTotal: mustDo.length,
    mustDoCompleted: mustDo.filter(t => t.completed).length,
    goalsTotal: goals.length,
    goalsCompleted: goals.filter(t => t.completed).length,
    casualTotal: casual.length,
    casualCompleted: casual.filter(t => t.completed).length,
  };
};

const getInitialSeedTasks = (): Task[] => {
  const today = getTodayDateString();
  const now = new Date().toISOString();

  return [
    {
      id: 'seed-1',
      title: 'פגישת צוות שבועית',
      description: 'סקירת פרויקטים ויעדים (מתוך יומן Google)',
      category: 'must_do',
      completed: false,
      date: today,
      time: '10:00',
      durationMinutes: 45,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'seed-2',
      title: 'לימוד פרק בקורס שפת תכנות / ניהול',
      description: 'התקדמות באבן דרך 1 לפי מסמך היעדים',
      category: 'goals',
      completed: false,
      date: today,
      time: '13:00',
      durationMinutes: 60,
      milestoneTitle: 'שליטה בכלים מתקדמים',
      link: 'https://drive.google.com',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'seed-3',
      title: 'תרגול כושר 30 דקות',
      description: 'יעד בריאות ואנרגיה יומית',
      category: 'goals',
      completed: false,
      date: today,
      durationMinutes: 30,
      milestoneTitle: 'שמירה על כושר ומיקוד',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'seed-4',
      title: 'להזמין תור לרופא',
      description: 'סידור אישי (מתוך רשימת Microsoft To Do)',
      category: 'casual',
      completed: false,
      date: today,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'seed-5',
      title: 'תכנון סדר יום ומיקוד בוקר',
      description: 'הגדרה מהירה של 3 משימות מפתח',
      category: 'must_do',
      completed: true,
      completedAt: now,
      date: today,
      time: '08:00',
      durationMinutes: 15,
      createdAt: now,
      updatedAt: now
    }
  ];
};

/**
 * Completely purges all local storage and session cache from this device
 * (Emergency / Panic Wipe). Does NOT modify or delete remote files in Google Drive.
 */
export const performEmergencyLocalWipe = (): void => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.error('Failed to execute emergency storage wipe:', e);
  }
};
