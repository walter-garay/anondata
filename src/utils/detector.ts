export type PIICategory = 'email' | 'ip' | 'credit_card' | 'uuid' | 'api_key' | 'phone' | 'password';

export interface PIIRule {
  id: PIICategory;
  label: string;
  description: string;
  pattern: RegExp;
  color: string; // CSS color variable name or hex
  defaultAction: 'redact' | 'hash' | 'fake' | 'keep';
}

export const PII_RULES: PIIRule[] = [
  {
    id: 'api_key',
    label: 'API Keys & Tokens',
    description: 'Cloud credentials, Stripe, GitHub, AWS, and generic auth tokens',
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b|\bsk_(?:live|test)_[0-9a-zA-Z]{24}\b|\bgh[pso]_[0-9a-zA-Z]{36,40}\b|\b(?:Bearer\s+)[a-zA-Z0-9\-._~+/]+=*\b/g,
    color: 'var(--color-api-key)',
    defaultAction: 'redact'
  },
  {
    id: 'email',
    label: 'Email Addresses',
    description: 'Electronic mail addresses (e.g., user@domain.com)',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    color: 'var(--color-email)',
    defaultAction: 'fake'
  },
  {
    id: 'ip',
    label: 'IP Addresses',
    description: 'IPv4 and IPv6 network identifiers',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b|\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b/g,
    color: 'var(--color-ip)',
    defaultAction: 'hash'
  },
  {
    id: 'credit_card',
    label: 'Credit Cards',
    description: 'Visa, Mastercard, American Express, and Discover card numbers',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    color: 'var(--color-credit-card)',
    defaultAction: 'redact'
  },
  {
    id: 'uuid',
    label: 'UUIDs / GUIDs',
    description: 'Universally Unique Identifiers',
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    color: 'var(--color-uuid)',
    defaultAction: 'keep'
  },
  {
    id: 'phone',
    label: 'Phone Numbers',
    description: 'International and national telephone numbers',
    pattern: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    color: 'var(--color-phone)',
    defaultAction: 'fake'
  }
];

export interface DetectedEntity {
  id: string; // Unique identifier for this occurrence
  category: PIICategory;
  value: string;
  start: number;
  end: number;
  row?: number; // CSV line number
  col?: string; // CSV column name
  keyPath?: string; // JSON path e.g. "users.0.email"
}

/**
 * Scan standard raw text to find occurrences of sensitive information.
 */
export function scanRawText(text: string): DetectedEntity[] {
  const findings: DetectedEntity[] = [];
  let idCounter = 0;

  for (const rule of PII_RULES) {
    // Reset regexp lastIndex
    rule.pattern.lastIndex = 0;
    let match;
    
    // Create a copy of regex to avoid global flag issues
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      findings.push({
        id: `${rule.id}-${idCounter++}`,
        category: rule.id,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }

  // Sort findings by start index ascending
  return findings.sort((a, b) => a.start - b.start);
}

/**
 * Heuristics to check if a key in JSON indicates credentials/secrets
 */
export function isSecretKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  const secretKeywords = ['password', 'passwd', 'secret', 'token', 'key', 'passphrase', 'credential', 'private', 'auth_token', 'apikey'];
  return secretKeywords.some(keyword => lowerKey.includes(keyword));
}
