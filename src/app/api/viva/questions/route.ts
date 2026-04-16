import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const submissionId = searchParams.get("submissionId");

  if (!submissionId) {
    return NextResponse.json({ error: "submissionId required" }, { status: 400 });
  }

  const questions = await prisma.vivaQuestion.findMany({
    where: { submissionId },
    orderBy: { id: "asc" },
    select: {
      id: true,
      question: true,
      type: true,
      options: true,
      // Don't expose correctAnswer to students
    },
  });

  return NextResponse.json(questions);
}
