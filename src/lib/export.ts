/**
 * Export helpers — CSV generation for course reports.
 * PDF is handled client-side with @react-pdf/renderer.
 */
import prisma from "./prisma";

export interface StudentReportRow {
  name: string;
  email: string;
  assignments: {
    title: string;
    codeScore: number | null;
    vivaScore: number | null;
    peerScore: number | null;
    finalScore: number | null;
    plagiarismFlags: string[];
  }[];
  overallAvg: number;
}

export async function getCourseReportData(courseId: string): Promise<{
  courseTitle: string;
  teacherName: string;
  students: StudentReportRow[];
  assignmentTitles: string[];
}> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      teacher: { select: { name: true, email: true } },
      assignments: {
        where: { isRemedial: false },
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true },
      },
      enrollments: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              submissions: {
                where: { assignment: { courseId } },
                select: {
                  assignmentId: true,
                  score: true,
                  vivaScore: true,
                  peerScore: true,
                  finalScore: true,
                  plagiarismFlags: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!course) return { courseTitle: "", teacherName: "", students: [], assignmentTitles: [] };

  const assignmentTitles = course.assignments.map((a) => a.title);

  const students: StudentReportRow[] = course.enrollments.map((en) => {
    const user = en.user;
    const assignments = course.assignments.map((a) => {
      const sub = user.submissions.find((s) => s.assignmentId === a.id);
      const flags = (sub?.plagiarismFlags as { type: string }[] | null) || [];
      return {
        title: a.title,
        codeScore: sub?.score ?? null,
        vivaScore: sub?.vivaScore ?? null,
        peerScore: sub?.peerScore ?? null,
        finalScore: sub?.finalScore ?? null,
        plagiarismFlags: flags.map((f) => f.type),
      };
    });

    const scores = assignments.filter((a) => a.finalScore !== null).map((a) => a.finalScore!);
    const overallAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return {
      name: user.name || "Unknown",
      email: user.email || "",
      assignments,
      overallAvg: Math.round(overallAvg * 10) / 10,
    };
  });

  return {
    courseTitle: course.title,
    teacherName: course.teacher.name || course.teacher.email || "",
    students,
    assignmentTitles,
  };
}

export function generateCSVString(data: Awaited<ReturnType<typeof getCourseReportData>>): string {
  const headers = [
    "Student Name",
    "Email",
    ...data.assignmentTitles.flatMap((t) => [`${t} (Code)`, `${t} (Viva)`, `${t} (Final)`, `${t} (Flags)`]),
    "Overall Average",
  ];

  const rows = data.students.map((s) => [
    s.name,
    s.email,
    ...s.assignments.flatMap((a) => [
      a.codeScore?.toString() ?? "",
      a.vivaScore?.toString() ?? "",
      a.finalScore?.toString() ?? "",
      a.plagiarismFlags.join("; "),
    ]),
    s.overallAvg.toString(),
  ]);

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}
