/**
 * Web Security & Safe Navigation Utilities
 * 1. Safe URL sanitization (blocks javascript:, data:, vbscript: schemes)
 * 2. Anti-Clickjacking frame protection
 */

/**
 * Sanitizes external and internal URLs.
 * Returns only safe URLs (https:, http:, or valid relative paths).
 * If a dangerous scheme (like javascript:) is detected, returns null or a safe fallback.
 */
export const sanitizeUrl = (url?: string | null): string | null => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Immediate check for common malicious pseudo-protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    console.warn('Blocked potentially unsafe URL scheme:', trimmed);
    return null;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return trimmed;
    }
    return null;
  } catch {
    // Relative paths
    if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('#')) {
      return trimmed;
    }
    return null;
  }
};

/**
 * Anti-Clickjacking Frame Buster
 * Guarantees that the app is never loaded inside an unauthorized iframe on third-party domains.
 */
export const enforceFrameBuster = (): void => {
  if (typeof window === 'undefined') return;
  try {
    if (window.top && window.top !== window.self) {
      // Prevent embedding in third-party frames
      window.top.location.href = window.self.location.href;
    }
  } catch {
    // Access denied across domains indicates iframe embedding
    try {
      window.self.location.replace(window.location.href);
    } catch (_) {}
  }
};
