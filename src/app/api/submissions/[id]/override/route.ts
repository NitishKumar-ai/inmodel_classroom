import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { manualScore, note } = await req.json();

  const submission = await prisma.submission.update({
    where: { id: params.id },
    data: {
      manualScore: Number(manualScore),
      manualNote: note || null,
      finalScore: Number(manualScore), // Override replaces computed final
    },
  });

  return NextResponse.json(submission);
}
