import prisma from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  const rounded = Math.round(score);
  let cls = "bg-slate-100 text-slate-600";
  if (rounded >= 80) cls = "bg-emerald-50 text-emerald-700 border-emerald-200";
  else if (rounded >= 50) cls = "bg-amber-50 text-amber-700 border-amber-200";
  else cls = "bg-red-50 text-red-700 border-red-200";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded border ${cls}`}>{rounded}%</span>;
}

function StatusPill({ status, hasViva }: { status: string; hasViva: boolean }) {
  if (status === "GRADED" && !hasViva) {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">Viva Pending</span>;
  }
  if (status === "GRADED") {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">Graded</span>;
  }
  return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">Pending</span>;
}

function deadlineCountdown(deadline: Date): string {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return "Past due";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m left`;
}

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);

  // Fetch enrolled courses with assignments
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session?.user.id },
    include: {
      course: {
        include: {
          assignments: {
            orderBy: { deadline: "asc" },
          },
        },
      },
    },
  });

  // Fetch student's submissions
  const submissions = await prisma.submission.findMany({
    where: { studentId: session?.user.id },
    include: { vivaResponses: true },
    orderBy: { submittedAt: "desc" },
  });

  // Build a map: assignmentId -> latest submission
  const submissionMap = new Map<string, typeof submissions[0]>();
  for (const sub of submissions) {
    if (!submissionMap.has(sub.assignmentId)) {
      submissionMap.set(sub.assignmentId, sub);
    }
  }

  const allAssignments = enrollments.flatMap((en) =>
    en.course.assignments.map((a) => ({ ...a, courseTitle: en.course.title }))
  );

  const pending = allAssignments.filter((a) => !submissionMap.has(a.id));
  const submitted = allAssignments.filter((a) => submissionMap.has(a.id));

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Student Dashboard</h1>

      {/* Pending Assignments */}
      <section>
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full" />
          Pending Assignments
          {pending.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
              {pending.length}
            </span>
          )}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pending.length > 0 ? (
            pending.map((assignment) => {
              const isPastDue = new Date(assignment.deadline) < new Date();
              return (
                <Link
                  key={assignment.id}
                  href={isPastDue ? "#" : `/student/assignment/${assignment.id}`}
                  className={`block bg-white p-5 rounded-xl border shadow-sm transition group ${
                    isPastDue
                      ? "border-red-200 opacity-60 cursor-not-allowed"
                      : "border-slate-200 hover:border-indigo-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">{assignment.courseTitle}</p>
                      <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition">
                        {assignment.title}
                      </h3>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      isPastDue ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                    }`}>
                      {isPastDue ? "Past due" : deadlineCountdown(new Date(assignment.deadline))}
                    </span>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="col-span-full py-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
              {enrollments.length === 0 ? "You are not enrolled in any courses yet." : "All caught up! No pending assignments."}
            </div>
          )}
        </div>
      </section>

      {/* Submitted Assignments */}
      <section>
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-indigo-500 rounded-full" />
          Submitted
        </h2>
        <div className="space-y-3">
          {submitted.length > 0 ? (
            submitted.map((assignment) => {
              const sub = submissionMap.get(assignment.id)!;
              const hasVivaResponses = sub.vivaResponses.length > 0;
              const vivaNeeded = sub.status === "GRADED" && !hasVivaResponses;

              return (
                <div
                  key={assignment.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">{assignment.courseTitle}</p>
                    <h3 className="font-bold text-slate-800">{assignment.title}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <StatusPill status={sub.status} hasViva={hasVivaResponses} />
                      {sub.score !== null && (
                        <span className="text-xs text-slate-500">
                          Code: <ScoreBadge score={sub.score} />
                        </span>
                      )}
                      {sub.vivaScore !== null && (
                        <span className="text-xs text-slate-500">
                          Viva: <ScoreBadge score={sub.vivaScore} />
                        </span>
                      )}
                      {sub.finalScore !== null && (
                        <span className="text-xs text-slate-500">
                          Final: <ScoreBadge score={sub.finalScore} />
                        </span>
                      )}
                    </div>
                  </div>

                  {vivaNeeded && (
                    <Link
                      href={`/student/viva/${sub.id}`}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition animate-pulse"
                    >
                      Complete Viva →
                    </Link>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
              No submissions yet.
            </div>
          )}
        </div>
      </section>

      {/* Courses */}
      <section>
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-slate-400 rounded-full" />
          My Courses
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrollments.map((en) => (
            <div key={en.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800">{en.course.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{en.course.assignments.length} assignments</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
