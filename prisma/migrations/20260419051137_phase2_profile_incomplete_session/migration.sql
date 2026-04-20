-- CreateTable
CREATE TABLE "PersonalizationProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastSelectedExamId" TEXT,
    "lastRecommendedExamId" TEXT,
    "selectionCountByExam" JSONB DEFAULT '{}',
    "launchCountByExam" JSONB DEFAULT '{}',
    "recommendationCountByExam" JSONB DEFAULT '{}',
    "eventSourceByExam" JSONB DEFAULT '{}',
    "preferences" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalizationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncompleteSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "sessionId" TEXT,
    "startUrl" TEXT,
    "resumeUrl" TEXT,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "currentSectionIndex" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER NOT NULL DEFAULT 1,
    "timerSeconds" INTEGER NOT NULL DEFAULT 0,
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "selectedLanguage" TEXT NOT NULL DEFAULT 'en',
    "questionStates" JSONB DEFAULT '[]',
    "sectionTimeById" JSONB DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncompleteSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalizationProfile_userId_key" ON "PersonalizationProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IncompleteSession_userId_key" ON "IncompleteSession"("userId");

-- AddForeignKey
ALTER TABLE "PersonalizationProfile" ADD CONSTRAINT "PersonalizationProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncompleteSession" ADD CONSTRAINT "IncompleteSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
