import { Task } from '../types';
import { getTodayDateString } from './storage';

export interface FetchedGoogleDoc {
  docId: string;
  title: string;
  rawText: string;
  body?: any;
  source: 'docs_api' | 'drive_export';
}

/**
 * Fetches a Google Document from the Google Docs API.
 * If the Docs API returns 403 or is unsupported/unauthorized, falls back
 * to plain text Drive export.
 */
export const fetchGoogleDoc = async (
  docId: string,
  accessToken: string
): Promise<FetchedGoogleDoc | null> => {
  try {
    // 1. Attempt Docs API first
    const docsApiUrl = `https://docs.googleapis.com/v1/documents/${docId}`;
    const docsRes = await fetch(docsApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (docsRes.ok) {
      const docData = await docsRes.json();
      const rawText = extractRawTextFromDocsJson(docData);
      return {
        docId,
        title: docData.title || '',
        rawText,
        body: docData.body,
        source: 'docs_api'
      };
    }

    console.warn(
      `Docs API returned ${docsRes.status} for doc ${docId}, attempting Drive export fallback...`
    );
  } catch (docsErr) {
    console.warn(`Docs API fetch error for ${docId}, falling back to Drive export:`, docsErr);
  }

  // 2. Fallback to Drive plain text export
  try {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text/plain`;
    const exportRes = await fetch(exportUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (exportRes.ok) {
      const text = await exportRes.text();
      return {
        docId,
        title: '',
        rawText: text,
        body: text,
        source: 'drive_export'
      };
    }

    console.warn(`Drive export also failed for ${docId} with status ${exportRes.status}`);
    return null;
  } catch (exportErr) {
    console.warn(`Drive export error for ${docId}:`, exportErr);
    return null;
  }
};

/**
 * Extracts plain text from Google Docs API JSON body
 */
export const extractRawTextFromDocsJson = (docData: any): string => {
  if (!docData?.body?.content) return '';
  const lines: string[] = [];

  for (const item of docData.body.content) {
    if (item.paragraph?.elements) {
      let paraText = '';
      for (const el of item.paragraph.elements) {
        if (el.textRun?.content) {
          paraText += el.textRun.content;
        }
      }
      lines.push(paraText);
    }
  }

  return lines.join('');
};

/**
 * Extracts duration in minutes from text (supports Hebrew and English formats).
 */
export const parseDurationMinutes = (text: string): { durationMinutes?: number; cleanedText: string } => {
  let cleaned = text;

  // Hebrew word forms
  if (/שעה\s+וחצי/i.test(cleaned)) {
    return { durationMinutes: 90, cleanedText: cleaned.replace(/שעה\s+וחצי/gi, '').trim() };
  }
  if (/שעתיים/i.test(cleaned)) {
    return { durationMinutes: 120, cleanedText: cleaned.replace(/שעתיים/gi, '').trim() };
  }
  if (/חצי\s+שעה/i.test(cleaned)) {
    return { durationMinutes: 30, cleanedText: cleaned.replace(/חצי\s+שעה/gi, '').trim() };
  }
  if (/רבע\s+שעה/i.test(cleaned)) {
    return { durationMinutes: 15, cleanedText: cleaned.replace(/רבע\s+שעה/gi, '').trim() };
  }

  // Hours: e.g. '1.5 שעות', '2 שעות', '1 שעה', '2h', '1.5h'
  const hoursMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:שעות|שעה|hours|hour|hr|h)\b/i);
  if (hoursMatch) {
    const mins = Math.round(parseFloat(hoursMatch[1]) * 60);
    return {
      durationMinutes: mins,
      cleanedText: cleaned.replace(hoursMatch[0], '').trim()
    };
  }

  // Minutes: e.g. '30 דק', '45 דקות', '60 דק'', '(60m)', '45min', '30m'
  const minsMatch = cleaned.match(/(?:\(?\s*\[?\s*)?(\d+)\s*(?:דקות|דק'|דק|mins|min|m)(?:\s*\]?\s*\)?)/i);
  if (minsMatch) {
    const mins = parseInt(minsMatch[1], 10);
    return {
      durationMinutes: mins,
      cleanedText: cleaned.replace(minsMatch[0], '').trim()
    };
  }

  return { cleanedText: cleaned };
};

/**
 * Extracts date (YYYY-MM-DD) and time (HH:mm) if present in text.
 */
export const parseDateTime = (text: string, defaultDate: string): { date: string; time?: string; cleanedText: string } => {
  let cleaned = text;
  let date = defaultDate;
  let time: string | undefined = undefined;

  // Time pattern: e.g. '14:00', '09:30', 'בשעה 18:30'
  const timeMatch = cleaned.match(/(?:בשעה\s+|at\s+)?\b([01]?\d|2[0-3]):([0-5]\d)\b/i);
  if (timeMatch) {
    const hour = timeMatch[1].padStart(2, '0');
    const min = timeMatch[2];
    time = `${hour}:${min}`;
    cleaned = cleaned.replace(timeMatch[0], '').trim();
  }

  // ISO Date pattern: 2026-11-20
  const isoDateMatch = cleaned.match(/\b(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (isoDateMatch) {
    date = isoDateMatch[0];
    cleaned = cleaned.replace(isoDateMatch[0], '').trim();
    return { date, time, cleanedText: cleaned };
  }

  // Israeli/European Date pattern: 20/11/2026 or 20.11.2026 or 20/11
  const euroDateMatch = cleaned.match(/\b(0?[1-9]|[12]\d|3[01])[/.-](0?[1-9]|1[0-2])(?:[/.-](20\d\d|\d{2}))?\b/);
  if (euroDateMatch) {
    const day = euroDateMatch[1].padStart(2, '0');
    const month = euroDateMatch[2].padStart(2, '0');
    let year = euroDateMatch[3];
    if (!year) {
      year = new Date().getFullYear().toString();
    } else if (year.length === 2) {
      year = `20${year}`;
    }
    date = `${year}-${month}-${day}`;
    cleaned = cleaned.replace(euroDateMatch[0], '').trim();
  }

  return { date, time, cleanedText: cleaned };
};

/**
 * Extracts URL link from text (markdown link or direct URL)
 */
export const parseLink = (text: string): { link?: string; cleanedText: string } => {
  let cleaned = text;

  // Markdown link: [Title](https://...)
  const mdLinkMatch = cleaned.match(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/);
  if (mdLinkMatch) {
    return {
      link: mdLinkMatch[2],
      cleanedText: cleaned.replace(mdLinkMatch[0], mdLinkMatch[1]).trim()
    };
  }

  // Direct URL
  const urlMatch = cleaned.match(/\b(https?:\/\/[^\s\)\>]+)/i);
  if (urlMatch) {
    return {
      link: urlMatch[1],
      cleanedText: cleaned.replace(urlMatch[0], '').trim()
    };
  }

  return { cleanedText: cleaned };
};

interface IntermediateDocItem {
  text: string;
  isCompleted: boolean;
  link?: string;
  heading?: string;
}

/**
 * Parses a Google Document (Docs API structure or plain text string)
 * into structured goal tasks.
 */
export const parseDocForGoals = (
  docTitle: string,
  docContent: any,
  docId: string,
  milestoneTitle: string = 'יעדים',
  targetDate: string = getTodayDateString()
): Task[] => {
  const intermediateItems: IntermediateDocItem[] = [];
  let currentHeading = milestoneTitle;

  // Case A: Google Docs API object with body.content
  if (docContent && typeof docContent === 'object' && Array.isArray(docContent.content)) {
    for (const structElem of docContent.content) {
      if (!structElem.paragraph) continue;
      const para = structElem.paragraph;
      const namedStyle = para.paragraphStyle?.namedStyleType || '';

      // Check if this paragraph is a Heading (sub-milestone)
      let fullParaText = '';
      let isStrikethrough = false;
      let elemLink: string | undefined = undefined;

      if (para.elements) {
        for (const el of para.elements) {
          if (el.textRun?.content) {
            fullParaText += el.textRun.content;
            if (el.textRun.textStyle?.strikethrough) {
              isStrikethrough = true;
            }
            if (el.textRun.textStyle?.link?.url && !elemLink) {
              elemLink = el.textRun.textStyle.link.url;
            }
          }
        }
      }

      const trimmed = fullParaText.trim();
      if (!trimmed) continue;

      if (namedStyle.startsWith('HEADING_')) {
        currentHeading = trimmed;
        continue;
      }

      // Check completion markers
      const hasCompletionMarker =
        isStrikethrough ||
        /\[[xXvV✓✔]\]/.test(trimmed) ||
        /^[☑✅✓✔]/.test(trimmed) ||
        /\b(בוצע|הושלם|done)\b/i.test(trimmed);

      intermediateItems.push({
        text: trimmed,
        isCompleted: hasCompletionMarker,
        link: elemLink,
        heading: currentHeading
      });
    }
  } else {
    // Case B: Raw text string (from Drive text export or fallback)
    const rawString = typeof docContent === 'string' ? docContent : String(docContent || '');
    const lines = rawString.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Detect markdown headings: # Heading, ## Subheading
      if (/^#{1,3}\s+/.test(line)) {
        currentHeading = line.replace(/^#{1,3}\s+/, '').trim();
        continue;
      }

      // Ignore horizontal separators
      if (/^[-=*_]{3,}$/.test(line)) continue;

      // Completion check
      const hasCompletionMarker =
        /\[[xXvV✓✔]\]/.test(line) ||
        /^[☑✅✓✔]/.test(line) ||
        /~~.+~~/.test(line) ||
        /\b(בוצע|הושלם|done)\b/i.test(line);

      intermediateItems.push({
        text: line,
        isCompleted: hasCompletionMarker,
        heading: currentHeading
      });
    }
  }

  const now = new Date().toISOString();
  const tasks: Task[] = [];
  const defaultDocLink = `https://docs.google.com/document/d/${docId}/edit`;

  for (let i = 0; i < intermediateItems.length; i++) {
    const item = intermediateItems[i];
    let workingText = item.text;

    // 1. Remove strikethrough markdown
    workingText = workingText.replace(/~~([^~]+)~~/g, '$1');

    // 2. Remove leading checkbox or bullet markers
    workingText = workingText.replace(/^\[[ xXvV✓✔בוצע]*\]\s*/i, '');
    workingText = workingText.replace(/^[•\-\*\+\d+\.]\s*/, '');
    workingText = workingText.replace(/^[☐☑✅✓✔]\s*/, '');

    // 3. Extract Link
    const linkResult = parseLink(workingText);
    workingText = linkResult.cleanedText;
    const taskLink = item.link || linkResult.link || defaultDocLink;

    // 4. Extract Duration
    const durationResult = parseDurationMinutes(workingText);
    workingText = durationResult.cleanedText;
    const duration = durationResult.durationMinutes || 45;

    // 5. Extract Date & Time
    const dateTimeResult = parseDateTime(workingText, targetDate);
    workingText = dateTimeResult.cleanedText;

    // Clean remaining trailing/leading punctuation
    workingText = workingText
      .replace(/^[:\-–—]\s*/, '')
      .replace(/\s*[:\-–—]$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    // If text became empty or was just metadata, skip
    if (!workingText || workingText.length < 2) continue;

    const milestone = item.heading || milestoneTitle || docTitle;
    const taskId = `goal-doc-${docId}-${i + 1}`;

    tasks.push({
      id: taskId,
      title: workingText,
      description: `מתוך מסמך יעד: "${docTitle || milestone}"`,
      category: 'goals',
      completed: item.isCompleted,
      completedAt: item.isCompleted ? now : undefined,
      date: dateTimeResult.date,
      time: dateTimeResult.time,
      durationMinutes: duration,
      link: taskLink,
      milestoneTitle: milestone,
      goalDocumentId: docId,
      createdAt: now,
      updatedAt: now
    });
  }

  // If no items were parsed (e.g. unstructured prose doc), create one top-level goal task for the document itself
  if (tasks.length === 0 && docTitle) {
    tasks.push({
      id: `goal-doc-${docId}-main`,
      title: docTitle,
      description: `יעד ראשי מתוך Google Drive: "${docTitle}"`,
      category: 'goals',
      completed: false,
      date: targetDate,
      durationMinutes: 60,
      link: defaultDocLink,
      milestoneTitle: milestoneTitle || docTitle,
      goalDocumentId: docId,
      createdAt: now,
      updatedAt: now
    });
  }

  return tasks;
};

/**
 * Updates a Google Document when a goal task status changes in the app.
 * Uses Docs API batchUpdate (replaceAllText) to mark [V] or [ ] or append completion.
 * Gracefully logs and returns false if the document is read-only or update fails.
 */
export const updateGoogleDocGoalStatus = async (
  docId: string,
  accessToken: string,
  taskTitle: string,
  completed: boolean
): Promise<boolean> => {
  if (!docId || !accessToken || !taskTitle) return false;

  const trimmedTitle = taskTitle.trim();
  if (!trimmedTitle) return false;

  try {
    const updateUrl = `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`;
    const requests: any[] = [];

    if (completed) {
      // If task marked completed:
      // Replace unchecked checkbox patterns with checked
      requests.push({
        replaceAllText: {
          containsText: {
            text: `[ ] ${trimmedTitle}`,
            matchCase: false
          },
          replaceText: `[V] ${trimmedTitle}`
        }
      });
      requests.push({
        replaceAllText: {
          containsText: {
            text: `☐ ${trimmedTitle}`,
            matchCase: false
          },
          replaceText: `☑ ${trimmedTitle}`
        }
      });
    } else {
      // If task marked uncompleted:
      // Revert checked markers back to unchecked
      requests.push({
        replaceAllText: {
          containsText: {
            text: `[V] ${trimmedTitle}`,
            matchCase: false
          },
          replaceText: `[ ] ${trimmedTitle}`
        }
      });
      requests.push({
        replaceAllText: {
          containsText: {
            text: `[x] ${trimmedTitle}`,
            matchCase: false
          },
          replaceText: `[ ] ${trimmedTitle}`
        }
      });
      requests.push({
        replaceAllText: {
          containsText: {
            text: `☑ ${trimmedTitle}`,
            matchCase: false
          },
          replaceText: `☐ ${trimmedTitle}`
        }
      });
    }

    const response = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(
        `Google Doc (${docId}) status update returned ${response.status} (possibly read-only):`,
        errText
      );
      return false;
    }

    const result = await response.json().catch(() => ({}));
    console.log(`Successfully synced task "${trimmedTitle}" status to Google Doc (${docId})`, result);
    return true;
  } catch (err) {
    // Graceful fallback for read-only doc, network error, or permission issues
    console.warn(`Safely skipped updating Google Doc (${docId}) - document may be read-only:`, err);
    return false;
  }
};
