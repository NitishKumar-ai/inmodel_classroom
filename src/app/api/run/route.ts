import { NextResponse } from "next/server";
import { submitCode, LANGUAGE_MAP } from "@/lib/judge0";

export async function POST(req: Request) {
  const { code, language, stdin } = await req.json();

  const lang = LANGUAGE_MAP[language] || LANGUAGE_MAP.python;
  const result = await submitCode(code, lang.id, stdin || "");

  return NextResponse.json(result);
}
