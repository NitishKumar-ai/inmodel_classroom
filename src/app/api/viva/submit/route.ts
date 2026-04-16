import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { submissionId, responses } = await req.json();

  // Validate submission belongs to user
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission || submission.studentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Save each response
  const results = await Promise.all(
    (responses as { vivaQuestionId: string; studentAnswer: string }[]).map(
      async (res) => {
        const question = await prisma.vivaQuestion.findUnique({
          where: { id: res.vivaQuestionId },
        });

        // For MCQ, check correctness immediately
        const isCorrect =
          question?.type === "MCQ"
            ? question.correctAnswer.trim() === res.studentAnswer.trim()
            : false; // SHORT_ANSWER scored later by AI

        return prisma.vivaResponse.create({
          data: {
            submissionId,
            vivaQuestionId: res.vivaQuestionId,
            studentAnswer: res.studentAnswer,
            isCorrect,
          },
        });
      }
    )
  );

  return NextResponse.json({ message: "Viva submitted", count: results.length });
}
