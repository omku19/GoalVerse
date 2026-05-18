-- Persist JWT-backed sessions so logout and inactivity can invalidate tokens.
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "jwt_id" VARCHAR(80) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_sessions_jwt_id_key" ON "auth_sessions"("jwt_id");
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");
CREATE INDEX "auth_sessions_jwt_id_idx" ON "auth_sessions"("jwt_id");
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");
CREATE INDEX "auth_sessions_revoked_at_idx" ON "auth_sessions"("revoked_at");

ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Goal lock metadata powers HR exception unlocks and post-lock audit reporting.
ALTER TABLE "goals"
ADD COLUMN "locked_at" TIMESTAMPTZ(6),
ADD COLUMN "unlocked_until" TIMESTAMPTZ(6),
ADD COLUMN "unlocked_by_id" UUID,
ADD COLUMN "unlock_reason" TEXT;

CREATE INDEX "goals_locked_at_idx" ON "goals"("locked_at");
CREATE INDEX "goals_unlocked_until_idx" ON "goals"("unlocked_until");
