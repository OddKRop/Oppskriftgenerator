import { NextResponse } from "next/server";
import { hasOpenAIApiKey } from "@/lib/ai/openaiConfig";

export async function GET() {
  const configured = hasOpenAIApiKey();

  if (!configured) {
    return NextResponse.json(
      {
        ok: false,
        message: "OPENAI_API_KEY er ikke konfigurert på serveren.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
