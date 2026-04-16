/**
 * Notification helper — creates notifications in the database.
 */
import prisma from "./prisma";

export type NotificationType =
  | "ASSIGNMENT_PUBLISHED"
  | "SUBMISSION_GRADED"
  | "VIVA_READY"
  | "PLAGIARISM_FLAGGED"
  | "PEER_REVIEW_ASSIGNED"
  | "REMEDIAL_ASSIGNED"
  | "PEER_REVIEW_COMPLETE";

export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
  metadata?: Record<string, string>
) {
  return prisma.notification.create({
    data: { userId, type, message, metadata: metadata || undefined },
  });
}

export async function notifyEnrolledStudents(
  courseId: string,
  type: NotificationType,
  message: string,
  metadata?: Record<string, string>
) {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    select: { userId: true },
  });

  await prisma.notification.createMany({
    data: enrollments.map((e) => ({
      userId: e.userId,
      type,
      message,
      metadata: metadata || undefined,
    })),
  });
}
