import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateRemedialAssignment } from "@/lib/claude";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { submissionId } = await req.json();

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: true, student: true },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const generated = await generateRemedialAssignment(
    submission.assignment.title,
    submission.assignment.description,
    submission.score || 0,
    submission.assignment.language
  );

  // Create remedial assignment
  const remedial = await prisma.assignment.create({
    data: {
      title: generated.title,
      description: generated.description,
      starterCode: generated.starterCode,
      language: submission.assignment.language,
      difficulty: "Beginner",
      hints: generated.hints,
      isRemedial: true,
      parentAssignmentId: submission.assignmentId,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      courseId: submission.assignment.courseId,
      testCases: {
        create: generated.testCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
        })),
      },
    },
  });

  // Notify student
  await createNotification(
    submission.studentId,
    "REMEDIAL_ASSIGNED",
    `A practice assignment "${generated.title}" has been created to help you improve.`,
    { assignmentId: remedial.id }
  );

  return NextResponse.json({ message: "Remedial assignment created", assignment: remedial });
}
