import { Task } from '../types';
import { getTodayDateString } from './storage';
import { fetchGoogleDoc, parseDocForGoals, updateGoogleDocGoalStatus } from './googleDocs';

export { fetchGoogleDoc, parseDocForGoals, updateGoogleDocGoalStatus };

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  parents?: string[];
  description?: string;
}

const TASKS_FILE_NAME = 'daily_tasks_data.json';
const CACHED_FILE_ID_KEY = 'google_drive_tasks_file_id';

export const getCachedDailyTasksFileId = (): string | null => {
  try {
    return localStorage.getItem(CACHED_FILE_ID_KEY);
  } catch {
    return null;
  }
};

export const setCachedDailyTasksFileId = (fileId: string | null): void => {
  try {
    if (fileId) {
      localStorage.setItem(CACHED_FILE_ID_KEY, fileId);
    } else {
      localStorage.removeItem(CACHED_FILE_ID_KEY);
    }
  } catch {}
};

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
 * Searches Google Drive for files matching a name query (e.g. plan document name)
 */
export const searchDriveFilesByName = async (
  nameQuery: string,
  accessToken: string
): Promise<DriveItem[]> => {
  const clean = nameQuery.trim().replace(/'/g, "\\'");
  if (!clean) return [];

  const q = `name contains '${clean}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=files(id,name,mimeType,webViewLink,parents,description)&pageSize=10`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to search Google Drive files: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.files || [];
};

/**
 * Fetches content of a file from Google Drive (supports Google Docs and plain text files)
 */
export const fetchDriveFileContent = async (
  fileId: string,
  mimeType: string,
  accessToken: string
): Promise<{ title: string; content: string }> => {
  if (mimeType === 'application/vnd.google-apps.document') {
    const doc = await fetchGoogleDoc(fileId, accessToken);
    return {
      title: doc?.title || '',
      content: doc?.rawText || ''
    };
  }

  let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  if (mimeType.startsWith('application/vnd.google-apps.')) {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (res.ok) {
    const text = await res.text();
    return { title: '', content: text };
  }

  throw new Error(`Failed to fetch file content (${res.status})`);
};

/**
 * Recursively scans the app folder to discover milestones (subfolders like "Machine Learning")
 * and goals documents/links (especially Google Docs: application/vnd.google-apps.document)
 */
export const scanDriveForGoals = async (
  rootFolderId: string,
  accessToken: string
): Promise<Array<{ milestone: string; item: DriveItem }>> => {
  const discovered: Array<{ milestone: string; item: DriveItem }> = [];

  const scanFolder = async (folderId: string, currentMilestone: string, depth: number = 0) => {
    if (depth > 4) return;
    try {
      const items = await fetchFolderContents(folderId, accessToken);
      for (const item of items) {
        // Ignore internal tasks sync file
        if (item.name === TASKS_FILE_NAME) continue;

        if (item.mimeType === 'application/vnd.google-apps.folder') {
          const milestoneName = currentMilestone === 'יעדים כלליים' ? item.name : `${currentMilestone} / ${item.name}`;
          await scanFolder(item.id, milestoneName, depth + 1);
        } else {
          discovered.push({ milestone: currentMilestone, item });
        }
      }
    } catch (err) {
      console.warn(`Error scanning folder ${folderId}:`, err);
    }
  };

  await scanFolder(rootFolderId, 'יעדים כלליים', 0);
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
    const content = JSON.stringify(tasks, null, 2);
    let targetFileId = getCachedDailyTasksFileId();

    // 1. If we have a cached file ID, attempt fast direct PATCH update
    if (targetFileId) {
      const patchRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${targetFileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: content
        }
      );

      if (patchRes.ok) {
        return; // Fast path succeeded!
      }

      // If not ok (e.g. 404 deleted or unauthorized file), clear cache and search
      setCachedDailyTasksFileId(null);
      targetFileId = null;
    }

    // 2. Search folder to find existing file
    const items = await fetchFolderContents(folderId, accessToken);
    const existingFile = items.find(f => f.name === TASKS_FILE_NAME);

    if (existingFile) {
      setCachedDailyTasksFileId(existingFile.id);
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
        name: TASKS_FILE_NAME,
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

      const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });

      if (createRes.ok) {
        const created = await createRes.json();
        if (created?.id) {
          setCachedDailyTasksFileId(created.id);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to save tasks file to Google Drive', err);
  }
};

/**
 * Debounced and queue-safe task saver to Drive.
 * Avoids racing multiple rapid user actions (like checking off 3 tasks).
 */
let saveTimeout: any = null;
interface PendingSaveArgs {
  folderId: string;
  accessToken: string;
  tasks: Task[];
}

let pendingSaveArgs: PendingSaveArgs | null = null;
let isSavingInProgress = false;

const getNextPendingSave = (): PendingSaveArgs | null => pendingSaveArgs;

export const scheduleSaveTasksToDrive = (
  folderId: string,
  accessToken: string,
  tasks: Task[],
  debounceMs: number = 350
) => {
  pendingSaveArgs = { folderId, accessToken, tasks };

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    if (isSavingInProgress) {
      // Re-trigger once current in-flight save finishes
      scheduleSaveTasksToDrive(folderId, accessToken, tasks, 150);
      return;
    }

    const current = pendingSaveArgs;
    if (!current) return;
    pendingSaveArgs = null;
    isSavingInProgress = true;

    try {
      await saveTasksToDriveFile(current.folderId, current.accessToken, current.tasks);
    } finally {
      isSavingInProgress = false;
      const nextArgs = getNextPendingSave();
      if (nextArgs) {
        scheduleSaveTasksToDrive(
          nextArgs.folderId,
          nextArgs.accessToken,
          nextArgs.tasks,
          100
        );
      }
    }
  }, debounceMs);
};

/**
 * Loads the shared tasks file from the user's Google Drive folder
 */
export const loadTasksFromDriveFile = async (
  folderId: string,
  accessToken: string
): Promise<Task[] | null> => {
  try {
    let fileId = getCachedDailyTasksFileId();

    if (fileId) {
      const fastRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (fastRes.ok) {
        const data = await fastRes.json();
        return Array.isArray(data) ? data : null;
      }
      setCachedDailyTasksFileId(null);
    }

    const items = await fetchFolderContents(folderId, accessToken);
    const existingFile = items.find(f => f.name === TASKS_FILE_NAME);
    if (!existingFile) return null;

    setCachedDailyTasksFileId(existingFile.id);
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
 * Syncs Drive files and Google Docs into Goals tasks.
 * For Google Docs, extracts milestones, sub-tasks, duration, and completion statuses.
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
    const isGoogleDoc = item.mimeType === 'application/vnd.google-apps.document';

    if (isGoogleDoc) {
      try {
        const fetchedDoc = await fetchGoogleDoc(item.id, accessToken);
        if (fetchedDoc) {
          const docTitle = fetchedDoc.title || item.name.replace(/\.[^/.]+$/, '');
          const parsedSubTasks = parseDocForGoals(
            docTitle,
            fetchedDoc.body || fetchedDoc.rawText,
            item.id,
            milestone,
            targetDate
          );

          if (parsedSubTasks.length > 0) {
            for (const pTask of parsedSubTasks) {
              const alreadyExists = existingTasks.some(
                t => t.id === pTask.id || (t.goalDocumentId === item.id && t.title === pTask.title)
              ) || createdOrUpdated.some(
                t => t.id === pTask.id || (t.goalDocumentId === item.id && t.title === pTask.title)
              );

              if (!alreadyExists) {
                // Ensure link points to Google Docs editor or webViewLink
                if (!pTask.link && item.webViewLink) {
                  pTask.link = item.webViewLink;
                }
                createdOrUpdated.push(pTask);
              }
            }
            continue; // Successfully handled Google Doc with granular tasks
          }
        }
      } catch (docErr) {
        console.warn(`Failed to parse Google Doc "${item.name}" (${item.id}):`, docErr);
      }
    }

    // Fallback for non-doc files or when doc parsing produced no tasks
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
