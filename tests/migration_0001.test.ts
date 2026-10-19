/**
 * Static SQL migration validator — Task 2
 *
 * Because no live PostgreSQL or Supabase instance is available in this
 * environment, this test performs a thorough STATIC analysis of the
 * migration file content. It does NOT execute any SQL.
 *
 * What this verifies:
 *   - The migration file exists and is non-empty.
 *   - Every required table declaration is present.
 *   - Every required column appears in the correct table block.
 *   - Critical constraints (CHECK, UNIQUE, NOT NULL, REFERENCES) are present.
 *   - All required indexes are declared.
 *   - Row-Level Security is enabled on all tables.
 *   - The updated_at trigger function and triggers exist.
 *   - No forbidden patterns are present (Supabase Auth references,
 *     plaintext password columns, FLOAT/REAL monetary types, VITE_ env vars).
 *
 * Label: STATIC (no DB connection) — see README §"Database migrations" for
 *        instructions on running the migration against a real database.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve from tests/ directory up to repo root, then into supabase/migrations/
const MIGRATION_PATH = resolve(
  __dirname,
  "../supabase/migrations/0001_core_identity_and_tenancy.sql"
);

let sql: string;

beforeAll(() => {
  sql = readFileSync(MIGRATION_PATH, "utf-8");
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** Extracts the block of SQL for a specific CREATE TABLE statement. */
function tableBlock(tableName: string): string {
  const pattern = new RegExp(
    `CREATE TABLE IF NOT EXISTS ${tableName}\\s*\\(([\\s\\S]*?)\\);`,
    "i"
  );
  const m = sql.match(pattern);
  expect(m, `CREATE TABLE IF NOT EXISTS ${tableName} not found`).toBeTruthy();
  return m ? m[0] : "";
}

// ── Test suites ────────────────────────────────────────────────────────────

describe("[STATIC] Migration file existence", () => {
  it("migration file exists and is non-empty", () => {
    expect(sql.length).toBeGreaterThan(500);
  });

  it("begins with a descriptive header comment", () => {
    expect(sql).toMatch(/Migration:\s*0001_core_identity_and_tenancy/i);
  });
});

describe("[STATIC] Table declarations", () => {
  const tables = ["users", "user_sessions", "shops", "shop_members", "shop_settings"];

  for (const t of tables) {
    it(`declares CREATE TABLE IF NOT EXISTS ${t}`, () => {
      expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${t}\\s*\\(`, "i"));
    });
  }
});

describe("[STATIC] users table", () => {
  it("has UUID primary key using gen_random_uuid()", () => {
    const block = tableBlock("users");
    expect(block).toMatch(/id\s+UUID\s+PRIMARY KEY/i);
    expect(block).toMatch(/gen_random_uuid\(\)/i);
  });

  it("has full_name NOT NULL", () => {
    const block = tableBlock("users");
    expect(block).toMatch(/full_name\s+TEXT\s+NOT NULL/i);
  });

  it("has nullable email with UNIQUE", () => {
    const block = tableBlock("users");
    expect(block).toMatch(/email\s+TEXT\s+UNIQUE/i);
  });

  it("has nullable phone_e164 with UNIQUE", () => {
    const block = tableBlock("users");
    expect(block).toMatch(/phone_e164\s+TEXT\s+UNIQUE/i);
  });

  it("has password_hash NOT NULL (no 'password' plain column)", () => {
    const block = tableBlock("users");
    expect(block).toMatch(/password_hash\s+TEXT\s+NOT NULL/i);
    expect(block).not.toMatch(/\bpassword\b(?!_hash)/);
  });

  it("has status with CHECK constraint", () => {
    const block = tableBlock("users");
    expect(block).toMatch(/status/i);
    expect(block).toMatch(/CHECK\s*\(status IN \('active'/i);
    expect(block).toMatch(/'suspended'/i);
    expect(block).toMatch(/'deleted'/i);
  });

  it("has TIMESTAMPTZ created_at and updated_at", () => {
    const block = tableBlock("users");
    expect(block).toMatch(/created_at\s+TIMESTAMPTZ/i);
    expect(block).toMatch(/updated_at\s+TIMESTAMPTZ/i);
  });

  it("enforces email OR phone_e164 with a CHECK constraint", () => {
    expect(sql).toMatch(/users_email_or_phone_required/i);
    expect(sql).toMatch(/email IS NOT NULL OR phone_e164 IS NOT NULL/i);
  });

  it("has case-insensitive email unique index using lower()", () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX.*users_email_ci_unique/is);
    expect(sql).toMatch(/ON users \(lower\(email\)\)/i);
  });

  it("has RLS enabled", () => {
    expect(sql).toMatch(/ALTER TABLE users ENABLE ROW LEVEL SECURITY/i);
  });
});

describe("[STATIC] user_sessions table", () => {
  it("has UUID primary key", () => {
    const block = tableBlock("user_sessions");
    expect(block).toMatch(/id\s+UUID\s+PRIMARY KEY/i);
  });

  it("has user_id FK referencing users", () => {
    const block = tableBlock("user_sessions");
    expect(block).toMatch(/user_id\s+UUID\s+NOT NULL/i);
    expect(block).toMatch(/REFERENCES users\s*\(id\)/i);
  });

  it("uses ON DELETE CASCADE for user_id", () => {
    const block = tableBlock("user_sessions");
    expect(block).toMatch(/REFERENCES users\s*\(id\)\s+ON DELETE CASCADE/i);
  });

  it("has token_hash NOT NULL UNIQUE", () => {
    const block = tableBlock("user_sessions");
    expect(block).toMatch(/token_hash\s+TEXT\s+NOT NULL UNIQUE/i);
  });

  it("has expires_at and revoked_at columns", () => {
    const block = tableBlock("user_sessions");
    expect(block).toMatch(/expires_at\s+TIMESTAMPTZ/i);
    expect(block).toMatch(/revoked_at\s+TIMESTAMPTZ/i);
  });

  it("has last_active_at for idle-timeout support", () => {
    const block = tableBlock("user_sessions");
    expect(block).toMatch(/last_active_at/i);
  });

  it("has index on token_hash", () => {
    expect(sql).toMatch(/CREATE INDEX.*user_sessions_token_hash_idx/is);
  });

  it("has index on expires_at for cleanup jobs", () => {
    expect(sql).toMatch(/CREATE INDEX.*user_sessions_expires_at_idx/is);
  });

  it("has RLS enabled", () => {
    expect(sql).toMatch(/ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY/i);
  });
});

describe("[STATIC] shops table", () => {
  it("has UUID primary key", () => {
    const block = tableBlock("shops");
    expect(block).toMatch(/id\s+UUID\s+PRIMARY KEY/i);
  });

  it("has name NOT NULL", () => {
    const block = tableBlock("shops");
    expect(block).toMatch(/name\s+TEXT\s+NOT NULL/i);
  });

  it("has slug NOT NULL UNIQUE", () => {
    const block = tableBlock("shops");
    expect(block).toMatch(/slug\s+TEXT\s+NOT NULL UNIQUE/i);
  });

  it("has created_by FK referencing users with ON DELETE RESTRICT", () => {
    const block = tableBlock("shops");
    expect(block).toMatch(/created_by\s+UUID\s+NOT NULL/i);
    expect(block).toMatch(/REFERENCES users\s*\(id\)\s+ON DELETE RESTRICT/i);
  });

  it("has status CHECK constraint with allowed values", () => {
    const block = tableBlock("shops");
    expect(block).toMatch(/status/i);
    expect(block).toMatch(/CHECK\s*\(status IN \('active'/i);
    expect(block).toMatch(/'inactive'/i);
    expect(block).toMatch(/'deleted'/i);
  });

  it("has TIMESTAMPTZ timestamps", () => {
    const block = tableBlock("shops");
    expect(block).toMatch(/created_at\s+TIMESTAMPTZ/i);
    expect(block).toMatch(/updated_at\s+TIMESTAMPTZ/i);
  });

  it("does NOT have shop_type or merchant_category column", () => {
    const block = tableBlock("shops");
    expect(block).not.toMatch(/shop_type/i);
    expect(block).not.toMatch(/merchant_category/i);
    expect(block).not.toMatch(/business_type/i);
  });

  it("has RLS enabled", () => {
    expect(sql).toMatch(/ALTER TABLE shops ENABLE ROW LEVEL SECURITY/i);
  });
});

describe("[STATIC] shop_members table", () => {
  it("has UUID primary key", () => {
    const block = tableBlock("shop_members");
    expect(block).toMatch(/id\s+UUID\s+PRIMARY KEY/i);
  });

  it("has shop_id FK referencing shops ON DELETE RESTRICT", () => {
    const block = tableBlock("shop_members");
    expect(block).toMatch(/REFERENCES shops\s*\(id\)\s+ON DELETE RESTRICT/i);
  });

  it("has user_id FK referencing users ON DELETE RESTRICT", () => {
    const block = tableBlock("shop_members");
    expect(block).toMatch(/REFERENCES users\s*\(id\)\s+ON DELETE RESTRICT/i);
  });

  it("has role CHECK constraint with owner/manager/staff", () => {
    const block = tableBlock("shop_members");
    expect(block).toMatch(/role\s+TEXT\s+NOT NULL/i);
    expect(block).toMatch(/CHECK\s*\(role IN \('owner'/i);
    expect(block).toMatch(/'manager'/i);
    expect(block).toMatch(/'staff'/i);
  });

  it("has unique membership constraint per shop+user", () => {
    expect(sql).toMatch(/shop_members_unique_membership/i);
    expect(sql).toMatch(/UNIQUE\s*\(shop_id,\s*user_id\)/i);
  });

  it("has partial unique index enforcing one owner per shop", () => {
    expect(sql).toMatch(/shop_members_one_owner_per_shop/i);
    expect(sql).toMatch(/WHERE role = 'owner'/i);
  });

  it("has RLS enabled", () => {
    expect(sql).toMatch(/ALTER TABLE shop_members ENABLE ROW LEVEL SECURITY/i);
  });
});

describe("[STATIC] shop_settings table", () => {
  it("uses shop_id as both PK and FK to shops", () => {
    const block = tableBlock("shop_settings");
    expect(block).toMatch(/shop_id\s+UUID\s+PRIMARY KEY/i);
    expect(block).toMatch(/REFERENCES shops\s*\(id\)/i);
  });

  it("has currency defaulting to INR", () => {
    const block = tableBlock("shop_settings");
    expect(block).toMatch(/currency/i);
    expect(block).toMatch(/DEFAULT 'INR'/i);
  });

  it("has timezone defaulting to Asia/Kolkata", () => {
    const block = tableBlock("shop_settings");
    expect(block).toMatch(/timezone/i);
    expect(block).toMatch(/DEFAULT 'Asia\/Kolkata'/i);
  });

  it("does NOT have shop_type column", () => {
    const block = tableBlock("shop_settings");
    expect(block).not.toMatch(/shop_type/i);
  });

  it("has RLS enabled", () => {
    expect(sql).toMatch(/ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY/i);
  });
});

describe("[STATIC] updated_at trigger", () => {
  it("defines set_updated_at() function", () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION set_updated_at\(\)/i);
  });

  it("attaches trigger to users", () => {
    expect(sql).toMatch(/CREATE OR REPLACE TRIGGER users_set_updated_at/i);
  });

  it("attaches trigger to shops", () => {
    expect(sql).toMatch(/CREATE OR REPLACE TRIGGER shops_set_updated_at/i);
  });

  it("attaches trigger to shop_members", () => {
    expect(sql).toMatch(/CREATE OR REPLACE TRIGGER shop_members_set_updated_at/i);
  });

  it("attaches trigger to shop_settings", () => {
    expect(sql).toMatch(/CREATE OR REPLACE TRIGGER shop_settings_set_updated_at/i);
  });
});

describe("[STATIC] Security guardrails", () => {
  /**
   * Strip SQL line-comments (-- ...) and COMMENT ON ... IS '...' prose
   * before running guardrail checks so that explanatory text in comments
   * cannot produce false positives against real DDL rules.
   */
  function stripSqlComments(s: string): string {
    return s
      .replace(/--[^\n]*/g, "")                          // remove -- line comments
      .replace(/COMMENT\s+ON\b[\s\S]*?;\s*\n/gi, "");    // remove COMMENT ON blocks
  }

  it("does NOT reference auth.uid() or Supabase Auth", () => {
    const ddl = stripSqlComments(sql);
    expect(ddl).not.toMatch(/auth\.uid\(\)/i);
    expect(ddl).not.toMatch(/auth\.users/i);
    expect(ddl).not.toMatch(/supabase_auth/i);
  });

  it("does NOT use FLOAT or REAL for monetary columns", () => {
    const ddl = stripSqlComments(sql);
    expect(ddl).not.toMatch(/\bFLOAT\b/i);
    expect(ddl).not.toMatch(/\bREAL\b/i);
    expect(ddl).not.toMatch(/\bDOUBLE PRECISION\b/i);
  });

  it("does NOT store a plaintext 'password' column", () => {
    // After stripping comments the only remaining 'password' token
    // must be the column name 'password_hash'.
    const ddl = stripSqlComments(sql);
    expect(ddl).not.toMatch(/\bpassword\b(?!_hash)/i);
  });

  it("does NOT grant public or anonymous access", () => {
    expect(sql).not.toMatch(/GRANT.*TO.*anon/i);
    expect(sql).not.toMatch(/GRANT.*TO.*public/i);
  });
});
