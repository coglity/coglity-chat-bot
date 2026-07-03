import 'dotenv/config';
import express from 'express';
import { handleChat } from './bot.js';

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

app.post('/chat', authMiddleware, async (req, res) => {
  const { text, sessionId } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const reply = await handleChat(sessionId ?? 'default', text);
    res.json({ text: reply });
  } catch (err) {
    console.error('[chat error]', err.message);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

app.listen(PORT, () => console.log(`Test bot running on port ${PORT}`));
