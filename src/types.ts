export type TaskCategory = 'must_do' | 'goals' | 'casual';

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

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  lastActiveDate: string; // tracks when user last opened the app to detect day changes
  userFullName?: string;
}
