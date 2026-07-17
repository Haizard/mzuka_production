import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "../lib/db";

describe("resolveDatabaseUrl", () => {
  it("prefers DATABASE_URL when it is available", () => {
    const resolved = resolveDatabaseUrl({
      DATABASE_URL: "postgresql://primary.example/db",
      POSTGRES_URL: "postgresql://fallback.example/db",
    });

    expect(resolved).toBe("postgresql://primary.example/db");
  });

  it("falls back to POSTGRES_URL when DATABASE_URL is missing", () => {
    const resolved = resolveDatabaseUrl({
      POSTGRES_URL: "postgresql://fallback.example/db",
    });

    expect(resolved).toBe("postgresql://fallback.example/db");
  });

  it("uses DIRECT_URL before pooler URLs when both exist", () => {
    const resolved = resolveDatabaseUrl({
      DATABASE_URL: "postgresql://pool.example/db?pgbouncer=true",
      DIRECT_URL: "postgresql://direct.example/db",
      SESSION_POOLER_URL: "postgresql://session.example/db",
    });

    expect(resolved).toBe("postgresql://direct.example/db");
  });
});
