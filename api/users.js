const REDIS_BASE = 'https://smooth-dingo-93735.upstash.io';
const REDIS_TOKEN = 'gQAAAAAAAW4nAAIncDIwYzk0ODBlZmViOTY0ODZkYTAyN2JhYzJjNmNjMmUxMXAyOTM3MzU';
const REDIS_KEY = 'poli-users-v1';

const headers = {
  'Authorization': `Bearer ${REDIS_TOKEN}`,
  'Content-Type': 'application/json',
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Seed inicial: mantém compatibilidade com os owners fixos já usados no app
const DEFAULT_USERS = [
  { key: 'raphael', name: 'Raphael Costa', email: 'raphael.costa@policontrol.com.br' },
  { key: 'rodrigo', name: 'Rodrigo Costa', email: '' },
  { key: 'luciana', name: 'Luciana Lima', email: 'luciana.lima@policontrol.com.br' },
  { key: 'teresa', name: 'Teresa Costa', email: '' },
  { key: 'marcelo', name: 'Marcelo Câmara', email: 'marcelo.camara@policontrol.com.br' },
];

export default async function handler(req, res) {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const r = await fetch(`${REDIS_BASE}/get/${REDIS_KEY}`, { headers });
    const json = await r.json();
    let users = null;
    if (json.result) {
      try {
        const parsed = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
        users = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
      } catch (e) {
        users = null;
      }
    }
    if (!Array.isArray(users) || !users.length) {
      users = DEFAULT_USERS;
    }
    return res.status(200).json({ users });
  }

  if (req.method === 'POST') {
    const { users } = req.body;
    if (!Array.isArray(users)) {
      return res.status(400).json({ error: 'users deve ser um array' });
    }
    const body = JSON.stringify(JSON.stringify(users));
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
