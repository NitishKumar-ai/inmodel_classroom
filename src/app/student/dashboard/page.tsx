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
  const userId = session?.user.id;

  // Fetch enrolled courses with assignments
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
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
    where: { studentId: userId },
    include: { vivaResponses: true },
    orderBy: { submittedAt: "desc" },
  });

  // Fetch pending peer reviews
  const peerReviews = await prisma.peerReview.findMany({
    where: { reviewerId: userId, completedAt: null },
    include: {
      submission: {
        include: {
          assignment: { select: { title: true, courseId: true } },
        },
      },
    },
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Student Dashboard</h1>
        <Link
          href="/student/progress"
          className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-bold hover:bg-indigo-100 transition border border-indigo-100 shadow-sm"
        >
          <span>📈</span> View My Progress
        </Link>
      </div>

      {/* Peer Reviews section */}
      {peerReviews.length > 0 && (
        <section className="bg-indigo-600 p-6 rounded-2xl text-white shadow-xl shadow-indigo-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">👥</span>
            <h2 className="text-xl font-bold">Pending Peer Reviews</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {peerReviews.map((review) => (
              <Link
                key={review.id}
                href={`/student/peer-review/${review.id}`}
                className="bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-xl transition backdrop-blur-sm group"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-white group-hover:text-indigo-100">
                      {review.submission.assignment.title}
                    </h3>
                    <p className="text-xs text-indigo-200">Help a peer move forward</p>
                  </div>
                  <span className="bg-white text-indigo-600 text-[10px] font-black px-2 py-1 rounded shadow-sm uppercase tracking-wider">
                    Start Review
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Pending Assignments */}
      <section>
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full" />
          Assignments to Complete
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
                  className={`block bg-white p-6 rounded-2xl border shadow-sm transition group ${
                    isPastDue
                      ? "border-red-100 bg-red-50/30 opacity-60 cursor-not-allowed"
                      : "border-slate-100 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{assignment.courseTitle}</p>
                      <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition text-lg">
                        {assignment.title}
                      </h3>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg shadow-sm border ${
                      isPastDue ? "bg-red-50 text-red-600 border-red-100" : "bg-amber-50 text-amber-600 border-amber-100"
                    }`}>
                      {isPastDue ? "PAST DUE" : deadlineCountdown(new Date(assignment.deadline)).toUpperCase()}
                    </span>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 font-medium">
              {enrollments.length === 0 ? "You are not enrolled in any courses yet." : "All caught up! ✨ No pending assignments."}
            </div>
          )}
        </div>
      </section>

      {/* Submitted Assignments */}
      <section>
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-indigo-500 rounded-full" />
          Submission History
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {submitted.length > 0 ? (
            submitted.map((assignment) => {
              const sub = submissionMap.get(assignment.id)!;
              const hasVivaResponses = sub.vivaResponses.length > 0;
              const vivaNeeded = sub.status === "GRADED" && !hasVivaResponses;

              return (
                <div
                  key={assignment.id}
                  className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{assignment.courseTitle}</p>
                      <StatusPill status={sub.status} hasViva={hasVivaResponses} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg mb-4">{assignment.title}</h3>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-slate-50 p-2 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Code</p>
                        <ScoreBadge score={sub.score} />
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Viva</p>
                        <ScoreBadge score={sub.vivaScore} />
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Peer</p>
                        <ScoreBadge score={sub.peerScore} />
                      </div>
                      <div className="bg-indigo-50 p-2 rounded-xl text-center border border-indigo-100">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">Final</p>
                        <ScoreBadge score={sub.finalScore} />
                      </div>
                    </div>
                  </div>

                  {vivaNeeded && (
                    <Link
                      href={`/student/viva/${sub.id}`}
                      className="w-full text-center py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 animate-pulse"
                    >
                      COMPLETE VIVA →
                    </Link>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 font-medium">
              No submissions yet.
            </div>
          )}
        </div>
      </section>

      {/* Courses */}
      <section>
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-slate-400 rounded-full" />
          Enrolled Courses
        </h2>
        <div className="flex flex-wrap gap-4">
          {enrollments.map((en) => (
            <div key={en.id} className="bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl flex flex-col items-center">
              <h3 className="font-extrabold text-slate-800 tracking-tight">{en.course.title}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{en.course.assignments.length} Assignments</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
