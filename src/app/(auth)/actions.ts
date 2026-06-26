"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createUserSession, clearUserSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  email: z.email("Use a valid email address.").toLowerCase(),
  phone: z.string().trim().optional(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const loginSchema = z.object({
  email: z.email("Use a valid email address.").toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export type AuthActionState = {
  error?: string;
};

export async function registerAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid registration." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existingUser) {
    return { error: "An account with this email already exists." };
  }

  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      passwordHash: await hashPassword(parsed.data.password),
      role: isFirstUser ? "FOUNDER" : "CLIENT",
      approvalStatus: isFirstUser ? "APPROVED" : "PENDING",
    },
    select: { id: true, approvalStatus: true, role: true },
  });

  await prisma.clientApproval.create({
    data: {
      clientId: user.id,
      status: user.approvalStatus,
      decidedAt: user.approvalStatus === "APPROVED" ? new Date() : null,
      notes: isFirstUser
        ? "First registered user becomes the approved founder account."
        : "Client registration awaiting admin approval.",
    },
  });

  await createUserSession(user.id);

  if (user.role === "FOUNDER") {
    redirect("/admin");
  }

  redirect("/pending-approval");
}

export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid login." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      passwordHash: true,
      role: true,
      approvalStatus: true,
    },
  });

  if (!user?.passwordHash) {
    return { error: "Invalid email or password." };
  }

  const passwordIsValid = await verifyPassword(
    parsed.data.password,
    user.passwordHash,
  );

  if (!passwordIsValid) {
    return { error: "Invalid email or password." };
  }

  await createUserSession(user.id);

  if (user.approvalStatus !== "APPROVED") {
    redirect("/pending-approval");
  }

  if (["FOUNDER", "ADMIN", "STAFF"].includes(user.role)) {
    redirect("/admin");
  }

  redirect("/client");
}

export async function logoutAction() {
  await clearUserSession();
  redirect("/login");
}
