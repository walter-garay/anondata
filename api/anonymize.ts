import type { VercelRequest, VercelResponse } from '@vercel/node';
import { anonymizeFile } from '../src/utils/masker.js';
import { scanRawText, isSecretKey, type PIICategory } from '../src/utils/detector.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { content, type = 'txt', rules } = req.body;

  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "content" parameter in body' });
  }

  if (type !== 'json' && type !== 'csv' && type !== 'txt') {
    return res.status(400).json({ error: 'Invalid "type" parameter. Must be "json", "csv", or "txt"' });
  }

  // Default rules configuration if none provided
  const defaultRules: Record<PIICategory, 'redact' | 'hash' | 'fake' | 'keep'> = {
    api_key: 'redact',
    email: 'fake',
    ip: 'hash',
    credit_card: 'redact',
    uuid: 'keep',
    phone: 'fake',
    password: 'redact'
  };

  const finalRules = { ...defaultRules, ...rules };

  // Calculate statistics before anonymization
  const categoriesStats: Record<string, number> = {
    api_key: 0,
    email: 0,
    ip: 0,
    credit_card: 0,
    uuid: 0,
    phone: 0,
    password: 0
  };

  const findings = scanRawText(content);
  findings.forEach((f) => {
    categoriesStats[f.category] = (categoriesStats[f.category] || 0) + 1;
  });

  if (type === 'json') {
    try {
      const parsed = JSON.parse(content);
      const countSecretKeys = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
          obj.forEach(countSecretKeys);
          return;
        }
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (typeof val === 'string' && isSecretKey(key)) {
            categoriesStats.password = (categoriesStats.password || 0) + 1;
          } else {
            countSecretKeys(val);
          }
        }
      };
      countSecretKeys(parsed);
    } catch (e) {
      // Ignore JSON parsing errors for stats (will fallback to raw text in masker)
    }
  }

  const totalDetections = Object.values(categoriesStats).reduce((a, b) => a + b, 0);

  const startTime = Date.now();
  let anonymizedContent = '';
  try {
    anonymizedContent = anonymizeFile(content, type, finalRules);
  } catch (err: any) {
    console.error('Error masking file:', err);
    return res.status(500).json({ error: 'Failed to anonymize content', details: err.message });
  }
  const durationMs = Date.now() - startTime;

  // Log request to database
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const dbResponse = await fetch(`${supabaseUrl}/rest/v1/request_logs`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          source: 'api',
          char_count: content.length,
          detections_count: totalDetections,
          file_type: type,
          categories_stats: categoriesStats
        })
      });

      if (!dbResponse.ok) {
        const errText = await dbResponse.text();
        console.error('Supabase DB insertion error:', errText);
      }
    } catch (dbErr) {
      console.error('Failed to log to Supabase in api/anonymize:', dbErr);
    }
  } else {
    console.warn('Supabase credentials missing. API logged request only to console.');
  }

  return res.status(200).json({
    success: true,
    anonymizedContent,
    stats: {
      char_count: content.length,
      detections_count: totalDetections,
      duration_ms: durationMs,
      categories_stats: categoriesStats
    }
  });
}
