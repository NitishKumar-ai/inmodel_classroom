import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAssignmentMetrics, getStudentMetrics, getConceptHeatmap } from "@/lib/analytics";

export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [assignmentMetrics, studentMetrics, conceptHeatmap] = await Promise.all([
    getAssignmentMetrics(params.courseId),
    getStudentMetrics(params.courseId),
    getConceptHeatmap(params.courseId),
  ]);

  return NextResponse.json({ assignmentMetrics, studentMetrics, conceptHeatmap });
}
