import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { runTestCase, LANGUAGE_MAP } from "@/lib/judge0";

// ---------------------------------------------------------------------------
// Suspicious Activity Detection
// ---------------------------------------------------------------------------

function detectFlags(
  code: string,
  starterCode: string,
  assignmentCreatedAt: Date,
  submittedAt: Date
): string[] {
  const flags: string[] = [];

  // Check if submitted too fast (< 2 minutes after assignment was created)
  const diffMs = submittedAt.getTime() - assignmentCreatedAt.getTime();
  if (diffMs < 2 * 60 * 1000) {
    flags.push("SUSPICIOUSLY_FAST");
  }

  // Check if code is identical to starter code
  if (code.trim() === starterCode.trim()) {
    flags.push("UNCHANGED_CODE");
  }

  return flags;
}

// ---------------------------------------------------------------------------
// POST — Submit code, auto-grade, trigger viva
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId, code, language } = await req.json();

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { testCases: true },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const lang = language || assignment.language || "python";
  const langId = LANGUAGE_MAP[lang]?.id || 71;
  const now = new Date();

  // Detect suspicious activity
  const flags = detectFlags(code, assignment.starterCode, assignment.createdAt, now);

  // Create submission first (PENDING)
  const submission = await prisma.submission.create({
    data: {
      assignmentId,
      studentId: session.user.id,
      code,
      language: lang,
      flags: flags.length > 0 ? flags : undefined,
    },
  });

  // Run all test cases through Judge0
  const testResults = await Promise.all(
    assignment.testCases.map(async (tc) => {
      const result = await runTestCase(code, langId, tc.input, tc.expectedOutput);
      return {
        testCaseId: tc.id,
        isHidden: tc.isHidden,
        passed: result.passed,
        actualOutput: result.actualOutput,
        expectedOutput: result.expectedOutput,
        time: result.time,
        status: result.status,
      };
    })
  );

  // Compute score
  const totalTests = testResults.length;
  const passedTests = testResults.filter((t) => t.passed).length;
  const score = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  // Update submission with results
  const updatedSubmission = await prisma.submission.update({
    where: { id: submission.id },
    data: {
      score,
      status: "GRADED",
      testResults: testResults,
    },
  });

  // Auto-trigger viva generation (fire and forget — don't block response)
  fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/viva/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submissionId: submission.id }),
  }).catch((err) => console.error("[Viva] Failed to trigger generation:", err));

  return NextResponse.json({
    ...updatedSubmission,
    // Filter hidden test results for students
    testResults: testResults.map((t) => ({
      ...t,
      actualOutput: t.isHidden ? "[hidden]" : t.actualOutput,
      expectedOutput: t.isHidden ? "[hidden]" : t.expectedOutput,
    })),
  });
}

// ---------------------------------------------------------------------------
// GET — List submissions
// ---------------------------------------------------------------------------

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
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(submissions);
}
