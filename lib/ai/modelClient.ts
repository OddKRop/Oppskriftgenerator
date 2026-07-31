import "server-only";
import OpenAI from "openai";

// Ollama på verten eksponerer et OpenAI-kompatibelt endepunkt, så vi beholder
// openai-klienten og peker den hit i stedet for på api.openai.com.
const DEFAULT_BASE_URL = "http://127.0.0.1:11434/v1";
const DEFAULT_MODEL = "gemma4:e4b";

let cachedClient: OpenAI | null = null;

export function getModelName(): string {
  return process.env.AI_MODEL ?? DEFAULT_MODEL;
}

export function getBaseUrl(): string {
  return process.env.AI_BASE_URL ?? DEFAULT_BASE_URL;
}

export function getModelClient(): OpenAI {
  if (!cachedClient) {
    cachedClient = new OpenAI({
      baseURL: getBaseUrl(),
      // Ollama krever ingen nøkkel, men openai-klienten nekter å starte uten
      // en ikke-tom streng. AI_API_KEY finnes for om endepunktet en gang
      // byttes ut med noe som faktisk autentiserer.
      apiKey: process.env.AI_API_KEY ?? "ollama",
    });
  }

  return cachedClient;
}

// Sjekker at modell-endepunktet svarer og at den konfigurerte modellen finnes.
// Kalles av /api/ai/health.
export async function checkModelAvailability(): Promise<
  { ok: true; model: string } | { ok: false; message: string }
> {
  const model = getModelName();

  try {
    const models = await getModelClient().models.list();
    const available = models.data.map((entry) => entry.id);

    if (!available.includes(model)) {
      return {
        ok: false,
        message: `Modellen ${model} er ikke lastet ned. Tilgjengelig: ${
          available.join(", ") || "ingen"
        }.`,
      };
    }

    return { ok: true, model };
  } catch (error) {
    return {
      ok: false,
      message: `Fikk ikke kontakt med modelltjenesten på ${getBaseUrl()}: ${
        error instanceof Error ? error.message : "ukjent feil"
      }`,
    };
  }
}
