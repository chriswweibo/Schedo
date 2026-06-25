CREATE INDEX IF NOT EXISTS "Provider_lat_lng_idx" ON "Provider"("lat", "lng");
CREATE INDEX IF NOT EXISTS "CompletedJob_providerId_completedAt_idx" ON "CompletedJob"("providerId", "completedAt");
CREATE INDEX IF NOT EXISTS "Provider_keywords_gin_idx" ON "Provider" USING GIN ("keywords");
