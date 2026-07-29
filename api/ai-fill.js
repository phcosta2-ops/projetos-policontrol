const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function buildPrompt(text, currentProject, users) {
  const usersList = (users || []).map(u => `- ${u.key}: ${u.name}${u.email ? ' <' + u.email + '>' : ''}`).join('\n') || '(nenhum)';
  const proj = currentProject ? {
    name: currentProject.name || '(vazio)',
    code: currentProject.code || '(vazio)',
    area: currentProject.area || '(vazio)',
    tipo: currentProject.tipo || '(vazio)',
    phase: currentProject.phase || '(vazio)',
    status: currentProject.status || '(vazio)',
    solicitante: currentProject.solicitante || '(vazio)',
    patrocinador: currentProject.patrocinador || '(vazio)',
    owner: currentProject.owner || '(vazio)',
    dataAbertura: currentProject.dataAbertura || '(vazio)',
    dataInicio: currentProject.dataInicio || '(vazio)',
    dataConclusao: currentProject.dataConclusao || '(vazio)',
    previsaoInicial: currentProject.previsaoInicial || '(vazio)',
    previsaoFinal: currentProject.previsaoFinal || '(vazio)',
    descricao: currentProject.descricao || '(vazio)',
    actionsCount: (currentProject.actions || []).length,
  } : null;
  const projText = proj ? Object.entries(proj).map(([k, v]) => `- ${k}: ${v}`).join('\n') : '(projeto novo, vazio)';

  return `Você é assistente de PMO da Policontrol (empresa de instrumentos analíticos e reagentes químicos para saneamento).
Recebe descrição livre de um projeto (texto e/ou imagem de ata, whiteboard, TAP em papel, e-mail) e sugere valores para os campos do projeto no app PMO, além de um cronograma inicial de etapas.

CONTEXTO DO APP:
- Áreas válidas: "Des. Industrial", "Des. Químico", "Contratado", "Projetos Especiais"
- Fases válidas: "Ideação", "Desenvolvimento", "Testes", "Validação", "Lote Piloto", "Lançamento", "Concluído"
- Status válidos: "No prazo", "Atrasado", "Em risco", "Parado", "Concluído"
- Tipos válidos: "Novo Produto", "Melhoria / Red. Custo", "Contratado", "Outro"
- Solicitantes válidos: "Cliente", "Vendas", "Licitações", "Produto", "Produção Industrial", "Produção Química", "Depto Serviços", "Compras", "Diretoria", "Outros"

USUÁRIOS DISPONÍVEIS (respKey/owner/patrocinador devem usar a chave 'key'):
${usersList}

DADOS DO PROJETO ATUAL:
${projText}

INSTRUÇÃO/DESCRIÇÃO DO USUÁRIO:
"""
${text || '(sem texto — usar apenas imagem se houver)'}
"""

Sua tarefa: extrair informações e sugerir preenchimento. Retorne APENAS JSON válido (sem markdown ou explicações fora do JSON) no formato:

{
  "suggestions": {
    "name": string ou null,
    "code": string ou null,
    "area": string ou null,
    "tipo": string ou null,
    "phase": string ou null,
    "status": string ou null,
    "solicitante": string ou null,
    "patrocinador": string ou null,
    "owner": string ou null,
    "dataAbertura": "YYYY-MM-DD" ou null,
    "dataInicio": "YYYY-MM-DD" ou null,
    "dataConclusao": "YYYY-MM-DD" ou null,
    "previsaoInicial": "YYYY-MM-DD" ou null,
    "previsaoFinal": "YYYY-MM-DD" ou null
  },
  "cronograma": [
    { "etapa": "ETAPA 1 — ESCOPO", "num": "1.1", "title": "...", "respKey": "raphael" ou null, "inicio": "YYYY-MM-DD" ou null, "fim": "YYYY-MM-DD" ou null }
  ],
  "reasoning": "1-2 frases explicando como interpretou o pedido"
}

REGRAS:
- SÓ preencha campos que puder extrair com boa confiança. Use null para incertos — o usuário revisa antes de aplicar.
- NUNCA sobrescreva um campo que já tem valor no projeto atual, exceto se o texto do usuário pedir explicitamente a mudança.
- Datas: "Nov/26" → 2026-11-30 (último dia do mês). "3o trimestre 2026" → 2026-09-30. "início 2027" → 2027-01-31.
- Área: se mencionar reagente, química, formulação, fórmula, sachê, pastilha, pó → "Des. Químico". Hardware, placa, sensor, instrumento, medidor, esquema elétrico, gerber, firmware → "Des. Industrial".
- Tipo: substituir fornecedor / reduzir custo → "Melhoria / Red. Custo". Produto novo do zero → "Novo Produto".
- respKey / owner / patrocinador: use APENAS as chaves listadas em USUÁRIOS DISPONÍVEIS (ex: "raphael", "luciana"). Se não conseguir identificar com certeza, use null.
- Cronograma: sugira 3-8 etapas iniciais só se houver contexto (ex: novo desenvolvimento). Para updates simples de projeto existente, retorne cronograma: [].
- Etapas típicas Industrial: ESCOPO, HARDWARE, FIRMWARE, TESTES, DOCUMENTAÇÃO, LOTE PILOTO.
- Etapas típicas Químico: ESCOPO, FORMULAÇÃO, TESTES, VALIDAÇÃO, LOTE PILOTO, RETENÇÃO.
- Se o texto sugere que o projeto FOI CONCLUÍDO (ex: "encerrado", "entregue", "finalizado"), preencha status="Concluído" e dataConclusao com a data mencionada (ou hoje se não especificada).
- Se o texto é uma ATUALIZAÇÃO sobre projeto existente (menciona mudanças de status/prazo/ações completadas), preencha só os campos que mudaram e deixe o resto null.
- Retorne SÓ o JSON, nada mais.`;
}

export default async function handler(req, res) {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY não configurada no Vercel',
      instructions: 'Crie uma chave gratuita em https://aistudio.google.com/apikey e adicione como env var GEMINI_API_KEY em Settings > Environment Variables no Vercel.'
    });
  }

  const { text = '', imageBase64 = null, imageMimeType = 'image/png', currentProject = null, users = [] } = req.body || {};

  if (!text && !imageBase64) {
    return res.status(400).json({ error: 'Envie ao menos texto ou imagem.' });
  }

  const prompt = buildPrompt(text, currentProject, users);
  const parts = [{ text: prompt }];
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: imageMimeType, data: imageBase64 } });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const gr = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      })
    });
    if (!gr.ok) {
      const errText = await gr.text();
      return res.status(gr.status).json({ error: 'Erro Gemini: ' + errText.substring(0, 300) });
    }
    const gj = await gr.json();
    const raw = gj?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return res.status(500).json({ error: 'Resposta vazia do Gemini', gemini: gj });

    let parsed;
    try {
      // Tenta parse direto (responseMimeType=json deveria garantir)
      parsed = JSON.parse(raw);
    } catch (e) {
      // Fallback: extrair JSON de dentro de eventual markdown fence
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); }
        catch (e2) { return res.status(500).json({ error: 'JSON invalido da IA', raw: raw.substring(0, 500) }); }
      } else {
        return res.status(500).json({ error: 'Sem JSON na resposta', raw: raw.substring(0, 500) });
      }
    }

    // Normalização básica
    parsed.suggestions = parsed.suggestions || {};
    parsed.cronograma = Array.isArray(parsed.cronograma) ? parsed.cronograma : [];
    parsed.reasoning = parsed.reasoning || '';

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao chamar Gemini: ' + (err.message || String(err)) });
  }
}
