import 'dotenv/config';
import express from 'express';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { handleChat, getTokenStats, getTokenLogFile } from './bot.js';
import { existsSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

const API_KEY = process.env.BOT_API_KEY ?? 'coglity-test-bot-key';
const PORT = process.env.PORT ?? 3000;

function authMiddleware(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden: invalid or missing x-api-key' });
  }
  next();
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/tokens', authMiddleware, (_req, res) => res.json(getTokenStats()));

app.get('/tokens/dashboard', (_req, res) => res.sendFile(join(__dirname, 'tokens.html')));

app.get('/tokens/export', authMiddleware, (_req, res) => {
  const logFile = getTokenLogFile();
  if (!existsSync(logFile)) return res.status(404).json({ error: 'No log file yet' });
  const lines = readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean);
  const rows = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const csv = ['timestamp,sessionId,promptTokens,completionTokens,totalTokens']
    .concat(rows.map(r => `${r.ts},${r.sessionId ?? ''},${r.promptTokens},${r.completionTokens},${r.totalTokens}`))
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="token_log.csv"');
  res.send(csv);
});

app.post('/chat', authMiddleware, async (req, res) => {
  const { text, sessionId } = req.body;
  if (text === undefined || text === null) return res.status(400).json({ error: 'text is required' });
  try {
    const greeting = text.trim() === '' ? 'Hello' : text;
    const reply = await handleChat(sessionId ?? 'default', greeting);
    res.json({ text: reply });
  } catch (err) {
    console.error('[chat error]', err.message);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

app.listen(PORT, () => console.log(`Test bot running on port ${PORT}`));
