import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Authentication check
  const authHeader = req.headers.authorization;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not defined.');
    return res.status(500).json({ error: 'Server authentication configuration error' });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized: Invalid password' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Database configuration missing' });
  }

  try {
    // Fetch last 2000 log entries
    const dbResponse = await fetch(`${supabaseUrl}/rest/v1/request_logs?order=created_at.desc&limit=2000`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json'
      }
    });

    if (!dbResponse.ok) {
      const errText = await dbResponse.text();
      console.error('Supabase DB fetch error:', errText);
      return res.status(500).json({ error: 'Failed to retrieve logs from database' });
    }

    const logs: any[] = await dbResponse.json();

    // Perform aggregates
    let totalRequests = logs.length;
    let webRequests = 0;
    let apiRequests = 0;
    let totalChars = 0;
    let totalDetections = 0;

    const categoriesStats: Record<string, number> = {
      api_key: 0,
      email: 0,
      ip: 0,
      credit_card: 0,
      uuid: 0,
      phone: 0,
      password: 0
    };

    // Timeline aggregation for the last 30 days
    const dailyStatsMap: Record<string, { date: string; web: number; api: number; total: number }> = {};
    
    // Initialize last 30 days
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateString = d.toISOString().split('T')[0];
      dailyStatsMap[dateString] = { date: dateString, web: 0, api: 0, total: 0 };
    }

    for (const log of logs) {
      if (log.source === 'web') webRequests++;
      if (log.source === 'api') apiRequests++;
      totalChars += log.char_count || 0;
      totalDetections += log.detections_count || 0;

      // Category metrics
      if (log.categories_stats && typeof log.categories_stats === 'object') {
        for (const cat of Object.keys(categoriesStats)) {
          categoriesStats[cat] += Number(log.categories_stats[cat] || 0);
        }
      }

      // Group by date YYYY-MM-DD
      if (log.created_at) {
        const datePart = log.created_at.split('T')[0];
        if (dailyStatsMap[datePart]) {
          if (log.source === 'web') dailyStatsMap[datePart].web++;
          if (log.source === 'api') dailyStatsMap[datePart].api++;
          dailyStatsMap[datePart].total++;
        }
      }
    }

    const timeline = Object.values(dailyStatsMap).sort((a, b) => a.date.localeCompare(b.date));

    // Formulate response
    return res.status(200).json({
      success: true,
      summary: {
        totalRequests,
        webRequests,
        apiRequests,
        totalChars,
        totalDetections
      },
      categoriesStats,
      timeline,
      recent: logs.slice(0, 15) // send last 15 items for the log feed
    });
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
