import { Task } from '../types';

export interface GoogleContactBirthday {
  resourceName: string;
  contactId: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  birthMonth: number; // 1-12
  birthDay: number; // 1-31
  birthYear?: number;
  phone?: string;
  email?: string;
  photoUrl?: string;
}

export const getCachedContactsBirthdays = (): GoogleContactBirthday[] => {
  try {
    const raw = localStorage.getItem('google_contacts_birthdays_cache_v1');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveCachedContactsBirthdays = (contacts: GoogleContactBirthday[]): void => {
  try {
    localStorage.setItem('google_contacts_birthdays_cache_v1', JSON.stringify(contacts));
  } catch (e) {
    console.warn('Failed to cache contacts birthdays:', e);
  }
};

export const addCustomBirthday = (
  name: string,
  month: number,
  day: number,
  year?: number,
  phone?: string
): GoogleContactBirthday => {
  const existing = getCachedContactsBirthdays();
  const contactId = `custom-bday-${Date.now()}`;
  const newContact: GoogleContactBirthday = {
    resourceName: `custom/${contactId}`,
    contactId,
    displayName: name.trim(),
    birthMonth: month,
    birthDay: day,
    birthYear: year,
    phone: phone?.trim()
  };
  const updated = [newContact, ...existing];
  saveCachedContactsBirthdays(updated);
  return newContact;
};

export const deleteCustomBirthday = (contactId: string): void => {
  const existing = getCachedContactsBirthdays();
  const updated = existing.filter(c => c.contactId !== contactId);
  saveCachedContactsBirthdays(updated);
};

export interface ContactsSyncResult {
  newTasks: Task[];
  updatedTasks: Task[];
  foundCount: number;
  scopeRequired?: boolean;
}

/**
 * Generates rich, diverse Hebrew birthday greeting options
 */
export const generateBirthdayGreetingVariants = (name: string, age?: number): string[] => {
  const cleanName = name.trim() || 'חבר/ה יקר/ה';
  
  const options = [
    // 1. Warm & heartfelt
    `מזל טוב ${cleanName} היקר/ה! 🎉🎂 המון בריאות, אושר, שמחה והגשמת כל המשאלות. שתהיה שנה מופלאה ומלאת רגעים יפים ומיוחדים! ✨`,
    
    // 2. Inspiring & festive
    `יום הולדת שמח ${cleanName}! 🥳🎈 מאחל/ת לך שנה מדהימה של צמיחה, שמחה אמיתית, בריאות איתנה ואינסוף סיבות לחייך ולשמוח! 🌟`,
    
    // 3. Short & punchy (WhatsApp classic)
    `המון המון מזל טוב ליום ההולדת ${cleanName}! 🎁 שתזכה/י לשנה מבורכת, שפע של נחת והצלחה בכל מעשי ידייך! 🥂`,
    
    // 4. Age milestone (if known) or warm personal
    age && age > 0
      ? `מזל טוב ענקי ליום הולדת ה-${age} ${cleanName}! 🎂🎉 ציון דרך מרגש ומיוחד! מאחל/ת לך עוד המון שנים טובות של בריאות, אהבה, הגשמה והישגים נהדרים! 💖`
      : `שיהיה יום הולדת הכי שמח שיש ${cleanName}! 🎊 שתמיד תהיה מוקף/ת באנשים טובים ובאנרגיות מעולות, ושתמשיך/י להפיץ המון אור סביבך! 🚀`,
    
    // 5. Joyful & cheerful
    `מזל טוב ${cleanName}! 🍰 עוד שנה של חוכמה, קסם ויופי! שרק תמשיך/י לפרוח, לחגוג את החיים בגדול ולהגשים את כל החלומות! 🍾`
  ];

  return options;
};

/**
 * Returns the default greeting recommendation
 */
export const getDefaultBirthdayGreeting = (name: string, age?: number): string => {
  return generateBirthdayGreetingVariants(name, age)[0];
};

/**
 * Detects whether any task is a birthday task, regardless of source (Contacts, Calendar, Voice, Manual)
 */
export const isBirthdayTaskCheck = (task: {
  id?: string;
  title?: string;
  description?: string;
  birthdayGreeting?: string;
}): boolean => {
  if (task.id && (task.id.startsWith('gcontact-') || task.id.includes('bday'))) return true;
  if (Boolean(task.birthdayGreeting)) return true;
  const text = `${task.title || ''} ${task.description || ''}`;
  return /יום\s*הולדת|יומהולדת|יום-הולדת|\bbirthday\b|\bbday\b|🎂|🎈/i.test(text);
};

/**
 * Extracts the person's name from birthday task titles (Hebrew and English)
 */
export const extractBirthdayPersonName = (title: string, contactName?: string): string => {
  if (contactName && contactName.trim()) return contactName.trim();
  let clean = (title || '').replace(/[🎂🎈🎉]/g, '').trim();
  clean = clean.replace(/^(?:משימה:?\s*)?(?:יום\s*הולדת|יומהולדת|יום-הולדת)\s*(?:של|ל|לכבוד|-)?\s*/i, '');
  clean = clean.replace(/^birthday\s*(?:of)?\s*/i, '');
  clean = clean.replace(/\s*-\s*(?:יום\s*הולדת|יומהולדת|יום-הולדת).*$/i, '');
  clean = clean.replace(/'s\s*birthday.*$/i, '');
  clean = clean.replace(/\((?:גיל\s*)?\d+\)/g, '').trim();
  return clean || 'חבר/ה יקר/ה';
};

/**
 * Generates a direct WhatsApp click-to-chat URL with the greeting pre-filled
 */
export const formatWhatsAppBirthdayLink = (phone?: string, text?: string): string => {
  const encoded = text ? encodeURIComponent(text) : '';
  if (!phone || !phone.trim()) {
    return `https://wa.me/?text=${encoded}`;
  }

  // Remove non-digit characters (keep digits only)
  let clean = phone.replace(/[^\d]/g, '');

  // Format Israeli numbers
  if (clean.startsWith('05')) {
    clean = '972' + clean.slice(1);
  } else if (clean.startsWith('0')) {
    clean = '972' + clean.slice(1);
  }

  return `https://wa.me/${clean}?text=${encoded}`;
};

/**
 * Fetches contacts with birthdays from Google People API
 */
export const fetchGoogleContactsBirthdays = async (
  accessToken: string
): Promise<{ contacts: GoogleContactBirthday[]; scopeRequired?: boolean }> => {
  if (!accessToken) {
    return { contacts: [] };
  }

  const contactsWithBirthdays: GoogleContactBirthday[] = [];
  let nextPageToken: string | undefined = undefined;
  let pageCount = 0;
  const maxPages = 4; // limit to ~4000 contacts to keep sync fast

  try {
    do {
      const url: string = `https://people.googleapis.com/v1/people/me/connections?personFields=names,birthdays,phoneNumbers,emailAddresses,photos&pageSize=1000${
        nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : ''
      }`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        }
      });

      if (res.status === 401 || res.status === 403) {
        console.warn('Google People API permission required or expired (status: ' + res.status + ')');
        return { contacts: [], scopeRequired: true };
      }

      if (!res.ok) {
        console.warn(`Google Contacts fetch error: ${res.status} ${res.statusText}`);
        break;
      }

      const data = await res.json();
      const connections = data.connections || [];

      for (const person of connections) {
        const birthdays = person.birthdays || [];
        if (!birthdays || birthdays.length === 0) continue;

        // Find birthday with valid month and day (supporting date object or formatted text)
        let birthMonth: number | undefined = undefined;
        let birthDay: number | undefined = undefined;
        let birthYear: number | undefined = undefined;

        for (const b of birthdays) {
          if (b.date && typeof b.date.month === 'number' && typeof b.date.day === 'number') {
            birthMonth = b.date.month;
            birthDay = b.date.day;
            if (typeof b.date.year === 'number') birthYear = b.date.year;
            break;
          } else if (b.text && typeof b.text === 'string') {
            const iso = b.text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
            if (iso) {
              birthYear = parseInt(iso[1], 10);
              birthMonth = parseInt(iso[2], 10);
              birthDay = parseInt(iso[3], 10);
              break;
            }
            const dmy = b.text.match(/^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{4}))?/);
            if (dmy) {
              birthDay = parseInt(dmy[1], 10);
              birthMonth = parseInt(dmy[2], 10);
              if (dmy[3]) birthYear = parseInt(dmy[3], 10);
              break;
            }
          }
        }

        if (birthMonth === undefined || birthDay === undefined) continue;

        const names = person.names || [];
        const primaryName = names.find((n: any) => n.metadata?.primary) || names[0];
        const displayName = primaryName?.displayName || 'איש קשר ללא שם';
        const givenName = primaryName?.givenName;
        const familyName = primaryName?.familyName;

        // Primary phone
        const phones = person.phoneNumbers || [];
        const primaryPhone = phones.find((p: any) => p.metadata?.primary) || phones[0];
        const phone = primaryPhone?.value;

        // Primary email
        const emails = person.emailAddresses || [];
        const primaryEmail = emails.find((e: any) => e.metadata?.primary) || emails[0];
        const email = primaryEmail?.value;

        // Photo
        const photos = person.photos || [];
        const photoUrl = photos[0]?.url;

        // Sanitize resourceName to ID
        const resourceName = person.resourceName || `person-${Date.now()}`;
        const contactId = resourceName.replace(/[^a-zA-Z0-9_-]/g, '_');

        contactsWithBirthdays.push({
          resourceName,
          contactId,
          displayName,
          givenName,
          familyName,
          birthMonth,
          birthDay,
          birthYear,
          phone,
          email,
          photoUrl
        });
      }

      nextPageToken = data.nextPageToken;
      pageCount++;
    } while (nextPageToken && pageCount < maxPages);

    if (contactsWithBirthdays.length > 0) {
      const customOnly = getCachedContactsBirthdays().filter(c => c.resourceName.startsWith('custom/'));
      saveCachedContactsBirthdays([...customOnly, ...contactsWithBirthdays]);
    }

    return { contacts: contactsWithBirthdays, scopeRequired: false };
  } catch (err: any) {
    console.warn('Error fetching Google Contacts birthdays:', err);
    return { contacts: [] };
  }
};

/**
 * Calculates occurrences of a birthday within a date window (-7 to +60 days)
 */
const findOccurrencesInWindow = (
  contact: GoogleContactBirthday,
  windowStart: Date,
  windowEnd: Date
): Array<{ dateStr: string; year: number; age?: number }> => {
  const occurrences: Array<{ dateStr: string; year: number; age?: number }> = [];
  const startYear = windowStart.getFullYear();
  const endYear = windowEnd.getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    // Construct date for this year
    // Note: handle leap years (e.g. Feb 29)
    let day = contact.birthDay;
    if (contact.birthMonth === 2 && day === 29) {
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      if (!isLeap) day = 28;
    }

    const occurrenceDate = new Date(year, contact.birthMonth - 1, day, 12, 0, 0, 0);

    if (occurrenceDate >= windowStart && occurrenceDate <= windowEnd) {
      const mStr = String(contact.birthMonth).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;
      const age = contact.birthYear ? year - contact.birthYear : undefined;

      occurrences.push({
        dateStr,
        year,
        age
      });
    }
  }

  return occurrences;
};

/**
 * Synchronizes Google Contacts birthdays into Must Do tasks
 */
export const syncContactsBirthdaysToTasks = async (
  currentDate: string,
  accessToken: string,
  existingTasks: Task[],
  daysBack: number = 7,
  daysForward: number = 60
): Promise<ContactsSyncResult> => {
  const [cy, cm, cd] = (currentDate || '').split('-').map(Number);
  const baseDate = !isNaN(cy) && !isNaN(cm) && !isNaN(cd) ? new Date(cy, cm - 1, cd) : new Date();
  const windowStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - daysBack, 0, 0, 0, 0);
  const windowEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + daysForward, 23, 59, 59, 999);

  const { contacts, scopeRequired } = await fetchGoogleContactsBirthdays(accessToken);

  const customBirthdays = getCachedContactsBirthdays().filter(c => c.resourceName.startsWith('custom/'));
  const allContacts = [...contacts, ...customBirthdays];

  if (scopeRequired && allContacts.length === 0) {
    return {
      newTasks: [],
      updatedTasks: [],
      foundCount: 0,
      scopeRequired: true
    };
  }

  const newTasks: Task[] = [];
  const updatedTasks: Task[] = [];
  const existingTasksMap = new Map<string, Task>();
  existingTasks.forEach(t => existingTasksMap.set(t.id, t));

  const nowIso = new Date().toISOString();

  for (const contact of allContacts) {
    const occurrences = findOccurrencesInWindow(contact, windowStart, windowEnd);

    for (const occ of occurrences) {
      const taskId = `gcontact-bday-${contact.contactId}-${occ.year}`;
      const existing = existingTasksMap.get(taskId);

      const greeting = existing?.birthdayGreeting || getDefaultBirthdayGreeting(contact.displayName, occ.age);
      const title = `🎂 יום הולדת ל${contact.displayName}${occ.age ? ` (${occ.age})` : ''}`;
      const description = `יום הולדת מתוך Google Contacts 🎉\n${
        occ.age ? `חוגג/ת גיל ${occ.age} 🎈\n` : ''
      }${contact.phone ? `טלפון: ${contact.phone}\n` : ''}💌 הצעת ברכה לשליחה:\n"${greeting}"`;

      if (existing) {
        // Only update if not completed and fields changed or missing
        let hasChanges = false;
        const updated: Task = { ...existing };

        if (!existing.birthdayGreeting) {
          updated.birthdayGreeting = greeting;
          hasChanges = true;
        }
        if (contact.phone && existing.contactPhone !== contact.phone) {
          updated.contactPhone = contact.phone;
          hasChanges = true;
        }
        if (occ.age && existing.birthdayAge !== occ.age) {
          updated.birthdayAge = occ.age;
          hasChanges = true;
        }
        if (existing.date !== occ.dateStr) {
          updated.date = occ.dateStr;
          hasChanges = true;
        }

        if (hasChanges) {
          updated.updatedAt = nowIso;
          updatedTasks.push(updated);
        }
      } else {
        // Create new task
        const newTask: Task = {
          id: taskId,
          title,
          description,
          category: 'must_do',
          completed: false,
          date: occ.dateStr,
          durationMinutes: 10,
          contactId: contact.contactId,
          contactName: contact.displayName,
          contactPhone: contact.phone,
          birthdayGreeting: greeting,
          birthdayAge: occ.age,
          createdAt: nowIso,
          updatedAt: nowIso
        };

        newTasks.push(newTask);
      }
    }
  }

  return {
    newTasks,
    updatedTasks,
    foundCount: contacts.length,
    scopeRequired: false
  };
};
