import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // session_pooler_connection_skill is the Supabase session pooler URL (port 5432).
    // Falls back to DATABASE_URL for local dev.
    url: process.env.session_pooler_connection_skill ?? process.env.DATABASE_URL,
  },
});
