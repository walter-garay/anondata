import { type DetectedEntity, type PIICategory, isSecretKey, scanRawText } from './detector';
import { getFakeValue, getRedactedPlaceholder, sha256Sync } from './faker';
import Papa from 'papaparse';

/**
 * Returns the masked replacement string for a given PII value and category.
 */
export function getReplacement(
  category: PIICategory,
  value: string,
  action: 'redact' | 'hash' | 'fake' | 'keep'
): string {
  if (action === 'keep') return value;
  if (action === 'redact') return getRedactedPlaceholder(category);
  if (action === 'hash') return sha256Sync(value);
  if (action === 'fake') return getFakeValue(category, value);
  return value;
}

/**
 * Replace findings in raw text from end-to-start (reverse index) to avoid offset shifting.
 */
export function maskRawText(
  text: string,
  findings: DetectedEntity[],
  rules: Record<PIICategory, 'redact' | 'hash' | 'fake' | 'keep'>
): string {
  const sorted = [...findings].sort((a, b) => b.start - a.start);
  let result = text;

  for (const finding of sorted) {
    const action = rules[finding.category];
    const replacement = getReplacement(finding.category, finding.value, action);
    result = result.slice(0, finding.start) + replacement + result.slice(finding.end);
  }
  return result;
}

/**
 * Parses and processes JSON recursively. Detects password keys and scans string values for PII.
 */
export function maskJSON(
  jsonStr: string,
  rules: Record<PIICategory, 'redact' | 'hash' | 'fake' | 'keep'>
): string {
  try {
    const parsed = JSON.parse(jsonStr);

    const walk = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;

      if (Array.isArray(obj)) {
        return obj.map(walk);
      }

      if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key of Object.keys(obj)) {
          const val = obj[key];

          if (typeof val === 'string') {
            if (isSecretKey(key)) {
              // Apply password category masking if the key indicates a secret
              newObj[key] = getReplacement('password', val, rules['password'] || 'redact');
            } else {
              // Otherwise, scan the string value for general PII
              const cellFindings = scanRawText(val);
              newObj[key] = maskRawText(val, cellFindings, rules);
            }
          } else if (typeof val === 'object') {
            newObj[key] = walk(val);
          } else {
            newObj[key] = val;
          }
        }
        return newObj;
      }

      return obj;
    };

    return JSON.stringify(walk(parsed), null, 2);
  } catch (e) {
    // If it's invalid JSON, fallback to raw text parsing
    const findings = scanRawText(jsonStr);
    return maskRawText(jsonStr, findings, rules);
  }
}

/**
 * Parses CSV cell-by-cell and anonymizes contents.
 */
export function maskCSV(
  csvStr: string,
  rules: Record<PIICategory, 'redact' | 'hash' | 'fake' | 'keep'>
): string {
  try {
    const parsed = Papa.parse(csvStr, { skipEmptyLines: true });
    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      throw new Error('CSV parsing failed');
    }

    const rows = parsed.data as string[][];
    const maskedRows = rows.map((row) => {
      return row.map((cell) => {
        if (typeof cell !== 'string') return cell;
        const cellFindings = scanRawText(cell);
        return maskRawText(cell, cellFindings, rules);
      });
    });

    return Papa.unparse(maskedRows);
  } catch (e) {
    // If CSV parsing fails, fallback to raw text parsing
    const findings = scanRawText(csvStr);
    return maskRawText(csvStr, findings, rules);
  }
}

/**
 * Main orchestrator for file anonymization based on file type.
 */
export function anonymizeFile(
  content: string,
  type: 'json' | 'csv' | 'txt',
  rules: Record<PIICategory, 'redact' | 'hash' | 'fake' | 'keep'>
): string {
  if (type === 'json') {
    return maskJSON(content, rules);
  }
  if (type === 'csv') {
    return maskCSV(content, rules);
  }
  
  // For raw logs / text files
  const findings = scanRawText(content);
  return maskRawText(content, findings, rules);
}
