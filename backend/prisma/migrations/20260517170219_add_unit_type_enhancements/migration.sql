-- CreateEnum
CREATE TYPE "unit_type" AS ENUM ('min', 'max', 'timeline', 'zero');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "goal_status" ADD VALUE 'paused';
ALTER TYPE "goal_status" ADD VALUE 'submitted';

-- AlterTable
ALTER TABLE "goals" ADD COLUMN     "employee_note" TEXT,
ADD COLUMN     "manager_comment" TEXT,
ADD COLUMN     "target_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "unit" "unit_type" NOT NULL DEFAULT 'min';

-- AlterTable
ALTER TABLE "quarterly_checkins" ADD COLUMN     "status" VARCHAR(40) NOT NULL DEFAULT 'submitted',
ADD COLUMN     "submission_status" VARCHAR(40) NOT NULL DEFAULT 'submitted';
