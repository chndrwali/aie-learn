-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('LEARN', 'BUILD');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "phase" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "motto" TEXT,
    "type" "LessonType",
    "languages" TEXT[],
    "prerequisites" TEXT,
    "estimatedMinutes" INTEGER,
    "contentMd" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "sourceSha" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "firstViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_sync" (
    "id" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "phases" INTEGER NOT NULL,
    "lessonsActive" INTEGER NOT NULL,
    "lessonsSkipped" INTEGER NOT NULL,
    "report" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_sync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phase_slug_key" ON "phase"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "phase_number_key" ON "phase"("number");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_sourcePath_key" ON "lesson"("sourcePath");

-- CreateIndex
CREATE INDEX "lesson_phaseId_sortOrder_idx" ON "lesson"("phaseId", "sortOrder");

-- CreateIndex
CREATE INDEX "lesson_sortOrder_idx" ON "lesson"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_phaseId_slug_key" ON "lesson"("phaseId", "slug");

-- CreateIndex
CREATE INDEX "lesson_progress_userId_status_idx" ON "lesson_progress"("userId", "status");

-- CreateIndex
CREATE INDEX "lesson_progress_userId_lastViewedAt_idx" ON "lesson_progress"("userId", "lastViewedAt" DESC);

-- CreateIndex
CREATE INDEX "lesson_progress_userId_completedAt_idx" ON "lesson_progress"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_userId_lessonId_key" ON "lesson_progress"("userId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "note_userId_lessonId_key" ON "note"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "content_sync_createdAt_idx" ON "content_sync"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note" ADD CONSTRAINT "note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note" ADD CONSTRAINT "note_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
