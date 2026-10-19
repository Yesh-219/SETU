-- =============================================================================
-- Migration: 0001_core_identity_and_tenancy.sql
-- Description: Core identity and multi-tenancy tables for Setu.
--
-- Tables created:
--   1. users          — Setu-managed user accounts (NOT Supabase Auth)
--   2. user_sessions  — Server-managed session tokens (hashed)
--   3. shops          — Merchant shop profiles
--   4. shop_members   — User ↔ shop membership with roles
--   5. shop_settings  — Per-shop defaults (currency, timezone)
--
-- Architecture notes:
--   - Setu manages its own authentication. Supabase Auth / auth.users is NOT used.
--   - The Express backend uses the Supabase service-role key via a server-side
--     connection pool. Browser clients NEVER receive this key.
--   - Row-Level Security (RLS) is ENABLED on all tables so that the Supabase
--     Data API (PostgREST) cannot expose rows to anonymous or authenticated
--     Supabase JWT callers. All legitimate access goes through the Express API
--     using the service role, which bypasses RLS intentionally.
--   - Do NOT add policies that reference auth.uid() — Supabase Auth is not used.
--   - This migration is idempotent via IF NOT EXISTS / CREATE TYPE IF NOT EXISTS.
--   - Apply to a fresh database; never run against production without review.
--
-- Applied: manually via psql or Supabase Dashboard SQL editor.
--          See README.md §"Database migrations" for instructions.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Prerequisites
-- ---------------------------------------------------------------------------
-- Enable pgcrypto for gen_random_uuid() (available by default on Supabase).
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ---------------------------------------------------------------------------
-- 1. Enum-like domains / check-constraint helpers
--    Using VARCHAR + CHECK rather than ENUM so we can alter them without
--    rewriting the column later.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 2. users
-- ---------------------------------------------------------------------------
-- Setu's own user accounts. Supabase Auth is explicitly NOT used.
-- Password hashing is the responsibility of the Express backend; only the
-- bcrypt/argon2 hash is stored here, never a plaintext password.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  full_name     TEXT        NOT NULL,

  -- Registration may be by email OR phone; both are nullable individually,
  -- but the CHECK below ensures at least one is always present.
  email         TEXT        UNIQUE,          -- stored lower-cased by the app layer
  phone_e164    TEXT        UNIQUE,          -- E.164 format, e.g. +919876543210

  -- Only bcrypt/argon2 hashes are stored.
  password_hash TEXT        NOT NULL,

  -- Account lifecycle.
  -- 'active'   — normal, can log in.
  -- 'suspended' — temporarily disabled by an admin.
  -- 'deleted'   — soft-deleted; row retained for FK integrity.
  status        TEXT        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended', 'deleted')),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- At least one contact identifier must be present.
  CONSTRAINT users_email_or_phone_required
    CHECK (email IS NOT NULL OR phone_e164 IS NOT NULL)
);

COMMENT ON TABLE  users                    IS 'Setu-managed user accounts. Supabase Auth is not used.';
COMMENT ON COLUMN users.email              IS 'Lower-cased in the application layer before storage; case-insensitive uniqueness enforced by the UNIQUE index.';
COMMENT ON COLUMN users.phone_e164         IS 'International format (E.164), e.g. +919876543210. Normalized by the application before storage.';
COMMENT ON COLUMN users.password_hash      IS 'bcrypt or argon2 hash only. Plaintext passwords must never be stored.';
COMMENT ON COLUMN users.status             IS 'active | suspended | deleted. Deleted accounts are soft-deleted; rows are never hard-deleted.';

-- Support fast lookup by email (case-insensitive) and phone.
-- The UNIQUE constraint above already creates a btree index; we add a
-- functional lower() index for case-insensitive email lookups.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_ci_unique
  ON users (lower(email))
  WHERE email IS NOT NULL;

-- Index for status-filtered admin queries.
CREATE INDEX IF NOT EXISTS users_status_idx ON users (status);

-- Row-Level Security — enabled; no policies means service-role bypass only.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 3. user_sessions
-- ---------------------------------------------------------------------------
-- Server-managed sessions. The Express API creates and validates sessions;
-- raw tokens are NEVER stored — only a secure hash (SHA-256 or similar).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id         UUID        NOT NULL
                  REFERENCES users (id) ON DELETE CASCADE,

  -- Hash of the opaque token issued to the client (e.g. SHA-256 hex).
  token_hash      TEXT        NOT NULL UNIQUE,

  -- Timestamps.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,                          -- NULL means not yet revoked
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT now()   -- updated on each authenticated request
);

COMMENT ON TABLE  user_sessions                 IS 'Setu server-managed sessions. Raw tokens are never stored.';
COMMENT ON COLUMN user_sessions.token_hash      IS 'SHA-256 (or equivalent) hex digest of the opaque session token issued to the client.';
COMMENT ON COLUMN user_sessions.expires_at      IS 'Absolute expiry; the Express middleware rejects sessions past this time.';
COMMENT ON COLUMN user_sessions.revoked_at      IS 'Set to now() on explicit logout. NULL = active (subject to expiry check).';
COMMENT ON COLUMN user_sessions.last_active_at  IS 'Updated on each authenticated request to support idle-timeout policies.';

-- Fast token lookup (the most frequent query: validate a presented token).
CREATE INDEX IF NOT EXISTS user_sessions_token_hash_idx
  ON user_sessions (token_hash);

-- Lookup all sessions for a user (profile / "active sessions" screen).
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx
  ON user_sessions (user_id);

-- Expiry-based cleanup: find rows safe to purge in a maintenance job.
CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx
  ON user_sessions (expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 4. shops
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shops (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  name             TEXT        NOT NULL,

  -- URL-safe public identifier, e.g. "raj-electronics".
  -- Used for catalogue URLs; must be globally unique.
  slug             TEXT        NOT NULL UNIQUE,

  address          TEXT,
  contact_phone    TEXT,

  -- Supabase Storage object key; resolved to a signed URL at read time.
  logo_storage_key TEXT,

  created_by       UUID        NOT NULL
                   REFERENCES users (id) ON DELETE RESTRICT,

  -- 'active'   — operational.
  -- 'inactive' — owner has paused the shop.
  -- 'deleted'  — soft-deleted; historical records remain intact.
  status           TEXT        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive', 'deleted')),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  shops                   IS 'Merchant shop profiles. No hard deletes; use status=''deleted''.';
COMMENT ON COLUMN shops.slug              IS 'URL-safe unique identifier, e.g. ''raj-electronics''. Used in public catalogue URLs.';
COMMENT ON COLUMN shops.logo_storage_key  IS 'Supabase Storage object key. The API resolves this to a signed or public URL; never stored as a full URL.';
COMMENT ON COLUMN shops.created_by        IS 'The user who created the shop. ON DELETE RESTRICT prevents orphaned shops.';
COMMENT ON COLUMN shops.status            IS 'active | inactive | deleted. Rows are soft-deleted only.';

-- Slug uniqueness is already enforced by UNIQUE above (creates an index).
-- Additional index for filtering active shops.
CREATE INDEX IF NOT EXISTS shops_status_idx       ON shops (status);
CREATE INDEX IF NOT EXISTS shops_created_by_idx   ON shops (created_by);

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 5. shop_members
-- ---------------------------------------------------------------------------
-- Connects users to shops with a role. One user may belong to multiple shops.
-- A shop has exactly one 'owner' at any point in time (enforced below).
--
-- IMPORTANT (for onboarding task):
--   When a user creates a shop, the application MUST insert an 'owner'
--   membership in the same transaction as the shops INSERT.
--   This table does not enforce that automatically.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  shop_id    UUID        NOT NULL
             REFERENCES shops (id) ON DELETE RESTRICT,

  user_id    UUID        NOT NULL
             REFERENCES users (id) ON DELETE RESTRICT,

  -- Roles: owner > manager > staff.
  -- owner   — full control, cannot be removed while the shop exists.
  -- manager — operational access; cannot change ownership.
  -- staff   — limited day-to-day access.
  role       TEXT        NOT NULL
             CHECK (role IN ('owner', 'manager', 'staff')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A user can only have one membership per shop.
  CONSTRAINT shop_members_unique_membership
    UNIQUE (shop_id, user_id)
);

COMMENT ON TABLE  shop_members        IS 'User ↔ shop memberships. ON DELETE RESTRICT on both FKs preserves historical records.';
COMMENT ON COLUMN shop_members.role   IS 'owner | manager | staff. Each shop must have exactly one owner (enforced by the partial unique index below).';

-- Enforce at most one owner per shop.
CREATE UNIQUE INDEX IF NOT EXISTS shop_members_one_owner_per_shop
  ON shop_members (shop_id)
  WHERE role = 'owner';

-- Find all shops a user belongs to.
CREATE INDEX IF NOT EXISTS shop_members_user_id_idx  ON shop_members (user_id);

-- Find all members of a shop.
CREATE INDEX IF NOT EXISTS shop_members_shop_id_idx  ON shop_members (shop_id);

ALTER TABLE shop_members ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 6. shop_settings
-- ---------------------------------------------------------------------------
-- One row per shop. shop_id is both PK and FK, ensuring 1-to-1.
-- Populated when a shop is created; rows should never be hard-deleted.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop_settings (
  shop_id    UUID        PRIMARY KEY
             REFERENCES shops (id) ON DELETE RESTRICT,

  currency   TEXT        NOT NULL DEFAULT 'INR',
  timezone   TEXT        NOT NULL DEFAULT 'Asia/Kolkata',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  shop_settings           IS 'Per-shop defaults. One row per shop, created during onboarding.';
COMMENT ON COLUMN shop_settings.currency  IS 'ISO 4217 currency code, e.g. INR. Default: INR.';
COMMENT ON COLUMN shop_settings.timezone  IS 'IANA timezone name, e.g. Asia/Kolkata. Default: Asia/Kolkata.';

ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 7. updated_at trigger function
-- ---------------------------------------------------------------------------
-- Automatically keeps updated_at current on every UPDATE.
-- Applied to all tables that carry an updated_at column.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER shops_set_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER shop_members_set_updated_at
  BEFORE UPDATE ON shop_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER shop_settings_set_updated_at
  BEFORE UPDATE ON shop_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------------------
-- End of migration 0001
-- ---------------------------------------------------------------------------
