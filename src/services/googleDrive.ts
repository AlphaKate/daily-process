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
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      // It's a milestone folder, e.g., "Machine Learning"
      const subItems = await fetchFolderContents(item.id, accessToken);
      if (subItems.length > 0) {
        for (const sub of subItems) {
          discovered.push({ milestone: item.name, item: sub });
        }
      } else {
        // Empty folder or placeholder folder
        discovered.push({ milestone: item.name, item });
      }
    } else {
      // Document or link directly in root
      discovered.push({ milestone: 'יעדים כלליים', item });
    }
  }

  return discovered;
};

/**
 * Converts discovered Drive items into Task objects for the Goals section
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
    // Check if task already exists for this document on this date or globally
    const existing = existingTasks.find(
      t => t.goalDocumentId === item.id || (t.title.includes(item.name) && t.category === 'goals')
    );

    if (!existing) {
      // Create new goal task
      createdOrUpdated.push({
        id: `drive-goal-${item.id}`,
        title: item.name.replace(/\.[^/.]+$/, ''), // remove file extension if present
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
