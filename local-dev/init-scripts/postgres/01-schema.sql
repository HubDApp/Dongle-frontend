-- Dongle local development database schema
-- This file runs automatically on first container start (PostgreSQL initdb).
-- For production migrations use a proper migration tool (e.g. Flyway, golang-migrate).

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ── Projects ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id              TEXT        PRIMARY KEY,
    name            TEXT        NOT NULL,
    category        TEXT        NOT NULL,
    description     TEXT        NOT NULL DEFAULT '',
    website_url     TEXT        NOT NULL DEFAULT '',
    github_url      TEXT,
    logo_cid        TEXT,                        -- IPFS CID
    docs_url        TEXT,
    audit_report_url TEXT,
    owner_address   TEXT        NOT NULL,        -- Stellar G... public key
    status          TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner   ON projects (owner_address);
CREATE INDEX IF NOT EXISTS idx_projects_status  ON projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects (created_at DESC);

-- ── Reviews ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    TEXT        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    user_address  TEXT        NOT NULL,           -- Stellar G... public key
    rating        SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT        NOT NULL CHECK (char_length(comment) BETWEEN 10 AND 1000),
    comment_cid   TEXT,                           -- IPFS CID for on-chain version
    helpful_votes TEXT[]      NOT NULL DEFAULT '{}',
    unhelpful_votes TEXT[]    NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- One review per user per project
    CONSTRAINT uq_reviews_user_project UNIQUE (project_id, user_address)
);

CREATE INDEX IF NOT EXISTS idx_reviews_project ON reviews (project_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user    ON reviews (user_address);

-- ── Verification requests ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_requests (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        TEXT        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    submitted_by      TEXT        NOT NULL,       -- Stellar G... public key
    status            TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'verified', 'rejected', 'revoked')),
    evidence_cid      TEXT,                       -- IPFS CID for evidence bundle
    rejection_reason  TEXT,
    status_updated_by TEXT,
    status_updated_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- One active request per project
    CONSTRAINT uq_verification_project UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS idx_verification_status ON verification_requests (status);

-- ── Drafts ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drafts (
    id             TEXT        NOT NULL,
    wallet_address TEXT        NOT NULL,
    project_data   JSONB       NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_drafts_wallet ON drafts (wallet_address);

-- ── Audit log ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor      TEXT        NOT NULL,
    action     TEXT        NOT NULL,
    target_id  TEXT,
    target_label TEXT,
    metadata   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor  ON audit_log (actor);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_ts     ON audit_log (created_at DESC);

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_address TEXT        NOT NULL,
    type              TEXT        NOT NULL,
    title             TEXT        NOT NULL,
    message           TEXT,
    project_id        TEXT,
    project_name      TEXT,
    read              BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_address);
CREATE INDEX IF NOT EXISTS idx_notifications_read      ON notifications (recipient_address, read);
