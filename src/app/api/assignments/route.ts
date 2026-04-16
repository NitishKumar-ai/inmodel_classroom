import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignments = await prisma.assignment.findMany({
    include: { course: true },
  });
  return NextResponse.json(assignments);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, starterCode, deadline, courseId } = await req.json();

  const assignment = await prisma.assignment.create({
    data: {
      title,
      description,
      starterCode,
      deadline: new Date(deadline),
      courseId,
    },
  });

  return NextResponse.json(assignment);
}
