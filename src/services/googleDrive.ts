import { Task } from '../types';
import { getTodayDateString } from './storage';

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  parents?: string[];
  description?: string;
}

export const fetchFolderContents = async (
  folderId: string,
  accessToken: string
): Promise<DriveItem[]> => {
  const query = `'${folderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,webViewLink,parents,description)&pageSize=50`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to fetch Google Drive files: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.files || [];
};

/**
 * Recursively scans the app folder to discover milestones (subfolders like "Machine Learning")
 * and goals documents/links (like "GoogleLM")
 */
export const scanDriveForGoals = async (
  rootFolderId: string,
  accessToken: string
): Promise<Array<{ milestone: string; item: DriveItem }>> => {
  const rootItems = await fetchFolderContents(rootFolderId, accessToken);
  const discovered: Array<{ milestone: string; item: DriveItem }> = [];

  for (const item of rootItems) {
    // Ignore internal sync file
    if (item.name === 'daily_tasks_data.json') continue;

    if (item.mimeType === 'application/vnd.google-apps.folder') {
      const subItems = await fetchFolderContents(item.id, accessToken);
      if (subItems.length > 0) {
        for (const sub of subItems) {
          discovered.push({ milestone: item.name, item: sub });
        }
      } else {
        discovered.push({ milestone: item.name, item });
      }
    } else {
      discovered.push({ milestone: 'יעדים כלליים', item });
    }
  }

  return discovered;
};

/**
 * Saves all tasks into a single private JSON file in the user's Google Drive folder
 * enabling complete cross-device synchronization between phone and computer.
 */
export const saveTasksToDriveFile = async (
  folderId: string,
  accessToken: string,
  tasks: Task[]
): Promise<void> => {
  try {
    const items = await fetchFolderContents(folderId, accessToken);
    const existingFile = items.find(f => f.name === 'daily_tasks_data.json');
    const content = JSON.stringify(tasks, null, 2);

    if (existingFile) {
      // Update existing file content
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
      // Create new file inside the folder using multipart upload
      const metadata = {
        name: 'daily_tasks_data.json',
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
  } catch (err) {
    console.warn('Failed to save tasks file to Google Drive', err);
  }
};

/**
 * Loads the shared tasks file from the user's Google Drive folder
 */
export const loadTasksFromDriveFile = async (
  folderId: string,
  accessToken: string
): Promise<Task[] | null> => {
  try {
    const items = await fetchFolderContents(folderId, accessToken);
    const existingFile = items.find(f => f.name === 'daily_tasks_data.json');
    if (!existingFile) return null;

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch (err) {
    console.warn('Failed to load tasks file from Google Drive', err);
    return null;
  }
};

/**
 * Syncs Drive files (like Machine Learning / GoogleLM) into Goals tasks
 */
export const syncDriveGoalsToTasks = async (
  rootFolderId: string,
  accessToken: string,
  existingTasks: Task[],
  targetDate: string = getTodayDateString()
): Promise<{ newTasks: Task[]; foundCount: number }> => {
  const driveGoals = await scanDriveForGoals(rootFolderId, accessToken);
  const now = new Date().toISOString();
  const createdOrUpdated: Task[] = [];

  for (const entry of driveGoals) {
    const { milestone, item } = entry;
    const existing = existingTasks.find(
      t => t.goalDocumentId === item.id || (t.title.includes(item.name) && t.category === 'goals')
    );

    if (!existing) {
      createdOrUpdated.push({
        id: `drive-goal-${item.id}`,
        title: item.name.replace(/\.[^/.]+$/, ''),
        description: `מתוך Google Drive: תיקיית "${milestone}"`,
        category: 'goals',
        completed: false,
        date: targetDate,
        durationMinutes: 45,
        milestoneTitle: milestone,
        link: item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`,
        goalDocumentId: item.id,
        createdAt: now,
        updatedAt: now
      });
    }
  }

  return {
    newTasks: createdOrUpdated,
    foundCount: driveGoals.length
  };
};
