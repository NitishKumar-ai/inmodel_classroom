import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateVivaQuestions } from "@/lib/claude";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { submissionId } = await req.json();

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: true },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  // Parse test results for Claude context
  const testResults = (submission.testResults as Array<{ passed: boolean; status: string }>) || [];

  // Generate questions via Claude
  const questions = await generateVivaQuestions(
    submission.assignment.title,
    submission.assignment.description,
    submission.code,
    testResults
  );

  // Save to database
  const created = await Promise.all(
    questions.map((q) =>
      prisma.vivaQuestion.create({
        data: {
          submissionId,
          question: q.question,
          type: q.type,
          options: q.options || undefined,
          correctAnswer: q.correctAnswer,
          conceptTested: q.conceptTested,
        },
      })
    )
  );

  return NextResponse.json({
    message: "Viva questions generated",
    count: created.length,
    questions: created,
  });
}
