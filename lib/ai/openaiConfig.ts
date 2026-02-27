import "server-only";

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
