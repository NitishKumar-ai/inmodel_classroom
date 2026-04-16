import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { emails, courseId } = await req.json();

  const emailList = (emails as string)
    .split("\n")
    .map((e) => e.trim())
    .filter((e) => e.includes("@"));

  const results = [];

  for (const email of emailList) {
    // Find or create student
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const hashed = await bcrypt.hash("student123", 10);
      user = await prisma.user.create({
        data: { email, name: email.split("@")[0], password: hashed, role: "STUDENT" },
      });
    }

    // Enroll if not already
    try {
      await prisma.enrollment.create({
        data: { userId: user.id, courseId },
      });
      results.push({ email, status: "enrolled" });
    } catch {
      results.push({ email, status: "already enrolled" });
    }
  }

  return NextResponse.json({ results, count: results.length });
}
