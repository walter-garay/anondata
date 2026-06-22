import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
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

  const { char_count, detections_count, file_type, categories_stats } = req.body;

  if (
    typeof char_count !== 'number' ||
    typeof detections_count !== 'number' ||
    !file_type
  ) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase environment variables are missing');
    return res.status(500).json({ error: 'Database configuration missing' });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/request_logs`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        source: 'web',
        char_count,
        detections_count,
        file_type,
        categories_stats: categories_stats || {}
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Supabase logging error:', errText);
      return res.status(500).json({ error: 'Failed to log request to database' });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Internal Server Error in api/log:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
