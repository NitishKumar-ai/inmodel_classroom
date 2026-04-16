import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId, code } = await req.json();

  const submission = await prisma.submission.create({
    data: {
      assignmentId,
      studentId: session.user.id,
      code,
    },
  });

  return NextResponse.json(submission);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assignmentId = searchParams.get("assignmentId");

  const submissions = await prisma.submission.findMany({
    where: {
      assignmentId: assignmentId || undefined,
      studentId: session.user.role === "STUDENT" ? session.user.id : undefined,
    },
    include: { student: true, assignment: true },
  });

  return NextResponse.json(submissions);
}
