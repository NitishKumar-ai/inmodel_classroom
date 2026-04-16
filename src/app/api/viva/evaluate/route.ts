import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { scoreShortAnswer } from "@/lib/claude";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { submissionId } = await req.json();

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      vivaQuestions: { include: { responses: true } },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  let totalPoints = 0;
  let maxPoints = 0;

  for (const question of submission.vivaQuestions) {
    const response = question.responses[0]; // One response per question
    if (!response) continue;

    if (question.type === "MCQ") {
      // MCQ: 1 point if correct
      maxPoints += 1;
      const isCorrect = question.correctAnswer.trim() === response.studentAnswer.trim();
      const score = isCorrect ? 1 : 0;
      totalPoints += score;

      await prisma.vivaResponse.update({
        where: { id: response.id },
        data: {
          isCorrect,
          aiScore: score,
          aiFeedback: isCorrect ? "Correct answer." : `Incorrect. The correct answer is: ${question.correctAnswer}`,
        },
      });
    } else {
      // SHORT_ANSWER: 0-2 points via Claude
      maxPoints += 2;

      const result = await scoreShortAnswer(
        question.question,
        question.conceptTested || "",
        response.studentAnswer
      );

      totalPoints += result.score;

      await prisma.vivaResponse.update({
        where: { id: response.id },
        data: {
          isCorrect: result.score >= 1,
          aiScore: result.score,
          aiFeedback: result.feedback,
        },
      });
    }
  }

  // Compute viva score as percentage
  const vivaScore = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;

  // Compute final score: (autoGrade * 0.6) + (vivaScore * 0.4)
  const autoGrade = submission.score || 0;
  const finalScore = autoGrade * 0.6 + vivaScore * 0.4;

  await prisma.submission.update({
    where: { id: submissionId },
    data: { vivaScore, finalScore },
  });

  return NextResponse.json({
    vivaScore: Math.round(vivaScore * 100) / 100,
    finalScore: Math.round(finalScore * 100) / 100,
    totalPoints,
    maxPoints,
  });
}
