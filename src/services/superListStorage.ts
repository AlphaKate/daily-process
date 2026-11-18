import { Task } from '../types';
import { getTodayDateString, getStoredTasks, saveStoredTasks } from './storage';
import { fetchFolderContents } from './googleDrive';

const SUPER_LIST_KEY = 'super_todo_items_v1';
export const SUPER_LIST_INVITE_URL =
  'https://to-do.microsoft.com/sharing?InvitationToken=cSHAtsnUNTW0E2q3AEdlYmuhB8FZ2Q3tILzClg0YBCn-KrWUF9s9KrPQZJrtOsYlCiEN015c05_7oQPJaeCRkA';

export interface SuperListItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_SUPER_ITEMS: SuperListItem[] = [
  {
    id: 'super-1',
    text: 'חלב שיבולת שועל',
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'super-2',
    text: 'ירקות ופירות טריים',
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'super-3',
    text: 'לחם כוסמין מלא',
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'super-4',
    text: 'ביצים אורגניות',
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'super-5',
    text: 'טחינה גולמית',
    completed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const getSuperListItems = (): SuperListItem[] => {
  if (typeof window === 'undefined') return DEFAULT_SUPER_ITEMS;
  const raw = localStorage.getItem(SUPER_LIST_KEY);
  if (!raw) {
    saveSuperListItems(DEFAULT_SUPER_ITEMS);
    return DEFAULT_SUPER_ITEMS;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_SUPER_ITEMS;
  } catch {
    return DEFAULT_SUPER_ITEMS;
  }
};

export const saveSuperListItems = (items: SuperListItem[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SUPER_LIST_KEY, JSON.stringify(items));
};

export const addSuperListItem = (text: string): SuperListItem => {
  const items = getSuperListItems();
  const now = new Date().toISOString();
  const newItem: SuperListItem = {
    id: `super-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    text: text.trim(),
    completed: false,
    createdAt: now,
    updatedAt: now
  };
  const updated = [newItem, ...items];
  saveSuperListItems(updated);
  return newItem;
};

export const toggleSuperListItem = (id: string): SuperListItem[] => {
  const items = getSuperListItems();
  const now = new Date().toISOString();
  const updated = items.map(item =>
    item.id === id
      ? { ...item, completed: !item.completed, updatedAt: now }
      : item
  );
  saveSuperListItems(updated);
  return updated;
};

export const deleteSuperListItem = (id: string): SuperListItem[] => {
  const items = getSuperListItems();
  const updated = items.filter(item => item.id !== id);
  saveSuperListItems(updated);
  return updated;
};

/**
 * Copies an item from the "סופר" list into today's Casual checklist
 */
export const importSuperItemToCasual = (
  item: SuperListItem,
  targetDate: string = getTodayDateString()
): Task => {
  const tasks = getStoredTasks();
  const now = new Date().toISOString();

  // Check if already exists in today's tasks
  const existing = tasks.find(
    t => t.date === targetDate && t.title === item.text && t.category === 'casual'
  );

  if (existing) {
    return existing;
  }

  const newTask: Task = {
    id: `casual-super-${item.id}-${Date.now()}`,
    title: item.text,
    description: 'מתוך רשימת "סופר" (To Do)',
    category: 'casual',
    completed: item.completed,
    date: targetDate,
    sourceList: 'סופר',
    createdAt: now,
    updatedAt: now
  };

  const updatedTasks = [newTask, ...tasks];
  saveStoredTasks(updatedTasks);
  return newTask;
};

/**
 * Syncs the "סופר" list file with Google Drive folder without requiring any Microsoft OAuth
 */
export const syncSuperListWithDrive = async (
  folderId: string,
  accessToken: string
): Promise<{ items: SuperListItem[]; syncCount: number }> => {
  const localItems = getSuperListItems();
  let mergedItems = [...localItems];

  try {
    const itemsInFolder = await fetchFolderContents(folderId, accessToken);
    const existingFile = itemsInFolder.find(f => f.name === 'super_list_data.json');

    if (existingFile) {
      // Fetch remote items
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (res.ok) {
        const remoteItems: SuperListItem[] = await res.json();
        if (Array.isArray(remoteItems)) {
          // Merge remote and local by id, keeping latest updatedAt
          const itemMap = new Map<string, SuperListItem>();
          remoteItems.forEach(i => itemMap.set(i.id, i));
          localItems.forEach(i => {
            const existing = itemMap.get(i.id);
            if (!existing || (i.updatedAt && existing.updatedAt && i.updatedAt > existing.updatedAt)) {
              itemMap.set(i.id, i);
            }
          });
          mergedItems = Array.from(itemMap.values());
        }
      }
    }

    // Save back to Google Drive
    const content = JSON.stringify(mergedItems, null, 2);
    if (existingFile) {
      await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: content
        }
      );
    } else {
      const metadata = {
        name: 'super_list_data.json',
        parents: [folderId],
        mimeType: 'application/json'
      };
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;
      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        content +
        closeDelimiter;

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });
    }

    saveSuperListItems(mergedItems);
  } catch (err) {
    console.warn('Super list Drive sync error:', err);
  }

  return {
    items: mergedItems,
    syncCount: mergedItems.length
  };
};
