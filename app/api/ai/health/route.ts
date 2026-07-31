import { NextResponse } from "next/server";
import { checkModelAvailability } from "@/lib/ai/modelClient";

export async function GET() {
  const status = await checkModelAvailability();

  if (!status.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: status.message,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, model: status.model });
}
