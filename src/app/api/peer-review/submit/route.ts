import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId, scores, comments } = await req.json();

  const review = await prisma.peerReview.findUnique({ where: { id: reviewId } });
  if (!review || review.reviewerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.peerReview.update({
    where: { id: reviewId },
    data: { scores, comments, completedAt: new Date() },
  });

  // Compute peer score for the submission
  const allReviews = await prisma.peerReview.findMany({
    where: { submissionId: review.submissionId, completedAt: { not: null } },
  });

  if (allReviews.length > 0) {
    const avgPeerScore = allReviews.reduce((sum, r) => {
      const s = r.scores as { criterion: string; score: number; maxScore: number }[] | null;
      if (!s) return sum;
      const total = s.reduce((a, b) => a + b.score, 0);
      const max = s.reduce((a, b) => a + b.maxScore, 0);
      return sum + (max > 0 ? (total / max) * 100 : 0);
    }, 0) / allReviews.length;

    const submission = await prisma.submission.findUnique({
      where: { id: review.submissionId },
      include: { assignment: true },
    });

    const peerEnabled = submission?.assignment.peerReviewEnabled;
    const codeScore = submission?.score || 0;
    const vivaScore = submission?.vivaScore || 0;

    // Recompute final score with peer component
    const finalScore = peerEnabled
      ? codeScore * 0.55 + vivaScore * 0.35 + avgPeerScore * 0.10
      : codeScore * 0.60 + vivaScore * 0.40;

    await prisma.submission.update({
      where: { id: review.submissionId },
      data: { peerScore: Math.round(avgPeerScore * 10) / 10, finalScore: Math.round(finalScore * 10) / 10 },
    });
  }

  return NextResponse.json({ message: "Review submitted", review: updated });
}
