import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { assignmentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const submissions = await prisma.submission.findMany({
    where: {
      assignmentId: params.assignmentId,
      plagiarismFlags: { not: { equals: null } },
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  // Filter to only those with actual flags
  const flagged = submissions.filter((s) => {
    const flags = s.plagiarismFlags as unknown[];
    return Array.isArray(flags) && flags.length > 0;
  });

  return NextResponse.json(flagged);
}
