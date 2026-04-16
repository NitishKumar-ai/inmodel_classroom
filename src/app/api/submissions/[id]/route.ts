import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    include: {
      student: { select: { id: true, name: true, email: true } },
      assignment: { include: { testCases: true } },
      vivaQuestions: { include: { responses: true } },
      vivaResponses: true,
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  // Students can only view their own submissions
  if (session.user.role === "STUDENT" && submission.studentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Hide test details for hidden cases if deadline hasn't passed
  const now = new Date();
  const deadlinePassed = now > submission.assignment.deadline;

  let testResults = submission.testResults as Array<{
    testCaseId: string;
    isHidden: boolean;
    passed: boolean;
    actualOutput: string;
    expectedOutput: string;
    time: string;
    status: string;
  }> | null;

  if (session.user.role === "STUDENT" && testResults && !deadlinePassed) {
    testResults = testResults.map((t) => ({
      ...t,
      actualOutput: t.isHidden ? "[hidden until deadline]" : t.actualOutput,
      expectedOutput: t.isHidden ? "[hidden until deadline]" : t.expectedOutput,
    }));
  }

  return NextResponse.json({ ...submission, testResults });
}
