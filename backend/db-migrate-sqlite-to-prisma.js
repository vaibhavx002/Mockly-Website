const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
    createPersistentStores
} = require('./db');
const {
    isPrismaPersistenceEnabled,
    getPrismaPersistenceState,
    upsertUserRecord,
    upsertAttemptForUser,
    upsertPersonalizationProfile,
    upsertIncompleteSession
} = require('./prisma-persistence');

const toSafeString = (value) => String(value || '').trim();

const normalizeUserRecord = (rawUser) => {
    const email = toSafeString(rawUser?.email).toLowerCase();
    const name = toSafeString(rawUser?.name) || 'Mockly User';
    const phone = toSafeString(rawUser?.phone).replace(/\D/g, '').slice(0, 10);
    const passwordHash = toSafeString(rawUser?.passwordHash);

    if (!email || !passwordHash) {
        return null;
    }

    return {
        email,
        name,
        phone,
        passwordHash,
        createdAt: toSafeString(rawUser?.createdAt) || new Date().toISOString(),
        lastLoginAt: toSafeString(rawUser?.lastLoginAt)
    };
};

const normalizeAttemptRecord = (rawAttempt) => {
    const attemptId = toSafeString(rawAttempt?.attemptId);
    const examId = toSafeString(rawAttempt?.examId).toLowerCase();
    const paperId = toSafeString(rawAttempt?.paperId).toLowerCase();

    if (!attemptId || !examId || !paperId) {
        return null;
    }

    return {
        attemptId,
        examId,
        paperId,
        score: Number(rawAttempt?.score || 0),
        maxScore: Number(rawAttempt?.maxScore || 0),
        scorePercent: Number(rawAttempt?.scorePercent || 0),
        correct: Math.max(0, Number.parseInt(String(rawAttempt?.correct || 0), 10) || 0),
        wrong: Math.max(0, Number.parseInt(String(rawAttempt?.wrong || 0), 10) || 0),
        unanswered: Math.max(0, Number.parseInt(String(rawAttempt?.unanswered || 0), 10) || 0),
        totalQuestions: Math.max(0, Number.parseInt(String(rawAttempt?.totalQuestions || 0), 10) || 0),
        accuracyPercent: Number(rawAttempt?.accuracyPercent || 0),
        durationMinutes: Math.max(1, Number.parseInt(String(rawAttempt?.durationMinutes || 1), 10) || 1),
        timeTakenSeconds: Math.max(0, Number.parseInt(String(rawAttempt?.timeTakenSeconds || 0), 10) || 0),
        launchMode: toSafeString(rawAttempt?.launchMode) || 'dynamic',
        isAutoSubmitted: Boolean(rawAttempt?.isAutoSubmitted),
        sectionStats: Array.isArray(rawAttempt?.sectionStats) ? rawAttempt.sectionStats : [],
        weakTopics: Array.isArray(rawAttempt?.weakTopics) ? rawAttempt.weakTopics : [],
        lowScoreWarnings: Array.isArray(rawAttempt?.lowScoreWarnings) ? rawAttempt.lowScoreWarnings : [],
        submittedAt: toSafeString(rawAttempt?.submittedAt) || new Date().toISOString()
    };
};

const normalizePersonalizationProfile = (rawProfile) => {
    const source = rawProfile && typeof rawProfile === 'object' ? rawProfile : {};

    return {
        lastSelectedExamId: toSafeString(source.lastSelectedExamId).toLowerCase(),
        lastRecommendedExamId: toSafeString(source.lastRecommendedExamId).toLowerCase(),
        selectionCountByExam: source.selectionCountByExam && typeof source.selectionCountByExam === 'object'
            ? source.selectionCountByExam
            : {},
        launchCountByExam: source.launchCountByExam && typeof source.launchCountByExam === 'object'
            ? source.launchCountByExam
            : {},
        recommendationCountByExam: source.recommendationCountByExam && typeof source.recommendationCountByExam === 'object'
            ? source.recommendationCountByExam
            : {},
        eventSourceByExam: source.eventSourceByExam && typeof source.eventSourceByExam === 'object'
            ? source.eventSourceByExam
            : {},
        preferences: source.preferences && typeof source.preferences === 'object'
            ? source.preferences
            : {}
    };
};

const normalizeIncompleteSessionRecord = (rawSession) => {
    const source = rawSession && typeof rawSession === 'object' ? rawSession : {};
    const examId = toSafeString(source.examId).toLowerCase();
    const paperId = toSafeString(source.paperId).toLowerCase();

    if (!examId || !paperId) {
        return null;
    }

    return {
        examId,
        paperId,
        sessionId: toSafeString(source.sessionId || source.session).slice(0, 80),
        startUrl: toSafeString(source.startUrl),
        resumeUrl: toSafeString(source.resumeUrl),
        totalQuestions: Math.max(0, Number.parseInt(String(source.totalQuestions || 0), 10) || 0),
        currentQuestionIndex: Math.max(0, Number.parseInt(String(source.currentQuestionIndex || 0), 10) || 0),
        currentSectionIndex: Math.max(0, Number.parseInt(String(source.currentSectionIndex || 0), 10) || 0),
        durationMinutes: Math.max(1, Number.parseInt(String(source.durationMinutes || 1), 10) || 1),
        timerSeconds: Math.max(0, Number.parseInt(String(source.timerSeconds || 0), 10) || 0),
        progressPercent: Number.isFinite(Number(source.progressPercent))
            ? Math.max(0, Math.min(100, Number(source.progressPercent)))
            : 0,
        selectedLanguage: toSafeString(source.selectedLanguage).toLowerCase() || 'en',
        questionStates: Array.isArray(source.questionStates)
            ? source.questionStates
            : (Array.isArray(source.qState) ? source.qState : []),
        sectionTimeById: source.sectionTimeById && typeof source.sectionTimeById === 'object'
            ? source.sectionTimeById
            : {}
    };
};

const run = async () => {
    const summary = {
        prismaEnabled: isPrismaPersistenceEnabled(),
        persistenceState: getPrismaPersistenceState(),
        usersSeen: 0,
        usersUpserted: 0,
        attemptsSeen: 0,
        attemptsUpserted: 0,
        profilesSeen: 0,
        profilesUpserted: 0,
        incompleteSessionsSeen: 0,
        incompleteSessionsUpserted: 0,
        skippedUsers: 0,
        skippedAttempts: 0,
        skippedProfiles: 0,
        skippedIncompleteSessions: 0,
        failedAttempts: 0,
        failedUsers: 0,
        failedProfiles: 0,
        failedIncompleteSessions: 0
    };

    if (!summary.prismaEnabled) {
        throw new Error('Set MOCKLY_PERSISTENCE_DRIVER=prisma and DATABASE_URL before running migration.');
    }

    if (!summary.persistenceState.initialized) {
        throw new Error(summary.persistenceState.error || 'Prisma client is not initialized.');
    }

    const {
        authUserStore,
        attemptStore,
        personalizationStore,
        incompleteSessionStore
    } = createPersistentStores();

    for (const [, rawUser] of authUserStore.entries()) {
        summary.usersSeen += 1;
        const userRecord = normalizeUserRecord(rawUser);
        if (!userRecord) {
            summary.skippedUsers += 1;
            continue;
        }

        try {
            await upsertUserRecord(userRecord);
            summary.usersUpserted += 1;
        } catch (error) {
            console.error(`Failed user: ${userRecord.email}`, error); summary.failedUsers += 1;
        }
    }

    for (const [email, rawAttempts] of attemptStore.entries()) {
        const safeEmail = toSafeString(email).toLowerCase();
        if (!safeEmail) continue;

        const attempts = Array.isArray(rawAttempts) ? rawAttempts : [];
        for (const rawAttempt of attempts) {
            summary.attemptsSeen += 1;
            const attemptRecord = normalizeAttemptRecord(rawAttempt);
            if (!attemptRecord) {
                summary.skippedAttempts += 1;
                continue;
            }

            try {
                await upsertAttemptForUser(safeEmail, attemptRecord);
                summary.attemptsUpserted += 1;
            } catch (error) {
                summary.failedAttempts += 1;
            }
        }
    }

    for (const [email, rawProfile] of personalizationStore.entries()) {
        const safeEmail = toSafeString(email).toLowerCase();
        if (!safeEmail) continue;

        summary.profilesSeen += 1;
        const profileRecord = normalizePersonalizationProfile(rawProfile);

        try {
            await upsertPersonalizationProfile(safeEmail, profileRecord);
            summary.profilesUpserted += 1;
        } catch (error) {
            summary.failedProfiles += 1;
        }
    }

    for (const [email, rawSession] of incompleteSessionStore.entries()) {
        const safeEmail = toSafeString(email).toLowerCase();
        if (!safeEmail) continue;

        summary.incompleteSessionsSeen += 1;
        const sessionRecord = normalizeIncompleteSessionRecord(rawSession);
        if (!sessionRecord) {
            summary.skippedIncompleteSessions += 1;
            continue;
        }

        try {
            await upsertIncompleteSession(safeEmail, sessionRecord);
            summary.incompleteSessionsUpserted += 1;
        } catch (error) {
            summary.failedIncompleteSessions += 1;
        }
    }

    const hasFailures = [
        summary.failedUsers,
        summary.failedAttempts,
        summary.failedProfiles,
        summary.failedIncompleteSessions
    ].some((count) => Number(count || 0) > 0);

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
        ...summary,
        ok: !hasFailures
    }, null, 2));

    process.exitCode = hasFailures ? 1 : 0;
};

run().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error.message || error);
    process.exitCode = 1;
});
