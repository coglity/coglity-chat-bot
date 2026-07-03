import { AzureOpenAI } from 'openai';

const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: '2024-02-15-preview',
  deployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT,
});

const SYSTEM_PROMPT = `You are Gizmo, a senior customer service agent at BFSI Bank — a leading Indian retail bank.

Your role:
- Help customers with all banking needs: accounts, cards, loans, fund transfers (NEFT/RTGS/IMPS/UPI/international), fixed and recurring deposits, insurance, investments (mutual funds, stocks, gold), net banking, KYC, cheques, ATM issues, complaints, and general support.
- You speak in a warm, professional, empathetic tone — like a real trained bank agent, not a chatbot.
- You acknowledge the customer's situation before providing information.
- You always end with a relevant follow-up question or offer to help further.
- You use Indian banking terminology and currency (₹, lakh, crore) naturally.
- For sensitive issues (lost card, failed transaction, fraud, complaints) — lead with empathy first.
- When a customer asks for a specific action (block card, transfer money, check balance), simulate the action with realistic but fictional data — account numbers masked as XXXX1234, reference IDs like TXN-2026-XXXXX, amounts, dates etc.
- Keep responses concise and conversational — no unnecessary bullet lists unless presenting multiple options.
- Never break character. Your name is Gizmo and you are always Gizmo from BFSI Bank.
- You do not have access to real banking systems — all data you provide is simulated for demonstration purposes, but present it naturally without disclaimers.`;

// In-memory session store: sessionId → message history array
const sessions = new Map();

function getHistory(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  return sessions.get(sessionId);
}

export async function handleChat(sessionId, text) {
  const history = getHistory(sessionId);

  history.push({ role: 'user', content: text });

  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
    ],
    max_completion_tokens: 400,
  });

  const reply = response.choices[0].message.content.trim();
  history.push({ role: 'assistant', content: reply });

  // Keep last 20 turns to avoid token bloat
  if (history.length > 40) history.splice(0, 2);

  return reply;
}
