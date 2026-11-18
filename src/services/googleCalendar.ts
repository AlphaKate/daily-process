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
 * Calculates start and end of day using local date boundaries to avoid UTC offset bugs (e.g. UTC+2/UTC+3 in Israel).
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

  // Fallback if date string isn't standard YYYY-MM-DD
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
 * Priority:
 * 1. event.hangoutLink
 * 2. event.conferenceData.entryPoints (video type or meet/zoom/teams URL)
 * 3. Links found in event.location or event.description
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
        // Strip trailing punctuation (e.g. '.', ',', ';', ')')
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

export const fetchCalendarEventsForDate = async (
  dateStr: string, // YYYY-MM-DD
  accessToken: string
): Promise<CalendarEvent[]> => {
  const { timeMin, timeMax } = getLocalDateBounds(dateStr);

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
  return data.items || [];
};

export const syncCalendarEventsToTasks = async (
  dateStr: string,
  accessToken: string,
  existingTasks: Task[]
): Promise<CalendarSyncResult> => {
  const events = await fetchCalendarEventsForDate(dateStr, accessToken);
  const now = new Date().toISOString();
  const newTasks: Task[] = [];
  const updatedTasks: Task[] = [];

  for (const event of events) {
    // Skip cancelled events
    if (event.status === 'cancelled') {
      continue;
    }

    const eventTaskId = `gcal-${event.id}`;
    const existing = existingTasks.find(
      t =>
        t.id === eventTaskId ||
        (t.title === (event.summary || 'פגישה ללא כותרת') && t.date === dateStr && t.category === 'must_do')
    );

    // Parse start and duration
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

    const title = event.summary?.trim() || 'פגישה ללא כותרת';
    const meetingLink = extractMeetingLink(event);
    const taskLink = meetingLink || event.htmlLink || undefined;
    const description = buildTaskDescription(event, meetingLink);

    if (existing) {
      // 1. If soft-deleted, do NOT resurrect it
      if (existing.isDeleted) {
        continue;
      }

      // 2. If not completed, update if start time, duration, title, meeting link, or description changed
      if (!existing.completed) {
        const titleChanged = existing.title !== title;
        const timeChanged = (existing.time || undefined) !== (timeStr || undefined);
        const durationChanged = (existing.durationMinutes || undefined) !== (duration || undefined);
        const linkChanged = (existing.link || undefined) !== (taskLink || undefined);
        const descChanged = existing.description !== description;

        if (titleChanged || timeChanged || durationChanged || linkChanged || descChanged) {
          updatedTasks.push({
            ...existing,
            title,
            time: timeStr,
            durationMinutes: duration,
            link: taskLink,
            description,
            updatedAt: now
          });
        }
      }
    } else {
      // 3. New event
      newTasks.push({
        id: eventTaskId,
        title,
        description,
        category: 'must_do',
        completed: false,
        date: dateStr,
        time: timeStr,
        durationMinutes: duration,
        link: taskLink,
        createdAt: now,
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
