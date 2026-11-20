// Parser for natural Hebrew voice task input: Title, Date, Time

export interface ParsedVoiceTask {
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  rawTranscript: string;
  dateLabel?: string;
  addToCalendar?: boolean;
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
 * Format a Date object to YYYY-MM-DD in local time
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
    diff += 7; // Next occurrence
  }
  result.setDate(result.getDate() + diff);
  return result;
}

export function parseVoiceTask(raw: string, baseDateStr?: string): ParsedVoiceTask {
  // Always anchor spoken relative dates ("מחר", "למחר", "היום") to real-world current day
  const realToday = new Date();
  const realTodayStr = formatDate(realToday);

  let text = raw.trim();
  // Default to today (or base date if provided and no spoken date found)
  let matchedDate: string = realTodayStr;
  let dateLabel: string | undefined = undefined;
  let matchedTime: string | undefined = undefined;

  // Calendar intent detection ("יומן", "פגישה", "אירוע", "לוח שנה", "קלנדר", "תור", "זימון")
  const calendarIntentRegex = /(?:^|[\s,.:;!?"'()־-])(?:ב|ל|ה)?(?:יומן|יומנים|יומני|פגישה|פגישת|פגישות|אירוע|אירועים|לוח\s*שנה|לוח\s*השנה|קלנדר|calendar|תור|תורים|זימון)(?:$|[\s,.:;!?"'()־-])/i;
  const calendarPrefixRegex = /^\s*(?:תוסיף|תוסיפי|להוסיף|תרשום|תרשמי|לרשום|תכניס|להכניס|שים|לשים|קבע|לקבוע|תקבע|תקבעי|תזמן|לזמן)\s+(?:לי\s+)?(?:ב|ל)?(?:יומן|יומני|לוח\s*שנה|קלנדר|פגישה|תור)/i;
  const addToCalendar = calendarIntentRegex.test(raw) || calendarPrefixRegex.test(raw);

  // 1. EXTRACT DATE
  // Check "מחרתיים" (including "למחרתיים", "במחרתיים", "שמחרתיים")
  const moxrotayimRegex = /(?:^|[\s,.:;!?"'()־-])(?:ל|ב|ש)?מחרתיים(?:$|[\s,.:;!?"'()־-])/i;
  // Check "מחר" (including "למחר", "במחר", "שמחר", "למחרת")
  const tomorrowRegex = /(?:^|[\s,.:;!?"'()־-])(?:ל|ב|ש)?מחרת?(?:$|[\s,.:;!?"'()־-])/i;
  // Check "היום" (including "להיום", "בהיום", "שהיום")
  const todayRegex = /(?:^|[\s,.:;!?"'()־-])(?:ל|ב|ש)?היום(?:$|[\s,.:;!?"'()־-])/i;
  // Check "בעוד יומיים" / "עוד יומיים" / "בעוד 2 ימים"
  const inTwoDaysRegex = /(?:^|[\s,.:;!?"'()־-])(?:ב?עוד\s+(?:יומיים|2\s+ימים|שני\s+ימים))(?:$|[\s,.:;!?"'()־-])/i;
  // Check "בעוד 3 ימים"
  const inThreeDaysRegex = /(?:^|[\s,.:;!?"'()־-])(?:ב?עוד\s+(?:3|שלושה)\s+ימים)(?:$|[\s,.:;!?"'()־-])/i;
  // Check "שבוע הבא"
  const nextWeekRegex = /(?:^|[\s,.:;!?"'()־-])(?:ל?שבוע\s+הבא|ב?עוד\s+שבוע)(?:$|[\s,.:;!?"'()־-])/i;
  // Check Hebrew day of week
  const dayOfWeekRegex = /(?:^|[\s,.:;!?"'()־-])(?:ביום|ליום|יום|ב|ל)?\s*(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)(?:$|[\s,.:;!?"'()־-])/i;

  if (moxrotayimRegex.test(text)) {
    const d = new Date(realToday);
    d.setDate(d.getDate() + 2);
    matchedDate = formatDate(d);
    dateLabel = 'מחרתיים';
    text = text.replace(moxrotayimRegex, ' ');
  } else if (tomorrowRegex.test(text)) {
    const d = new Date(realToday);
    d.setDate(d.getDate() + 1);
    matchedDate = formatDate(d);
    dateLabel = 'מחר';
    text = text.replace(tomorrowRegex, ' ');
  } else if (todayRegex.test(text)) {
    matchedDate = realTodayStr;
    dateLabel = 'היום';
    text = text.replace(todayRegex, ' ');
  } else if (inTwoDaysRegex.test(text)) {
    const d = new Date(realToday);
    d.setDate(d.getDate() + 2);
    matchedDate = formatDate(d);
    dateLabel = 'בעוד יומיים';
    text = text.replace(inTwoDaysRegex, ' ');
  } else if (inThreeDaysRegex.test(text)) {
    const d = new Date(realToday);
    d.setDate(d.getDate() + 3);
    matchedDate = formatDate(d);
    dateLabel = 'בעוד 3 ימים';
    text = text.replace(inThreeDaysRegex, ' ');
  } else if (nextWeekRegex.test(text)) {
    const d = new Date(realToday);
    d.setDate(d.getDate() + 7);
    matchedDate = formatDate(d);
    dateLabel = 'שבוע הבא';
    text = text.replace(nextWeekRegex, ' ');
  } else {
    const dayMatch = text.match(dayOfWeekRegex);
    if (dayMatch && dayMatch[1]) {
      const dayName = dayMatch[1];
      const targetDay = HEBREW_DAYS_MAP[dayName];
      if (targetDay !== undefined) {
        const nextDate = getNextDayOfWeek(targetDay, realToday);
        matchedDate = formatDate(nextDate);
        dateLabel = `יום ${dayName}`;
        text = text.replace(dayOfWeekRegex, ' ');
      }
    } else {
      // Check explicit numeric date DD/MM or DD.MM
      const explicitDateMatch = text.match(/(?:^|[\s,.:;!?"'()־-])([0-3]?[0-9])[\/\.]([0-1]?[0-9])(?:[\/\.](20\d{2}))?(?:$|[\s,.:;!?"'()־-])/);
      if (explicitDateMatch) {
        const dNum = parseInt(explicitDateMatch[1], 10);
        const mNum = parseInt(explicitDateMatch[2], 10);
        const yNum = explicitDateMatch[3] ? parseInt(explicitDateMatch[3], 10) : realToday.getFullYear();
        if (dNum >= 1 && dNum <= 31 && mNum >= 1 && mNum <= 12) {
          matchedDate = `${yNum}-${String(mNum).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
          dateLabel = `${dNum}/${mNum}`;
          text = text.replace(explicitDateMatch[0], ' ');
        }
      } else if (baseDateStr) {
        // If no explicit or relative date was spoken at all, fall back to baseDateStr
        matchedDate = baseDateStr;
      }
    }
  }

  // 2. EXTRACT TIME
  // Check explicit digital time like 14:30 or ב-10:00 or בשעה 09:15
  const digitalTimeMatch = text.match(/(?:בשעה\s+|ב-|ב\s*)?([0-2]?[0-9]):([0-5][0-9])(?:\s*(?:בבוקר|בצהריים|בערב|בלילה))?/i);
  if (digitalTimeMatch) {
    let h = parseInt(digitalTimeMatch[1], 10);
    const m = parseInt(digitalTimeMatch[2], 10);
    const timeMatchStr = digitalTimeMatch[0];

    // Adjust for PM if words like "בצהריים", "בערב", "בלילה" are in the match
    if (/(?:בערב|בלילה|בצהריים)/i.test(timeMatchStr) && h < 12) {
      h += 12;
    }

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
      const numMatch = text.match(/(?:בשעה\s+|ב-|ב\s*)(\d{1,2})(?!\d)/);
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
  // Clean leftovers of "בשעה", "שעה", "בתאריך", "ליום", "בתאריך", "לשעה"
  text = text.replace(/\b(?:בשעה|שעה|לשעה|בתאריך|ליום)\b/gi, ' ');

  // Clean conversational prefixes: תזכיר לי, תוסיף משימה, להוסיף, לרשום, תרשום, משימה, קבע, ליומן
  text = text.replace(
    /^\s*(?:תזכיר לי|תזכרי לי|תוסיף לי|תוסיפי לי|תוסיף משימה|תוסיפי משימה|תוסיף ליומן|תוסיפי ליומן|להוסיף ליומן|לרשום ביומן|תרשום ביומן|תרשמי ביומן|תכניס ליומן|להכניס ליומן|שים ביומן|לשים ביומן|קבע ביומן|תקבע ביומן|תוסיף|תוסיפי|להוסיף|לרשום|תרשום|תרשמי|תכניס|שים|משימה|תפתח משימה|קבע פגישה|לקבוע פגישה|קבע תור|לקבוע תור|תקבע פגישה|תקבע תור|קבע|לקבוע|תקבע|תקבעי|תזמן|לזמן|יש לי)\s*(?:משימה|ש|את|ליומן|ביומן|לי|ליומני)?\s*/i,
    ''
  );

  // Clean standalone "ביומן" / "ליומן" / "יומן גוגל" / "בלוח שנה" / "בקלנדר"
  text = text.replace(/\b(?:ב|ל|ה)?(?:יומן|יומני)(?:\s+גוגל)?\b/gi, ' ');
  text = text.replace(/\b(?:ב|ל|ה)?לוח\s+(?:ה)?שנה\b/gi, ' ');
  text = text.replace(/\b(?:ב|ל)?קלנדר\b/gi, ' ');

  // Clean trailing and leading dashes, colons, spaces
  text = text
    .replace(/^[\s,.:;־-]+|[\s,.:;־-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // If text starts with "עם ...", make it "פגישה עם ..."
  if (addToCalendar && /^עם\s+/i.test(text)) {
    text = 'פגישה ' + text;
  }

  // Fallback title if all words were parsed as dates/times
  if (!text) {
    text = addToCalendar ? 'אירוע ביומן' : 'משימה קולית חדשה';
  }

  return {
    title: text,
    date: matchedDate,
    time: matchedTime,
    rawTranscript: raw,
    dateLabel,
    addToCalendar
  };
}
