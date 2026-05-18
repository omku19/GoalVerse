-- Annual goal-sheet fields, shared-goal linkage, and governance controls.
ALTER TABLE "goals"
ADD COLUMN "shared_group_id" UUID,
ADD COLUMN "shared_source_goal_id" UUID,
ADD COLUMN "thrust_area" VARCHAR(120) NOT NULL DEFAULT 'Business Impact',
ADD COLUMN "weightage" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN "cycle_year" INTEGER,
ADD COLUMN "submitted_at" TIMESTAMPTZ(6),
ADD COLUMN "returned_at" TIMESTAMPTZ(6);

UPDATE "goals" SET "cycle_year" = COALESCE("year", EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
UPDATE "goals" SET "submitted_at" = COALESCE("approved_at", "created_at") WHERE "approval_status" = 'approved';

CREATE INDEX "goals_shared_group_id_idx" ON "goals"("shared_group_id");
CREATE INDEX "goals_shared_source_goal_id_idx" ON "goals"("shared_source_goal_id");
CREATE INDEX "goals_cycle_year_idx" ON "goals"("cycle_year");

CREATE TABLE "goal_cycles" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "is_goal_setting_open" BOOLEAN NOT NULL DEFAULT false,
    "opened_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "goal_cycles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "goal_cycles_year_key" ON "goal_cycles"("year");
CREATE INDEX "goal_cycles_year_idx" ON "goal_cycles"("year");
CREATE INDEX "goal_cycles_is_goal_setting_open_idx" ON "goal_cycles"("is_goal_setting_open");

CREATE TABLE "checkin_windows" (
    "id" UUID NOT NULL,
    "cycle_year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "is_open" BOOLEAN NOT NULL DEFAULT false,
    "opened_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "checkin_windows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "checkin_windows_cycle_year_quarter_key" ON "checkin_windows"("cycle_year", "quarter");
CREATE INDEX "checkin_windows_cycle_year_idx" ON "checkin_windows"("cycle_year");
CREATE INDEX "checkin_windows_quarter_idx" ON "checkin_windows"("quarter");
CREATE INDEX "checkin_windows_is_open_idx" ON "checkin_windows"("is_open");
