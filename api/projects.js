const REDIS_BASE = 'https://smooth-dingo-93735.upstash.io';
const REDIS_TOKEN = 'gQAAAAAAAW4nAAIncDIwYzk0ODBlZmViOTY0ODZkYTAyN2JhYzJjNmNjMmUxMXAyOTM3MzU';
const REDIS_KEY = 'poli-projects-v1';

const headers = {
  'Authorization': `Bearer ${REDIS_TOKEN}`,
  'Content-Type': 'application/json',
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const r = await fetch(`${REDIS_BASE}/get/${REDIS_KEY}`, { headers });
    const json = await r.json();
    let projects = [];
    if (json.result) {
      try {
        const parsed = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
        projects = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
      } catch (e) {
        projects = [];
      }
    }
    return res.status(200).json({ projects });
  }

  if (req.method === 'POST') {
    const { projects } = req.body;
    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: 'projects deve ser um array' });
    }
    const body = JSON.stringify(JSON.stringify(projects));
    const r = await fetch(`${REDIS_BASE}/set/${REDIS_KEY}`, {
      method: 'POST',
      headers,
      body,
    });
    const json = await r.json();
    return res.status(200).json({ ok: json.result === 'OK' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
