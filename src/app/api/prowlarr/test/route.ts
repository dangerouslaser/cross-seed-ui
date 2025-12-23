import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { testProwlarrConnection } from "@/lib/services/prowlarr";

const testSchema = z.object({
  url: z.string().url(),
  apiKey: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = testSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }

  const { url, apiKey } = result.data;
  const testResult = await testProwlarrConnection(url, apiKey);

  return NextResponse.json(testResult);
}
