import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { submissionId, responses } = await req.json();

  // responses is an array of { vivaQuestionId, studentAnswer }
  const results = await Promise.all(
    responses.map(async (res: { vivaQuestionId: string; studentAnswer: string }) => {
      const question = await prisma.vivaQuestion.findUnique({
        where: { id: res.vivaQuestionId },
      });

      const isCorrect = question?.correctAnswer === res.studentAnswer;

      return prisma.vivaResponse.create({
        data: {
          submissionId,
          vivaQuestionId: res.vivaQuestionId,
          studentAnswer: res.studentAnswer,
          isCorrect,
        },
      });
    })
  );

  return NextResponse.json(results);
}
