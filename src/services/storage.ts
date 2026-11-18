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

// Check for overdue unfinished tasks from previous days
export const checkUnfinishedPreviousTasks = (currentDate: string): Task[] => {
  const allTasks = getStoredTasks();
  return allTasks.filter(t => !t.isDeleted && !t.completed && t.date < currentDate);
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
