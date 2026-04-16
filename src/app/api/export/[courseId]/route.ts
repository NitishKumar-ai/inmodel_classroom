import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCourseReportData, generateCSVString } from "@/lib/export";

export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getCourseReportData(params.courseId);
  const csv = generateCSVString(data);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${data.courseTitle || "report"}_export.csv"`,
    },
  });
}
