import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function resolveDatabaseUrl(env: Record<string, string | undefined> = process.env) {
  const candidates = [
    env.DATABASE_URL,
    env.DIRECT_URL,
    env.POSTGRES_URL,
    env.POSTGRES_PRISMA_URL,
    env.SESSION_POOLER_URL,
    env.SESSION_POOLER_CONNECTION_SKILL,
    env.POSTGRES_URL_NON_POOLING,
  ];

  const connectionString = candidates.find((value) => {
    if (!value) return false;
    if (/[\s"'`]/.test(value)) {
      return false;
    }
    return value.startsWith("postgresql://") || value.startsWith("postgres://");
  });

  if (!connectionString) {
    throw new Error(
      "No valid PostgreSQL connection string found. Set DATABASE_URL or a compatible Vercel/Supabase variable.",
    );
  }

  return connectionString;
}

function createPrismaClient() {
  const connectionString = resolveDatabaseUrl();

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
