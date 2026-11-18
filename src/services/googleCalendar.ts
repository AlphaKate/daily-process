import { Task } from '../types';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
}

export const fetchCalendarEventsForDate = async (
  dateStr: string, // YYYY-MM-DD
  accessToken: string
): Promise<CalendarEvent[]> => {
  const startOfDay = new Date(`${dateStr}T00:00:00Z`).toISOString();
  const endOfDay = new Date(`${dateStr}T23:59:59Z`).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    startOfDay
  )}&timeMax=${encodeURIComponent(
    endOfDay
  )}&singleEvents=true&orderBy=startTime&maxResults=50`;

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
): Promise<{ newTasks: Task[]; foundCount: number }> => {
  const events = await fetchCalendarEventsForDate(dateStr, accessToken);
  const now = new Date().toISOString();
  const newTasks: Task[] = [];

  for (const event of events) {
    const existing = existingTasks.find(
      t => t.id === `gcal-${event.id}` || (t.title === event.summary && t.date === dateStr && t.category === 'must_do')
    );

    if (!existing) {
      let timeStr: string | undefined = undefined;
      let duration: number | undefined = undefined;

      if (event.start?.dateTime) {
        const start = new Date(event.start.dateTime);
        const hours = String(start.getHours()).padStart(2, '0');
        const minutes = String(start.getMinutes()).padStart(2, '0');
        timeStr = `${hours}:${minutes}`;

        if (event.end?.dateTime) {
          const end = new Date(event.end.dateTime);
          duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        }
      }

      newTasks.push({
        id: `gcal-${event.id}`,
        title: event.summary || 'פגישה ללא כותרת',
        description: event.description ? `מתוך יומן Google:\n${event.description}` : 'מתוך יומן Google Calendar',
        category: 'must_do',
        completed: false,
        date: dateStr,
        time: timeStr,
        durationMinutes: duration,
        link: event.htmlLink,
        createdAt: now,
        updatedAt: now
      });
    }
  }

  return {
    newTasks,
    foundCount: events.length
  };
};
