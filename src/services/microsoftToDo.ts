import { Task } from '../types';

export const MS_SELECTED_LIST_KEY = 'ms_selected_list_v1';

export interface MicrosoftToDoList {
  id: string;
  displayName: string;
  isOwner?: boolean;
  isShared?: boolean;
  wellknownListName?: string; // 'none' | 'defaultList' | 'flaggedEmails' | 'unknown'
}

export interface MicrosoftToDoTask {
  id: string;
  title: string;
  status: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred';
  importance?: 'low' | 'normal' | 'high';
  isReminderOn?: boolean;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  completedDateTime?: {
    dateTime: string;
    timeZone: string;
  };
  dueDateTime?: {
    dateTime: string;
    timeZone: string;
  };
  body?: {
    content: string;
    contentType: string; // 'text' | 'html'
  };
}

export interface MicrosoftSyncResult {
  newTasks: Task[];
  updatedTasks: Task[];
  foundCount: number;
}

export interface SelectedToDoList {
  id: string;
  name: string;
}

/**
 * Strips HTML tags from task body content.
 */
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>?/gm, '').trim();
};

/**
 * Fetches all Microsoft To Do lists for the authenticated user.
 */
export const fetchToDoLists = async (accessToken: string): Promise<MicrosoftToDoList[]> => {
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/todo/lists', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      console.warn('Failed to fetch Microsoft To Do lists:', res.status, res.statusText);
      return [];
    }

    const data = await res.json();
    return data.value || [];
  } catch (err) {
    console.error('Error fetching Microsoft To Do lists:', err);
    return [];
  }
};

/**
 * Fetches all tasks within a specific Microsoft To Do list.
 */
export const fetchToDoTasks = async (listId: string, accessToken: string): Promise<MicrosoftToDoTask[]> => {
  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/todo/lists/${encodeURIComponent(listId)}/tasks?$top=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!res.ok) {
      console.warn(`Failed to fetch tasks for list ${listId}:`, res.status, res.statusText);
      return [];
    }

    const data = await res.json();
    return data.value || [];
  } catch (err) {
    console.error(`Error fetching tasks for list ${listId}:`, err);
    return [];
  }
};

/**
 * Syncs tasks from a Microsoft To Do list into the local casual tasks list.
 * - Maps ID as 'mstodo-' + item.id
 * - Respects soft-delete (isDeleted: true) to prevent resurrecting tasks
 * - Updates changed tasks and creates new tasks
 */
export const syncMicrosoftTasksToCasual = async (
  listId: string,
  accessToken: string,
  existingTasks: Task[],
  targetDate: string
): Promise<MicrosoftSyncResult> => {
  const msTasks = await fetchToDoTasks(listId, accessToken);
  const now = new Date().toISOString();

  const newTasks: Task[] = [];
  const updatedTasks: Task[] = [];

  for (const item of msTasks) {
    const mstodoId = `mstodo-${item.id}`;
    const rawTitle = item.title?.trim() || 'משימה ללא כותרת';
    const isCompleted = item.status === 'completed';

    // Find if task already exists by id, or by exact title in casual category for that date
    const existing = existingTasks.find(
      t =>
        t.id === mstodoId ||
        (t.title === rawTitle && t.date === targetDate && t.category === 'casual')
    );

    // 1. If soft-deleted locally, do NOT resurrect it
    if (existing?.isDeleted) {
      continue;
    }

    let description = item.body?.content ? stripHtml(item.body.content) : '';
    if (!description) {
      description = 'מתוך רשימת Microsoft To Do';
    }

    const completedAt = isCompleted
      ? (item.completedDateTime?.dateTime || existing?.completedAt || now)
      : undefined;

    if (existing) {
      // 2. Check if title, status, or description changed
      const titleChanged = existing.title !== rawTitle;
      const statusChanged = existing.completed !== isCompleted;
      const descChanged = (existing.description || '') !== description;

      if (titleChanged || statusChanged || descChanged) {
        updatedTasks.push({
          ...existing,
          title: rawTitle,
          completed: isCompleted,
          completedAt,
          description,
          updatedAt: now
        });
      }
    } else {
      // 3. New task
      newTasks.push({
        id: mstodoId,
        title: rawTitle,
        description,
        category: 'casual',
        completed: isCompleted,
        completedAt,
        date: targetDate,
        createdAt: item.createdDateTime || now,
        updatedAt: item.lastModifiedDateTime || now
      });
    }
  }

  return {
    newTasks,
    updatedTasks,
    foundCount: msTasks.length
  };
};

/**
 * Updates the completion status of a Microsoft To Do task on Microsoft Graph API.
 */
export const updateMicrosoftTaskStatus = async (
  listId: string,
  taskId: string,
  accessToken: string,
  completed: boolean
): Promise<boolean> => {
  try {
    const rawTaskId = taskId.startsWith('mstodo-') ? taskId.replace('mstodo-', '') : taskId;
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/todo/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(
        rawTaskId
      )}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: completed ? 'completed' : 'notStarted'
        })
      }
    );

    return res.ok;
  } catch (err) {
    console.error(`Error updating Microsoft To Do task ${taskId}:`, err);
    return false;
  }
};

/**
 * Gets currently selected Microsoft To Do list from localStorage.
 */
export const getSelectedToDoList = (): SelectedToDoList | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(MS_SELECTED_LIST_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && parsed.id) {
      return parsed as SelectedToDoList;
    }
    if (typeof parsed === 'string') {
      return { id: parsed, name: parsed };
    }
  } catch {
    // If raw string was stored
    if (raw.trim()) {
      return { id: raw.trim(), name: raw.trim() };
    }
  }
  return null;
};

/**
 * Saves selected Microsoft To Do list to localStorage.
 */
export const saveSelectedToDoList = (list: SelectedToDoList | string | null): void => {
  if (typeof window === 'undefined') return;
  if (!list) {
    localStorage.removeItem(MS_SELECTED_LIST_KEY);
    return;
  }

  if (typeof list === 'string') {
    localStorage.setItem(MS_SELECTED_LIST_KEY, JSON.stringify({ id: list, name: list }));
  } else {
    localStorage.setItem(MS_SELECTED_LIST_KEY, JSON.stringify(list));
  }
};
