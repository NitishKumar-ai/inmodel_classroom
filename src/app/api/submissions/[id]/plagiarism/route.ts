import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, note } = await req.json();

  if (action === "mark") {
    const submission = await prisma.submission.update({
      where: { id: params.id },
      data: { status: "PLAGIARIZED" },
      include: { assignment: { select: { title: true } } },
    });

    await createNotification(
      submission.studentId,
      "PLAGIARISM_FLAGGED",
      `Your submission for "${submission.assignment.title}" has been flagged for academic integrity review.`,
      { submissionId: submission.id }
    );

    return NextResponse.json({ message: "Marked as plagiarized" });
  }

  if (action === "clear") {
    await prisma.submission.update({
      where: { id: params.id },
      data: {
        status: "GRADED",
        plagiarismFlags: [],
        manualNote: note || "Plagiarism flag cleared by teacher",
      },
    });

    return NextResponse.json({ message: "Flag cleared" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
