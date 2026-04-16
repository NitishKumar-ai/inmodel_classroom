import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { code, language, input } = await req.json();

  // Placeholder echo implementation
  // Future: Integrate Judge0 or Piston API here
  
  const output = `Executed ${language} code with input: "${input || "none"}".\n\nCode Preview:\n${code.substring(0, 50)}...`;

  return NextResponse.json({
    output,
    error: null,
  });
}
