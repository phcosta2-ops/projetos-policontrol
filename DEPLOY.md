# PMO Policontrol — Deploy no Vercel

## Estrutura do projeto

```
pmo-vercel/
├── index.html          # App principal
├── api/
│   └── projects.js     # Proxy serverless → Redis Upstash
├── package.json
├── vercel.json
└── DEPLOY.md
```

## Passo a passo

### 1. Criar repositório no GitHub

1. Acesse github.com → New repository
2. Nome: `pmo-policontrol` (privado ou público)
3. Não inicializar com README
4. Copie a URL do repositório

### 2. Subir os arquivos

Abra o terminal na pasta `pmo-vercel/` e execute:

```bash
git init
git add .
git commit -m "PMO Policontrol — versão inicial"
git remote add origin https://github.com/SEU_USUARIO/pmo-policontrol.git
git push -u origin main
```

### 3. Deploy no Vercel

1. Acesse vercel.com e faça login com sua conta GitHub
2. Clique em **"Add New Project"**
3. Selecione o repositório `pmo-policontrol`
4. Clique em **Deploy** (sem precisar configurar nada)
5. Aguarde ~1 minuto

### 4. URL do time

Após o deploy, você receberá uma URL como:
```
https://pmo-policontrol.vercel.app
```

Compartilhe essa URL com o time. Qualquer pessoa pode acessar — os dados vêm do Redis Upstash, ou seja, **todos veem os mesmos projetos em tempo real**.

## Como funciona

- `index.html` → App frontend (lê/salva via `/api/projects`)
- `api/projects.js` → Função serverless que faz a chamada ao Redis Upstash
- Sem CORS, sem servidor, sem banco de dados separado — tudo via Upstash

## Atualizações futuras

Para atualizar o app, basta editar os arquivos e fazer push:
```bash
git add .
git commit -m "atualização"
git push
```
O Vercel re-deploya automaticamente em ~30 segundos.

## Dados

Os projetos ficam no Redis Upstash:
- Base: `https://smooth-dingo-93735.upstash.io`
- Chave: `poli-projects-v1`

O `/pmo-teams-sync` e o `/pmo-alertas` usam a mesma chave — tudo sincronizado.
