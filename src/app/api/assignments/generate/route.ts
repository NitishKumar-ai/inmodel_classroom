import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateAssignment } from "@/lib/claude";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { difficulty, concepts, courseId, language } = await req.json();

  // Get prior assignments for context
  const priorAssignments = await prisma.assignment.findMany({
    where: { courseId },
    select: { title: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  const generated = await generateAssignment(
    difficulty,
    concepts || [],
    priorAssignments.map((a) => a.title),
    language || "python"
  );

  return NextResponse.json(generated);
}
