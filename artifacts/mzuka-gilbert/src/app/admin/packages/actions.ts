"use server";

import { requireAdminAccess } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";

function requirePackagesAccess() {
  return requireAdminAccess("/admin/packages");
}

export async function getServicePackages() {
  try {
    await requirePackagesAccess();

    const packages = await prisma.servicePackage.findMany({
      orderBy: { priceCents: "asc" },
    });

    return {
      success: true,
      packages,
    };
  } catch (error) {
    console.error("Failed to fetch packages:", error);
    return {
      success: false,
      error: "Failed to load packages",
      packages: [],
    };
  }
}

export async function createServicePackageAction(input: {
  name: string;
  description: string;
  priceCents: number;
  durationMin?: number;
}) {
  try {
    await requirePackagesAccess();

    const pkg = await prisma.servicePackage.create({
      data: {
        name: input.name,
        description: input.description,
        priceCents: input.priceCents,
        durationMin: input.durationMin,
        currency: "USD",
        isActive: true,
      },
    });

    return {
      success: true,
      package: pkg,
    };
  } catch (error) {
    console.error("Failed to create package:", error);
    return {
      success: false,
      error: "Failed to create package",
    };
  }
}

export async function updateServicePackageAction(
  packageId: string,
  input: {
    name?: string;
    description?: string;
    priceCents?: number;
    durationMin?: number;
    isActive?: boolean;
  }
) {
  try {
    await requirePackagesAccess();

    const pkg = await prisma.servicePackage.update({
      where: { id: packageId },
      data: input,
    });

    return {
      success: true,
      package: pkg,
    };
  } catch (error) {
    console.error("Failed to update package:", error);
    return {
      success: false,
      error: "Failed to update package",
    };
  }
}

export async function deleteServicePackageAction(packageId: string) {
  try {
    await requirePackagesAccess();

    await prisma.servicePackage.delete({
      where: { id: packageId },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to delete package:", error);
    return {
      success: false,
      error: "Failed to delete package",
    };
  }
}
