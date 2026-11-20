/**
 * DLP (Data Loss Prevention) Service
 * Scans user input for sensitive information:
 * 1. Israeli ID numbers (with official modulo 10 checksum verification)
 * 2. Credit card numbers (with Luhn algorithm verification)
 * 3. Bank account / IBAN information
 */

export interface DLPFinding {
  type: 'id_number' | 'credit_card' | 'bank_account';
  label: string;
  snippet: string;
  details: string;
}

export interface DLPScanResult {
  hasSensitiveData: boolean;
  findings: DLPFinding[];
}

/**
 * Validates Israeli ID number using the standard Modulo 10 checksum algorithm.
 */
export const isValidIsraeliId = (idStr: string): boolean => {
  const clean = idStr.replace(/\D/g, '');
  if (clean.length < 5 || clean.length > 9) return false;
  // Pad with leading zeros to 9 digits
  const padded = clean.padStart(9, '0');

  // Avoid all identical digits (e.g. 000000000 or 111111111)
  if (/^(\d)\1{8}$/.test(padded)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let num = Number(padded[i]) * ((i % 2) + 1);
    if (num > 9) num -= 9;
    sum += num;
  }
  return sum % 10 === 0;
};

/**
 * Validates Credit Card number using the Luhn Algorithm.
 */
export const isValidCreditCard = (cardNumber: string): boolean => {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

/**
 * Mask sensitive string for safe UI presentation (e.g., "1234****9" or "4580 **** **** 1234").
 */
export const maskSensitiveString = (str: string, type: 'id' | 'card' | 'bank'): string => {
  const clean = str.trim();
  if (type === 'id') {
    if (clean.length <= 4) return '***';
    return clean.slice(0, 2) + '****' + clean.slice(-2);
  }
  if (type === 'card') {
    const digits = clean.replace(/\D/g, '');
    if (digits.length <= 4) return '****';
    return digits.slice(0, 4) + ' **** **** ' + digits.slice(-4);
  }
  return clean.slice(0, 3) + '****';
};

/**
 * Scans any text (or combination of title and description) for sensitive data.
 */
export const scanTextForSensitiveData = (text: string): DLPScanResult => {
  if (!text || !text.trim()) {
    return { hasSensitiveData: false, findings: [] };
  }

  const findings: DLPFinding[] = [];

  // 1. Scan for Credit Cards (13 to 19 digits formatted or unformatted)
  const ccRegex = /\b(?:\d[ -]*?){13,19}\b/g;
  let ccMatch: RegExpExecArray | null;
  while ((ccMatch = ccRegex.exec(text)) !== null) {
    const rawMatch = ccMatch[0];
    const digits = rawMatch.replace(/\D/g, '');
    if (digits.length >= 13 && digits.length <= 19 && isValidCreditCard(rawMatch)) {
      findings.push({
        type: 'credit_card',
        label: 'מספר כרטיס אשראי',
        snippet: maskSensitiveString(digits, 'card'),
        details: 'זוהה מספר כרטיס אשראי תקין (אלגוריתם Luhn).'
      });
    }
  }

  // 2. Scan for Israeli ID numbers
  // Matches standalone 8-9 digit tokens, or tokens preceded by id keywords
  const idKeywordRegex = /(?:ת["״׳'.]?ז|תעודת\s+זהות|ת\.ז|זהות|id)[:\s]*(\d{7,9})\b/gi;
  let idKeyMatch: RegExpExecArray | null;
  const inspectedIds = new Set<string>();

  while ((idKeyMatch = idKeywordRegex.exec(text)) !== null) {
    const candidate = idKeyMatch[1];
    if (candidate && isValidIsraeliId(candidate)) {
      inspectedIds.add(candidate);
      findings.push({
        type: 'id_number',
        label: 'מספר תעודת זהות',
        snippet: maskSensitiveString(candidate, 'id'),
        details: 'זוהה מספר תעודת זהות ישראלית תקין (ספרת ביקורת תקינה).'
      });
    }
  }

  // Scan standalone 8-9 digit numbers that were not caught by keyword regex
  const standaloneDigitsRegex = /\b\d{8,9}\b/g;
  let standaloneMatch: RegExpExecArray | null;
  while ((standaloneMatch = standaloneDigitsRegex.exec(text)) !== null) {
    const candidate = standaloneMatch[0];
    if (!inspectedIds.has(candidate) && isValidIsraeliId(candidate)) {
      // Ensure it is not a timestamp or already matched as part of credit card
      const isPartOfCC = findings.some(f => f.type === 'credit_card' && f.snippet.includes(candidate.slice(-4)));
      if (!isPartOfCC) {
        inspectedIds.add(candidate);
        findings.push({
          type: 'id_number',
          label: 'מספר תעודת זהות',
          snippet: maskSensitiveString(candidate, 'id'),
          details: 'זוהה מספר בעל מבנה של תעודת זהות ישראלית תקינה.'
        });
      }
    }
  }

  // 3. Scan for Bank Account / IBAN patterns
  // Israeli IBAN pattern: IL + 21 alphanumeric chars
  const ibanRegex = /\bIL\d{2}[A-Z0-9]{19}\b/gi;
  let ibanMatch: RegExpExecArray | null;
  while ((ibanMatch = ibanRegex.exec(text)) !== null) {
    findings.push({
      type: 'bank_account',
      label: 'מספר חשבון בנק בינלאומי (IBAN)',
      snippet: maskSensitiveString(ibanMatch[0], 'bank'),
      details: 'זוהה מספר חשבון בנק בפורמט IBAN ישראלי.'
    });
  }

  // Bank keywords + numbers: "בנק X סניף Y חשבון Z"
  const bankHebrewRegex = /(?:חשבון\s+בנק|סניף\s*\d+|מספר\s+חשבון\s*[:\s]*\d{5,})/gi;
  if (bankHebrewRegex.test(text) && findings.every(f => f.type !== 'bank_account')) {
    findings.push({
      type: 'bank_account',
      label: 'פרטי חשבון בנק / סניף',
      snippet: 'פרטי חשבון',
      details: 'זוהו ביטויים המעידים על פרטי חשבון בנק או סניף.'
    });
  }

  return {
    hasSensitiveData: findings.length > 0,
    findings
  };
};
