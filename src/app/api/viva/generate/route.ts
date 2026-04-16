import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/*
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "stub-key",
});
*/

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { submissionId } = await req.json();

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: true },
  });

  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  // Stub Claude API call
  console.log("Generating viva for code:", submission.code);
  
  /* 
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [{ role: "user", content: `Generate 3 viva questions for this code: ${submission.code}` }],
  });
  */

  // Create placeholder questions
  await prisma.vivaQuestion.createMany({
    data: [
      {
        submissionId,
        question: "What is the time complexity of your solution?",
        type: "MCQ",
        options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
        correctAnswer: "O(n)",
      },
      {
        submissionId,
        question: "Why did you choose this data structure?",
        type: "SHORT_ANSWER",
        correctAnswer: "To optimize space complexity.",
      },
    ],
  });

  return NextResponse.json({ message: "Viva generated", count: 2 });
}
