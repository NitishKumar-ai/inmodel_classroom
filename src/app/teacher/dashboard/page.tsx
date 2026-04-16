import prisma from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return <span className="text-slate-400">—</span>;
  const rounded = Math.round(score);
  let cls = "text-slate-600";
  if (rounded >= 80) cls = "text-emerald-600 font-bold";
  else if (rounded >= 50) cls = "text-amber-600 font-bold";
  else cls = "text-red-600 font-bold";
  return <span className={cls}>{rounded}</span>;
}

function FlagIcon({ flags }: { flags: string[] }) {
  if (!flags || flags.length === 0) return null;
  const titles = flags.map((f) => {
    if (f === "SUSPICIOUSLY_FAST") return "⚡ Submitted unusually fast";
    if (f === "UNCHANGED_CODE") return "📋 Code identical to starter";
    return f;
  });
  return (
    <span title={titles.join("\n")} className="cursor-help text-red-500 text-lg">
      🚩
    </span>
  );
}

function SuspiciousBadge({ score, vivaScore }: { score: number | null; vivaScore: number | null }) {
  if (score === null || vivaScore === null) return null;
  if (score > 90 && vivaScore < 40) {
    return (
      <span
        title="High code score but low viva — possible integrity concern"
        className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded font-semibold cursor-help"
      >
        ⚠ Suspicious
      </span>
    );
  }
  return null;
}

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);

  const courses = await prisma.course.findMany({
    where: { teacherId: session?.user.id },
    include: {
      _count: { select: { assignments: true, enrollments: true } },
      assignments: {
        include: {
          submissions: {
            include: {
              student: { select: { id: true, name: true, email: true } },
            },
            orderBy: { submittedAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // Flatten all submissions across all assignments
  const allSubmissions = courses
    .flatMap((c) => c.assignments)
    .flatMap((a) =>
      a.submissions.map((s) => ({
        ...s,
        assignmentTitle: a.title,
        assignmentId: a.id,
      }))
    );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Teacher Dashboard</h1>
        <Link
          href="/teacher/assignment/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition text-sm"
        >
          + New Assignment
        </Link>
      </div>

      {/* Course cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.length > 0 ? (
          courses.map((course) => (
            <div key={course.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">{course.title}</h2>
              <div className="flex gap-4 text-sm text-slate-500 mt-2">
                <span>{course._count.enrollments} Students</span>
                <span>{course._count.assignments} Assignments</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-10 text-center bg-white rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400">No courses yet.</p>
          </div>
        )}
      </div>

      {/* Submissions table */}
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">All Submissions</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {allSubmissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Student</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Assignment</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Code</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Viva</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Final</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allSubmissions.map((sub) => {
                    const flags = (sub.flags as string[]) || [];
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3">
                          <Link href={`/teacher/submission/${sub.id}`} className="text-indigo-600 hover:underline font-medium">
                            {sub.student.name || sub.student.email}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{sub.assignmentTitle}</td>
                        <td className="px-5 py-3 text-center"><ScoreBadge score={sub.score} /></td>
                        <td className="px-5 py-3 text-center"><ScoreBadge score={sub.vivaScore} /></td>
                        <td className="px-5 py-3 text-center">
                          <ScoreBadge score={sub.manualScore ?? sub.finalScore} />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            sub.status === "GRADED"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center space-x-1">
                          <FlagIcon flags={flags} />
                          <SuspiciousBadge score={sub.score} vivaScore={sub.vivaScore} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              No submissions yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
