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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.length > 0 ? (
          courses.map((course) => (
            <div key={course.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{course.title}</h2>
                <div className="flex gap-4 text-sm text-slate-500 mt-2">
                  <span>{course._count.enrollments} Students</span>
                  <span>{course._count.assignments} Assignments</span>
                </div>
              </div>
              <div className="flex gap-3 mt-6 border-t pt-4 border-slate-50">
                <Link
                  href={`/teacher/analytics/${course.id}`}
                  className="flex-1 text-center py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
                >
                  Analytics
                </Link>
                <Link
                  href={`/teacher/export/${course.id}`}
                  className="flex-1 text-center py-2 text-xs font-bold text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                >
                  Export
                </Link>
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
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">All Submissions</h2>
          <p className="text-sm text-slate-500">Review and grade student work</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {allSubmissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Student</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Assignment</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Code</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Viva</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Peer</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Final</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Flags</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allSubmissions.map((sub) => {
                    const flags = (sub.flags as string[]) || [];
                    const plagiarismFlags = (sub.plagiarismFlags as any[]) || [];
                    const hasPlagiarism = plagiarismFlags.length > 0;

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 transition group">
                        <td className="px-5 py-3">
                          <Link href={`/teacher/submission/${sub.id}`} className="text-indigo-600 hover:underline font-medium block">
                            {sub.student.name || sub.student.email}
                          </Link>
                          <span className="text-[10px] text-slate-400">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-600 truncate max-w-[150px]">{sub.assignmentTitle}</td>
                        <td className="px-5 py-3 text-center"><ScoreBadge score={sub.score} /></td>
                        <td className="px-5 py-3 text-center"><ScoreBadge score={sub.vivaScore} /></td>
                        <td className="px-5 py-3 text-center"><ScoreBadge score={sub.peerScore} /></td>
                        <td className="px-5 py-3 text-center">
                          <ScoreBadge score={sub.manualScore ?? sub.finalScore} />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                            sub.status === "GRADED"
                              ? "bg-emerald-50 text-emerald-600"
                              : sub.status === "PLAGIARIZED"
                                ? "bg-red-50 text-red-600 border border-red-100"
                                : "bg-slate-100 text-slate-500"
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <FlagIcon flags={flags} />
                            {hasPlagiarism && (
                              <Link href={`/teacher/plagiarism/${sub.assignmentId}`} title="Plagiarism detected" className="text-red-500 animate-pulse">
                                🚨
                              </Link>
                            )}
                            <SuspiciousBadge score={sub.score} vivaScore={sub.vivaScore} />
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/teacher/submission/${sub.id}`}
                            className="bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition shadow-sm"
                          >
                            Review
                          </Link>
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
