const SCRIPT_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_RE = /\s+on\w+\s*=/gi;
const DANGEROUS_ATTRS = /\s+(href|src|action)\s*=\s*["']javascript:/gi;

export function sanitizeHtml(input: string): string {
  let clean = input;
  clean = clean.replace(SCRIPT_RE, '');
  clean = clean.replace(EVENT_HANDLER_RE, ' ');
  clean = clean.replace(DANGEROUS_ATTRS, ' $1="');
  return clean;
}

export function sanitizeText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

export function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  return input.slice(0, maxLength - 3) + '...';
}
