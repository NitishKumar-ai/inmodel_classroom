import prisma from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  
  // Fetch enrolled courses
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

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Student Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            My Courses
          </h2>
          <div className="space-y-4">
            {enrollments.length > 0 ? (
              enrollments.map((en) => (
                <div key={en.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800">{en.course.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{en.course.assignments.length} assignments total</p>
                </div>
              ))
            ) : (
              <div className="py-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                You are not enrolled in any courses yet.
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
            Pending Assignments
          </h2>
          <div className="space-y-4">
            {enrollments.flatMap(en => en.course.assignments).filter(a => new Date(a.deadline) > new Date()).map((assignment) => (
              <Link
                key={assignment.id}
                href={`/student/assignment/${assignment.id}`}
                className="block bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition">{assignment.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">Due: {new Date(assignment.deadline).toLocaleString()}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-amber-50 text-amber-600 rounded">DUE SOON</span>
                </div>
              </Link>
            ))}
            {enrollments.length === 0 && (
              <div className="py-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                No pending assignments.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
