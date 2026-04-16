import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { reviewId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const review = await prisma.peerReview.findUnique({
    where: { id: params.reviewId },
    include: {
      submission: {
        include: {
          assignment: {
            include: { peerReviewConfig: true },
          },
        },
      },
    },
  });

  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (review.reviewerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Strip student-identifying info from code comments
  const anonymizedCode = review.submission.code
    .replace(/\/\/.*(?:by|author|name|student).*$/gim, "// [redacted]")
    .replace(/#.*(?:by|author|name|student).*$/gim, "# [redacted]");

  return NextResponse.json({
    id: review.id,
    code: anonymizedCode,
    language: review.submission.language,
    assignmentTitle: review.submission.assignment.title,
    assignmentDescription: review.submission.assignment.description,
    rubric: review.submission.assignment.peerReviewConfig?.rubric || [],
    scores: review.scores,
    comments: review.comments,
    completed: !!review.completedAt,
  });
}
