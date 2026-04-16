import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateStudySuggestion } from "@/lib/claude";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Score trend — all submissions ordered by date
  const submissions = await prisma.submission.findMany({
    where: { studentId: userId },
    include: { assignment: { select: { title: true, createdAt: true } } },
    orderBy: { submittedAt: "asc" },
  });

  const scoreTrend = submissions.map((s) => ({
    assignment: s.assignment.title,
    score: s.finalScore ?? s.score ?? 0,
    date: s.submittedAt.toISOString(),
  }));

  // Concept performance — from viva questions
  const vivaResponses = await prisma.vivaResponse.findMany({
    where: { submission: { studentId: userId } },
    include: { vivaQuestion: { select: { conceptTested: true } } },
  });

  const conceptMap = new Map<string, { correct: number; total: number }>();
  for (const r of vivaResponses) {
    const concept = r.vivaQuestion.conceptTested || "general";
    const entry = conceptMap.get(concept) || { correct: 0, total: 0 };
    entry.total++;
    if (r.isCorrect) entry.correct++;
    conceptMap.set(concept, entry);
  }

  const conceptPerformance = Array.from(conceptMap.entries()).map(([concept, data]) => ({
    concept,
    score: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
  }));

  // Streak — consecutive on-time submissions
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: { course: { include: { assignments: { orderBy: { deadline: "asc" } } } } },
  });

  const allAssignments = enrollments.flatMap((e) => e.course.assignments);
  let streak = 0;
  for (let i = allAssignments.length - 1; i >= 0; i--) {
    const a = allAssignments[i];
    const sub = submissions.find((s) => s.assignmentId === a.id);
    if (sub && sub.submittedAt <= a.deadline) {
      streak++;
    } else {
      break;
    }
  }

  // Weakest concept — with cached suggestion
  let weakestConcept = null;
  let suggestion = null;
  if (conceptPerformance.length > 0) {
    const sorted = [...conceptPerformance].sort((a, b) => a.score - b.score);
    weakestConcept = sorted[0];

    // Check cache
    const cached = await prisma.conceptCache.findUnique({
      where: { userId_concept: { userId, concept: weakestConcept.concept } },
    });

    const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    if (cached && Date.now() - cached.cachedAt.getTime() < cacheExpiry) {
      suggestion = cached.suggestion;
    } else {
      suggestion = await generateStudySuggestion(weakestConcept.concept);
      await prisma.conceptCache.upsert({
        where: { userId_concept: { userId, concept: weakestConcept.concept } },
        update: { suggestion, cachedAt: new Date() },
        create: { userId, concept: weakestConcept.concept, suggestion },
      });
    }
  }

  return NextResponse.json({
    scoreTrend,
    conceptPerformance,
    streak,
    weakestConcept: weakestConcept ? { ...weakestConcept, suggestion } : null,
  });
}
