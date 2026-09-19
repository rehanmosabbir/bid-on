import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { emitNotification } from "../socket";
import { sendEmail } from "../lib/email";

export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
  meta?: Record<string, unknown>
) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      message,
      meta: meta ? (meta as Prisma.InputJsonValue) : undefined,
    },
  });

  emitNotification(userId, notification);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    await sendEmail(user.email, `Bid On: ${type.replace("_", " ")}`, `<p>${message}</p>`);
  }

  return notification;
}
