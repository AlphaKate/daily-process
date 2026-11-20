import { Task } from '../types';

export interface ConferenceEntryPoint {
  entryPointType?: string; // 'video' | 'phone' | 'sip' | 'more'
  uri?: string;
  label?: string;
  pin?: string;
}

export interface ConferenceData {
  entryPoints?: ConferenceEntryPoint[];
  conferenceSolution?: {
    name?: string;
    iconUri?: string;
    key?: {
      type?: string;
    };
  };
}

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: ConferenceData;
  status?: string;
}

export interface CalendarSyncResult {
  newTasks: Task[];
  updatedTasks: Task[];
  foundCount: number;
}

/**
 * Calculates start and end boundaries for a given date in local time
 */
export const getLocalDateBounds = (dateStr: string): { timeMin: string; timeMax: string } => {
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    const [year, month, day] = parts;
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    return {
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString()
    };
  }

  const fallback = new Date(dateStr);
  const startOfDay = new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 23, 59, 59, 999);
  return {
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString()
  };
};

/**
 * Extracts video conferencing link (Google Meet, Zoom, Microsoft Teams, Webex)
 */
export const extractMeetingLink = (event: CalendarEvent): string | undefined => {
  // 1. Direct hangoutLink from Google Meet
  if (event.hangoutLink && event.hangoutLink.trim()) {
    return event.hangoutLink.trim();
  }

  // 2. conferenceData video entry points
  if (event.conferenceData?.entryPoints && Array.isArray(event.conferenceData.entryPoints)) {
    const videoEntry = event.conferenceData.entryPoints.find(
      ep => ep.entryPointType === 'video' && ep.uri
    );
    if (videoEntry?.uri && videoEntry.uri.trim()) {
      return videoEntry.uri.trim();
    }

    const anyVideoUri = event.conferenceData.entryPoints.find(
      ep =>
        ep.uri &&
        (ep.uri.includes('meet.google.com') ||
          ep.uri.includes('zoom.us') ||
          ep.uri.includes('teams.microsoft.com') ||
          ep.uri.includes('teams.live.com'))
    );
    if (anyVideoUri?.uri && anyVideoUri.uri.trim()) {
      return anyVideoUri.uri.trim();
    }
  }

  // 3. Scan location and description for video meeting URLs
  const meetingRegexes = [
    /https?:\/\/meet\.google\.com\/[a-zA-Z0-9\-_]+/i,
    /https?:\/\/(?:[a-zA-Z0-9-]+\.)?zoom\.us\/(?:j|my|[a-zA-Z0-9-_/]+)(?:\?[^\s"'>)]+)?/i,
    /https?:\/\/teams\.(?:microsoft|live)\.com\/[^\s"'>)]+/i,
    /https?:\/\/[a-zA-Z0-9-]+\.webex\.com\/[^\s"'>)]+/i
  ];

  const textsToScan = [event.location, event.description];
  for (const text of textsToScan) {
    if (!text) continue;
    for (const regex of meetingRegexes) {
      const match = text.match(regex);
      if (match && match[0]) {
        return match[0].replace(/[.,;:)]+$/, '').trim();
      }
    }
  }

  return undefined;
};

/**
 * Builds a descriptive Hebrew text including links, all-day flag, location and calendar event url.
 */
export const buildTaskDescription = (event: CalendarEvent, meetingLink?: string): string => {
  const sections: string[] = [];

  const isAllDay = !event.start?.dateTime && Boolean(event.start?.date);
  if (isAllDay) {
    sections.push('📅 אירוע לכל היום (All-day event)');
  }

  if (meetingLink) {
    sections.push(`🔗 קישור לפגישה:\n${meetingLink}`);
  }

  if (event.htmlLink) {
    sections.push(`📆 קישור ליומן Google:\n${event.htmlLink}`);
  }

  if (event.location && (!meetingLink || event.location !== meetingLink)) {
    sections.push(`📍 מיקום: ${event.location}`);
  }

  if (event.description && event.description.trim()) {
    sections.push(`📝 תיאור:\n${event.description.trim()}`);
  }

  if (sections.length === 0) {
    return 'מתוך יומן Google Calendar';
  }

  return sections.join('\n\n');
};

/**
 * Format a Date object to YYYY-MM-DD in local time
 */
const formatLocalYMD = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Extract exact local date YYYY-MM-DD from CalendarEvent
 */
export const getEventLocalDateString = (event: CalendarEvent): string => {
  if (event.start?.dateTime) {
    const d = new Date(event.start.dateTime);
    if (!isNaN(d.getTime())) {
      return formatLocalYMD(d);
    }
  }
  if (event.start?.date) {
    return event.start.date.substring(0, 10);
  }
  return formatLocalYMD(new Date());
};

/**
 * Fetch calendar events across a rolling time window (e.g. past 7 days to next 30 days)
 * to ensure all moved, updated, and new events are caught in a single sync operation.
 */
export const fetchCalendarEventsWindow = async (
  accessToken: string,
  daysBack: number = 7,
  daysForward: number = 30
): Promise<{ events: CalendarEvent[]; windowStart: string; windowEnd: string }> => {
  const now = new Date();
  const startWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack, 0, 0, 0, 0);
  const endWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysForward, 23, 59, 59, 999);

  const timeMin = startWindow.toISOString();
  const timeMax = endWindow.toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin
  )}&timeMax=${encodeURIComponent(
    timeMax
  )}&singleEvents=true&orderBy=startTime&maxResults=250&conferenceDataVersion=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to fetch Google Calendar: ${response.statusText}`
    );
  }

  const data = await response.json();
  return {
    events: data.items || [],
    windowStart: formatLocalYMD(startWindow),
    windowEnd: formatLocalYMD(endWindow)
  };
};

/**
 * Synchronize Google Calendar events with application tasks:
 * - Automatically moves tasks if their date or time changed in Google Calendar (e.g. from tomorrow to today).
 * - Updates titles, descriptions, and meeting links.
 * - Adds new meetings to Must Do.
 * - Soft-deletes tasks if the event was cancelled or removed from Google Calendar.
 */
export const syncCalendarEventsToTasks = async (
  _currentDate: string,
  accessToken: string,
  existingTasks: Task[]
): Promise<CalendarSyncResult> => {
  // Fetch a rolling window from 7 days ago to 30 days ahead
  const { events, windowStart, windowEnd } = await fetchCalendarEventsWindow(accessToken, 7, 30);
  const now = new Date().toISOString();
  const newTasks: Task[] = [];
  const updatedTasks: Task[] = [];

  // Track event IDs that are active in Google Calendar
  const activeEventIds = new Set<string>();

  for (const event of events) {
    const eventTaskId = `gcal-${event.id}`;
    const eventDateStr = getEventLocalDateString(event);
    const title = event.summary?.trim() || 'פגישה ללא כותרת';

    // If event is cancelled in Google Calendar, mark existing task as deleted
    if (event.status === 'cancelled') {
      const existingTask = existingTasks.find(t => t.id === eventTaskId);
      if (existingTask && !existingTask.isDeleted) {
        updatedTasks.push({
          ...existingTask,
          isDeleted: true,
          updatedAt: now
        });
      }
      continue;
    }

    activeEventIds.add(eventTaskId);

    // Parse time and duration
    let timeStr: string | undefined = undefined;
    let duration: number | undefined = undefined;

    if (event.start?.dateTime) {
      const start = new Date(event.start.dateTime);
      if (!isNaN(start.getTime())) {
        const hours = String(start.getHours()).padStart(2, '0');
        const minutes = String(start.getMinutes()).padStart(2, '0');
        timeStr = `${hours}:${minutes}`;

        if (event.end?.dateTime) {
          const end = new Date(event.end.dateTime);
          if (!isNaN(end.getTime())) {
            duration = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
          }
        }
      }
    }

    const meetingLink = extractMeetingLink(event);
    const taskLink = meetingLink || event.htmlLink || undefined;
    const description = buildTaskDescription(event, meetingLink);

    // Find if task already exists (by ID, or by identical title and category)
    const existing = existingTasks.find(t => t.id === eventTaskId);

    if (existing) {
      // If user soft-deleted it in app, honor deletion
      if (existing.isDeleted) {
        continue;
      }

      // Check if DATE changed (e.g. moved from tomorrow to today!)
      const dateChanged = existing.date !== eventDateStr;
      const timeChanged = (existing.time || undefined) !== (timeStr || undefined);
      const titleChanged = existing.title !== title;
      const durationChanged = (existing.durationMinutes || undefined) !== (duration || undefined);
      const linkChanged = (existing.link || undefined) !== (taskLink || undefined);
      const descChanged = existing.description !== description;

      if (dateChanged || timeChanged || titleChanged || durationChanged || linkChanged || descChanged) {
        updatedTasks.push({
          ...existing,
          date: eventDateStr, // <--- CRITICAL FIX: Updates date to the event's current date!
          time: timeStr,
          title,
          durationMinutes: duration,
          link: taskLink,
          description,
          updatedAt: now
        });
      }
    } else {
      // New calendar event -> add to Must Do
      newTasks.push({
        id: eventTaskId,
        title,
        description,
        category: 'must_do',
        completed: false,
        date: eventDateStr,
        time: timeStr,
        durationMinutes: duration,
        link: taskLink,
        createdAt: now,
        updatedAt: now
      });
    }
  }

  // Check for any calendar tasks that were deleted from Google Calendar
  // (within the scanned windowStart .. windowEnd)
  for (const t of existingTasks) {
    if (
      t.id.startsWith('gcal-') &&
      !t.isDeleted &&
      t.date >= windowStart &&
      t.date <= windowEnd &&
      !activeEventIds.has(t.id)
    ) {
      // Event no longer exists in Google Calendar -> soft delete it
      updatedTasks.push({
        ...t,
        isDeleted: true,
        updatedAt: now
      });
    }
  }

  return {
    newTasks,
    updatedTasks,
    foundCount: events.length
  };
};
