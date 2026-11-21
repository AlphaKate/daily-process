export type TaskCategory = 'must_do' | 'goals' | 'casual';

export type GoalLifecycleStatus = 'active' | 'in_preparation' | 'archived' | 'completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  completed: boolean;
  completedAt?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  durationMinutes?: number;
  link?: string;
  milestoneTitle?: string;
  goalDocumentId?: string;
  goalStatus?: GoalLifecycleStatus;
  sourceList?: string; // e.g. 'סופר' or other list name
  rolledOverFrom?: string; // original date if rolled over
  isDeleted?: boolean; // soft-delete for reliable cross-device sync
  createdAt: string;
  updatedAt: string;
}

export interface DayStats {
  date: string;
  totalPlanned: number;
  completedCount: number;
  mustDoTotal: number;
  mustDoCompleted: number;
  goalsTotal: number;
  goalsCompleted: number;
  casualTotal: number;
  casualCompleted: number;
}

export type FontSizeSetting = 'normal' | 'medium' | 'large' | 'xlarge';
export type ThemeSetting = 'light' | 'dark' | 'system';
export type FontFamilySetting = 'assistant' | 'heebo' | 'system';

export interface AppSettings {
  theme: ThemeSetting;
  fontSize: FontSizeSetting;
  fontFamily?: FontFamilySetting;
  highContrast?: boolean;
  cardDensity?: 'comfortable' | 'compact';
  confettiEnabled?: boolean;
  lastActiveDate: string; // tracks when user last opened the app to detect day changes
  userFullName?: string;
}
