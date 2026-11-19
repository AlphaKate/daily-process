// Parser for natural Hebrew voice task input: Title, Date, Time

export interface ParsedVoiceTask {
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  rawTranscript: string;
  dateLabel?: string;
}

const HEBREW_HOURS_MAP: Record<string, number> = {
  'אחת': 1,
  'אחד': 1,
  'שתיים': 2,
  'שתים': 2,
  'שניים': 2,
  'שלוש': 3,
  'שלושה': 3,
  'ארבע': 4,
  'ארבעה': 4,
  'חמש': 5,
  'חמישה': 5,
  'שש': 6,
  'שישה': 6,
  'שבע': 7,
  'שבעה': 7,
  'שמונה': 8,
  'תשע': 9,
  'עשר': 10,
  'אחת עשרה': 11,
  'אחד עשר': 11,
  'שתים עשרה': 12,
  'שתיים עשרה': 12,
  'שנים עשר': 12,
  'חצות': 0
};

const HEBREW_DAYS_MAP: Record<string, number> = {
  'ראשון': 0,
  'שני': 1,
  'שלישי': 2,
  'רביעי': 3,
  'חמישי': 4,
  'שישי': 5,
  'שבת': 6
};

/**
 * Format a Date to YYYY-MM-DD
 */
export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate the next date matching a target day of the week (0=Sunday ... 6=Saturday)
 */
function getNextDayOfWeek(targetDay: number, baseDate: Date): Date {
  const result = new Date(baseDate);
  const currentDay = result.getDay();
  let diff = targetDay - currentDay;
  if (diff <= 0) {
    diff += 7; // Next week's occurrence
  }
  result.setDate(result.getDate() + diff);
  return result;
}

export function parseVoiceTask(raw: string, baseDateStr?: string): ParsedVoiceTask {
  const now = new Date();
  const baseDate = baseDateStr ? new Date(`${baseDateStr}T12:00:00`) : new Date();

  let text = raw.trim();
  let matchedDate: string = formatDate(baseDate);
  let dateLabel: string | undefined = undefined;
  let matchedTime: string | undefined = undefined;

  // 1. EXTRACT DATE
  // Check "מחרתיים"
  if (/\bמחרתיים\b/i.test(text)) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 2);
    matchedDate = formatDate(d);
    dateLabel = 'מחרתיים';
    text = text.replace(/\bמחרתיים\b/gi, ' ');
  }
  // Check "מחר"
  else if (/\bמחר\b/i.test(text)) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    matchedDate = formatDate(d);
    dateLabel = 'מחר';
    text = text.replace(/\bמחר\b/gi, ' ');
  }
  // Check "היום"
  else if (/\bהיום\b/i.test(text)) {
    matchedDate = formatDate(baseDate);
    dateLabel = 'היום';
    text = text.replace(/\bהיום\b/gi, ' ');
  }
  // Check "בעוד יומיים"
  else if (/בעוד יומיים/i.test(text)) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 2);
    matchedDate = formatDate(d);
    dateLabel = 'בעוד יומיים';
    text = text.replace(/בעוד יומיים/gi, ' ');
  }
  // Check "שבוע הבא"
  else if (/שבוע הבא/i.test(text)) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 7);
    matchedDate = formatDate(d);
    dateLabel = 'שבוע הבא';
    text = text.replace(/שבוע הבא/gi, ' ');
  }
  // Check day of week: ביום ראשון / יום שני / בשישי...
  else {
    const dayMatch = text.match(/(?:ביום|יום|ל|ב)?\s*(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)\b/i);
    if (dayMatch && dayMatch[1]) {
      const dayName = dayMatch[1];
      const targetDay = HEBREW_DAYS_MAP[dayName];
      if (targetDay !== undefined) {
        const nextDate = getNextDayOfWeek(targetDay, baseDate);
        matchedDate = formatDate(nextDate);
        dateLabel = `יום ${dayName}`;
        text = text.replace(dayMatch[0], ' ');
      }
    }
  }

  // Check explicit numeric date DD/MM or DD.MM
  const explicitDateMatch = text.match(/\b([0-3]?[0-9])[\/\.]([0-1]?[0-9])(?:[\/\.](20\d{2}))?\b/);
  if (explicitDateMatch) {
    const dNum = parseInt(explicitDateMatch[1], 10);
    const mNum = parseInt(explicitDateMatch[2], 10);
    const yNum = explicitDateMatch[3] ? parseInt(explicitDateMatch[3], 10) : now.getFullYear();
    if (dNum >= 1 && dNum <= 31 && mNum >= 1 && mNum <= 12) {
      matchedDate = `${yNum}-${String(mNum).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      dateLabel = `${dNum}/${mNum}`;
      text = text.replace(explicitDateMatch[0], ' ');
    }
  }

  // 2. EXTRACT TIME
  // Check explicit digital time like 14:30 or ב-10:00 or בשעה 09:15
  const digitalTimeMatch = text.match(/(?:בשעה\s+|ב-|ב\s*)?([0-2]?[0-9]):([0-5][0-9])\b/);
  if (digitalTimeMatch) {
    const h = parseInt(digitalTimeMatch[1], 10);
    const m = parseInt(digitalTimeMatch[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      matchedTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      text = text.replace(digitalTimeMatch[0], ' ');
    }
  }

  // Check word-based or single-number time if no digital time found
  if (!matchedTime) {
    let hour: number | null = null;
    let minutes = 0;
    let isPM = false;
    let isAM = false;

    // Check periods of day
    if (/\b(?:בערב|בלילה|אחר הצהריים|אחה"צ|אחה״צ)\b/i.test(text)) {
      isPM = true;
      text = text.replace(/\b(?:בערב|בלילה|אחר הצהריים|אחה"צ|אחה״צ)\b/gi, ' ');
    } else if (/\b(?:בצהריים|בצהרים)\b/i.test(text)) {
      // In Hebrew, 12, 1, 2, 3, 4 pm are "בצהריים"
      isPM = true;
      text = text.replace(/\b(?:בצהריים|בצהרים)\b/gi, ' ');
    } else if (/\b(?:בבוקר|בבקר)\b/i.test(text)) {
      isAM = true;
      text = text.replace(/\b(?:בבוקר|בבקר)\b/gi, ' ');
    }

    // Minutes additions like "וחצי", "ורבע", "ועשרים"
    if (/\bוחצי\b/i.test(text)) {
      minutes = 30;
      text = text.replace(/\bוחצי\b/gi, ' ');
    } else if (/\bורבע\b/i.test(text)) {
      minutes = 15;
      text = text.replace(/\bורבע\b/gi, ' ');
    } else if (/\bועשרים\b/i.test(text)) {
      minutes = 20;
      text = text.replace(/\bועשרים\b/gi, ' ');
    } else if (/\bושלושת רבעי\b|\bשלושת רבעי\b/i.test(text)) {
      minutes = 45;
      text = text.replace(/\bושלושת רבעי\b|\bשלושת רבעי\b/gi, ' ');
    }

    // Check Hebrew number word for hour: בשעה אחת עשרה / בארבע / בשמונה / בשעה שלוש
    for (const [word, num] of Object.entries(HEBREW_HOURS_MAP)) {
      const wordRegex = new RegExp(`(?:בשעה|שעה|ב-|ב)?\\s*\\b${word}\\b`, 'i');
      if (wordRegex.test(text)) {
        hour = num;
        text = text.replace(wordRegex, ' ');
        break;
      }
    }

    // If still no hour word, check single number: בשעה 16 / ב-4 / ב 10
    if (hour === null) {
      const numMatch = text.match(/(?:בשעה\s+|ב-|ב\s*)(\d{1,2})\b/);
      if (numMatch) {
        const val = parseInt(numMatch[1], 10);
        if (val >= 0 && val <= 23) {
          hour = val;
          text = text.replace(numMatch[0], ' ');
        }
      }
    }

    if (hour !== null) {
      // Adjust for PM/AM
      if (isPM && hour < 12) {
        hour += 12;
      } else if (!isAM && !isPM) {
        // If unspecified and hour is between 1 and 6, assume afternoon (e.g. "בארבע" = 16:00, "בחמש וחצי" = 17:30)
        if (hour >= 1 && hour <= 6) {
          hour += 12;
        }
      }
      matchedTime = `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  // 3. CLEAN UP TASK TITLE
  // Clean leftovers of "בשעה", "שעה", "ב-", "ב", "בתאריך", "ליום"
  text = text.replace(/\b(?:בשעה|שעה|בתאריך|ליום)\b/gi, ' ');

  // Clean conversational prefixes: תזכיר לי, תוסיף משימה, להוסיף, לרשום, תרשום, משימה, קבע
  text = text.replace(
    /^\s*(?:תזכיר לי|תזכרי לי|תוסיף לי|תוסיפי לי|תוסיף משימה|תוסיפי משימה|תוסיף|תוסיפי|להוסיף|לרשום|תרשום|תרשמי|משימה|תפתח משימה|קבע|לקבוע|יש לי)\s*(?:משימה|ש|את)?\s*/i,
    ''
  );

  // Clean trailing and leading dashes, colons, spaces
  text = text
    .replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Fallback title if all words were parsed as dates/times
  if (!text) {
    text = 'משימה קולית חדשה';
  }

  return {
    title: text,
    date: matchedDate,
    time: matchedTime,
    rawTranscript: raw,
    dateLabel
  };
}
