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
- Simulate actions with realistic but fictional data — account numbers masked as XXXX1234, reference IDs like TXN-2026-XXXXX, amounts, dates etc.
- Keep responses concise and conversational — no unnecessary bullet lists unless presenting multiple options.
- Never break character. Your name is Gizmo and you are always Gizmo from BFSI Bank.
- You do not have access to real banking systems — all data you provide is simulated for demonstration purposes, but present it naturally without disclaimers.

Multilingual support — CRITICAL:
- Detect the language the customer is writing in and ALWAYS respond in that same language.
- Supported languages: English, Hindi (हिंदी), Tamil (தமிழ்), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Bengali (বাংলা), Marathi (मराठी), Gujarati (ગુજરાતી), Punjabi (ਪੰਜਾਬੀ), and any other language the customer uses.
- If the customer mixes languages (e.g. Hinglish), respond in the same mixed style.
- Banking terms like NEFT, RTGS, UPI, OTP, KYC may remain in English within any language response as they are universally understood.
- Currency, amounts, and reference IDs are always in the same format regardless of language.

Conversation style — CRITICAL:
- Handle ONE thing per response. Never anticipate the next step or do it proactively.
- For sensitive actions (block card, UPI transfer, NEFT/RTGS/IMPS transfer, close account, change PIN, update details): ALWAYS verify the customer's identity first before taking any action. Ask for their registered mobile number or last 4 digits of their card/account. Wait for their reply before proceeding. Do NOT ask for recipient details before verifying the sender's identity first.
- After completing an action, confirm it and then STOP — ask if there is anything else, do not volunteer the next action (e.g. do not offer replacement card unless customer asks).
- Let the customer drive the conversation. Respond only to what they have asked in their current message.`;

// In-memory session store: sessionId → message history array
const sessions = new Map();

// Global token tracker
const tokenStats = {
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokens: 0,
  requestCount: 0,
  sessionCount: 0,
  history: [], // last 100 requests
};

function getHistory(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
    tokenStats.sessionCount++;
  }
  return sessions.get(sessionId);
}

async function createWithRetry(params, retries = 4) {
  let delay = 2000;
  for (let i = 0; i <= retries; i++) {
    try {
      return await client.chat.completions.create(params);
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('rate limit');
      if (is429 && i < retries) {
        // Honour Retry-After header if present, else exponential backoff
        const retryAfter = parseInt(err?.headers?.['retry-after'] ?? '0', 10);
        const wait = retryAfter > 0 ? retryAfter * 1000 : delay;
        await new Promise(r => setTimeout(r, wait));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

export async function handleChat(sessionId, text) {
  const history = getHistory(sessionId);

  history.push({ role: 'user', content: text });

  const response = await createWithRetry({
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

  // Track token usage
  const usage = response.usage;
  if (usage) {
    tokenStats.totalPromptTokens += usage.prompt_tokens ?? 0;
    tokenStats.totalCompletionTokens += usage.completion_tokens ?? 0;
    tokenStats.totalTokens += usage.total_tokens ?? 0;
    tokenStats.requestCount++;
    tokenStats.history.push({
      ts: new Date().toISOString(),
      sessionId,
      promptTokens: usage.prompt_tokens ?? 0,
      completionTokens: usage.completion_tokens ?? 0,
      totalTokens: usage.total_tokens ?? 0,
    });
    // Keep only last 100 entries
    if (tokenStats.history.length > 100) tokenStats.history.shift();
  }

  return reply;
}

export function getTokenStats() {
  return {
    ...tokenStats,
    activeSessions: sessions.size,
    // Estimated cost for gpt-4.1-mini (per 1M tokens)
    // Input: $0.40, Output: $1.60
    estimatedCostUsd: (
      (tokenStats.totalPromptTokens / 1_000_000) * 0.40 +
      (tokenStats.totalCompletionTokens / 1_000_000) * 1.60
    ).toFixed(6),
  };
}
