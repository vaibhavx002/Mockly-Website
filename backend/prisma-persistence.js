const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const PERSISTENCE_DRIVER = String(process.env.MOCKLY_PERSISTENCE_DRIVER || '').trim().toLowerCase();
const PRISMA_ENABLED = PERSISTENCE_DRIVER === 'prisma';
const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();

let prismaClient = null;
let prismaInitError = null;

if (PRISMA_ENABLED) {
    try {
        if (!DATABASE_URL) {
            throw new Error('DATABASE_URL is required when MOCKLY_PERSISTENCE_DRIVER=prisma.');
        }

        // eslint-disable-next-line global-require
        const { PrismaClient } = require('@prisma/client');
        prismaClient = new PrismaClient();
    } catch (error) {
        prismaInitError = error;
    }
}

const assertPrismaReady = () => {
    if (!PRISMA_ENABLED) {
        throw new Error('Prisma persistence is disabled. Set MOCKLY_PERSISTENCE_DRIVER=prisma.');
    }

    if (prismaInitError) {
        throw prismaInitError;
    }

    if (!prismaClient) {
        throw new Error('Prisma client is unavailable. Run npm install and prisma generate.');
    }

    return prismaClient;
};

const toIsoOrFallback = (value, fallbackIso) => {
    const timestamp = Date.parse(String(value || ''));
    if (!Number.isFinite(timestamp)) return fallbackIso;
    return new Date(timestamp).toISOString();
};

const toDateOrNow = (value) => {
    const timestamp = Date.parse(String(value || ''));
    if (!Number.isFinite(timestamp)) return new Date();
    return new Date(timestamp);
};

const toSafeEmail = (value) => String(value || '').trim().toLowerCase();

const mapUserRecord = (row) => {
    if (!row || !isPlainObject(row)) return null;

    return {
        email: toSafeEmail(row.email),
        name: String(row.name || '').trim(),
        phone: String(row.phone || '').replace(/\D/g, '').slice(0, 10),
        passwordHash: String(row.passwordHash || '').trim(),
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : '',
        lastLoginAt: row.lastLoginAt instanceof Date ? row.lastLoginAt.toISOString() : ''
    };
};

const mapAttemptRecord = (row) => {
    if (!row || !isPlainObject(row)) return null;

    return {
        attemptId: String(row.attemptId || '').trim(),
        examId: String(row.examId || '').trim().toLowerCase(),
        paperId: String(row.paperId || '').trim().toLowerCase(),
        score: Number(row.score || 0),
        maxScore: Number(row.maxScore || 0),
        scorePercent: Number(row.scorePercent || 0),
        correct: Math.max(0, Number.parseInt(String(row.correct || 0), 10) || 0),
        wrong: Math.max(0, Number.parseInt(String(row.wrong || 0), 10) || 0),
        unanswered: Math.max(0, Number.parseInt(String(row.unanswered || 0), 10) || 0),
        totalQuestions: Math.max(0, Number.parseInt(String(row.totalQuestions || 0), 10) || 0),
        accuracyPercent: Number(row.accuracyPercent || 0),
        durationMinutes: Math.max(1, Number.parseInt(String(row.durationMinutes || 1), 10) || 1),
        timeTakenSeconds: Math.max(0, Number.parseInt(String(row.timeTakenSeconds || 0), 10) || 0),
        launchMode: String(row.launchMode || 'dynamic').trim() || 'dynamic',
        isAutoSubmitted: Boolean(row.isAutoSubmitted),
        sectionStats: Array.isArray(row.sectionStats) ? row.sectionStats : [],
        weakTopics: Array.isArray(row.weakTopics) ? row.weakTopics : [],
        lowScoreWarnings: Array.isArray(row.lowScoreWarnings) ? row.lowScoreWarnings : [],
        submittedAt: row.submittedAt instanceof Date ? row.submittedAt.toISOString() : new Date().toISOString()
    };
};

const mapPersonalizationProfileRecord = (row) => {
    if (!row || !isPlainObject(row)) return null;

    return {
        lastSelectedExamId: String(row.lastSelectedExamId || '').trim().toLowerCase(),
        lastRecommendedExamId: String(row.lastRecommendedExamId || '').trim().toLowerCase(),
        selectionCountByExam: isPlainObject(row.selectionCountByExam) ? row.selectionCountByExam : {},
        launchCountByExam: isPlainObject(row.launchCountByExam) ? row.launchCountByExam : {},
        recommendationCountByExam: isPlainObject(row.recommendationCountByExam) ? row.recommendationCountByExam : {},
        eventSourceByExam: isPlainObject(row.eventSourceByExam) ? row.eventSourceByExam : {},
        preferences: isPlainObject(row.preferences) ? row.preferences : {},
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : new Date().toISOString()
    };
};

const mapIncompleteSessionRecord = (row) => {
    if (!row || !isPlainObject(row)) return null;

    return {
        examId: String(row.examId || '').trim().toLowerCase(),
        paperId: String(row.paperId || '').trim().toLowerCase(),
        sessionId: String(row.sessionId || '').trim(),
        startUrl: String(row.startUrl || '').trim(),
        resumeUrl: String(row.resumeUrl || '').trim(),
        totalQuestions: Math.max(0, Number.parseInt(String(row.totalQuestions || 0), 10) || 0),
        currentQuestionIndex: Math.max(0, Number.parseInt(String(row.currentQuestionIndex || 0), 10) || 0),
        currentSectionIndex: Math.max(0, Number.parseInt(String(row.currentSectionIndex || 0), 10) || 0),
        durationMinutes: Math.max(1, Number.parseInt(String(row.durationMinutes || 1), 10) || 1),
        timerSeconds: Math.max(0, Number.parseInt(String(row.timerSeconds || 0), 10) || 0),
        progressPercent: Math.max(0, Math.min(100, Number(row.progressPercent || 0))),
        selectedLanguage: String(row.selectedLanguage || 'en').trim().toLowerCase() || 'en',
        questionStates: Array.isArray(row.questionStates) ? row.questionStates : [],
        sectionTimeById: isPlainObject(row.sectionTimeById) ? row.sectionTimeById : {},
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : new Date().toISOString()
    };
};

const findUserIdByEmail = async (prisma, email) => {
    const safeEmail = toSafeEmail(email);
    if (!safeEmail) return '';

    const user = await prisma.user.findUnique({
        where: { email: safeEmail },
        select: { id: true }
    });

    return String(user?.id || '');
};

const isPrismaPersistenceEnabled = () => PRISMA_ENABLED;

const getPrismaPersistenceState = () => ({
    enabled: PRISMA_ENABLED,
    initialized: Boolean(prismaClient) && !prismaInitError,
    error: prismaInitError ? String(prismaInitError.message || prismaInitError) : ''
});

const getUserByEmail = async (email) => {
    const prisma = assertPrismaReady();
    const safeEmail = toSafeEmail(email);
    if (!safeEmail) return null;

    const row = await prisma.user.findUnique({
        where: { email: safeEmail }
    });

    return mapUserRecord(row);
};

const hasUserByEmail = async (email) => {
    const user = await getUserByEmail(email);
    return Boolean(user);
};

const upsertUserRecord = async (userRecord) => {
    const prisma = assertPrismaReady();
    const email = toSafeEmail(userRecord?.email);
    if (!email) {
        throw new Error('upsertUserRecord requires a valid email.');
    }

    const name = String(userRecord?.name || '').trim() || 'Mockly User';
    const phoneText = String(userRecord?.phone || '').replace(/\D/g, '').slice(0, 10);
    const passwordHash = String(userRecord?.passwordHash || '').trim();

    if (!passwordHash) {
        throw new Error('upsertUserRecord requires passwordHash.');
    }

    const nowIso = new Date().toISOString();
    const createdAtIso = toIsoOrFallback(userRecord?.createdAt, nowIso);
    const lastLoginAtIso = toIsoOrFallback(userRecord?.lastLoginAt, nowIso);

    const row = await prisma.user.upsert({
        where: { email },
        update: {
            name,
            phone: phoneText || null,
            passwordHash,
            lastLoginAt: lastLoginAtIso ? new Date(lastLoginAtIso) : null
        },
        create: {
            email,
            name,
            phone: phoneText || null,
            passwordHash,
            createdAt: new Date(createdAtIso),
            lastLoginAt: lastLoginAtIso ? new Date(lastLoginAtIso) : null
        }
    });

    return mapUserRecord(row);
};

const pruneExpiredRefreshTokenSessions = async () => {
    const prisma = assertPrismaReady();
    const now = new Date();

    const result = await prisma.refreshToken.deleteMany({
        where: {
            expiresAt: {
                lte: now
            }
        }
    });

    return Number(result?.count || 0);
};

const storeRefreshTokenSession = async (email, tokenHash, expiresAtIso) => {
    const prisma = assertPrismaReady();
    const safeEmail = toSafeEmail(email);
    const safeTokenHash = String(tokenHash || '').trim();
    if (!safeEmail || !safeTokenHash) {
        return false;
    }

    const user = await prisma.user.findUnique({
        where: { email: safeEmail },
        select: { id: true }
    });

    if (!user) {
        return false;
    }

    const expiresAt = toDateOrNow(expiresAtIso);

    await prisma.refreshToken.upsert({
        where: { tokenHash: safeTokenHash },
        update: {
            userId: user.id,
            expiresAt
        },
        create: {
            tokenHash: safeTokenHash,
            userId: user.id,
            expiresAt
        }
    });

    const staleRows = await prisma.refreshToken.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip: 5,
        select: { tokenHash: true }
    });

    if (staleRows.length) {
        await prisma.refreshToken.deleteMany({
            where: {
                tokenHash: {
                    in: staleRows.map((row) => String(row.tokenHash || '').trim()).filter(Boolean)
                }
            }
        });
    }

    return true;
};

const getRefreshTokenSession = async (tokenHash) => {
    const prisma = assertPrismaReady();
    const safeTokenHash = String(tokenHash || '').trim();
    if (!safeTokenHash) return null;

    const row = await prisma.refreshToken.findUnique({
        where: { tokenHash: safeTokenHash },
        include: {
            user: {
                select: { email: true }
            }
        }
    });

    if (!row) return null;

    return {
        email: toSafeEmail(row.user?.email),
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : '',
        expiresAt: row.expiresAt instanceof Date ? row.expiresAt.toISOString() : ''
    };
};

const revokeRefreshTokenSession = async (tokenHash) => {
    const prisma = assertPrismaReady();
    const safeTokenHash = String(tokenHash || '').trim();
    if (!safeTokenHash) return 0;

    const result = await prisma.refreshToken.deleteMany({
        where: { tokenHash: safeTokenHash }
    });

    return Number(result?.count || 0);
};

const upsertAttemptForUser = async (email, attemptRecord) => {
    const prisma = assertPrismaReady();
    const safeEmail = toSafeEmail(email);
    if (!safeEmail) {
        throw new Error('upsertAttemptForUser requires a valid email.');
    }

    const user = await prisma.user.findUnique({
        where: { email: safeEmail },
        select: { id: true }
    });

    if (!user) {
        throw new Error(`Cannot store attempt. User not found: ${safeEmail}`);
    }

    const attemptId = String(attemptRecord?.attemptId || '').trim();
    if (!attemptId) {
        throw new Error('Attempt record requires attemptId.');
    }

    const payload = {
        attemptId,
        userId: user.id,
        examId: String(attemptRecord?.examId || '').trim().toLowerCase(),
        paperId: String(attemptRecord?.paperId || '').trim().toLowerCase(),
        score: Number(attemptRecord?.score || 0),
        maxScore: Number(attemptRecord?.maxScore || 0),
        scorePercent: Number(attemptRecord?.scorePercent || 0),
        correct: Math.max(0, Number.parseInt(String(attemptRecord?.correct || 0), 10) || 0),
        wrong: Math.max(0, Number.parseInt(String(attemptRecord?.wrong || 0), 10) || 0),
        unanswered: Math.max(0, Number.parseInt(String(attemptRecord?.unanswered || 0), 10) || 0),
        totalQuestions: Math.max(0, Number.parseInt(String(attemptRecord?.totalQuestions || 0), 10) || 0),
        accuracyPercent: Number(attemptRecord?.accuracyPercent || 0),
        durationMinutes: Math.max(1, Number.parseInt(String(attemptRecord?.durationMinutes || 1), 10) || 1),
        timeTakenSeconds: Math.max(0, Number.parseInt(String(attemptRecord?.timeTakenSeconds || 0), 10) || 0),
        launchMode: String(attemptRecord?.launchMode || 'dynamic').trim() || 'dynamic',
        isAutoSubmitted: Boolean(attemptRecord?.isAutoSubmitted),
        sectionStats: Array.isArray(attemptRecord?.sectionStats) ? attemptRecord.sectionStats : [],
        weakTopics: Array.isArray(attemptRecord?.weakTopics) ? attemptRecord.weakTopics : [],
        lowScoreWarnings: Array.isArray(attemptRecord?.lowScoreWarnings) ? attemptRecord.lowScoreWarnings : [],
        submittedAt: toDateOrNow(attemptRecord?.submittedAt)
    };

    await prisma.attempt.upsert({
        where: { attemptId: payload.attemptId },
        update: {
            userId: payload.userId,
            examId: payload.examId,
            paperId: payload.paperId,
            score: payload.score,
            maxScore: payload.maxScore,
            scorePercent: payload.scorePercent,
            correct: payload.correct,
            wrong: payload.wrong,
            unanswered: payload.unanswered,
            totalQuestions: payload.totalQuestions,
            accuracyPercent: payload.accuracyPercent,
            durationMinutes: payload.durationMinutes,
            timeTakenSeconds: payload.timeTakenSeconds,
            launchMode: payload.launchMode,
            isAutoSubmitted: payload.isAutoSubmitted,
            sectionStats: payload.sectionStats,
            weakTopics: payload.weakTopics,
            lowScoreWarnings: payload.lowScoreWarnings,
            submittedAt: payload.submittedAt
        },
        create: payload
    });

    const staleAttempts = await prisma.attempt.findMany({
        where: { userId: user.id },
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        skip: 200,
        select: { id: true }
    });

    if (staleAttempts.length) {
        await prisma.attempt.deleteMany({
            where: {
                id: {
                    in: staleAttempts.map((item) => item.id)
                }
            }
        });
    }

    const totalAttempts = await prisma.attempt.count({
        where: { userId: user.id }
    });

    return {
        totalAttempts
    };
};

const listRecentAttemptsForUser = async (email, limit = 10) => {
    const prisma = assertPrismaReady();
    const safeEmail = toSafeEmail(email);
    if (!safeEmail) return [];

    const user = await prisma.user.findUnique({
        where: { email: safeEmail },
        select: { id: true }
    });

    if (!user) return [];

    const rows = await prisma.attempt.findMany({
        where: { userId: user.id },
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        take: Math.max(1, Math.min(100, Number.parseInt(String(limit), 10) || 10))
    });

    return rows.map(mapAttemptRecord).filter(Boolean);
};

const listAttemptsForPaper = async (examId, paperId, limit = 500) => {
    const prisma = assertPrismaReady();
    const safeExamId = String(examId || '').trim().toLowerCase();
    const safePaperId = String(paperId || '').trim().toLowerCase();
    if (!safeExamId || !safePaperId) return [];

    const rows = await prisma.attempt.findMany({
        where: {
            examId: safeExamId,
            paperId: safePaperId
        },
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        take: Math.max(1, Math.min(2000, Number.parseInt(String(limit), 10) || 500))
    });

    return rows.map(mapAttemptRecord).filter(Boolean);
};

const listAttemptCutoffAverages = async () => {
    const prisma = assertPrismaReady();

    const rows = await prisma.attempt.groupBy({
        by: ['examId'],
        _avg: {
            scorePercent: true
        },
        _count: {
            _all: true
        },
        _max: {
            submittedAt: true
        }
    });

    return rows
        .map((row) => {
            const examId = String(row?.examId || '').trim().toLowerCase();
            const averageScorePercent = Number(row?._avg?.scorePercent);
            const attemptsCount = Number(row?._count?._all || 0);
            const lastSubmittedAt = row?._max?.submittedAt instanceof Date
                ? row._max.submittedAt.toISOString()
                : '';

            if (!examId || !Number.isFinite(averageScorePercent) || attemptsCount <= 0) {
                return null;
            }

            return {
                examId,
                averageScorePercent: Number(averageScorePercent.toFixed(2)),
                attemptsCount,
                lastSubmittedAt
            };
        })
        .filter(Boolean);
};

const upsertPersonalizationProfile = async (email, profileRecord) => {
    const prisma = assertPrismaReady();
    const userId = await findUserIdByEmail(prisma, email);
    if (!userId) {
        throw new Error(`Cannot store personalization profile. User not found: ${toSafeEmail(email)}`);
    }

    const payload = {
        userId,
        lastSelectedExamId: String(profileRecord?.lastSelectedExamId || '').trim().toLowerCase() || null,
        lastRecommendedExamId: String(profileRecord?.lastRecommendedExamId || '').trim().toLowerCase() || null,
        selectionCountByExam: isPlainObject(profileRecord?.selectionCountByExam) ? profileRecord.selectionCountByExam : {},
        launchCountByExam: isPlainObject(profileRecord?.launchCountByExam) ? profileRecord.launchCountByExam : {},
        recommendationCountByExam: isPlainObject(profileRecord?.recommendationCountByExam) ? profileRecord.recommendationCountByExam : {},
        eventSourceByExam: isPlainObject(profileRecord?.eventSourceByExam) ? profileRecord.eventSourceByExam : {},
        preferences: isPlainObject(profileRecord?.preferences) ? profileRecord.preferences : {}
    };

    const row = await prisma.personalizationProfile.upsert({
        where: { userId },
        update: {
            lastSelectedExamId: payload.lastSelectedExamId,
            lastRecommendedExamId: payload.lastRecommendedExamId,
            selectionCountByExam: payload.selectionCountByExam,
            launchCountByExam: payload.launchCountByExam,
            recommendationCountByExam: payload.recommendationCountByExam,
            eventSourceByExam: payload.eventSourceByExam,
            preferences: payload.preferences
        },
        create: payload
    });

    return mapPersonalizationProfileRecord(row);
};

const getPersonalizationProfile = async (email) => {
    const prisma = assertPrismaReady();
    const userId = await findUserIdByEmail(prisma, email);
    if (!userId) return null;

    const row = await prisma.personalizationProfile.findUnique({
        where: { userId }
    });

    return mapPersonalizationProfileRecord(row);
};

const listPersonalizationProfiles = async () => {
    const prisma = assertPrismaReady();
    const rows = await prisma.personalizationProfile.findMany();
    return rows.map(mapPersonalizationProfileRecord).filter(Boolean);
};

const upsertIncompleteSession = async (email, sessionRecord) => {
    const prisma = assertPrismaReady();
    const userId = await findUserIdByEmail(prisma, email);
    if (!userId) {
        throw new Error(`Cannot store incomplete session. User not found: ${toSafeEmail(email)}`);
    }

    const examId = String(sessionRecord?.examId || '').trim().toLowerCase();
    const paperId = String(sessionRecord?.paperId || '').trim().toLowerCase();
    if (!examId || !paperId) {
        throw new Error('Incomplete session requires examId and paperId.');
    }

    const payload = {
        userId,
        examId,
        paperId,
        sessionId: String(sessionRecord?.sessionId || '').trim() || null,
        startUrl: String(sessionRecord?.startUrl || '').trim() || null,
        resumeUrl: String(sessionRecord?.resumeUrl || '').trim() || null,
        totalQuestions: Math.max(0, Number.parseInt(String(sessionRecord?.totalQuestions || 0), 10) || 0),
        currentQuestionIndex: Math.max(0, Number.parseInt(String(sessionRecord?.currentQuestionIndex || 0), 10) || 0),
        currentSectionIndex: Math.max(0, Number.parseInt(String(sessionRecord?.currentSectionIndex || 0), 10) || 0),
        durationMinutes: Math.max(1, Number.parseInt(String(sessionRecord?.durationMinutes || 1), 10) || 1),
        timerSeconds: Math.max(0, Number.parseInt(String(sessionRecord?.timerSeconds || 0), 10) || 0),
        progressPercent: Math.max(0, Math.min(100, Number(sessionRecord?.progressPercent || 0))),
        selectedLanguage: String(sessionRecord?.selectedLanguage || 'en').trim().toLowerCase() || 'en',
        questionStates: Array.isArray(sessionRecord?.questionStates) ? sessionRecord.questionStates : [],
        sectionTimeById: isPlainObject(sessionRecord?.sectionTimeById) ? sessionRecord.sectionTimeById : {}
    };

    const row = await prisma.incompleteSession.upsert({
        where: { userId },
        update: {
            examId: payload.examId,
            paperId: payload.paperId,
            sessionId: payload.sessionId,
            startUrl: payload.startUrl,
            resumeUrl: payload.resumeUrl,
            totalQuestions: payload.totalQuestions,
            currentQuestionIndex: payload.currentQuestionIndex,
            currentSectionIndex: payload.currentSectionIndex,
            durationMinutes: payload.durationMinutes,
            timerSeconds: payload.timerSeconds,
            progressPercent: payload.progressPercent,
            selectedLanguage: payload.selectedLanguage,
            questionStates: payload.questionStates,
            sectionTimeById: payload.sectionTimeById
        },
        create: payload
    });

    return mapIncompleteSessionRecord(row);
};

const getIncompleteSession = async (email) => {
    const prisma = assertPrismaReady();
    const userId = await findUserIdByEmail(prisma, email);
    if (!userId) return null;

    const row = await prisma.incompleteSession.findUnique({
        where: { userId }
    });

    return mapIncompleteSessionRecord(row);
};

const deleteIncompleteSession = async (email) => {
    const prisma = assertPrismaReady();
    const userId = await findUserIdByEmail(prisma, email);
    if (!userId) return 0;

    const result = await prisma.incompleteSession.deleteMany({
        where: { userId }
    });

    return Number(result?.count || 0);
};

const getPrismaDiagnostics = async () => {
    const prisma = assertPrismaReady();

    const [activeUsers, activeRefreshSessions, totalAttempts, attemptBucketsRows, activeProfiles, incompleteSessions] = await Promise.all([
        prisma.user.count(),
        prisma.refreshToken.count(),
        prisma.attempt.count(),
        prisma.attempt.groupBy({ by: ['userId'] }),
        prisma.personalizationProfile.count(),
        prisma.incompleteSession.count()
    ]);

    return {
        activeUsers,
        activeRefreshSessions,
        totalAttempts,
        attemptBuckets: attemptBucketsRows.length,
        activeProfiles,
        incompleteSessions
    };
};

module.exports = {
    isPrismaPersistenceEnabled,
    getPrismaPersistenceState,
    getUserByEmail,
    hasUserByEmail,
    upsertUserRecord,
    pruneExpiredRefreshTokenSessions,
    storeRefreshTokenSession,
    getRefreshTokenSession,
    revokeRefreshTokenSession,
    upsertAttemptForUser,
    listRecentAttemptsForUser,
    listAttemptsForPaper,
    listAttemptCutoffAverages,
    upsertPersonalizationProfile,
    getPersonalizationProfile,
    listPersonalizationProfiles,
    upsertIncompleteSession,
    getIncompleteSession,
    deleteIncompleteSession,
    getPrismaDiagnostics
};
