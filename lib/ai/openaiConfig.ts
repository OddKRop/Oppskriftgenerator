import "server-only";
import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export function getOpenAIApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    console.error(
      "[AI Config] Missing OPENAI_API_KEY. Add it to .env.local and restart the server."
    );
    return null;
  }

  return key;
}

export function hasOpenAIApiKey(): boolean {
  return Boolean(getOpenAIApiKey());
}

export function getOpenAIClient(): OpenAI | null {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey });
  }

  return cachedClient;
}
