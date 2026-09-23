-- Snapshot the current template name before allowing the template relation to be removed.
ALTER TABLE "WorkoutSession" ADD COLUMN "workoutName" TEXT;

UPDATE "WorkoutSession" AS session
SET "workoutName" = workout."name"
FROM "Workout" AS workout
WHERE session."workoutId" = workout."id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "WorkoutSession" WHERE "workoutName" IS NULL) THEN
    RAISE EXCEPTION 'WorkoutSession workoutName backfill left NULL rows';
  END IF;
END $$;

ALTER TABLE "WorkoutSession" ALTER COLUMN "workoutName" SET NOT NULL;
ALTER TABLE "WorkoutSession" ALTER COLUMN "workoutId" DROP NOT NULL;

ALTER TABLE "WorkoutSession" DROP CONSTRAINT "WorkoutSession_workoutId_fkey";
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_workoutId_fkey"
  FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "WorkoutSession_workoutId_userId_completedAt_idx"
  ON "WorkoutSession"("workoutId", "userId", "completedAt");
CREATE INDEX "WorkoutSession_userId_completedAt_idx"
  ON "WorkoutSession"("userId", "completedAt");
