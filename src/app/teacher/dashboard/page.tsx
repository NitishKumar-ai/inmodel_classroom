import prisma from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);
  const courses = await prisma.course.findMany({
    where: { teacherId: session?.user.id },
    include: { _count: { select: { assignments: true, enrollments: true } } },
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Teacher Dashboard</h1>
        <Link
          href="/teacher/assignment/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          + New Assignment
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.length > 0 ? (
          courses.map((course) => (
            <div key={course.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">{course.title}</h2>
              <div className="flex gap-4 text-sm text-slate-500">
                <span>{course._count.enrollments} Students</span>
                <span>{course._count.assignments} Assignments</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400">No courses yet. Create one to get started.</p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Recent Submissions</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Student</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Assignment</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              <tr className="hover:bg-slate-50 transition">
                <td className="px-6 py-4">John Doe</td>
                <td className="px-6 py-4">Binary Search Implementation</td>
                <td className="px-6 py-4 underline text-indigo-500 cursor-pointer">PENDING</td>
                <td className="px-6 py-4">-</td>
              </tr>
              {/* More rows would come from database */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
