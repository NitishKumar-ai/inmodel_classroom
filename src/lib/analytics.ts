/**
 * Analytics helpers for computing course and student metrics.
 */
import prisma from "./prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssignmentMetrics {
  assignmentId: string;
  title: string;
  avgScore: number;
  passRate: number;
  distribution: number[]; // 5 buckets: 0-20, 20-40, 40-60, 60-80, 80-100
  avgTimeMinutes: number;
  vivaDropOffRate: number;
  totalSubmissions: number;
}

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  scores: { assignmentId: string; title: string; score: number | null }[];
  avgScore: number;
  trend: "up" | "down" | "stable";
  atRisk: boolean;
  suspicious: boolean; // high code, low viva
}

export interface ConceptCell {
  concept: string;
  correctRate: number; // 0-100
  totalQuestions: number;
}

// ---------------------------------------------------------------------------
// Assignment Metrics
// ---------------------------------------------------------------------------

export async function getAssignmentMetrics(courseId: string): Promise<AssignmentMetrics[]> {
  const assignments = await prisma.assignment.findMany({
    where: { courseId, isRemedial: false },
    include: {
      submissions: {
        include: { vivaResponses: { select: { id: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return assignments.map((a) => {
    const subs = a.submissions;
    const scores = subs.map((s) => s.finalScore ?? s.score ?? 0);
    const avgScore = scores.length > 0 ? scores.reduce((x, y) => x + y, 0) / scores.length : 0;
    const passRate = scores.length > 0 ? (scores.filter((s) => s >= 60).length / scores.length) * 100 : 0;

    // Distribution buckets
    const dist = [0, 0, 0, 0, 0];
    for (const s of scores) {
      const bucket = Math.min(4, Math.floor(s / 20));
      dist[bucket]++;
    }

    // Avg time to submit
    const times = subs.map((s) =>
      (s.submittedAt.getTime() - a.createdAt.getTime()) / (1000 * 60)
    );
    const avgTime = times.length > 0 ? times.reduce((x, y) => x + y, 0) / times.length : 0;

    // Viva drop-off
    const codeSubs = subs.filter((s) => s.status === "GRADED");
    const vivaDone = subs.filter((s) => s.vivaResponses.length > 0);
    const dropOff = codeSubs.length > 0 ? ((codeSubs.length - vivaDone.length) / codeSubs.length) * 100 : 0;

    return {
      assignmentId: a.id,
      title: a.title,
      avgScore: Math.round(avgScore * 10) / 10,
      passRate: Math.round(passRate * 10) / 10,
      distribution: dist,
      avgTimeMinutes: Math.round(avgTime),
      vivaDropOffRate: Math.round(dropOff * 10) / 10,
      totalSubmissions: subs.length,
    };
  });
}

// ---------------------------------------------------------------------------
// Student Metrics
// ---------------------------------------------------------------------------

export async function getStudentMetrics(courseId: string): Promise<StudentRow[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: { user: true },
  });

  const assignments = await prisma.assignment.findMany({
    where: { courseId, isRemedial: false },
    orderBy: { createdAt: "asc" },
  });

  const results: StudentRow[] = [];

  for (const en of enrollments) {
    const submissions = await prisma.submission.findMany({
      where: { studentId: en.userId, assignmentId: { in: assignments.map((a) => a.id) } },
      orderBy: { submittedAt: "asc" },
    });

    const scoresByAssignment = assignments.map((a) => {
      const sub = submissions.find((s) => s.assignmentId === a.id);
      return { assignmentId: a.id, title: a.title, score: sub?.finalScore ?? sub?.score ?? null };
    });

    const validScores = scoresByAssignment.filter((s) => s.score !== null).map((s) => s.score!);
    const avgScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;

    // Trend: compare last 2 assignments
    let trend: "up" | "down" | "stable" = "stable";
    if (validScores.length >= 2) {
      const last = validScores[validScores.length - 1];
      const prev = validScores[validScores.length - 2];
      if (last > prev + 5) trend = "up";
      else if (last < prev - 5) trend = "down";
    }

    // Suspicious: high code score but low viva on any submission
    const suspicious = submissions.some(
      (s) => (s.score ?? 0) > 90 && (s.vivaScore ?? 100) < 40
    );

    results.push({
      id: en.userId,
      name: en.user.name || "Unknown",
      email: en.user.email || "",
      scores: scoresByAssignment,
      avgScore: Math.round(avgScore * 10) / 10,
      trend,
      atRisk: avgScore < 50 && validScores.length > 0,
      suspicious,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Concept Heatmap
// ---------------------------------------------------------------------------

export async function getConceptHeatmap(courseId: string): Promise<ConceptCell[]> {
  const assignments = await prisma.assignment.findMany({
    where: { courseId },
    select: { id: true },
  });

  const questions = await prisma.vivaQuestion.findMany({
    where: {
      submission: { assignmentId: { in: assignments.map((a) => a.id) } },
      conceptTested: { not: null },
    },
    include: { responses: true },
  });

  const conceptMap = new Map<string, { correct: number; total: number }>();

  for (const q of questions) {
    const concept = q.conceptTested || "unknown";
    const entry = conceptMap.get(concept) || { correct: 0, total: 0 };
    for (const r of q.responses) {
      entry.total++;
      if (r.isCorrect) entry.correct++;
    }
    conceptMap.set(concept, entry);
  }

  return Array.from(conceptMap.entries()).map(([concept, data]) => ({
    concept,
    correctRate: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    totalQuestions: data.total,
  }));
}
