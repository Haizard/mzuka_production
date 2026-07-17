import "dotenv/config";
import { defineConfig } from "prisma/config";

function resolveDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.DIRECT_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.SESSION_POOLER_URL,
    process.env.SESSION_POOLER_CONNECTION_SKILL,
    process.env.POSTGRES_URL_NON_POOLING,
  ];

  const connectionString = candidates.find((value) => {
    if (!value) return false;
    if (/[\s"'`]/.test(value)) {
      return false;
    }
    return value.startsWith("postgresql://") || value.startsWith("postgres://");
  });

  return connectionString;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
