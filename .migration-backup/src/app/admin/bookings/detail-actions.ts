"use server";

import { requireAdminAccess } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";

export async function getAdminBookingDetail(id: string) {
  try {
    await requireAdminAccess("/admin/bookings");

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        package: true,
        gallery: { include: { mediaAssets: { select: { id: true } } } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!booking) return { success: false, booking: null };
    return { success: true, booking };
  } catch (error) {
    console.error("getAdminBookingDetail:", error);
    return { success: false, booking: null };
  }
}
