import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generatePeerRubric } from "@/lib/claude";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assignmentId } = await req.json();

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      submissions: { select: { id: true, studentId: true } },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  // Generate rubric via Claude
  const rubric = await generatePeerRubric(assignment.description);

  // Save rubric
  await prisma.peerReviewAssignment.upsert({
    where: { assignmentId },
    update: { rubric },
    create: { assignmentId, rubric },
  });

  // Randomly assign: each student reviews 2 others
  const submissions = assignment.submissions;
  if (submissions.length < 3) {
    return NextResponse.json({ error: "Need at least 3 submissions for peer review" }, { status: 400 });
  }

  // Shuffle submissions
  const shuffled = [...submissions].sort(() => Math.random() - 0.5);

  const assignments: { reviewerId: string; submissionId: string }[] = [];

  for (let i = 0; i < shuffled.length; i++) {
    const reviewer = shuffled[i];
    // Assign 2 submissions to review (not self)
    let assigned = 0;
    for (let j = 1; assigned < 2 && j < shuffled.length; j++) {
      const target = shuffled[(i + j) % shuffled.length];
      if (target.studentId !== reviewer.studentId) {
        assignments.push({ reviewerId: reviewer.studentId, submissionId: target.id });
        assigned++;
      }
    }
  }

  // Create peer review records
  for (const a of assignments) {
    await prisma.peerReview.upsert({
      where: { reviewerId_submissionId: { reviewerId: a.reviewerId, submissionId: a.submissionId } },
      update: {},
      create: { reviewerId: a.reviewerId, submissionId: a.submissionId },
    });

    await createNotification(
      a.reviewerId,
      "PEER_REVIEW_ASSIGNED",
      `You have been assigned a peer review for "${assignment.title}".`,
      { assignmentId }
    );
  }

  return NextResponse.json({ message: "Peer reviews assigned", count: assignments.length, rubric });
}
