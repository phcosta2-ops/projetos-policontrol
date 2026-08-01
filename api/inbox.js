const REDIS_BASE = 'https://smooth-dingo-93735.upstash.io';
const REDIS_TOKEN = 'gQAAAAAAAW4nAAIncDIwYzk0ODBlZmViOTY0ODZkYTAyN2JhYzJjNmNjMmUxMXAyOTM3MzU';
const REDIS_KEY = 'poli-inbox-v1';

const headers = { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' };
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function getEntries() {
  const r = await fetch(`${REDIS_BASE}/get/${REDIS_KEY}`, { headers });
  const json = await r.json();
  if (!json.result) return [];
  try {
    const parsed = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
    const entries = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
    return Array.isArray(entries) ? entries : [];
  } catch { return []; }
}

export default async function handler(req, res) {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') return res.status(200).json({ entries: await getEntries() });

  if (req.method === 'POST') {
    const { entries } = req.body || {};
    if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries deve ser um array' });
    const r = await fetch(`${REDIS_BASE}/set/${REDIS_KEY}`, {
      method: 'POST', headers, body: JSON.stringify(JSON.stringify(entries)),
    });
    const json = await r.json();
    return res.status(200).json({ ok: json.result === 'OK' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
