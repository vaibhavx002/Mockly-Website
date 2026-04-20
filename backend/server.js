const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');
const crypto = require('crypto');
const { promisify } = require('util');
const express = require('express');
const {
    createPersistentStores,
    backupDatabaseWithRotation,
    listBackupFiles,
    DEFAULT_BACKUP_KEEP
} = require('./db');
const {
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
} = require('./prisma-persistence');
const { getExamPatternRule } = require('./exam-pattern-rules');

const PORT = Number(process.env.PORT) || 3000;
const app = express();
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const PAPER_DATA_DIR = path.join(__dirname, 'data', 'papers');
const QUESTION_DATA_DIR = path.join(__dirname, 'data', 'questions');
const EXAM_DATA_DIR = path.join(__dirname, 'data', 'exams');
const EXAM_CATALOG_FILE = path.join(EXAM_DATA_DIR, 'catalog.json');
const EXAM_CHAPTERWISE_FILE = path.join(EXAM_DATA_DIR, 'chapterwise.json');
const ASSET_DATA_DIR = path.join(__dirname, 'data', 'assets');

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

const BASE_EXAMS = [
    {
        id: 'ssc-cgl',
        stream: 'SSC',
        title: 'SSC CGL',
        description: 'Full-length mocks, PYQ drills, and tier-wise analytics for stable score growth.',
        iconClass: 'fa-solid fa-graduation-cap',
        tags: ['beginner', 'bilingual', 'popular', 'ssc'],
        recommendedDuration: '20 mins',
        recommendedLevel: 'Moderate',
        paperConfig: {
            defaultPaperId: 'ssc-cgl-tier1-2025-set1',
            availablePaperIds: ['ssc-cgl-tier1-2025-set1'],
            languageSupport: ['en', 'hi']
        }
    },
    {
        id: 'ssc-chsl',
        stream: 'SSC',
        title: 'SSC CHSL',
        description: 'Practice basics faster with chapter-based tests and easy-to-track progress charts.',
        iconClass: 'fa-solid fa-pen-to-square',
        tags: ['beginner', 'bilingual', 'ssc'],
        recommendedDuration: '18 mins',
        recommendedLevel: 'Beginner to Moderate',
        paperConfig: {
            defaultPaperId: 'ssc-chsl-tier1-2025-set1',
            availablePaperIds: ['ssc-chsl-tier1-2025-set1'],
            languageSupport: ['en', 'hi']
        }
    },
    {
        id: 'rrb-ntpc',
        stream: 'RRB',
        title: 'RRB NTPC',
        description: 'Balanced mock strategy for speed and accuracy with real-paper style sequencing.',
        iconClass: 'fa-solid fa-train',
        tags: ['beginner', 'bilingual', 'popular', 'rrb'],
        recommendedDuration: '25 mins',
        recommendedLevel: 'Moderate',
        paperConfig: {
            defaultPaperId: 'rrb-ntpc-cbt1-2025-set1',
            availablePaperIds: ['rrb-ntpc-cbt1-2025-set1'],
            languageSupport: ['en', 'hi']
        }
    },
    {
        id: 'rrb-group-d',
        stream: 'RRB',
        title: 'RRB Group D',
        description: 'Daily sectional boosters and memory-friendly revision loops for stronger retention.',
        iconClass: 'fa-solid fa-route',
        tags: ['beginner', 'bilingual', 'rrb'],
        recommendedDuration: '20 mins',
        recommendedLevel: 'Beginner',
        paperConfig: {
            defaultPaperId: 'rrb-group-d-cbt-2025-set1',
            availablePaperIds: ['rrb-group-d-cbt-2025-set1'],
            languageSupport: ['en', 'hi']
        }
    },
    {
        id: 'upsc-prelims',
        stream: 'UPSC',
        title: 'UPSC Prelims',
        description: 'Concept-intense mocks with detailed explanations and current-affairs integration.',
        iconClass: 'fa-solid fa-landmark',
        tags: ['advanced', 'bilingual', 'upsc'],
        recommendedDuration: '30 mins',
        recommendedLevel: 'Advanced',
        paperConfig: {
            defaultPaperId: 'upsc-prelims-gs1-2025-set1',
            availablePaperIds: ['upsc-prelims-gs1-2025-set1'],
            languageSupport: ['en']
        }
    },
    {
        id: 'upsc-csat',
        stream: 'UPSC',
        title: 'UPSC CSAT',
        description: 'Improve aptitude precision with timed practice, concept refreshers, and elimination-based solving.',
        iconClass: 'fa-solid fa-scale-balanced',
        tags: ['advanced', 'bilingual', 'popular', 'upsc'],
        recommendedDuration: '25 mins',
        recommendedLevel: 'Advanced',
        paperConfig: {
            defaultPaperId: 'upsc-csat-2025-set1',
            availablePaperIds: ['upsc-csat-2025-set1'],
            languageSupport: ['en']
        }
    }
];

const loadExamCatalogFromDisk = () => {
    try {
        if (!fs.existsSync(EXAM_CATALOG_FILE)) {
            return null;
        }

        const raw = fs.readFileSync(EXAM_CATALOG_FILE, 'utf8');
        const parsed = JSON.parse(raw);

        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        const bodies = Array.isArray(parsed.bodies)
            ? parsed.bodies.filter((body) => body && typeof body === 'object')
            : [];
        const exams = Array.isArray(parsed.exams)
            ? parsed.exams.filter((exam) => exam && typeof exam === 'object')
            : [];

        return {
            version: String(parsed.version || '').trim() || 'local-catalog',
            bodies,
            exams
        };
    } catch (error) {
        return null;
    }
};

const normalizeExamForRuntime = (exam) => {
    const safeExam = exam && typeof exam === 'object' ? exam : {};
    const id = String(safeExam.id || '').trim().toLowerCase();
    if (!id) return null;

    const stream = String(safeExam.stream || '').trim().toUpperCase() || 'SSC';
    const title = String(safeExam.title || id.toUpperCase()).trim();
    const description = String(safeExam.description || '').trim() || 'Structured mocks with analytics and bilingual support where available.';
    const iconClass = String(safeExam.iconClass || 'fa-solid fa-file-lines').trim();
    const tags = Array.isArray(safeExam.tags)
        ? Array.from(new Set(safeExam.tags.map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean)))
        : [];
    const recommendedDuration = String(safeExam.recommendedDuration || '20 mins').trim();
    const recommendedLevel = String(safeExam.recommendedLevel || 'Moderate').trim();
    const isLive = safeExam.isLive !== false;
    const bodyId = String(safeExam.bodyId || stream.toLowerCase()).trim().toLowerCase();
    const dataFolder = String(safeExam.dataFolder || id).trim().toLowerCase();
    const paperConfig = safeExam.paperConfig && typeof safeExam.paperConfig === 'object'
        ? safeExam.paperConfig
        : {};

    const defaultPaperId = String(paperConfig.defaultPaperId || '').trim().toLowerCase();
    const availablePaperIds = Array.isArray(paperConfig.availablePaperIds)
        ? Array.from(new Set(paperConfig.availablePaperIds.map((paperId) => String(paperId || '').trim().toLowerCase()).filter(Boolean)))
        : [];
    const languageSupport = Array.isArray(paperConfig.languageSupport)
        ? Array.from(new Set(paperConfig.languageSupport.map((language) => String(language || '').trim().toLowerCase()).filter(Boolean)))
        : ['en'];

    return {
        id,
        stream,
        bodyId,
        title,
        description,
        iconClass,
        tags,
        recommendedDuration,
        recommendedLevel,
        isLive,
        dataFolder,
        paperConfig: {
            defaultPaperId: defaultPaperId || availablePaperIds[0] || '',
            availablePaperIds,
            languageSupport
        }
    };
};

const mergeExamCatalog = (baseExams, diskCatalog) => {
    const merged = new Map();

    baseExams.forEach((exam) => {
        const normalized = normalizeExamForRuntime(exam);
        if (normalized) {
            merged.set(normalized.id, normalized);
        }
    });

    const catalogExams = Array.isArray(diskCatalog?.exams) ? diskCatalog.exams : [];
    catalogExams.forEach((exam) => {
        const normalized = normalizeExamForRuntime(exam);
        if (normalized) {
            merged.set(normalized.id, normalized);
        }
    });

    return Array.from(merged.values());
};

const DISK_EXAM_CATALOG = loadExamCatalogFromDisk();
const EXAM_CATALOG_VERSION = String(DISK_EXAM_CATALOG?.version || 'base-only').trim();
const EXAM_BODIES = Array.isArray(DISK_EXAM_CATALOG?.bodies)
    ? DISK_EXAM_CATALOG.bodies
        .map((body) => ({
            id: String(body?.id || '').trim().toLowerCase(),
            title: String(body?.title || '').trim() || String(body?.id || '').trim().toUpperCase(),
            source: String(body?.source || '').trim(),
            examIds: Array.isArray(body?.examIds)
                ? Array.from(new Set(body.examIds.map((examId) => String(examId || '').trim().toLowerCase()).filter(Boolean)))
                : []
        }))
        .filter((body) => body.id)
    : [];
const EXAMS = mergeExamCatalog(BASE_EXAMS, DISK_EXAM_CATALOG);
const examById = new Map(EXAMS.map((exam) => [exam.id, exam]));
const examBodyById = new Map(EXAM_BODIES.map((body) => [body.id, body]));
const TEST_SERIES_PER_EXAM = 5000;
const TEST_SERIES_DEFAULT_LIMIT = 20;
const TEST_SERIES_MAX_LIMIT = 50;
const TEST_SERIES_SORTS = new Set(['newly-added', 'most-given', 'easy', 'moderate', 'hard']);
const {
    db,
    personalizationStore,
    attemptStore,
    incompleteSessionStore,
    authUserStore,
    baselineRecordStore,
    getHealthSnapshot
} = createPersistentStores();
const USE_PRISMA_PERSISTENCE = isPrismaPersistenceEnabled();
const PRISMA_PERSISTENCE_STATE = getPrismaPersistenceState();
const PLATFORM_BASE_METRICS = {
    aspirants: 800000,
    selections: 12000,
    rating: 4.9
};
const MINIMUM_MOCK_CUTOFF_PERCENT = 70;

const DASHBOARD_FOCUS_AREAS = new Set(['balanced', 'speed', 'accuracy', 'current-affairs', 'aptitude']);
const ACCESS_COOKIE_NAME = 'mockly_access_token';
const REFRESH_COOKIE_NAME = 'mockly_refresh_token';
const CSRF_COOKIE_NAME = 'mockly_csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60;
const PASSWORD_SCRYPT_COST = 16384;
const PASSWORD_SCRYPT_BLOCK_SIZE = 8;
const PASSWORD_SCRYPT_PARALLELIZATION = 1;
const PASSWORD_SCRYPT_KEY_LENGTH = 64;
const ACCESS_TOKEN_SECRET = String(process.env.MOCKLY_ACCESS_TOKEN_SECRET || '').trim()
    || crypto.randomBytes(32).toString('hex');
const NIGHTLY_BACKUP_ENABLED = String(process.env.MOCKLY_DB_NIGHTLY_BACKUP_ENABLED || 'true').trim().toLowerCase() !== 'false';
const NIGHTLY_BACKUP_KEEP = Math.max(1, Math.min(365, Number.parseInt(String(process.env.MOCKLY_DB_BACKUP_KEEP || DEFAULT_BACKUP_KEEP), 10) || DEFAULT_BACKUP_KEEP));
const NIGHTLY_BACKUP_HOUR = Math.max(0, Math.min(23, Number.parseInt(String(process.env.MOCKLY_DB_BACKUP_HOUR || '2'), 10) || 2));
const NIGHTLY_BACKUP_MINUTE = Math.max(0, Math.min(59, Number.parseInt(String(process.env.MOCKLY_DB_BACKUP_MINUTE || '15'), 10) || 15));
const scryptAsync = promisify(crypto.scrypt);
let nightlyBackupTimer = null;

const toSafeString = (value) => String(value || '').trim();

const toSafeIdentifier = (value) => toSafeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const toTitleWords = (value) => toSafeString(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

const buildChapterStats = (subjects) => {
    const safeSubjects = Array.isArray(subjects) ? subjects : [];

    const chapterCount = safeSubjects.reduce((count, subject) => {
        const chapters = Array.isArray(subject?.chapters) ? subject.chapters : [];
        return count + chapters.length;
    }, 0);

    const topicCount = safeSubjects.reduce((count, subject) => {
        const chapters = Array.isArray(subject?.chapters) ? subject.chapters : [];
        const chapterTopicCount = chapters.reduce((topicTotal, chapter) => {
            const topics = Array.isArray(chapter?.topics) ? chapter.topics : [];
            return topicTotal + topics.length;
        }, 0);
        return count + chapterTopicCount;
    }, 0);

    return {
        subjectCount: safeSubjects.length,
        chapterCount,
        topicCount
    };
};

const normalizeChapterwisePayloadForExam = (source, exam) => {
    if (!source || typeof source !== 'object') return null;

    const rawSubjects = Array.isArray(source.subjects) ? source.subjects : [];
    const subjects = rawSubjects
        .map((subject) => {
            const subjectId = toSafeIdentifier(subject?.subjectId || subject?.id || subject?.name);
            const subjectName = toSafeString(subject?.name || subject?.title) || toTitleWords(subjectId || 'Subject');
            const rawChapters = Array.isArray(subject?.chapters) ? subject.chapters : [];

            const chapters = rawChapters
                .map((chapter) => {
                    const chapterId = toSafeIdentifier(chapter?.chapterId || chapter?.id || chapter?.name);
                    const chapterName = toSafeString(chapter?.name || chapter?.title) || toTitleWords(chapterId || 'Chapter');
                    const estimatedWeightage = toSafeString(chapter?.estimatedWeightage || chapter?.weightage || '');
                    const rawTopics = Array.isArray(chapter?.topics) ? chapter.topics : [];

                    const topics = rawTopics
                        .map((topic) => {
                            const topicId = toSafeIdentifier(topic?.topicId || topic?.id || topic?.name);
                            const topicName = toSafeString(topic?.name || topic?.title) || toTitleWords(topicId || 'Topic');
                            const difficultyBand = toSafeString(topic?.difficultyBand || topic?.difficulty || 'moderate');

                            if (!topicId || !topicName) return null;

                            return {
                                topicId,
                                name: topicName,
                                difficultyBand: difficultyBand || 'moderate'
                            };
                        })
                        .filter(Boolean);

                    if (!chapterId || !chapterName || !topics.length) return null;

                    return {
                        chapterId,
                        name: chapterName,
                        estimatedWeightage,
                        topics
                    };
                })
                .filter(Boolean);

            if (!subjectId || !subjectName || !chapters.length) return null;

            return {
                subjectId,
                name: subjectName,
                chapters
            };
        })
        .filter(Boolean);

    if (!subjects.length) return null;

    return {
        examId: exam.id,
        stream: exam.stream,
        bodyId: toSafeString(exam.bodyId).toLowerCase(),
        subjects,
        stats: buildChapterStats(subjects)
    };
};

const buildFallbackChapterwisePayload = (exam) => {
    const rule = getExamPatternRule(exam?.id);
    const sections = Array.isArray(rule?.sections) && rule.sections.length
        ? rule.sections
        : [{ sectionId: 'general', name: 'General', questionCount: 20 }];

    const subjects = sections.map((section) => {
        const subjectId = toSafeIdentifier(section?.sectionId || section?.name || 'general');
        const subjectName = toSafeString(section?.name) || toTitleWords(subjectId || 'General');
        const chapterId = `${subjectId}-foundation`;

        return {
            subjectId,
            name: subjectName,
            chapters: [
                {
                    chapterId,
                    name: `${subjectName} Foundation`,
                    estimatedWeightage: `${Math.max(5, Math.round(100 / Math.max(1, sections.length)))}%`,
                    topics: [
                        {
                            topicId: `${chapterId}-core`,
                            name: `${subjectName} Core Concepts`,
                            difficultyBand: 'moderate'
                        }
                    ]
                }
            ]
        };
    });

    return {
        examId: exam.id,
        stream: exam.stream,
        bodyId: toSafeString(exam.bodyId).toLowerCase(),
        subjects,
        stats: buildChapterStats(subjects)
    };
};

const loadExamChapterwiseStore = () => {
    let parsed = null;

    try {
        if (fs.existsSync(EXAM_CHAPTERWISE_FILE)) {
            const raw = fs.readFileSync(EXAM_CHAPTERWISE_FILE, 'utf8');
            parsed = JSON.parse(raw);
        }
    } catch (error) {
        parsed = null;
    }

    const rawExams = parsed && typeof parsed === 'object' && parsed.exams && typeof parsed.exams === 'object'
        ? parsed.exams
        : {};

    const byExamId = new Map();
    EXAMS.forEach((exam) => {
        const sourcePayload = rawExams[exam.id];
        const normalized = normalizeChapterwisePayloadForExam(sourcePayload, exam) || buildFallbackChapterwisePayload(exam);
        byExamId.set(exam.id, normalized);
    });

    return {
        version: toSafeString(parsed?.version) || 'fallback',
        generatedAt: toSafeString(parsed?.generatedAt),
        byExamId
    };
};

const EXAM_CHAPTERWISE_STORE = loadExamChapterwiseStore();
const getChapterwiseForExam = (examId) => {
    const normalizedExamId = toSafeString(examId).toLowerCase();
    return EXAM_CHAPTERWISE_STORE.byExamId.get(normalizedExamId) || null;
};

const flattenChapterwisePool = (payload) => {
    if (!payload || !Array.isArray(payload.subjects)) return [];

    const pool = [];
    payload.subjects.forEach((subject) => {
        const safeSubjectId = toSafeIdentifier(subject?.subjectId);
        const safeSubjectName = toSafeString(subject?.name) || toTitleWords(safeSubjectId || 'Subject');
        const chapters = Array.isArray(subject?.chapters) ? subject.chapters : [];

        chapters.forEach((chapter) => {
            const safeChapterId = toSafeIdentifier(chapter?.chapterId);
            const safeChapterName = toSafeString(chapter?.name) || toTitleWords(safeChapterId || 'Chapter');
            const topics = Array.isArray(chapter?.topics) ? chapter.topics : [];

            topics.forEach((topic) => {
                const safeTopicId = toSafeIdentifier(topic?.topicId);
                const safeTopicName = toSafeString(topic?.name) || toTitleWords(safeTopicId || 'Topic');
                const safeDifficultyBand = toSafeString(topic?.difficultyBand || 'moderate').toLowerCase() || 'moderate';

                if (!safeSubjectId || !safeChapterId || !safeTopicId) return;

                pool.push({
                    subjectId: safeSubjectId,
                    subjectName: safeSubjectName,
                    chapterId: safeChapterId,
                    chapterName: safeChapterName,
                    topicId: safeTopicId,
                    topicName: safeTopicName,
                    topicDifficultyBand: safeDifficultyBand
                });
            });
        });
    });

    return pool;
};

const examChapterPoolById = new Map(
    EXAMS.map((exam) => [exam.id, flattenChapterwisePool(getChapterwiseForExam(exam.id))])
);

const toSafeInteger = (value, fallback, min, max) => {
    const parsedValue = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsedValue)) return fallback;
    return Math.max(min, Math.min(max, parsedValue));
};

const normalizeTestSeriesSort = (value) => {
    const sort = toSafeString(value).toLowerCase();
    return TEST_SERIES_SORTS.has(sort) ? sort : 'newly-added';
};

const getExamPoolForTarget = (value) => {
    const target = toSafeString(value).toLowerCase();
    if (!target || target === 'all') {
        return {
            isValid: true,
            normalizedTarget: 'all',
            exams: EXAMS.slice()
        };
    }

    if (examById.has(target)) {
        return {
            isValid: true,
            normalizedTarget: target,
            exams: [examById.get(target)]
        };
    }

    const streamMatches = EXAMS.filter((exam) => toSafeString(exam.stream).toLowerCase() === target);
    if (streamMatches.length) {
        return {
            isValid: true,
            normalizedTarget: target,
            exams: streamMatches
        };
    }

    return {
        isValid: false,
        normalizedTarget: target,
        exams: []
    };
};

const buildGeneratedTestSeriesItem = (exam, sequence, chapterPool = []) => {
    const safeSequence = Math.max(1, Number(sequence) || 1);
    const baseSeed = (safeSequence * 31) + (toSafeString(exam.id).length * 17);
    const stageLabel = toSafeString(exam.stream) === 'UPSC'
        ? (toSafeString(exam.id).includes('csat') ? 'CSAT' : 'Prelims')
        : (toSafeString(exam.stream) === 'RRB' ? 'CBT' : 'Tier');
    const difficultyOrder = ['easy', 'moderate', 'hard'];
    const difficulty = difficultyOrder[baseSeed % difficultyOrder.length];
    const attemptCount = 320 + ((baseSeed * 41) % 9000);
    const questionCount = toSafeString(exam.stream) === 'UPSC'
        ? 100
        : (toSafeString(exam.id).includes('chsl') ? 100 : 100);
    const baseDuration = toSafeInteger(toSafeString(exam.recommendedDuration).replace(/[^\d]/g, ''), 20, 10, 180);
    const durationMinutes = Math.max(10, baseDuration + ((baseSeed % 3) * 5));
    const languageSupport = Array.isArray(exam?.paperConfig?.languageSupport)
        ? exam.paperConfig.languageSupport.map((item) => String(item).toUpperCase())
        : ['EN'];
    const isBilingual = languageSupport.includes('HI');
    const daysAgo = (baseSeed * 7) % 180;
    const createdAt = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000) - ((baseSeed % 24) * 60 * 60 * 1000)).toISOString();
    const paperId = toSafeString(exam?.paperConfig?.defaultPaperId).toLowerCase();
    const id = `${exam.id}-mock-${safeSequence}`;
    const isLive = exam?.isLive !== false;
    const fallbackBrowseUrl = `/test-series?target=${encodeURIComponent(exam.id)}`;
    const chapterRef = Array.isArray(chapterPool) && chapterPool.length
        ? chapterPool[baseSeed % chapterPool.length]
        : null;

    return {
        id,
        examId: exam.id,
        examTitle: exam.title,
        stream: exam.stream,
        bodyId: toSafeString(exam.bodyId).toLowerCase(),
        title: `${exam.title} ${stageLabel} Mock ${safeSequence}`,
        sequence: safeSequence,
        difficulty,
        attemptCount,
        questionCount,
        durationMinutes,
        isLive,
        isBilingual,
        languageSupport,
        paperId,
        subjectId: chapterRef?.subjectId || '',
        subjectName: chapterRef?.subjectName || '',
        chapterId: chapterRef?.chapterId || '',
        chapterName: chapterRef?.chapterName || '',
        topicId: chapterRef?.topicId || '',
        topicName: chapterRef?.topicName || '',
        topicDifficultyBand: chapterRef?.topicDifficultyBand || '',
        createdAt,
        launchUrl: isLive && paperId
            ? `/mock/${encodeURIComponent(exam.id)}?paperId=${encodeURIComponent(paperId)}`
            : (isLive
                ? `/mock/${encodeURIComponent(exam.id)}`
                : fallbackBrowseUrl)
    };
};

const listGeneratedTestSeries = ({ target, sort, page, limit, subjectId, chapterId, topicId }) => {
    const targetSelection = getExamPoolForTarget(target);
    if (!targetSelection.isValid) {
        return {
            ok: false,
            message: 'Invalid target. Use exam id or stream (ssc, rrb, upsc).'
        };
    }

    const normalizedSort = normalizeTestSeriesSort(sort);
    const normalizedSubjectId = toSafeIdentifier(subjectId);
    const normalizedChapterId = toSafeIdentifier(chapterId);
    const normalizedTopicId = toSafeIdentifier(topicId);
    const safePage = toSafeInteger(page, 1, 1, 5000);
    const safeLimit = toSafeInteger(limit, TEST_SERIES_DEFAULT_LIMIT, 1, TEST_SERIES_MAX_LIMIT);
    const generated = [];

    targetSelection.exams.forEach((exam) => {
        const chapterPool = examChapterPoolById.get(exam.id) || [];
        for (let index = 1; index <= TEST_SERIES_PER_EXAM; index += 1) {
            generated.push(buildGeneratedTestSeriesItem(exam, index, chapterPool));
        }
    });

    let workingSet = generated;
    if (['easy', 'moderate', 'hard'].includes(normalizedSort)) {
        workingSet = workingSet.filter((item) => item.difficulty === normalizedSort);
    }

    if (normalizedSubjectId) {
        workingSet = workingSet.filter((item) => toSafeIdentifier(item.subjectId) === normalizedSubjectId);
    }

    if (normalizedChapterId) {
        workingSet = workingSet.filter((item) => toSafeIdentifier(item.chapterId) === normalizedChapterId);
    }

    if (normalizedTopicId) {
        workingSet = workingSet.filter((item) => toSafeIdentifier(item.topicId) === normalizedTopicId);
    }

    const isChapterwiseScope = Boolean(normalizedSubjectId || normalizedChapterId || normalizedTopicId);
    if (isChapterwiseScope) {
        workingSet = workingSet.map((item) => {
            if (toSafeString(item.examId).toLowerCase() !== 'ssc-cgl') {
                return item;
            }

            return {
                ...item,
                questionCount: 25
            };
        });
    }

    if (normalizedSort === 'newly-added') {
        workingSet.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.attemptCount - left.attemptCount);
    } else {
        workingSet.sort((left, right) => right.attemptCount - left.attemptCount || Date.parse(right.createdAt) - Date.parse(left.createdAt));
    }

    const total = workingSet.length;
    const startIndex = (safePage - 1) * safeLimit;
    const endIndex = startIndex + safeLimit;
    const items = workingSet.slice(startIndex, endIndex);

    return {
        ok: true,
        target: targetSelection.normalizedTarget,
        sort: normalizedSort,
        subjectId: normalizedSubjectId,
        chapterId: normalizedChapterId,
        topicId: normalizedTopicId,
        page: safePage,
        limit: safeLimit,
        total,
        hasMore: endIndex < total,
        items
    };
};

const toSafeEmail = (value) => {
    const email = toSafeString(value).toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailPattern.test(email) ? email : '';
};

const ADMIN_EMAILS = new Set(
    String(process.env.MOCKLY_ADMIN_EMAILS || 'demo@mockly.in')
        .split(',')
        .map((item) => toSafeEmail(item))
        .filter(Boolean)
);

const toSafeName = (value) => {
    const name = toSafeString(value).replace(/\s+/g, ' ');
    if (!name || name.length < 2 || name.length > 80) return '';
    return name;
};

const toSafePhone = (value) => {
    const phone = toSafeString(value).replace(/\D/g, '');
    return /^\d{10}$/.test(phone) ? phone : '';
};

const isValidPassword = (value) => {
    const password = String(value || '');
    return password.length >= 6 && password.length <= 72;
};

const hashLegacyPassword = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');

const isLegacyPasswordHash = (value) => /^[a-f0-9]{64}$/i.test(toSafeString(value));

const isScryptPasswordHash = (value) => toSafeString(value).startsWith('scrypt$');

const hashPassword = async (value) => {
    const plain = String(value || '');
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = await scryptAsync(plain, salt, PASSWORD_SCRYPT_KEY_LENGTH, {
        N: PASSWORD_SCRYPT_COST,
        r: PASSWORD_SCRYPT_BLOCK_SIZE,
        p: PASSWORD_SCRYPT_PARALLELIZATION
    });

    return `scrypt$${salt}$${Buffer.from(derivedKey).toString('hex')}`;
};

const hashPasswordSync = (value) => {
    const plain = String(value || '');
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(plain, salt, PASSWORD_SCRYPT_KEY_LENGTH, {
        N: PASSWORD_SCRYPT_COST,
        r: PASSWORD_SCRYPT_BLOCK_SIZE,
        p: PASSWORD_SCRYPT_PARALLELIZATION
    });

    return `scrypt$${salt}$${Buffer.from(derivedKey).toString('hex')}`;
};

const compareSafeText = (left, right) => {
    const leftBuffer = Buffer.from(String(left || ''));
    const rightBuffer = Buffer.from(String(right || ''));
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifyScryptPassword = async (value, storedHash) => {
    const safeHash = toSafeString(storedHash);
    const [, salt, expectedHex] = safeHash.split('$');
    if (!salt || !expectedHex) return false;

    const derivedKey = await scryptAsync(String(value || ''), salt, PASSWORD_SCRYPT_KEY_LENGTH, {
        N: PASSWORD_SCRYPT_COST,
        r: PASSWORD_SCRYPT_BLOCK_SIZE,
        p: PASSWORD_SCRYPT_PARALLELIZATION
    });
    return compareSafeText(Buffer.from(derivedKey).toString('hex'), expectedHex);
};

const verifyPassword = async (plainPassword, storedHash) => {
    const safeStoredHash = toSafeString(storedHash);
    if (!safeStoredHash) {
        return { isValid: false, shouldUpgrade: false };
    }

    if (isScryptPasswordHash(safeStoredHash)) {
        return {
            isValid: await verifyScryptPassword(plainPassword, safeStoredHash),
            shouldUpgrade: false
        };
    }

    if (isLegacyPasswordHash(safeStoredHash)) {
        const candidateHash = hashLegacyPassword(plainPassword);
        return {
            isValid: compareSafeText(candidateHash, safeStoredHash),
            shouldUpgrade: true
        };
    }

    return { isValid: false, shouldUpgrade: false };
};

const toSafeAuthUser = (user) => ({
    email: toSafeEmail(user?.email),
    name: toSafeName(user?.name),
    phone: toSafePhone(user?.phone)
});

const refreshSessionStore = new Map();
const refreshTokenHashesByEmail = new Map();
const loginAttemptStore = new Map();
let demoUserReadyPromise = null;

const getAuthUserByEmail = async (email) => {
    const safeEmail = toSafeEmail(email);
    if (!safeEmail) return null;

    if (USE_PRISMA_PERSISTENCE) {
        return getUserByEmail(safeEmail);
    }

    return authUserStore.get(safeEmail) || null;
};

const hasAuthUserByEmail = async (email) => {
    const safeEmail = toSafeEmail(email);
    if (!safeEmail) return false;

    if (USE_PRISMA_PERSISTENCE) {
        return hasUserByEmail(safeEmail);
    }

    return authUserStore.has(safeEmail);
};

const saveAuthUserRecord = async (userRecord) => {
    const safeRecord = {
        email: toSafeEmail(userRecord?.email),
        name: toSafeName(userRecord?.name) || 'Mockly User',
        phone: toSafePhone(userRecord?.phone),
        passwordHash: toSafeString(userRecord?.passwordHash),
        createdAt: toSafeString(userRecord?.createdAt) || new Date().toISOString(),
        lastLoginAt: toSafeString(userRecord?.lastLoginAt)
    };

    if (!safeRecord.email || !safeRecord.name || !safeRecord.passwordHash) {
        throw new Error('Cannot save auth user record. Missing mandatory fields.');
    }

    if (USE_PRISMA_PERSISTENCE) {
        await upsertUserRecord(safeRecord);
    } else {
        authUserStore.set(safeRecord.email, safeRecord);
    }

    return safeRecord;
};

const getUserPersonalizationProfile = async (email) => {
    const safeEmail = toSafeEmail(email);
    if (!safeEmail) return null;

    if (USE_PRISMA_PERSISTENCE) {
        return getPersonalizationProfile(safeEmail);
    }

    return personalizationStore.get(safeEmail) || null;
};

const saveUserPersonalizationProfile = async (email, profileRecord) => {
    const safeEmail = toSafeEmail(email);
    if (!safeEmail) return null;

    if (USE_PRISMA_PERSISTENCE) {
        return upsertPersonalizationProfile(safeEmail, profileRecord || {});
    }

    const safeProfile = profileRecord && typeof profileRecord === 'object'
        ? profileRecord
        : defaultPersonalizationProfile();
    personalizationStore.set(safeEmail, safeProfile);
    return safeProfile;
};

const ensureUserPersonalizationProfile = async (email) => {
    const safeEmail = toSafeEmail(email);
    if (!safeEmail) return null;

    const existingProfile = await getUserPersonalizationProfile(safeEmail);
    if (existingProfile && typeof existingProfile === 'object') {
        return existingProfile;
    }

    return saveUserPersonalizationProfile(safeEmail, defaultPersonalizationProfile());
};

const getUserIncompleteSession = async (email) => {
    const safeEmail = toSafeEmail(email);
    if (!safeEmail) return null;

    if (USE_PRISMA_PERSISTENCE) {
        return getIncompleteSession(safeEmail);
    }

    return incompleteSessionStore.get(safeEmail) || null;
};

const saveUserIncompleteSession = async (email, sessionRecord) => {
    const safeEmail = toSafeEmail(email);
    if (!safeEmail) return null;

    if (USE_PRISMA_PERSISTENCE) {
        return upsertIncompleteSession(safeEmail, sessionRecord || {});
    }

    const safeSession = sessionRecord && typeof sessionRecord === 'object' ? sessionRecord : null;
    if (!safeSession) return null;
    incompleteSessionStore.set(safeEmail, safeSession);
    return safeSession;
};

const clearUserIncompleteSession = async (email) => {
    const safeEmail = toSafeEmail(email);
    if (!safeEmail) return 0;

    if (USE_PRISMA_PERSISTENCE) {
        return deleteIncompleteSession(safeEmail);
    }

    return incompleteSessionStore.delete(safeEmail) ? 1 : 0;
};

const ensureDemoUserRecord = async () => {
    if (demoUserReadyPromise) {
        return demoUserReadyPromise;
    }

    demoUserReadyPromise = (async () => {
        const demoEmail = 'demo@mockly.in';
        const nowIso = new Date().toISOString();
        const existingDemo = await getAuthUserByEmail(demoEmail);

        if (!existingDemo) {
            await saveAuthUserRecord({
                email: demoEmail,
                name: 'Demo User',
                phone: '9999999999',
                passwordHash: hashPasswordSync('demo1234'),
                createdAt: nowIso,
                lastLoginAt: ''
            });
        } else {
            const merged = {
                email: demoEmail,
                name: toSafeName(existingDemo.name) || 'Demo User',
                phone: toSafePhone(existingDemo.phone) || '9999999999',
                passwordHash: toSafeString(existingDemo.passwordHash),
                createdAt: toSafeString(existingDemo.createdAt) || nowIso,
                lastLoginAt: toSafeString(existingDemo.lastLoginAt)
            };

            if (!isScryptPasswordHash(merged.passwordHash)) {
                merged.passwordHash = hashPasswordSync('demo1234');
            }

            await saveAuthUserRecord(merged);
        }

        await ensureUserPersonalizationProfile(demoEmail);
    })().catch((error) => {
        demoUserReadyPromise = null;
        throw error;
    });

    return demoUserReadyPromise;
};

const getCookieOptions = (maxAgeMs) => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeMs
});

const parseCookies = (cookieHeader) => {
    const cookieMap = new Map();
    const source = String(cookieHeader || '').trim();
    if (!source) return cookieMap;

    source.split(';').forEach((chunk) => {
        const [namePart, ...valueParts] = chunk.split('=');
        const name = toSafeString(namePart);
        if (!name) return;
        const value = valueParts.join('=').trim();

        try {
            cookieMap.set(name, decodeURIComponent(value));
        } catch (error) {
            cookieMap.set(name, value);
        }
    });

    return cookieMap;
};

const readCookie = (req, cookieName) => {
    const cookies = parseCookies(req?.headers?.cookie);
    return toSafeString(cookies.get(cookieName));
};

const getCsrfCookieOptions = () => ({
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000
});

const readCsrfHeader = (req) => toSafeString(
    req?.headers?.[CSRF_HEADER_NAME]
    || req?.headers?.['x-xsrf-token']
);

const isStateChangingMethod = (method) => {
    const normalized = toSafeString(method).toUpperCase();
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalized);
};

const encodeBase64Url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const decodeBase64Url = (value) => {
    try {
        const text = Buffer.from(String(value || ''), 'base64url').toString('utf8');
        return JSON.parse(text);
    } catch (error) {
        return null;
    }
};

const signAccessPayload = (payloadPart) => crypto
    .createHmac('sha256', ACCESS_TOKEN_SECRET)
    .update(payloadPart)
    .digest('base64url');

const createAccessToken = (email) => {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        sub: toSafeEmail(email),
        iat: now,
        exp: now + ACCESS_TOKEN_TTL_SECONDS
    };

    const headerPart = encodeBase64Url({ alg: 'HS256', typ: 'JWT' });
    const payloadPart = encodeBase64Url(payload);
    const signaturePart = signAccessPayload(`${headerPart}.${payloadPart}`);
    return `${headerPart}.${payloadPart}.${signaturePart}`;
};

const verifyAccessToken = (token) => {
    const safeToken = toSafeString(token);
    if (!safeToken) return { ok: false, reason: 'missing-token' };

    const [headerPart, payloadPart, signaturePart] = safeToken.split('.');
    if (!headerPart || !payloadPart || !signaturePart) {
        return { ok: false, reason: 'invalid-format' };
    }

    const expectedSignature = signAccessPayload(`${headerPart}.${payloadPart}`);
    if (!compareSafeText(signaturePart, expectedSignature)) {
        return { ok: false, reason: 'invalid-signature' };
    }

    const payload = decodeBase64Url(payloadPart);
    if (!payload || typeof payload !== 'object') {
        return { ok: false, reason: 'invalid-payload' };
    }

    const email = toSafeEmail(payload.sub);
    const exp = Number(payload.exp);
    if (!email || !Number.isFinite(exp)) {
        return { ok: false, reason: 'invalid-claims' };
    }

    if (Math.floor(Date.now() / 1000) >= exp) {
        return { ok: false, reason: 'expired' };
    }

    return {
        ok: true,
        payload: {
            email,
            exp,
            iat: Number(payload.iat) || 0
        }
    };
};

const hashRefreshToken = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');

const revokeRefreshTokenHash = async (tokenHash) => {
    const safeHash = toSafeString(tokenHash);
    if (!safeHash) return;

    if (USE_PRISMA_PERSISTENCE) {
        await revokeRefreshTokenSession(safeHash);
        return;
    }

    const session = refreshSessionStore.get(safeHash);
    if (session?.email) {
        const email = toSafeEmail(session.email);
        const userHashSet = refreshTokenHashesByEmail.get(email);
        if (userHashSet) {
            userHashSet.delete(safeHash);
            if (!userHashSet.size) {
                refreshTokenHashesByEmail.delete(email);
            }
        }
    }

    refreshSessionStore.delete(safeHash);
};

const pruneExpiredRefreshSessions = async () => {
    if (USE_PRISMA_PERSISTENCE) {
        await pruneExpiredRefreshTokenSessions();
        return;
    }

    const now = Date.now();
    refreshSessionStore.forEach((session, tokenHash) => {
        const expiresAtMs = Date.parse(String(session?.expiresAt || ''));
        if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now) {
            revokeRefreshTokenHash(tokenHash).catch(() => {});
        }
    });
};

const storeRefreshSession = async (email, refreshToken) => {
    await pruneExpiredRefreshSessions();

    const safeEmail = toSafeEmail(email);
    if (!safeEmail) return;

    const tokenHash = hashRefreshToken(refreshToken);
    const nowIso = new Date().toISOString();
    const expiresAtIso = new Date(Date.now() + (REFRESH_TOKEN_TTL_SECONDS * 1000)).toISOString();

    if (USE_PRISMA_PERSISTENCE) {
        await storeRefreshTokenSession(safeEmail, tokenHash, expiresAtIso);
        return;
    }

    refreshSessionStore.set(tokenHash, {
        email: safeEmail,
        createdAt: nowIso,
        expiresAt: expiresAtIso
    });

    const existingHashes = refreshTokenHashesByEmail.get(safeEmail) || new Set();
    existingHashes.add(tokenHash);
    refreshTokenHashesByEmail.set(safeEmail, existingHashes);

    // Keep only the latest 5 sessions per user in memory for safety.
    if (existingHashes.size > 5) {
        const removableHashes = Array.from(existingHashes).slice(0, existingHashes.size - 5);
        removableHashes.forEach((hash) => {
            revokeRefreshTokenHash(hash).catch(() => {});
        });
    }
};

const getRefreshSessionByHash = async (tokenHash) => {
    const safeHash = toSafeString(tokenHash);
    if (!safeHash) return null;

    if (USE_PRISMA_PERSISTENCE) {
        return getRefreshTokenSession(safeHash);
    }

    return refreshSessionStore.get(safeHash) || null;
};

const clearAuthCookies = (res) => {
    res.clearCookie(ACCESS_COOKIE_NAME, { path: '/' });
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
    res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
};

const issueAuthSession = async (res, email) => {
    const safeEmail = toSafeEmail(email);
    const accessToken = createAccessToken(safeEmail);
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(24).toString('hex');
    await storeRefreshSession(safeEmail, refreshToken);

    res.cookie(ACCESS_COOKIE_NAME, accessToken, getCookieOptions(ACCESS_TOKEN_TTL_SECONDS * 1000));
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions(REFRESH_TOKEN_TTL_SECONDS * 1000));
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());

    return {
        accessToken,
        accessTokenExpiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
        csrfToken
    };
};

const readBearerAccessToken = (req) => {
    const authHeader = toSafeString(req?.headers?.authorization);
    if (!authHeader.toLowerCase().startsWith('bearer ')) return '';
    return toSafeString(authHeader.slice(7));
};

const resolveRequestAuth = async (req) => {
    const accessToken = readBearerAccessToken(req) || readCookie(req, ACCESS_COOKIE_NAME);
    const verifiedToken = verifyAccessToken(accessToken);
    if (!verifiedToken.ok) return { ok: false, reason: verifiedToken.reason };

    const email = toSafeEmail(verifiedToken.payload?.email);
    const userRecord = await getAuthUserByEmail(email);
    if (!userRecord) return { ok: false, reason: 'user-not-found' };

    return {
        ok: true,
        email,
        tokenPayload: verifiedToken.payload,
        user: userRecord
    };
};

const requireAuth = async (req, res, next) => {
    try {
        const auth = await resolveRequestAuth(req);
        if (!auth.ok) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        req.auth = {
            email: auth.email,
            tokenPayload: auth.tokenPayload,
            user: auth.user
        };
        return next();
    } catch (error) {
        return next(error);
    }
};

const requireAdmin = (req, res, next) => {
    const email = toSafeEmail(req.auth?.email);
    if (!email || !ADMIN_EMAILS.has(email)) {
        return res.status(403).json({ message: 'Admin privileges required.' });
    }

    return next();
};

const requireCsrfForCookieAuth = (req, res, next) => {
    if (!isStateChangingMethod(req.method)) {
        return next();
    }

    // Bearer token requests are not vulnerable to ambient-cookie CSRF.
    const bearerToken = readBearerAccessToken(req);
    if (bearerToken) {
        return next();
    }

    const csrfCookie = readCookie(req, CSRF_COOKIE_NAME);
    const csrfHeader = readCsrfHeader(req);
    if (!csrfCookie || !csrfHeader || !compareSafeText(csrfCookie, csrfHeader)) {
        return res.status(403).json({ message: 'CSRF validation failed.' });
    }

    return next();
};

const getLoginAttemptKey = (req, email) => {
    const safeIp = toSafeString(req?.ip || req?.socket?.remoteAddress || 'unknown-ip');
    const safeEmail = toSafeEmail(email) || 'unknown-email';
    return `${safeIp}|${safeEmail}`;
};

const isLoginBlocked = (attemptKey) => {
    const record = loginAttemptStore.get(attemptKey);
    if (!record) return false;

    const blockedUntilMs = Date.parse(String(record.blockedUntil || ''));
    if (!Number.isFinite(blockedUntilMs)) return false;
    if (blockedUntilMs <= Date.now()) {
        loginAttemptStore.delete(attemptKey);
        return false;
    }

    return true;
};

const registerFailedLogin = (attemptKey) => {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const windowMs = 10 * 60 * 1000;
    const blockMs = 15 * 60 * 1000;

    const previous = loginAttemptStore.get(attemptKey);
    const firstFailureMs = Number.isFinite(Date.parse(String(previous?.firstFailureAt || '')))
        ? Date.parse(String(previous.firstFailureAt))
        : nowMs;

    const shouldResetWindow = nowMs - firstFailureMs > windowMs;
    const failures = shouldResetWindow
        ? 1
        : (Math.max(0, Number(previous?.failures || 0)) + 1);

    const blockedUntil = failures >= 5
        ? new Date(nowMs + blockMs).toISOString()
        : '';

    loginAttemptStore.set(attemptKey, {
        failures,
        firstFailureAt: shouldResetWindow ? nowIso : (previous?.firstFailureAt || nowIso),
        blockedUntil
    });
};

const clearLoginAttemptRecord = (attemptKey) => {
    loginAttemptStore.delete(attemptKey);
};

const logStartupDiagnostics = () => {
    try {
        const snapshot = getHealthSnapshot();
        const backupCount = listBackupFiles().length;
        const persistenceMode = USE_PRISMA_PERSISTENCE ? 'prisma' : 'sqlite-kv';
        // eslint-disable-next-line no-console
        console.log(`[db] path=${snapshot.dbPath} size=${snapshot.fileSizeBytes} rows=${snapshot.totalRows} quickCheck=${snapshot.quickCheck}`);
        // eslint-disable-next-line no-console
        console.log(`[db] backups=${backupCount} adminEmails=${Array.from(ADMIN_EMAILS).join(',') || 'none'}`);
        // eslint-disable-next-line no-console
        console.log(`[persistence] mode=${persistenceMode} initialized=${PRISMA_PERSISTENCE_STATE.initialized}`);
        if (PRISMA_PERSISTENCE_STATE.error) {
            // eslint-disable-next-line no-console
            console.warn(`[persistence] prisma initialization warning: ${PRISMA_PERSISTENCE_STATE.error}`);
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`[db] startup diagnostics unavailable: ${error.message || 'unknown-error'}`);
    }
};

const getMsUntilNextNightlyBackup = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(NIGHTLY_BACKUP_HOUR, NIGHTLY_BACKUP_MINUTE, 0, 0);
    if (next <= now) {
        next.setDate(next.getDate() + 1);
    }
    return Math.max(1000, next.getTime() - now.getTime());
};

const runNightlyBackupRotation = async () => {
    try {
        const result = await backupDatabaseWithRotation({ keep: NIGHTLY_BACKUP_KEEP });
        // eslint-disable-next-line no-console
        console.log(`[db] nightly backup created=${result.backup.destinationPath} pruned=${result.rotation.deletedCount} keep=${NIGHTLY_BACKUP_KEEP}`);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`[db] nightly backup failed: ${error.message || 'unknown-error'}`);
    }
};

const scheduleNightlyBackupRotation = () => {
    if (!NIGHTLY_BACKUP_ENABLED) {
        // eslint-disable-next-line no-console
        console.log('[db] nightly backup scheduler is disabled by environment setting.');
        return;
    }

    const delayMs = getMsUntilNextNightlyBackup();
    const runAtIso = new Date(Date.now() + delayMs).toISOString();

    if (nightlyBackupTimer) {
        clearTimeout(nightlyBackupTimer);
    }

    nightlyBackupTimer = setTimeout(async () => {
        await runNightlyBackupRotation();
        scheduleNightlyBackupRotation();
    }, delayMs);

    if (typeof nightlyBackupTimer.unref === 'function') {
        nightlyBackupTimer.unref();
    }

    // eslint-disable-next-line no-console
    console.log(`[db] nightly backup scheduled for ${runAtIso} (keep=${NIGHTLY_BACKUP_KEEP}).`);
};

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeLanguageKey = (value) => {
    const normalized = toSafeString(value).toLowerCase();
    if (!normalized) return 'en';
    if (normalized === 'english') return 'en';
    if (normalized === 'hindi') return 'hi';
    return normalized;
};

const sanitizePaperIdList = (paperIds) => {
    if (!Array.isArray(paperIds)) return [];

    const unique = new Set();
    paperIds.forEach((paperId) => {
        const safePaperId = toSafeString(paperId).toLowerCase();
        if (safePaperId) {
            unique.add(safePaperId);
        }
    });

    return Array.from(unique);
};

const sanitizePreferenceExamId = (value) => {
    const examId = toSafeString(value).toLowerCase();
    return examById.has(examId) ? examId : '';
};

const sanitizePreferredLanguage = (value) => {
    const language = normalizeLanguageKey(value);
    return ['en', 'hi'].includes(language) ? language : 'en';
};

const sanitizeWeeklyMockTarget = (value) => {
    const target = Number(value);
    if (!Number.isFinite(target)) return 5;
    return Math.max(1, Math.min(50, Math.floor(target)));
};

const sanitizeFocusArea = (value) => {
    const normalized = toSafeString(value).toLowerCase();
    return DASHBOARD_FOCUS_AREAS.has(normalized) ? normalized : 'balanced';
};

const sanitizePreferences = (sourcePreferences = {}) => {
    const source = sourcePreferences && typeof sourcePreferences === 'object' ? sourcePreferences : {};

    return {
        preferredExamId: sanitizePreferenceExamId(source.preferredExamId),
        preferredLanguage: sanitizePreferredLanguage(source.preferredLanguage),
        weeklyMockTarget: sanitizeWeeklyMockTarget(source.weeklyMockTarget),
        focusArea: sanitizeFocusArea(source.focusArea)
    };
};

const readJsonFileSafe = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }

        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
};

const getExamDataFolderPath = (examId) => {
    const safeExamId = toSafeString(examId).toLowerCase();
    const exam = examById.get(safeExamId);
    const folderName = toSafeString(exam?.dataFolder || safeExamId)
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '');

    return folderName ? path.join(EXAM_DATA_DIR, folderName) : '';
};

const getPaperFilePath = (paperId, examId) => {
    const safePaperId = toSafeString(paperId).toLowerCase();
    const examFolderPath = getExamDataFolderPath(examId);
    const scopedPath = examFolderPath ? path.join(examFolderPath, 'papers', `${safePaperId}.json`) : '';

    if (scopedPath && fs.existsSync(scopedPath)) {
        return scopedPath;
    }

    return path.join(PAPER_DATA_DIR, `${safePaperId}.json`);
};

const getQuestionFilePath = (paperId, examId) => {
    const safePaperId = toSafeString(paperId).toLowerCase();
    const examFolderPath = getExamDataFolderPath(examId);
    const scopedPath = examFolderPath ? path.join(examFolderPath, 'questions', `${safePaperId}.json`) : '';

    if (scopedPath && fs.existsSync(scopedPath)) {
        return scopedPath;
    }

    return path.join(QUESTION_DATA_DIR, `${safePaperId}.json`);
};

const validatePaperMetadata = (paper, examId, paperId) => {
    if (!isPlainObject(paper)) {
        return { ok: false, message: 'Paper metadata must be a JSON object.' };
    }

    if (toSafeString(paper.paperId).toLowerCase() !== paperId) {
        return { ok: false, message: 'Paper metadata paperId mismatch.' };
    }

    if (toSafeString(paper.examId).toLowerCase() !== examId) {
        return { ok: false, message: 'Paper metadata examId mismatch.' };
    }

    const totalQuestions = Number(paper.totalQuestions);
    if (!Number.isInteger(totalQuestions) || totalQuestions <= 0) {
        return { ok: false, message: 'Paper totalQuestions must be a positive integer.' };
    }

    const marksPerQuestion = Number(paper.marksPerQuestion);
    if (!Number.isFinite(marksPerQuestion) || marksPerQuestion <= 0) {
        return { ok: false, message: 'Paper marksPerQuestion must be a positive number.' };
    }

    const negativeMarks = Number(paper.negativeMarks);
    if (!Number.isFinite(negativeMarks) || negativeMarks < 0) {
        return { ok: false, message: 'Paper negativeMarks must be zero or positive.' };
    }

    const durationMinutes = Number(paper.durationMinutes);
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
        return { ok: false, message: 'Paper durationMinutes must be a positive integer.' };
    }

    const maxScore = Number(paper.maxScore);
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
        return { ok: false, message: 'Paper maxScore must be a positive number.' };
    }

    const expectedMaxScore = Number((totalQuestions * marksPerQuestion).toFixed(2));
    if (Math.abs(maxScore - expectedMaxScore) > 0.01) {
        return { ok: false, message: `Paper maxScore mismatch. Expected ${expectedMaxScore}.` };
    }

    if (!Array.isArray(paper.sections) || !paper.sections.length) {
        return { ok: false, message: 'Paper sections must be a non-empty array.' };
    }

    const sectionCount = paper.sections.reduce((sum, section) => {
        const nextCount = Number(section?.questionCount);
        return sum + (Number.isInteger(nextCount) && nextCount > 0 ? nextCount : 0);
    }, 0);

    if (sectionCount !== totalQuestions) {
        return { ok: false, message: 'Paper section totals do not match totalQuestions.' };
    }

    const invalidSection = paper.sections.find((section) => {
        const sectionId = toSafeString(section?.sectionId);
        const sectionName = toSafeString(section?.name);
        const count = Number(section?.questionCount);

        return !sectionId || !sectionName || !Number.isInteger(count) || count <= 0;
    });

    if (invalidSection) {
        return { ok: false, message: 'Paper contains invalid section definitions.' };
    }

    const rule = getExamPatternRule(examId);
    if (rule) {
        if (Number(rule.totalQuestions) !== totalQuestions) {
            return { ok: false, message: `Paper totalQuestions must match exam rule (${rule.totalQuestions}).` };
        }

        if (Number(rule.durationMinutes) !== durationMinutes) {
            return { ok: false, message: `Paper durationMinutes must match exam rule (${rule.durationMinutes}).` };
        }

        if (Math.abs(Number(rule.marksPerQuestion) - marksPerQuestion) > 0.01) {
            return { ok: false, message: `Paper marksPerQuestion must match exam rule (${rule.marksPerQuestion}).` };
        }

        if (Math.abs(Number(rule.negativeMarks) - negativeMarks) > 0.01) {
            return { ok: false, message: `Paper negativeMarks must match exam rule (${rule.negativeMarks}).` };
        }

        const ruleSections = Array.isArray(rule.sections) ? rule.sections : [];
        if (ruleSections.length !== paper.sections.length) {
            return { ok: false, message: 'Paper sections do not match exam pattern section count.' };
        }

        for (let index = 0; index < ruleSections.length; index += 1) {
            const ruleSection = ruleSections[index];
            const paperSection = paper.sections[index];
            const paperSectionId = toSafeString(paperSection?.sectionId).toLowerCase();
            const paperSectionCount = Number(paperSection?.questionCount || 0);

            if (paperSectionId !== ruleSection.sectionId) {
                return { ok: false, message: `Paper section order mismatch at index ${index + 1}. Expected ${ruleSection.sectionId}.` };
            }

            if (paperSectionCount !== Number(ruleSection.questionCount)) {
                return { ok: false, message: `Paper section count mismatch for ${ruleSection.sectionId}. Expected ${ruleSection.questionCount}.` };
            }
        }
    }

    return { ok: true };
};

const normalizeOptions = (value) => {
    if (!Array.isArray(value) || value.length !== 4) {
        return null;
    }

    const normalized = value.map((option) => toSafeString(option));
    if (normalized.some((option) => !option)) {
        return null;
    }

    return normalized;
};

const resolveQuestionContentByLanguage = (question, requestedLanguage) => {
    const safeLanguage = normalizeLanguageKey(requestedLanguage);
    const content = isPlainObject(question?.content) ? question.content : null;
    const languageMap = new Map();

    if (content) {
        Object.entries(content).forEach(([rawLanguage, payload]) => {
            const language = normalizeLanguageKey(rawLanguage);
            if (!isPlainObject(payload)) return;

            const questionText = toSafeString(payload.questionText);
            const options = normalizeOptions(payload.options);

            if (!language || !questionText || !options) return;
            languageMap.set(language, { questionText, options });
        });
    }

    if (!languageMap.size) {
        const questionText = toSafeString(question?.questionText);
        const options = normalizeOptions(question?.options);
        const legacyLanguage = normalizeLanguageKey(question?.language || 'en');

        if (!questionText || !options) {
            return { ok: false, message: 'Question text/options are missing or malformed.' };
        }

        languageMap.set(legacyLanguage, { questionText, options });
    }

    const availableLanguages = Array.from(languageMap.keys());
    const resolvedLanguage = languageMap.has(safeLanguage)
        ? safeLanguage
        : (languageMap.has('en') ? 'en' : availableLanguages[0]);

    const resolvedPayload = languageMap.get(resolvedLanguage);

    return {
        ok: true,
        questionText: resolvedPayload.questionText,
        options: resolvedPayload.options,
        availableLanguages,
        resolvedLanguage
    };
};

const normalizeQuestionMedia = (question) => {
    const media = isPlainObject(question?.media) ? question.media : {};
    const questionImageUrl = toSafeString(media.questionImageUrl || question?.questionImageUrl || question?.imageUrl) || null;

    const rawOptionImageUrls = Array.isArray(media.optionImageUrls)
        ? media.optionImageUrls
        : (Array.isArray(question?.optionImageUrls) ? question.optionImageUrls : []);

    const optionImageUrls = [0, 1, 2, 3].map((index) => {
        const value = toSafeString(rawOptionImageUrls[index]);
        return value || null;
    });

    return {
        questionImageUrl,
        optionImageUrls
    };
};

const resolveQuestionExplanation = (question, options = {}) => {
    const requestedLanguage = normalizeLanguageKey(options.requestedLanguage || 'en');
    const resolvedLanguage = normalizeLanguageKey(options.resolvedLanguage || requestedLanguage || 'en');
    const correctOptionIndex = Number(options.correctOptionIndex);
    const optionLabels = Array.isArray(options.optionLabels) ? options.optionLabels : [];

    const fromString = toSafeString(question?.explanation);
    if (fromString) {
        return fromString;
    }

    const explanationObject = isPlainObject(question?.explanation) ? question.explanation : null;
    if (explanationObject) {
        const explanationKeys = [requestedLanguage, resolvedLanguage, 'en', 'hi'];
        for (const key of explanationKeys) {
            const candidate = toSafeString(explanationObject?.[key]);
            if (candidate) {
                return candidate;
            }
        }
    }

    const optionIndex = Number.isInteger(correctOptionIndex) && correctOptionIndex >= 0 && correctOptionIndex < 4
        ? correctOptionIndex
        : -1;
    const optionLabel = optionIndex >= 0 ? toSafeString(optionLabels[optionIndex]) : '';

    if (optionLabel) {
        return `Correct answer: Option ${optionIndex + 1} (${optionLabel}). Review this concept to improve retention.`;
    }

    return 'Review this question with the official key and concept notes before the next mock.';
};

const validateAndNormalizeQuestionPayload = (questionPayload, examId, paperId, requestedLanguage) => {
    const sourceQuestions = Array.isArray(questionPayload)
        ? questionPayload
        : (Array.isArray(questionPayload?.questions) ? questionPayload.questions : null);

    if (!sourceQuestions || !sourceQuestions.length) {
        return { ok: false, message: 'Questions payload is empty.' };
    }

    const normalizedQuestions = [];
    const uniqueQuestionIds = new Set();

    for (let index = 0; index < sourceQuestions.length; index += 1) {
        const question = sourceQuestions[index];
        if (!isPlainObject(question)) {
            return { ok: false, message: `Question at index ${index} must be an object.` };
        }

        const questionId = toSafeString(question.questionId);
        if (!questionId) {
            return { ok: false, message: `Question at index ${index} is missing questionId.` };
        }

        if (uniqueQuestionIds.has(questionId)) {
            return { ok: false, message: `Duplicate questionId found: ${questionId}` };
        }

        uniqueQuestionIds.add(questionId);

        const questionExamId = toSafeString(question.examId || examId).toLowerCase();
        const questionPaperId = toSafeString(question.paperId || paperId).toLowerCase();
        const sectionId = toSafeString(question.sectionId).toLowerCase();
        const content = isPlainObject(question?.content) ? question.content : null;
        const englishContent = isPlainObject(content?.en) ? content.en : null;
        const hindiContent = isPlainObject(content?.hi) ? content.hi : null;

        if (questionExamId !== examId) {
            return { ok: false, message: `Question ${questionId} examId mismatch.` };
        }

        if (questionPaperId !== paperId) {
            return { ok: false, message: `Question ${questionId} paperId mismatch.` };
        }

        if (!sectionId) {
            return { ok: false, message: `Question ${questionId} is missing sectionId.` };
        }

        if (examId === 'ssc-cgl') {
            const englishOptions = normalizeOptions(englishContent?.options);
            const hasValidEnglishQuestion = Boolean(
                toSafeString(englishContent?.questionText)
                && englishOptions
                && englishOptions.length === 4
            );
            if (!hasValidEnglishQuestion) {
                return {
                    ok: false,
                    message: `Question ${questionId} must include content.en.questionText and 4 english options for SSC CGL.`
                };
            }

            if (sectionId !== 'english') {
                const hindiOptions = normalizeOptions(hindiContent?.options);
                const hasValidHindiQuestion = Boolean(
                    toSafeString(hindiContent?.questionText)
                    && hindiOptions
                    && hindiOptions.length === 4
                );
                if (!hasValidHindiQuestion) {
                    return {
                        ok: false,
                        message: `Question ${questionId} must include Hindi content for non-English SSC CGL sections.`
                    };
                }
            }
        }

        const correctOptionIndex = Number(question.correctOptionIndex);
        if (!Number.isInteger(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3) {
            return { ok: false, message: `Question ${questionId} has invalid correctOptionIndex.` };
        }

        const resolvedContent = resolveQuestionContentByLanguage(question, requestedLanguage);
        if (!resolvedContent.ok) {
            return { ok: false, message: `Question ${questionId}: ${resolvedContent.message}` };
        }

        const media = normalizeQuestionMedia(question);
        const explanation = resolveQuestionExplanation(question, {
            requestedLanguage,
            resolvedLanguage: resolvedContent.resolvedLanguage,
            correctOptionIndex,
            optionLabels: resolvedContent.options
        });

        normalizedQuestions.push({
            questionId,
            examId,
            paperId,
            sectionId,
            questionText: resolvedContent.questionText,
            options: resolvedContent.options,
            media,
            availableLanguages: resolvedContent.availableLanguages,
            language: resolvedContent.resolvedLanguage,
            explanation,
            correctOptionIndex,
            difficulty: toSafeString(question.difficulty) || undefined,
            sourceYear: toSafeString(question.sourceYear) || undefined
        });
    }

    const resolvedLanguages = new Set(normalizedQuestions.map((question) => normalizeLanguageKey(question.language)));
    const normalizedRequestedLanguage = normalizeLanguageKey(requestedLanguage);
    const effectiveLanguage = resolvedLanguages.has(normalizedRequestedLanguage)
        ? normalizedRequestedLanguage
        : (resolvedLanguages.has('en') ? 'en' : (Array.from(resolvedLanguages)[0] || 'en'));

    return {
        ok: true,
        questions: normalizedQuestions,
        effectiveLanguage
    };
};

const validatePaperQuestionConsistency = (paper, questions) => {
    if (!paper || !Array.isArray(questions)) {
        return { ok: false, message: 'Missing paper/question data for consistency check.' };
    }

    if (questions.length !== Number(paper.totalQuestions)) {
        return { ok: false, message: 'Question count does not match paper totalQuestions.' };
    }

    const sectionMap = new Map();
    paper.sections.forEach((section) => {
        sectionMap.set(toSafeString(section.sectionId).toLowerCase(), Number(section.questionCount));
    });

    const questionSectionCounts = new Map();
    questions.forEach((question) => {
        const sectionId = toSafeString(question.sectionId).toLowerCase();
        questionSectionCounts.set(sectionId, (questionSectionCounts.get(sectionId) || 0) + 1);
    });

    const invalidSection = Array.from(questionSectionCounts.keys()).find((sectionId) => !sectionMap.has(sectionId));
    if (invalidSection) {
        return { ok: false, message: `Unknown sectionId found in questions: ${invalidSection}` };
    }

    const mismatchSection = paper.sections.find((section) => {
        const sectionId = toSafeString(section.sectionId).toLowerCase();
        const expectedCount = Number(section.questionCount);
        const actualCount = questionSectionCounts.get(sectionId) || 0;
        return expectedCount !== actualCount;
    });

    if (mismatchSection) {
        return { ok: false, message: `Section count mismatch for ${mismatchSection.sectionId}.` };
    }

    return { ok: true };
};

const getValidatedPaperPayload = (examId, paperId, requestedLanguage = 'en') => {
    const safeExamId = toSafeString(examId).toLowerCase();
    const safePaperId = toSafeString(paperId).toLowerCase();
    const safeLanguage = normalizeLanguageKey(requestedLanguage);

    if (!safeExamId || !safePaperId) {
        return { ok: false, message: 'examId and paperId are required.' };
    }

    const paper = readJsonFileSafe(getPaperFilePath(safePaperId, safeExamId));
    const paperValidation = validatePaperMetadata(paper, safeExamId, safePaperId);
    if (!paperValidation.ok) {
        return { ok: false, message: paperValidation.message };
    }

    const questionPayload = readJsonFileSafe(getQuestionFilePath(safePaperId, safeExamId));
    const questionsValidation = validateAndNormalizeQuestionPayload(questionPayload, safeExamId, safePaperId, safeLanguage);
    if (!questionsValidation.ok) {
        return { ok: false, message: questionsValidation.message };
    }

    const consistencyValidation = validatePaperQuestionConsistency(paper, questionsValidation.questions);
    if (!consistencyValidation.ok) {
        return { ok: false, message: consistencyValidation.message };
    }

    return {
        ok: true,
        examId: safeExamId,
        paperId: safePaperId,
        language: questionsValidation.effectiveLanguage,
        paper,
        questions: questionsValidation.questions
    };
};

const getValidatedPaperIdsForExam = (exam) => {
    const paperIds = sanitizePaperIdList(exam?.paperConfig?.availablePaperIds);
    return paperIds.filter((paperId) => getValidatedPaperPayload(exam.id, paperId, 'en').ok);
};

const defaultPersonalizationProfile = () => ({
    lastSelectedExamId: '',
    lastRecommendedExamId: '',
    selectionCountByExam: {},
    launchCountByExam: {},
    recommendationCountByExam: {},
    eventSourceByExam: {},
    preferences: {
        preferredExamId: '',
        preferredLanguage: 'en',
        weeklyMockTarget: 5,
        focusArea: 'balanced'
    },
    updatedAt: ''
});

ensureDemoUserRecord().catch((error) => {
    // eslint-disable-next-line no-console
    console.warn(`[auth] demo-user bootstrap failed: ${error.message || 'unknown-error'}`);
});

const normalizeEventSourceKey = (value) => {
    const sourceKey = toSafeString(value)
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);

    return sourceKey || 'unknown';
};

const sanitizeCounter = (source) => {
    const safeCounter = {};
    const rawCounter = source && typeof source === 'object' ? source : {};

    Object.entries(rawCounter).forEach(([key, value]) => {
        const examId = toSafeString(key).toLowerCase();
        const numericValue = Number(value);

        if (!examById.has(examId)) return;
        if (!Number.isFinite(numericValue) || numericValue <= 0) return;

        safeCounter[examId] = Math.min(999, Math.floor(numericValue));
    });

    return safeCounter;
};

const sanitizeEventSourceCounter = (source) => {
    const safeCounter = {};
    const rawCounter = source && typeof source === 'object' ? source : {};

    Object.entries(rawCounter).forEach(([key, value]) => {
        const sourceKey = normalizeEventSourceKey(key);
        const numericValue = Number(value);

        if (!sourceKey) return;
        if (!Number.isFinite(numericValue) || numericValue <= 0) return;

        safeCounter[sourceKey] = Math.min(999, Math.floor(numericValue));
    });

    return safeCounter;
};

const sanitizeEventSourceByExam = (source) => {
    const safeMap = {};
    const rawMap = source && typeof source === 'object' ? source : {};

    Object.entries(rawMap).forEach(([key, value]) => {
        const examId = toSafeString(key).toLowerCase();
        if (!examById.has(examId)) return;

        const sourceByType = value && typeof value === 'object' ? value : {};
        const selected = sanitizeEventSourceCounter(sourceByType.selected);
        const launched = sanitizeEventSourceCounter(sourceByType.launched);
        const recommended = sanitizeEventSourceCounter(sourceByType.recommended);

        if (!Object.keys(selected).length && !Object.keys(launched).length && !Object.keys(recommended).length) {
            return;
        }

        safeMap[examId] = {
            selected,
            launched,
            recommended
        };
    });

    return safeMap;
};

const sanitizeProfile = (rawProfile) => {
    const source = rawProfile && typeof rawProfile === 'object' ? rawProfile : {};
    const selectedExamId = toSafeString(source.lastSelectedExamId).toLowerCase();
    const recommendedExamId = toSafeString(source.lastRecommendedExamId).toLowerCase();

    return {
        lastSelectedExamId: examById.has(selectedExamId) ? selectedExamId : '',
        lastRecommendedExamId: examById.has(recommendedExamId) ? recommendedExamId : '',
        selectionCountByExam: sanitizeCounter(source.selectionCountByExam),
        launchCountByExam: sanitizeCounter(source.launchCountByExam),
        recommendationCountByExam: sanitizeCounter(source.recommendationCountByExam),
        eventSourceByExam: sanitizeEventSourceByExam(source.eventSourceByExam),
        preferences: sanitizePreferences(source.preferences),
        updatedAt: toSafeString(source.updatedAt) || new Date().toISOString()
    };
};

const buildRecommendedExamListFromProfile = (profile) => {
    const scoreMap = new Map();
    const addScore = (examId, weight) => {
        if (!examById.has(examId)) return;
        scoreMap.set(examId, (scoreMap.get(examId) || 0) + weight);
    };

    Object.entries(profile.selectionCountByExam || {}).forEach(([examId, count]) => addScore(examId, Number(count) * 2));
    Object.entries(profile.launchCountByExam || {}).forEach(([examId, count]) => addScore(examId, Number(count) * 4));
    Object.entries(profile.recommendationCountByExam || {}).forEach(([examId, count]) => addScore(examId, Number(count) * 3));

    if (profile.lastSelectedExamId) addScore(profile.lastSelectedExamId, 8);
    if (profile.lastRecommendedExamId) addScore(profile.lastRecommendedExamId, 6);
    if (profile.preferences?.preferredExamId) addScore(profile.preferences.preferredExamId, 10);

    if (!scoreMap.size) {
        EXAMS.slice(0, 3).forEach((exam, index) => addScore(exam.id, 3 - index));
    }

    const sorted = Array.from(scoreMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    const topScore = sorted.length ? sorted[0][1] : 1;

    return sorted.map(([examId, score]) => {
        const exam = examById.get(examId);
        const confidence = Math.max(45, Math.min(95, Math.round((score / Math.max(1, topScore)) * 95)));
        return {
            examId,
            title: exam?.title || examId,
            stream: exam?.stream || '',
            confidence
        };
    });
};

const sanitizeInsightList = (source, maxItems = 8) => {
    if (!Array.isArray(source)) return [];

    return source
        .map((item) => toSafeString(item).replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, Math.max(1, Math.min(20, Number(maxItems) || 8)));
};

const sanitizeAttemptQuestionStats = (source, fallbackSectionId = '') => {
    if (!Array.isArray(source)) return [];

    const allowedStatuses = new Set(['not-visited', 'not-answered', 'answered', 'marked', 'answered-marked']);

    return source
        .slice(0, 400)
        .map((entry, index) => {
            const questionNumber = Math.max(1, Math.floor(Number(entry?.questionNumber) || (index + 1)));
            const questionId = toSafeString(entry?.questionId || `q${questionNumber}`).slice(0, 120);
            const sectionId = toSafeString(entry?.sectionId || fallbackSectionId).toLowerCase();
            const timeTakenSeconds = Math.max(
                0,
                Math.floor(
                    Number(entry?.timeTakenSeconds)
                    || Number(entry?.timeSeconds)
                    || ((Number(entry?.timeMs) || 0) / 1000)
                    || 0
                )
            );
            const selectedOptionIndex = Math.floor(Number(entry?.selectedOptionIndex));
            const correctOptionIndex = Math.floor(Number(entry?.correctOptionIndex));
            const status = toSafeString(entry?.status).toLowerCase();

            return {
                questionNumber,
                questionId,
                sectionId,
                timeTakenSeconds,
                status: allowedStatuses.has(status) ? status : 'not-visited',
                selectedOptionIndex: Number.isInteger(selectedOptionIndex) && selectedOptionIndex >= -1 && selectedOptionIndex <= 3
                    ? selectedOptionIndex
                    : -1,
                correctOptionIndex: Number.isInteger(correctOptionIndex) && correctOptionIndex >= 0 && correctOptionIndex <= 3
                    ? correctOptionIndex
                    : -1
            };
        })
        .filter((entry) => Boolean(entry.questionId));
};

const sanitizeAttemptSectionStats = (source, fallbackTotalQuestions = 0) => {
    if (!Array.isArray(source)) return [];

    return source
        .slice(0, 20)
        .map((entry) => {
            const sectionId = toSafeString(entry?.sectionId).toLowerCase();
            const sectionName = toSafeString(entry?.name || entry?.sectionName || sectionId || 'Section');
            const total = Math.max(0, Math.floor(Number(entry?.total) || 0));
            const attempted = Math.max(0, Math.floor(Number(entry?.attempted) || 0));
            const correct = Math.max(0, Math.floor(Number(entry?.correct) || 0));
            const wrong = Math.max(0, Math.floor(Number(entry?.wrong) || 0));
            const unanswered = Math.max(0, Math.floor(Number(entry?.unanswered) || Math.max(0, total - attempted)));
            const score = Number.isFinite(Number(entry?.score)) ? Number(Number(entry.score).toFixed(2)) : 0;
            const accuracyPercent = attempted > 0
                ? Number(((correct / attempted) * 100).toFixed(2))
                : 0;
            const attemptPercent = total > 0
                ? Number(((attempted / total) * 100).toFixed(2))
                : 0;
            const timeTakenSeconds = Math.max(
                0,
                Math.floor(
                    Number(entry?.timeTakenSeconds)
                    || Number(entry?.timeSeconds)
                    || ((Number(entry?.timeMs) || 0) / 1000)
                    || 0
                )
            );
            const questionStats = sanitizeAttemptQuestionStats(entry?.questionStats, sectionId);

            if (!sectionName) return null;
            if (total <= 0 && fallbackTotalQuestions <= 0) return null;

            return {
                sectionId,
                name: sectionName,
                total,
                attempted,
                correct,
                wrong,
                unanswered,
                score,
                accuracyPercent,
                attemptPercent,
                timeTakenSeconds,
                questionStats
            };
        })
        .filter(Boolean);
};

const addResumeFlagToUrl = (startUrl) => {
    const safeUrl = toSafeString(startUrl);
    if (!safeUrl) return '';
    if (safeUrl.includes('resume=1')) return safeUrl;
    return safeUrl.includes('?') ? `${safeUrl}&resume=1` : `${safeUrl}?resume=1`;
};

const sanitizeIncompleteSessionPayload = (rawSession, options = {}) => {
    const strictMode = options.strict !== false;
    const source = rawSession && typeof rawSession === 'object' ? rawSession : null;

    if (!source) {
        if (strictMode) {
            return { ok: false, message: 'Session payload is required.' };
        }

        return null;
    }

    const examId = toSafeString(source.examId).toLowerCase();
    const paperId = toSafeString(source.paperId).toLowerCase();

    if (!examById.has(examId) || !paperId) {
        if (strictMode) {
            return { ok: false, message: 'Incomplete session must include valid examId and paperId.' };
        }

        return null;
    }

    const sessionId = toSafeString(source.sessionId || source.session || '').slice(0, 80);
    const startUrlCandidate = toSafeString(source.startUrl);
    const defaultStartUrl = `/mock/${examId}?paperId=${encodeURIComponent(paperId)}${sessionId ? `&session=${encodeURIComponent(sessionId)}` : ''}`;
    const startUrl = startUrlCandidate.startsWith('/mock/') ? startUrlCandidate : defaultStartUrl;
    const resumeUrl = addResumeFlagToUrl(toSafeString(source.resumeUrl) || startUrl);

    const totalQuestions = Math.max(0, Math.floor(Number(source.totalQuestions) || 0));
    const currentQuestionIndex = Math.max(0, Math.floor(Number(source.currentQuestionIndex) || 0));
    const currentSectionIndex = Math.max(0, Math.floor(Number(source.currentSectionIndex) || 0));
    const durationMinutes = Math.max(1, Math.floor(Number(source.durationMinutes) || 1));
    const timerSeconds = Math.max(0, Math.floor(Number(source.timerSeconds) || 0));
    const progressPercent = Number.isFinite(Number(source.progressPercent))
        ? Math.max(0, Math.min(100, Number(Number(source.progressPercent).toFixed(2))))
        : 0;
    const selectedLanguage = ['en', 'hi'].includes(toSafeString(source.selectedLanguage).toLowerCase())
        ? toSafeString(source.selectedLanguage).toLowerCase()
        : 'en';

    const rawQuestionStates = Array.isArray(source.questionStates)
        ? source.questionStates
        : (Array.isArray(source.qState) ? source.qState : []);
    const questionStates = rawQuestionStates
        .slice(0, 300)
        .map((state) => {
            const status = toSafeString(state?.status).toLowerCase();
            const selected = Math.floor(Number(state?.selected));

            const allowedStatuses = new Set(['not-visited', 'not-answered', 'answered', 'marked', 'answered-marked']);
            return {
                status: allowedStatuses.has(status) ? status : 'not-visited',
                selected: Number.isInteger(selected) && selected >= -1 && selected <= 3 ? selected : -1
            };
        });

    const sectionTimeById = {};
    const rawSectionTime = source.sectionTimeById && typeof source.sectionTimeById === 'object'
        ? source.sectionTimeById
        : {};

    Object.entries(rawSectionTime).forEach(([sectionIdRaw, timeValue]) => {
        const sectionId = toSafeString(sectionIdRaw).toLowerCase();
        const safeTime = Math.max(0, Math.floor(Number(timeValue) || 0));
        if (!sectionId) return;
        if (safeTime <= 0) return;
        sectionTimeById[sectionId] = Math.min(safeTime, 8 * 60 * 60 * 1000);
    });

    const safeSession = {
        examId,
        paperId,
        sessionId,
        startUrl,
        resumeUrl,
        totalQuestions,
        currentQuestionIndex,
        currentSectionIndex,
        durationMinutes,
        timerSeconds,
        progressPercent,
        selectedLanguage,
        questionStates,
        sectionTimeById,
        updatedAt: toSafeString(source.updatedAt) || new Date().toISOString()
    };

    if (strictMode) {
        return { ok: true, session: safeSession };
    }

    return safeSession;
};

const buildWeakTopicsFromAttempt = (attempt) => {
    const fromAttempt = sanitizeInsightList(attempt?.weakTopics, 6);
    if (fromAttempt.length) return fromAttempt;

    const sectionStats = Array.isArray(attempt?.sectionStats) ? attempt.sectionStats : [];
    if (!sectionStats.length) return [];

    return [...sectionStats]
        .sort((left, right) => Number(left.accuracyPercent || 0) - Number(right.accuracyPercent || 0))
        .slice(0, 3)
        .map((section) => {
            const sectionName = toSafeString(section?.name || section?.sectionId || 'Section');
            const accuracy = Number(section?.accuracyPercent || 0).toFixed(1);
            return `${sectionName}: accuracy ${accuracy}%`;
        });
};

const buildLowScoreWarningsFromAttempt = (attempt) => {
    const warnings = sanitizeInsightList(attempt?.lowScoreWarnings, 8);
    if (warnings.length) return warnings;

    const generated = [];
    const scorePercent = Number(attempt?.scorePercent || 0);
    const accuracyPercent = Number(attempt?.accuracyPercent || 0);
    const totalQuestions = Number(attempt?.totalQuestions || 0);
    const unanswered = Number(attempt?.unanswered || 0);

    if (scorePercent < 45) {
        generated.push('Overall score is below 45%. Revisit basics and prioritize high-yield topics.');
    }

    if (accuracyPercent < 60) {
        generated.push('Accuracy is below 60%. Reduce risky guesses and review common error patterns.');
    }

    if (totalQuestions > 0 && unanswered > Math.ceil(totalQuestions * 0.2)) {
        generated.push('Unattempted count is high. Improve time allocation and final review strategy.');
    }

    const sectionStats = Array.isArray(attempt?.sectionStats) ? attempt.sectionStats : [];
    sectionStats.forEach((section) => {
        const accuracy = Number(section?.accuracyPercent || 0);
        if (accuracy > 0 && accuracy < 50) {
            const sectionName = toSafeString(section?.name || section?.sectionId || 'Section');
            generated.push(`${sectionName} is under 50% accuracy. Add this section to your next revision cycle.`);
        }
    });

    return generated.slice(0, 8);
};

const calculateAttemptStreak = (attempts) => {
    if (!Array.isArray(attempts) || !attempts.length) return 0;

    const dayKeys = Array.from(new Set(
        attempts
            .map((attempt) => toSafeString(attempt?.submittedAt))
            .map((submittedAt) => {
                const timestamp = Date.parse(submittedAt);
                if (!Number.isFinite(timestamp)) return '';
                return new Date(timestamp).toISOString().slice(0, 10);
            })
            .filter(Boolean)
    ));

    if (!dayKeys.length) return 0;

    const dayNumbers = dayKeys
        .map((key) => Math.floor(Date.parse(`${key}T00:00:00Z`) / 86400000))
        .filter(Number.isFinite)
        .sort((left, right) => right - left);

    if (!dayNumbers.length) return 0;

    let streak = 1;
    for (let index = 1; index < dayNumbers.length; index += 1) {
        if (dayNumbers[index - 1] - dayNumbers[index] === 1) {
            streak += 1;
        } else {
            break;
        }
    }

    return streak;
};

const sanitizeAttemptPayload = (rawAttempt) => {
    const attempt = rawAttempt && typeof rawAttempt === 'object' ? rawAttempt : {};
    const examId = toSafeString(attempt.examId).toLowerCase();
    const paperId = toSafeString(attempt.paperId).toLowerCase();

    if (!examById.has(examId)) {
        return { ok: false, message: 'Invalid or missing attempt examId.' };
    }

    if (!paperId) {
        return { ok: false, message: 'Invalid or missing attempt paperId.' };
    }

    const score = Number(attempt.score);
    const maxScore = Number(attempt.maxScore);
    const correct = Math.max(0, Math.floor(Number(attempt.correct) || 0));
    const wrong = Math.max(0, Math.floor(Number(attempt.wrong) || 0));
    const unanswered = Math.max(0, Math.floor(Number(attempt.unanswered) || 0));
    const attemptedQuestions = correct + wrong;
    const totalQuestions = attemptedQuestions + unanswered;

    if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) {
        return { ok: false, message: 'Attempt score and maxScore are required.' };
    }

    const normalizedScore = Math.max(0, Number(score.toFixed(2)));
    const normalizedMaxScore = Math.max(1, Number(maxScore.toFixed(2)));
    const scorePercent = Number(((normalizedScore / normalizedMaxScore) * 100).toFixed(2));
    const accuracyPercent = attemptedQuestions > 0
        ? Number(((correct / attemptedQuestions) * 100).toFixed(2))
        : 0;

    const submittedAt = toSafeString(attempt.submittedAt) || new Date().toISOString();
    const durationMinutes = Math.max(1, Math.floor(Number(attempt.durationMinutes) || 0));
    const timeTakenSeconds = Math.max(0, Math.floor(Number(attempt.timeTakenSeconds) || 0));
    const sectionStats = sanitizeAttemptSectionStats(attempt.sectionStats, totalQuestions);
    const weakTopics = sanitizeInsightList(attempt.weakTopics, 6);
    const lowScoreWarnings = sanitizeInsightList(attempt.lowScoreWarnings, 8);
    const isAutoSubmitted = Boolean(attempt.isAutoSubmitted || attempt.autoSubmitted);

    return {
        ok: true,
        attempt: {
            attemptId: crypto.randomBytes(6).toString('hex'),
            examId,
            paperId,
            score: normalizedScore,
            maxScore: normalizedMaxScore,
            scorePercent,
            correct,
            wrong,
            unanswered,
            totalQuestions,
            accuracyPercent,
            durationMinutes,
            timeTakenSeconds,
            launchMode: toSafeString(attempt.launchMode) || 'dynamic',
            isAutoSubmitted,
            sectionStats,
            weakTopics,
            lowScoreWarnings,
            submittedAt
        }
    };
};

const getRecentAttempts = async (email, limit = 10) => {
    const safeEmail = toSafeEmail(email);
    if (!safeEmail) return [];

    if (USE_PRISMA_PERSISTENCE) {
        return listRecentAttemptsForUser(safeEmail, limit);
    }

    const attempts = Array.isArray(attemptStore.get(safeEmail)) ? attemptStore.get(safeEmail) : [];
    return [...attempts]
        .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
        .slice(0, Math.max(1, Math.min(100, Number(limit) || 10)));
};

const buildPaperKey = (examId, paperId) => `${toSafeString(examId).toLowerCase()}::${toSafeString(paperId).toLowerCase()}`;

const getAttemptsForPaper = async (examId, paperId, limit = 500) => {
    const safeExamId = toSafeString(examId).toLowerCase();
    const safePaperId = toSafeString(paperId).toLowerCase();
    if (!safeExamId || !safePaperId) return [];

    if (USE_PRISMA_PERSISTENCE) {
        return listAttemptsForPaper(safeExamId, safePaperId, limit);
    }

    const collected = [];

    attemptStore.forEach((attempts) => {
        if (!Array.isArray(attempts)) return;
        attempts.forEach((attempt) => {
            const attemptExamId = toSafeString(attempt?.examId).toLowerCase();
            const attemptPaperId = toSafeString(attempt?.paperId).toLowerCase();
            if (attemptExamId !== safeExamId || attemptPaperId !== safePaperId) return;
            collected.push(attempt);
        });
    });

    return collected
        .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
        .slice(0, Math.max(1, Math.min(2000, Number(limit) || 500)));
};

const resolvePaperMaxScore = (examId, paperId) => {
    const payload = getValidatedPaperPayload(examId, paperId, 'en');
    if (!payload.ok) return null;
    const numericMaxScore = Number(payload?.paper?.maxScore);
    return Number.isFinite(numericMaxScore) && numericMaxScore > 0
        ? Number(numericMaxScore.toFixed(2))
        : null;
};

const rankAttemptsByScoreAndSpeed = (attempts) => {
    return [...(Array.isArray(attempts) ? attempts : [])].sort((left, right) => {
        const scoreDelta = Number(right?.scorePercent || 0) - Number(left?.scorePercent || 0);
        if (Math.abs(scoreDelta) > 0.001) return scoreDelta;

        const leftTime = Number(left?.timeTakenSeconds || Number.MAX_SAFE_INTEGER);
        const rightTime = Number(right?.timeTakenSeconds || Number.MAX_SAFE_INTEGER);
        if (leftTime !== rightTime) return leftTime - rightTime;

        return String(right?.submittedAt || '').localeCompare(String(left?.submittedAt || ''));
    });
};

const buildPaperBenchmarkSnapshot = (attempts, maxScore) => {
    const safeAttempts = Array.isArray(attempts) ? attempts : [];
    const attemptCount = safeAttempts.length;
    const averageScorePercent = attemptCount
        ? Number((safeAttempts.reduce((sum, attempt) => sum + (Number(attempt?.scorePercent) || 0), 0) / attemptCount).toFixed(2))
        : 0;
    const averageTimeTakenSeconds = attemptCount
        ? Math.round(safeAttempts.reduce((sum, attempt) => sum + (Number(attempt?.timeTakenSeconds) || 0), 0) / attemptCount)
        : 0;

    const ranked = rankAttemptsByScoreAndSpeed(safeAttempts);
    const topperAttempt = ranked[0] || null;
    const topBandAttempts = ranked.slice(0, Math.max(1, Math.min(5, ranked.length)));

    const cutoffScorePercent = Number(Math.max(MINIMUM_MOCK_CUTOFF_PERCENT, averageScorePercent || 0).toFixed(2));
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0
        ? Number(Number(maxScore).toFixed(2))
        : null;
    const cutoffScore = safeMaxScore === null
        ? null
        : Number(((safeMaxScore * cutoffScorePercent) / 100).toFixed(2));
    const topperScore = safeMaxScore === null || !topperAttempt
        ? null
        : Number((safeMaxScore * (Number(topperAttempt.scorePercent || 0) / 100)).toFixed(2));

    return {
        attemptCount,
        averageScorePercent,
        averageTimeTakenSeconds,
        cutoffScorePercent,
        cutoffScore,
        topperScorePercent: topperAttempt ? Number(Number(topperAttempt.scorePercent || 0).toFixed(2)) : null,
        topperScore,
        topperTimeTakenSeconds: topperAttempt ? Math.max(0, Math.floor(Number(topperAttempt.timeTakenSeconds) || 0)) : null,
        topBandAttempts
    };
};

const extractQuestionStatsFromAttempt = (attempt) => {
    const sectionStats = Array.isArray(attempt?.sectionStats) ? attempt.sectionStats : [];
    const rows = [];

    sectionStats.forEach((section) => {
        const sectionId = toSafeString(section?.sectionId || section?.name).toLowerCase();
        const questionStats = Array.isArray(section?.questionStats) ? section.questionStats : [];

        questionStats.forEach((questionStat, index) => {
            const questionNumber = Math.max(1, Math.floor(Number(questionStat?.questionNumber) || (index + 1)));
            const questionId = toSafeString(questionStat?.questionId || `q${questionNumber}`).slice(0, 120);
            if (!questionId) return;

            rows.push({
                questionNumber,
                questionId,
                sectionId: toSafeString(questionStat?.sectionId || sectionId).toLowerCase(),
                timeTakenSeconds: Math.max(0, Math.floor(Number(questionStat?.timeTakenSeconds) || 0)),
                status: toSafeString(questionStat?.status).toLowerCase() || 'not-visited',
                selectedOptionIndex: Math.floor(Number(questionStat?.selectedOptionIndex)),
                correctOptionIndex: Math.floor(Number(questionStat?.correctOptionIndex))
            });
        });
    });

    return rows.sort((left, right) => left.questionNumber - right.questionNumber);
};

const buildQuestionTimeAveragesMap = (attempts) => {
    const aggregateMap = new Map();

    (Array.isArray(attempts) ? attempts : []).forEach((attempt) => {
        extractQuestionStatsFromAttempt(attempt).forEach((questionStat) => {
            const key = questionStat.questionId || `q${questionStat.questionNumber}`;
            const previous = aggregateMap.get(key) || {
                questionId: questionStat.questionId,
                questionNumber: questionStat.questionNumber,
                sectionId: questionStat.sectionId,
                totalTimeSeconds: 0,
                sampleCount: 0
            };

            previous.totalTimeSeconds += Number(questionStat.timeTakenSeconds || 0);
            previous.sampleCount += 1;

            aggregateMap.set(key, previous);
        });
    });

    const averageMap = new Map();
    aggregateMap.forEach((value, key) => {
        if (!value.sampleCount) return;
        averageMap.set(key, {
            questionId: value.questionId,
            questionNumber: value.questionNumber,
            sectionId: value.sectionId,
            averageTimeSeconds: Number((value.totalTimeSeconds / value.sampleCount).toFixed(2)),
            sampleCount: value.sampleCount
        });
    });

    return averageMap;
};

const buildPaperPerformancePayload = async (email, target) => {
    const safeEmail = toSafeEmail(email);
    const targetSelection = getExamPoolForTarget(target);
    if (!targetSelection.isValid) {
        return {
            ok: false,
            message: 'Invalid target. Use exam id or stream (ssc, rrb, upsc).'
        };
    }

    const userAttempts = await getRecentAttempts(safeEmail, 400);
    const latestAttemptByPaperKey = new Map();
    userAttempts.forEach((attempt) => {
        const key = buildPaperKey(attempt?.examId, attempt?.paperId);
        if (!key || latestAttemptByPaperKey.has(key)) return;
        latestAttemptByPaperKey.set(key, attempt);
    });

    const items = [];
    for (const exam of targetSelection.exams) {
        const paperIds = getValidatedPaperIdsForExam(exam);
        for (const paperId of paperIds) {
            const paperKey = buildPaperKey(exam.id, paperId);
            const latestAttempt = latestAttemptByPaperKey.get(paperKey) || null;
            const paperMaxScore = resolvePaperMaxScore(exam.id, paperId)
                || normalizeMarkValue(latestAttempt?.maxScore)
                || null;
            const attemptsForPaper = await getAttemptsForPaper(exam.id, paperId, 800);
            const benchmark = buildPaperBenchmarkSnapshot(attemptsForPaper, paperMaxScore);

            const userLatestScore = latestAttempt ? normalizeMarkValue(latestAttempt?.score) : null;
            const userLatestScorePercent = latestAttempt ? normalizePercentValue(latestAttempt?.scorePercent) : null;
            const userLatestMaxScore = latestAttempt ? normalizeMarkValue(latestAttempt?.maxScore) : paperMaxScore;
            const cutoffScore = benchmark.cutoffScore;
            const isAboveCutoff = userLatestScore !== null
                ? (cutoffScore === null
                    ? Number(userLatestScorePercent || 0) >= Number(benchmark.cutoffScorePercent || MINIMUM_MOCK_CUTOFF_PERCENT)
                    : userLatestScore >= Number(cutoffScore || 0))
                : false;

            items.push({
                examId: exam.id,
                paperId,
                hasAttempt: Boolean(latestAttempt),
                userLatestScore,
                userLatestMaxScore,
                userLatestScorePercent,
                averageScorePercent: benchmark.averageScorePercent,
                cutoffScorePercent: benchmark.cutoffScorePercent,
                cutoffScore,
                topperScorePercent: benchmark.topperScorePercent,
                topperScore: benchmark.topperScore,
                topperTimeTakenSeconds: benchmark.topperTimeTakenSeconds,
                averageTimeTakenSeconds: benchmark.averageTimeTakenSeconds,
                attemptCount: benchmark.attemptCount,
                isAboveCutoff,
                submittedAt: toSafeString(latestAttempt?.submittedAt)
            });
        }
    }

    return {
        ok: true,
        email: safeEmail,
        target: targetSelection.normalizedTarget,
        minimumCutoffPercent: MINIMUM_MOCK_CUTOFF_PERCENT,
        generatedAt: new Date().toISOString(),
        items
    };
};

const buildPaperAnalysisPayload = async (email, examId, paperId) => {
    const safeEmail = toSafeEmail(email);
    const safeExamId = toSafeString(examId).toLowerCase();
    const safePaperId = toSafeString(paperId).toLowerCase();

    const userAttempts = await getRecentAttempts(safeEmail, 400);
    const latestAttempt = userAttempts.find((attempt) => {
        return toSafeString(attempt?.examId).toLowerCase() === safeExamId
            && toSafeString(attempt?.paperId).toLowerCase() === safePaperId;
    }) || null;

    const allAttempts = await getAttemptsForPaper(safeExamId, safePaperId, 1200);
    const paperMaxScore = resolvePaperMaxScore(safeExamId, safePaperId)
        || normalizeMarkValue(latestAttempt?.maxScore)
        || null;
    const benchmark = buildPaperBenchmarkSnapshot(allAttempts, paperMaxScore);
    const userScore = latestAttempt ? Number(latestAttempt.score || 0) : null;
    const userScorePercent = latestAttempt ? Number(latestAttempt.scorePercent || 0) : null;
    const userTimeTakenSeconds = latestAttempt ? Math.max(0, Math.floor(Number(latestAttempt.timeTakenSeconds) || 0)) : null;

    const allQuestionAverages = buildQuestionTimeAveragesMap(allAttempts);
    const topBandQuestionAverages = buildQuestionTimeAveragesMap(benchmark.topBandAttempts);
    const userQuestionStats = latestAttempt ? extractQuestionStatsFromAttempt(latestAttempt) : [];

    const questionTimeComparison = userQuestionStats.map((questionStat) => {
        const key = questionStat.questionId || `q${questionStat.questionNumber}`;
        const average = allQuestionAverages.get(key) || null;
        const topperAverage = topBandQuestionAverages.get(key) || null;
        const userTime = Number(questionStat.timeTakenSeconds || 0);
        const averageTime = Number(average?.averageTimeSeconds || 0);

        return {
            questionNumber: questionStat.questionNumber,
            questionId: questionStat.questionId,
            sectionId: questionStat.sectionId,
            status: questionStat.status,
            userTimeSeconds: userTime,
            averageTimeSeconds: average ? averageTime : null,
            topperAverageTimeSeconds: topperAverage ? Number(topperAverage.averageTimeSeconds || 0) : null,
            deltaVsAverageSeconds: average ? Number((userTime - averageTime).toFixed(2)) : null
        };
    });

    const briefAnalysis = [];
    if (!latestAttempt) {
        briefAnalysis.push('No completed attempt found for this paper yet. Start a mock to unlock detailed analysis.');
    } else {
        if (userScorePercent >= benchmark.cutoffScorePercent) {
            briefAnalysis.push(`Great progress: your score percentage (${userScorePercent.toFixed(1)}%) is above cutoff (${benchmark.cutoffScorePercent.toFixed(1)}%).`);
        } else {
            const percentGap = Number((benchmark.cutoffScorePercent - userScorePercent).toFixed(2));
            briefAnalysis.push(`You are ${percentGap.toFixed(2)}% below current cutoff. Focus on high-yield sections first.`);
        }

        const accuracyPercent = Number(latestAttempt.accuracyPercent || 0);
        if (accuracyPercent < 60) {
            briefAnalysis.push(`Accuracy is ${accuracyPercent.toFixed(1)}%. Reduce guesswork and prioritize reliable attempts.`);
        } else {
            briefAnalysis.push(`Accuracy at ${accuracyPercent.toFixed(1)}% is a strong base. Push speed while maintaining precision.`);
        }

        if (userTimeTakenSeconds !== null && benchmark.topperTimeTakenSeconds !== null) {
            const timeGapSeconds = Math.max(0, userTimeTakenSeconds - benchmark.topperTimeTakenSeconds);
            if (timeGapSeconds > 0) {
                briefAnalysis.push(`Topper solved the paper ${Math.round(timeGapSeconds / 60)} min faster. Improve scan-and-skip strategy.`);
            }
        }
    }

    return {
        examId: safeExamId,
        paperId: safePaperId,
        hasAttempt: Boolean(latestAttempt),
        generatedAt: new Date().toISOString(),
        latestAttempt: latestAttempt
            ? {
                attemptId: latestAttempt.attemptId,
                submittedAt: latestAttempt.submittedAt,
                score: Number(latestAttempt.score || 0),
                maxScore: Number(latestAttempt.maxScore || 0),
                scorePercent: Number(latestAttempt.scorePercent || 0),
                accuracyPercent: Number(latestAttempt.accuracyPercent || 0),
                correct: Number(latestAttempt.correct || 0),
                wrong: Number(latestAttempt.wrong || 0),
                unanswered: Number(latestAttempt.unanswered || 0),
                timeTakenSeconds: Number(latestAttempt.timeTakenSeconds || 0),
                sectionStats: Array.isArray(latestAttempt.sectionStats) ? latestAttempt.sectionStats : []
            }
            : null,
        benchmark: {
            attemptCount: benchmark.attemptCount,
            averageScorePercent: benchmark.averageScorePercent,
            cutoffScorePercent: benchmark.cutoffScorePercent,
            cutoffScore: benchmark.cutoffScore,
            topperScorePercent: benchmark.topperScorePercent,
            topperScore: benchmark.topperScore,
            topperTimeTakenSeconds: benchmark.topperTimeTakenSeconds,
            averageTimeTakenSeconds: benchmark.averageTimeTakenSeconds
        },
        comparison: {
            userScore,
            userScorePercent,
            userTimeTakenSeconds,
            scoreGapVsCutoff: userScore === null || benchmark.cutoffScore === null
                ? null
                : Number((Number(benchmark.cutoffScore) - Number(userScore)).toFixed(2)),
            scoreGapVsTopper: userScore === null || benchmark.topperScore === null
                ? null
                : Number((Number(benchmark.topperScore) - Number(userScore)).toFixed(2)),
            timeGapVsTopperSeconds: userTimeTakenSeconds === null || benchmark.topperTimeTakenSeconds === null
                ? null
                : Number(userTimeTakenSeconds - benchmark.topperTimeTakenSeconds)
        },
        briefAnalysis,
        questionTimeComparison
    };
};

const normalizePercentValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Number(Math.max(0, Math.min(100, numeric)).toFixed(2));
};

const normalizeMarkValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Number(Math.max(0, numeric).toFixed(2));
};

const getCutoffAveragesByExam = async () => {
    if (USE_PRISMA_PERSISTENCE) {
        return listAttemptCutoffAverages();
    }

    const summaryByExam = new Map();

    attemptStore.forEach((attempts) => {
        if (!Array.isArray(attempts)) return;

        attempts.forEach((attempt) => {
            const examId = toSafeString(attempt?.examId).toLowerCase();
            const scorePercent = normalizePercentValue(attempt?.scorePercent);
            const submittedAtIso = toSafeString(attempt?.submittedAt);
            const submittedAtMs = Date.parse(submittedAtIso);
            if (!examId || scorePercent === null) return;

            const previous = summaryByExam.get(examId) || {
                examId,
                scorePercentTotal: 0,
                attemptsCount: 0,
                lastSubmittedAtMs: Number.NEGATIVE_INFINITY,
                lastSubmittedAt: ''
            };

            previous.scorePercentTotal += scorePercent;
            previous.attemptsCount += 1;

            if (Number.isFinite(submittedAtMs) && submittedAtMs > previous.lastSubmittedAtMs) {
                previous.lastSubmittedAtMs = submittedAtMs;
                previous.lastSubmittedAt = new Date(submittedAtMs).toISOString();
            }

            summaryByExam.set(examId, previous);
        });
    });

    return Array.from(summaryByExam.values())
        .filter((item) => item.attemptsCount > 0)
        .map((item) => ({
            examId: item.examId,
            averageScorePercent: Number((item.scorePercentTotal / item.attemptsCount).toFixed(2)),
            attemptsCount: item.attemptsCount,
            lastSubmittedAt: item.lastSubmittedAt
        }));
};

const buildMockCardPerformancePayload = async (email) => {
    const safeEmail = toSafeEmail(email);
    const userAttempts = await getRecentAttempts(safeEmail, 200);
    const latestAttemptByExam = new Map();

    userAttempts.forEach((attempt) => {
        const examId = toSafeString(attempt?.examId).toLowerCase();
        if (!examId || latestAttemptByExam.has(examId)) return;
        latestAttemptByExam.set(examId, attempt);
    });

    const cutoffRows = await getCutoffAveragesByExam();
    const cutoffByExam = new Map(
        cutoffRows
            .map((row) => [toSafeString(row?.examId).toLowerCase(), row])
            .filter(([examId]) => Boolean(examId))
    );

    const generatedAt = new Date().toISOString();
    const items = EXAMS.map((exam) => {
        const examId = toSafeString(exam?.id).toLowerCase();
        const latestAttempt = latestAttemptByExam.get(examId) || null;
        const cutoffRow = cutoffByExam.get(examId) || null;
        const calculatedAverageScorePercent = normalizePercentValue(cutoffRow?.averageScorePercent);
        const cutoffScorePercent = Number(
            Math.max(MINIMUM_MOCK_CUTOFF_PERCENT, Number(calculatedAverageScorePercent || 0)).toFixed(2)
        );
        const userLatestScore = latestAttempt
            ? normalizeMarkValue(latestAttempt?.score)
            : null;
        const userLatestMaxScore = latestAttempt
            ? normalizeMarkValue(latestAttempt?.maxScore)
            : null;
        const userLatestScorePercent = latestAttempt
            ? normalizePercentValue(latestAttempt?.scorePercent)
            : null;
        const cutoffScore = userLatestMaxScore !== null
            ? Number(((userLatestMaxScore * cutoffScorePercent) / 100).toFixed(2))
            : null;
        const isAboveCutoff = userLatestScore !== null && cutoffScore !== null
            ? userLatestScore >= cutoffScore
            : (Boolean(latestAttempt) && Number(userLatestScorePercent || 0) >= cutoffScorePercent);

        return {
            examId,
            paperId: toSafeString(latestAttempt?.paperId || exam?.paperConfig?.defaultPaperId).toLowerCase(),
            hasAttempt: Boolean(latestAttempt),
            userLatestScore,
            userLatestMaxScore,
            userLatestScorePercent,
            calculatedAverageScorePercent,
            cutoffScorePercent,
            cutoffScore,
            cutoffAttemptCount: Math.max(0, Number(cutoffRow?.attemptsCount || 0)),
            isAboveCutoff,
            submittedAt: toSafeString(latestAttempt?.submittedAt),
            updatedAt: toSafeString(cutoffRow?.lastSubmittedAt) || generatedAt
        };
    });

    return {
        email: safeEmail,
        minimumCutoffPercent: MINIMUM_MOCK_CUTOFF_PERCENT,
        generatedAt,
        items
    };
};

const buildDashboardPayload = async (email) => {
    const safeEmail = toSafeEmail(email);
    const profile = sanitizeProfile((await getUserPersonalizationProfile(safeEmail)) || defaultPersonalizationProfile());
    const attempts = await getRecentAttempts(safeEmail, 25);
    const nowMs = Date.now();
    const sevenDaysAgoMs = nowMs - (7 * 24 * 60 * 60 * 1000);

    const totalLaunches = Object.values(profile.launchCountByExam || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const totalSelections = Object.values(profile.selectionCountByExam || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const totalRecommendations = Object.values(profile.recommendationCountByExam || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);

    const scoredAttempts = attempts.filter((item) => Number(item.maxScore) > 0);
    const avgScorePercent = scoredAttempts.length
        ? Number((scoredAttempts.reduce((sum, item) => sum + (Number(item.scorePercent) || 0), 0) / scoredAttempts.length).toFixed(2))
        : 0;
    const bestScorePercent = scoredAttempts.length
        ? Number(Math.max(...scoredAttempts.map((item) => Number(item.scorePercent) || 0)).toFixed(2))
        : 0;
    const last7DaysAttempts = attempts.filter((item) => {
        const submittedAtMs = Date.parse(String(item.submittedAt || ''));
        return Number.isFinite(submittedAtMs) && submittedAtMs >= sevenDaysAgoMs;
    }).length;

    const preferredExam = examById.get(profile.preferences?.preferredExamId || '');
    const lastAttempt = attempts[0] || null;
    const weakTopics = buildWeakTopicsFromAttempt(lastAttempt);
    const lowScoreWarnings = buildLowScoreWarningsFromAttempt(lastAttempt);
    const sectionPerformance = Array.isArray(lastAttempt?.sectionStats)
        ? lastAttempt.sectionStats
        : [];
    const lastMockSummary = lastAttempt
        ? {
            examId: lastAttempt.examId,
            paperId: lastAttempt.paperId,
            score: Number(lastAttempt.score || 0),
            maxScore: Number(lastAttempt.maxScore || 0),
            scorePercent: Number(lastAttempt.scorePercent || 0),
            accuracyPercent: Number(lastAttempt.accuracyPercent || 0),
            correct: Number(lastAttempt.correct || 0),
            wrong: Number(lastAttempt.wrong || 0),
            unanswered: Number(lastAttempt.unanswered || 0),
            totalQuestions: Number(lastAttempt.totalQuestions || 0),
            timeTakenSeconds: Number(lastAttempt.timeTakenSeconds || 0),
            durationMinutes: Number(lastAttempt.durationMinutes || 0),
            submittedAt: lastAttempt.submittedAt,
            isAutoSubmitted: Boolean(lastAttempt.isAutoSubmitted),
            sectionPerformance
        }
        : null;

    const recommendedExams = buildRecommendedExamListFromProfile(profile);
    const nextRecommendedExam = recommendedExams[0] || null;
    const nextRecommendedTest = nextRecommendedExam
        ? {
            examId: nextRecommendedExam.examId,
            title: nextRecommendedExam.title,
            stream: nextRecommendedExam.stream,
            confidence: Number(nextRecommendedExam.confidence || 0),
            reason: weakTopics.length
                ? `Recommended to improve: ${weakTopics[0]}`
                : 'Recommended based on your latest exam activity and preferences.'
        }
        : null;

    const incompleteMock = sanitizeIncompleteSessionPayload(await getUserIncompleteSession(safeEmail), { strict: false });
    const localName = safeEmail.includes('@') ? safeEmail.split('@')[0] : safeEmail;
    const displayName = localName
        ? localName.charAt(0).toUpperCase() + localName.slice(1)
        : 'User';

    const dailyStreak = calculateAttemptStreak(attempts);

    return {
        email: safeEmail,
        user: {
            name: displayName,
            avatarInitial: displayName.charAt(0).toUpperCase(),
            lastActiveAt: profile.updatedAt || new Date().toISOString()
        },
        profile,
        metrics: {
            totalSelections,
            totalLaunches,
            totalRecommendations,
            totalAttempts: attempts.length,
            last7DaysAttempts,
            avgScorePercent,
            bestScorePercent,
            dailyStreak,
            weeklyMockTarget: Number(profile.preferences?.weeklyMockTarget || 0),
            weeklyMockGap: Math.max(0, Number(profile.preferences?.weeklyMockTarget || 0) - last7DaysAttempts)
        },
        recentActivity: attempts.slice(0, 10),
        recommendedExams,
        nextRecommendedTest,
        lastMockSummary,
        weakTopics,
        lowScoreWarnings,
        incompleteMock,
        quickExamShortcuts: EXAMS.map((exam) => ({
            examId: exam.id,
            title: exam.title,
            stream: exam.stream,
            recommendedDuration: exam.recommendedDuration,
            recommendedLevel: exam.recommendedLevel,
            defaultPaperId: toSafeString(exam?.paperConfig?.defaultPaperId).toLowerCase(),
            isPreferred: Boolean(preferredExam && preferredExam.id === exam.id)
        }))
    };
};

const getPlatformStats = async () => {
    let totalLaunches = 0;
    let totalRecommendations = 0;

    const profiles = USE_PRISMA_PERSISTENCE
        ? await listPersonalizationProfiles()
        : (() => {
            const list = [];
            personalizationStore.forEach((profile) => {
                list.push(profile);
            });
            return list;
        })();

    profiles.forEach((profile) => {
        const launchCounter = profile && typeof profile.launchCountByExam === 'object'
            ? profile.launchCountByExam
            : {};
        const recommendationCounter = profile && typeof profile.recommendationCountByExam === 'object'
            ? profile.recommendationCountByExam
            : {};

        totalLaunches += Object.values(launchCounter).reduce((sum, value) => sum + (Number(value) || 0), 0);
        totalRecommendations += Object.values(recommendationCounter).reduce((sum, value) => sum + (Number(value) || 0), 0);
    });

    const aspirants = PLATFORM_BASE_METRICS.aspirants + Math.min(25000, Math.floor(totalLaunches * 3));
    const selections = PLATFORM_BASE_METRICS.selections + Math.min(5000, Math.floor((totalLaunches + totalRecommendations) * 1.2));

    return {
        aspirants,
        selections,
        rating: PLATFORM_BASE_METRICS.rating,
        activeProfiles: profiles.length,
        totalLaunches,
        totalRecommendations
    };
};

const normalizeAnswers = (answers) => {
    const source = answers && typeof answers === 'object' ? answers : {};

    return {
        target: toSafeString(source.target).toLowerCase(),
        stage: toSafeString(source.stage).toLowerCase(),
        time: toSafeString(source.time).toLowerCase(),
        focus: toSafeString(source.focus).toLowerCase()
    };
};

const calculateAssessment = (answers) => {
    const normalized = normalizeAnswers(answers);
    const scores = {
        'ssc-cgl': 0,
        'ssc-chsl': 0,
        'rrb-ntpc': 0,
        'rrb-group-d': 0,
        'upsc-prelims': 0,
        'upsc-csat': 0
    };

    const addScore = (examId, weight) => {
        scores[examId] = (scores[examId] || 0) + weight;
    };

    if (normalized.target === 'ssc') {
        addScore('ssc-cgl', 28);
        addScore('ssc-chsl', 24);
    } else if (normalized.target === 'rrb') {
        addScore('rrb-ntpc', 28);
        addScore('rrb-group-d', 24);
    } else if (normalized.target === 'upsc') {
        addScore('upsc-prelims', 30);
        addScore('upsc-csat', 26);
    } else {
        addScore('rrb-ntpc', 8);
        addScore('ssc-cgl', 8);
    }

    if (normalized.stage === 'beginner') {
        addScore('ssc-chsl', 16);
        addScore('rrb-group-d', 16);
    } else if (normalized.stage === 'intermediate') {
        addScore('ssc-cgl', 12);
        addScore('rrb-ntpc', 12);
        addScore('upsc-csat', 8);
    } else if (normalized.stage === 'advanced') {
        addScore('upsc-prelims', 16);
        addScore('upsc-csat', 14);
        addScore('ssc-cgl', 8);
    }

    if (normalized.time === 'low') {
        addScore('ssc-chsl', 10);
        addScore('rrb-group-d', 10);
        addScore('upsc-csat', 6);
    } else if (normalized.time === 'medium') {
        addScore('rrb-ntpc', 8);
        addScore('ssc-cgl', 8);
    } else if (normalized.time === 'high') {
        addScore('upsc-prelims', 12);
        addScore('ssc-cgl', 8);
    }

    if (normalized.focus === 'speed') {
        addScore('rrb-group-d', 11);
        addScore('rrb-ntpc', 7);
        addScore('ssc-chsl', 7);
    } else if (normalized.focus === 'accuracy') {
        addScore('ssc-cgl', 10);
        addScore('rrb-ntpc', 8);
    } else if (normalized.focus === 'current-affairs') {
        addScore('upsc-prelims', 12);
        addScore('ssc-cgl', 6);
    } else if (normalized.focus === 'aptitude') {
        addScore('upsc-csat', 12);
        addScore('rrb-ntpc', 7);
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [bestId, bestScore] = sorted[0] || ['ssc-cgl', 0];
    const secondScore = sorted[1] ? sorted[1][1] : 0;

    const confidence = Math.max(55, Math.min(95, 65 + (bestScore - secondScore)));
    const exam = examById.get(bestId) || examById.get('ssc-cgl');

    const reasonParts = [];
    if (normalized.target && normalized.target !== 'unsure') reasonParts.push(`target stream: ${normalized.target.toUpperCase()}`);
    if (normalized.stage) reasonParts.push(`prep stage: ${normalized.stage}`);
    if (normalized.time) reasonParts.push(`daily time: ${normalized.time}`);
    if (normalized.focus) reasonParts.push(`focus: ${normalized.focus.replace('-', ' ')}`);

    const reason = reasonParts.length
        ? `Matched from ${reasonParts.join(', ')} with confidence ${confidence}%.`
        : `Recommended from current answer pattern with confidence ${confidence}%.`;

    return {
        examId: exam.id,
        exam,
        confidence,
        reason
    };
};

const buildExamCatalogResponse = () => {
    const examsByBody = new Map();

    EXAMS.forEach((exam) => {
        const bodyId = toSafeString(exam.bodyId || exam.stream).toLowerCase();
        if (!examsByBody.has(bodyId)) {
            examsByBody.set(bodyId, []);
        }
        examsByBody.get(bodyId).push(exam);
    });

    const bodies = EXAM_BODIES.length
        ? EXAM_BODIES.map((body) => ({
            id: body.id,
            title: body.title,
            source: body.source,
            exams: (examsByBody.get(body.id) || []).map((exam) => ({
                chapterStats: getChapterwiseForExam(exam.id)?.stats || { subjectCount: 0, chapterCount: 0, topicCount: 0 },
                id: exam.id,
                title: exam.title,
                stream: exam.stream,
                isLive: exam.isLive !== false,
                dataFolder: toSafeString(exam.dataFolder).toLowerCase(),
                languageSupport: sanitizePaperIdList(exam?.paperConfig?.languageSupport),
                availablePaperIds: sanitizePaperIdList(exam?.paperConfig?.availablePaperIds)
            })),
            liveCount: (examsByBody.get(body.id) || []).filter((exam) => exam.isLive !== false).length
        }))
        : [];

    return {
        version: EXAM_CATALOG_VERSION,
        chapterwiseVersion: EXAM_CHAPTERWISE_STORE.version,
        totalExams: EXAMS.length,
        liveExams: EXAMS.filter((exam) => exam.isLive !== false).length,
        plannedExams: EXAMS.filter((exam) => exam.isLive === false).length,
        bodies,
        exams: EXAMS.map((exam) => ({
            ...exam,
            chapterStats: getChapterwiseForExam(exam.id)?.stats || { subjectCount: 0, chapterCount: 0, topicCount: 0 }
        }))
    };
};

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        service: 'mockly-local-api',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/exams', (req, res) => {
    const catalog = buildExamCatalogResponse();

    res.json({
        exams: catalog.exams,
        count: catalog.exams.length,
        catalogVersion: catalog.version,
        liveCount: catalog.liveExams,
        plannedCount: catalog.plannedExams,
        bodies: catalog.bodies.map((body) => ({
            id: body.id,
            title: body.title,
            source: body.source,
            examIds: body.exams.map((exam) => exam.id),
            liveCount: body.liveCount
        })),
        source: 'local-api'
    });
});

app.get('/api/exam-catalog', (req, res) => {
    const catalog = buildExamCatalogResponse();

    return res.json({
        ...catalog,
        source: 'local-api'
    });
});

app.get('/api/chapterwise', (req, res) => {
    const targetSelection = getExamPoolForTarget(req.query?.target);
    if (!targetSelection.isValid) {
        return res.status(400).json({ message: 'Invalid target. Use exam id or stream (ssc, rrb, upsc).' });
    }

    const items = targetSelection.exams.map((exam) => {
        const chapterwise = getChapterwiseForExam(exam.id);
        const stats = chapterwise?.stats || { subjectCount: 0, chapterCount: 0, topicCount: 0 };
        const topSubjects = Array.isArray(chapterwise?.subjects)
            ? chapterwise.subjects.slice(0, 3).map((subject) => ({
                subjectId: subject.subjectId,
                name: subject.name,
                chapterCount: Array.isArray(subject.chapters) ? subject.chapters.length : 0
            }))
            : [];

        return {
            examId: exam.id,
            examTitle: exam.title,
            stream: exam.stream,
            isLive: exam.isLive !== false,
            stats,
            topSubjects
        };
    });

    return res.json({
        version: EXAM_CHAPTERWISE_STORE.version,
        target: targetSelection.normalizedTarget,
        count: items.length,
        items,
        source: 'local-api'
    });
});

app.get('/api/chapterwise/:examId', (req, res) => {
    const examId = toSafeString(req.params?.examId).toLowerCase();
    if (!examId || !examById.has(examId)) {
        return res.status(404).json({ message: 'Exam not found.' });
    }

    const payload = getChapterwiseForExam(examId);
    const exam = examById.get(examId);
    const subjectFilter = toSafeIdentifier(req.query?.subjectId);
    const chapterFilter = toSafeIdentifier(req.query?.chapterId);
    const topicFilter = toSafeIdentifier(req.query?.topicId);

    let subjects = Array.isArray(payload?.subjects) ? payload.subjects : [];

    if (subjectFilter) {
        subjects = subjects.filter((subject) => toSafeIdentifier(subject.subjectId) === subjectFilter);
    }

    subjects = subjects
        .map((subject) => {
            const chapters = Array.isArray(subject?.chapters) ? subject.chapters : [];
            let filteredChapters = chapters;

            if (chapterFilter) {
                filteredChapters = filteredChapters.filter((chapter) => toSafeIdentifier(chapter.chapterId) === chapterFilter);
            }

            filteredChapters = filteredChapters
                .map((chapter) => {
                    const topics = Array.isArray(chapter?.topics) ? chapter.topics : [];
                    const filteredTopics = topicFilter
                        ? topics.filter((topic) => toSafeIdentifier(topic.topicId) === topicFilter)
                        : topics;

                    if (!filteredTopics.length) return null;

                    return {
                        ...chapter,
                        topics: filteredTopics
                    };
                })
                .filter(Boolean);

            if (!filteredChapters.length) return null;

            return {
                ...subject,
                chapters: filteredChapters
            };
        })
        .filter(Boolean);

    return res.json({
        examId,
        examTitle: exam.title,
        stream: exam.stream,
        isLive: exam.isLive !== false,
        version: EXAM_CHAPTERWISE_STORE.version,
        selectedFilters: {
            subjectId: subjectFilter,
            chapterId: chapterFilter,
            topicId: topicFilter
        },
        stats: payload?.stats || { subjectCount: 0, chapterCount: 0, topicCount: 0 },
        subjects,
        source: 'local-api'
    });
});

app.get('/api/test-series', (req, res) => {
    const result = listGeneratedTestSeries({
        target: req.query?.target,
        sort: req.query?.sort,
        page: req.query?.page,
        limit: req.query?.limit
    });

    if (!result.ok) {
        return res.status(400).json({ message: result.message });
    }

    const items = Array.isArray(result.items)
        ? result.items.map((item) => ({
            ...item,
            subjectId: '',
            subjectName: '',
            chapterId: '',
            chapterName: '',
            topicId: '',
            topicName: '',
            topicDifficultyBand: ''
        }))
        : [];

    return res.json({
        target: result.target,
        sort: result.sort,
        subjectId: '',
        chapterId: '',
        topicId: '',
        page: result.page,
        limit: result.limit,
        total: result.total,
        hasMore: result.hasMore,
        items,
        scope: 'series',
        message: 'Chapterwise tests are available only on the Chapter Wise page.',
        source: 'local-api'
    });
});

app.get('/api/chapter-tests', (req, res) => {
    const result = listGeneratedTestSeries({
        target: req.query?.target,
        sort: req.query?.sort,
        page: req.query?.page,
        limit: req.query?.limit,
        subjectId: req.query?.subjectId,
        chapterId: req.query?.chapterId,
        topicId: req.query?.topicId
    });

    if (!result.ok) {
        return res.status(400).json({ message: result.message });
    }

    return res.json({
        target: result.target,
        sort: result.sort,
        subjectId: result.subjectId,
        chapterId: result.chapterId,
        topicId: result.topicId,
        page: result.page,
        limit: result.limit,
        total: result.total,
        hasMore: result.hasMore,
        items: result.items,
        scope: 'chapterwise',
        source: 'local-api'
    });
});

app.get('/api/papers/:examId', (req, res) => {
    const examId = toSafeString(req.params?.examId).toLowerCase();
    if (!examId || !examById.has(examId)) {
        return res.status(404).json({ message: 'Exam not found.' });
    }

    const exam = examById.get(examId);
    const validatedPaperIds = getValidatedPaperIdsForExam(exam);
    const papers = validatedPaperIds
        .map((paperId) => {
            const payload = getValidatedPaperPayload(examId, paperId, 'en');
            return payload.ok ? payload.paper : null;
        })
        .filter(Boolean);

    return res.json({
        examId,
        papers,
        count: papers.length,
        source: 'local-api'
    });
});

app.get('/api/questions/:examId/:paperId', (req, res) => {
    const examId = toSafeString(req.params?.examId).toLowerCase();
    const paperId = toSafeString(req.params?.paperId).toLowerCase();
    const language = normalizeLanguageKey(req.query?.lang || 'en');

    if (!examId || !examById.has(examId)) {
        return res.status(404).json({ message: 'Exam not found.' });
    }

    const exam = examById.get(examId);
    const supportedPaperIds = sanitizePaperIdList(exam?.paperConfig?.availablePaperIds);
    if (!paperId || !supportedPaperIds.includes(paperId)) {
        return res.status(404).json({ message: 'Paper not found for selected exam.' });
    }

    const payload = getValidatedPaperPayload(examId, paperId, language);
    if (!payload.ok) {
        return res.status(404).json({
            message: 'Paper questions are not ready for candidate delivery.',
            detail: payload.message
        });
    }

    return res.json({
        examId,
        paperId,
        language: payload.language,
        paper: payload.paper,
        questions: payload.questions,
        count: payload.questions.length,
        source: 'local-api'
    });
});

app.get('/api/stats', async (req, res) => {
    try {
        const stats = await getPlatformStats();

        return res.json({
            aspirants: stats.aspirants,
            selections: stats.selections,
            rating: stats.rating,
            activeProfiles: stats.activeProfiles,
            totalLaunches: stats.totalLaunches,
            totalRecommendations: stats.totalRecommendations,
            source: 'local-api'
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to load platform stats.' });
    }
});

app.post('/api/assessment/recommend', (req, res) => {
    const answers = req.body && typeof req.body === 'object' ? req.body.answers : null;
    if (!answers || typeof answers !== 'object') {
        return res.status(400).json({ message: 'Invalid payload. Expected { answers: { ... } }.' });
    }

    const recommendation = calculateAssessment(answers);

    return res.json({
        examId: recommendation.examId,
        recommendedExamId: recommendation.examId,
        confidence: recommendation.confidence,
        reason: recommendation.reason
    });
});

app.post('/api/auth/signup', async (req, res) => {
    try {
        await ensureDemoUserRecord();

        const name = toSafeName(req.body?.name);
        const email = toSafeEmail(req.body?.email);
        const phone = toSafePhone(req.body?.phone);
        const password = String(req.body?.password || '');

        if (!name) {
            return res.status(400).json({ message: 'Name should be between 2 and 80 characters.' });
        }

        if (!email) {
            return res.status(400).json({ message: 'Please enter a valid email address.' });
        }

        if (!phone) {
            return res.status(400).json({ message: 'Please enter a valid 10-digit phone number.' });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({ message: 'Password must be between 6 and 72 characters.' });
        }

        if (await hasAuthUserByEmail(email)) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        const passwordHash = await hashPassword(password);
        const nowIso = new Date().toISOString();

        const userRecord = {
            email,
            name,
            phone,
            passwordHash,
            createdAt: nowIso,
            lastLoginAt: nowIso
        };

        await saveAuthUserRecord(userRecord);

        await ensureUserPersonalizationProfile(email);

        const authToken = await issueAuthSession(res, email);

        return res.status(201).json({
            ok: true,
            message: 'Account created successfully.',
            authenticated: true,
            user: toSafeAuthUser(userRecord),
            accessToken: authToken.accessToken,
            accessTokenExpiresInSeconds: authToken.accessTokenExpiresInSeconds
        });
    } catch (error) {
        return res.status(500).json({ message: 'Account creation failed. Please retry.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        await ensureDemoUserRecord();

        const email = toSafeEmail(req.body?.email);
        const password = String(req.body?.password || '');

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const loginAttemptKey = getLoginAttemptKey(req, email);
        if (isLoginBlocked(loginAttemptKey)) {
            return res.status(429).json({ message: 'Too many failed login attempts. Please try again in a few minutes.' });
        }

        const userRecord = await getAuthUserByEmail(email);
        if (!userRecord) {
            registerFailedLogin(loginAttemptKey);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const passwordVerification = await verifyPassword(password, userRecord.passwordHash);
        if (!passwordVerification.isValid) {
            registerFailedLogin(loginAttemptKey);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        clearLoginAttemptRecord(loginAttemptKey);

        if (passwordVerification.shouldUpgrade) {
            userRecord.passwordHash = await hashPassword(password);
        }

        userRecord.lastLoginAt = new Date().toISOString();
        await saveAuthUserRecord(userRecord);

        await ensureUserPersonalizationProfile(email);

        const authToken = await issueAuthSession(res, email);

        return res.json({
            ok: true,
            message: 'Login successful.',
            authenticated: true,
            user: toSafeAuthUser(userRecord),
            accessToken: authToken.accessToken,
            accessTokenExpiresInSeconds: authToken.accessTokenExpiresInSeconds
        });
    } catch (error) {
        return res.status(500).json({ message: 'Login failed. Please retry.' });
    }
});

app.post('/api/auth/refresh', requireCsrfForCookieAuth, async (req, res) => {
    try {
        await pruneExpiredRefreshSessions();

        const refreshToken = readCookie(req, REFRESH_COOKIE_NAME);
        if (!refreshToken) {
            clearAuthCookies(res);
            return res.status(401).json({ message: 'Refresh session is missing. Please log in again.' });
        }

        const tokenHash = hashRefreshToken(refreshToken);
        const refreshSession = await getRefreshSessionByHash(tokenHash);
        const refreshExpiryMs = Date.parse(String(refreshSession?.expiresAt || ''));

        if (!refreshSession || !Number.isFinite(refreshExpiryMs) || refreshExpiryMs <= Date.now()) {
            await revokeRefreshTokenHash(tokenHash);
            clearAuthCookies(res);
            return res.status(401).json({ message: 'Refresh session expired. Please log in again.' });
        }

        const email = toSafeEmail(refreshSession.email);
        const userRecord = await getAuthUserByEmail(email);
        if (!userRecord) {
            await revokeRefreshTokenHash(tokenHash);
            clearAuthCookies(res);
            return res.status(401).json({ message: 'Account not found. Please log in again.' });
        }

        await revokeRefreshTokenHash(tokenHash);
        const authToken = await issueAuthSession(res, email);

        return res.json({
            ok: true,
            authenticated: true,
            user: toSafeAuthUser(userRecord),
            accessToken: authToken.accessToken,
            accessTokenExpiresInSeconds: authToken.accessTokenExpiresInSeconds
        });
    } catch (error) {
        return res.status(500).json({ message: 'Refresh failed. Please retry.' });
    }
});

app.post('/api/auth/logout', requireCsrfForCookieAuth, async (req, res) => {
    try {
        const refreshToken = readCookie(req, REFRESH_COOKIE_NAME);
        if (refreshToken) {
            await revokeRefreshTokenHash(hashRefreshToken(refreshToken));
        }

        clearAuthCookies(res);

        return res.json({
            ok: true,
            authenticated: false,
            message: 'Logged out successfully.'
        });
    } catch (error) {
        return res.status(500).json({ message: 'Logout failed. Please retry.' });
    }
});

app.get('/api/auth/session', async (req, res) => {
    try {
        const auth = await resolveRequestAuth(req);
        if (!auth.ok) {
            return res.json({
                ok: true,
                authenticated: false,
                user: null
            });
        }

        return res.json({
            ok: true,
            authenticated: true,
            user: toSafeAuthUser(auth.user),
            accessTokenExpiresAt: new Date((Number(auth.tokenPayload?.exp) || 0) * 1000).toISOString()
        });
    } catch (error) {
        return res.status(500).json({ message: 'Session lookup failed. Please retry.' });
    }
});

app.post('/api/mocks/launch', requireAuth, requireCsrfForCookieAuth, (req, res) => {
    const examId = toSafeString(req.body?.examId).toLowerCase();
    const requestedPaperId = toSafeString(req.body?.paperId).toLowerCase();
    const userEmail = toSafeEmail(req.auth?.email);

    if (!examId || !examById.has(examId)) {
        return res.status(400).json({ message: 'Invalid or missing examId.' });
    }

    const exam = examById.get(examId);
    const availablePaperIds = sanitizePaperIdList(exam?.paperConfig?.availablePaperIds);
    const defaultPaperId = toSafeString(exam?.paperConfig?.defaultPaperId).toLowerCase();

    const candidatePaperIds = sanitizePaperIdList([
        requestedPaperId,
        defaultPaperId,
        ...availablePaperIds
    ]);

    let resolvedPaperId = '';
    for (const candidatePaperId of candidatePaperIds) {
        const payload = getValidatedPaperPayload(exam.id, candidatePaperId, 'en');
        if (payload.ok) {
            resolvedPaperId = candidatePaperId;
            break;
        }
    }

    const launchToken = crypto.randomBytes(8).toString('hex');
    const startUrl = resolvedPaperId
        ? `/mock/${exam.id}?paperId=${encodeURIComponent(resolvedPaperId)}&session=${launchToken}`
        : `/mock/${exam.id}?session=${launchToken}`;
    const emailText = userEmail ? ` for ${userEmail}` : '';
    const launchMode = resolvedPaperId ? 'dynamic' : 'legacy';
    const modeText = resolvedPaperId
        ? ` with validated paper ${resolvedPaperId}`
        : ' using legacy mock mode (validated paper unavailable)';

    return res.json({
        message: `Launch prepared${emailText}${modeText}. Start ${exam.title} now.`,
        startUrl,
        token: launchToken,
        examId: exam.id,
        paperId: resolvedPaperId,
        launchMode
    });
});

app.get('/api/exams/:examId', (req, res) => {
    const examId = toSafeString(req.params?.examId).toLowerCase();
    if (!examId || !examById.has(examId)) {
        return res.status(404).json({ message: 'Exam not found.' });
    }

    return res.json({ exam: examById.get(examId) });
});

app.get('/api/users/personalization', requireAuth, async (req, res) => {
    try {
        const email = toSafeEmail(req.auth?.email);
        const profile = sanitizeProfile((await getUserPersonalizationProfile(email)) || defaultPersonalizationProfile());

        return res.json({
            email,
            profile
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to fetch personalization profile.' });
    }
});

app.put('/api/users/personalization', requireAuth, requireCsrfForCookieAuth, async (req, res) => {
    try {
        const email = toSafeEmail(req.auth?.email);
        const profile = sanitizeProfile(req.body?.profile || {});
        const persistedProfile = await saveUserPersonalizationProfile(email, profile);

        return res.json({
            ok: true,
            email,
            profile: sanitizeProfile(persistedProfile || profile)
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to update personalization profile.' });
    }
});

app.post('/api/users/attempts', requireAuth, requireCsrfForCookieAuth, async (req, res) => {
    try {
        const email = toSafeEmail(req.auth?.email);

        const normalizedAttempt = sanitizeAttemptPayload(req.body?.attempt);
        if (!normalizedAttempt.ok) {
            return res.status(400).json({ message: normalizedAttempt.message });
        }

        let totalAttempts = 0;
        if (USE_PRISMA_PERSISTENCE) {
            const persistenceResult = await upsertAttemptForUser(email, normalizedAttempt.attempt);
            totalAttempts = Number(persistenceResult?.totalAttempts || totalAttempts);
        } else {
            const existingAttempts = Array.isArray(attemptStore.get(email)) ? attemptStore.get(email) : [];
            const nextAttempts = [normalizedAttempt.attempt, ...existingAttempts]
                .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
                .slice(0, 200);

            attemptStore.set(email, nextAttempts);
            totalAttempts = nextAttempts.length;
        }

        await clearUserIncompleteSession(email);

        return res.json({
            ok: true,
            email,
            attempt: normalizedAttempt.attempt,
            totalAttempts
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to save attempt. Please retry.' });
    }
});

app.post('/api/users/incomplete-session', requireAuth, requireCsrfForCookieAuth, async (req, res) => {
    try {
        const email = toSafeEmail(req.auth?.email);

        const normalizedSession = sanitizeIncompleteSessionPayload(req.body?.session, { strict: true });
        if (!normalizedSession.ok) {
            return res.status(400).json({ message: normalizedSession.message });
        }

        const persistedSession = await saveUserIncompleteSession(email, normalizedSession.session);

        return res.json({
            ok: true,
            email,
            session: sanitizeIncompleteSessionPayload(persistedSession, { strict: false })
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to store incomplete session.' });
    }
});

app.get('/api/users/incomplete-session', requireAuth, async (req, res) => {
    try {
        const email = toSafeEmail(req.auth?.email);

        return res.json({
            email,
            session: sanitizeIncompleteSessionPayload(await getUserIncompleteSession(email), { strict: false })
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to fetch incomplete session.' });
    }
});

app.delete('/api/users/incomplete-session', requireAuth, requireCsrfForCookieAuth, async (req, res) => {
    try {
        const email = toSafeEmail(req.auth?.email);
        await clearUserIncompleteSession(email);

        return res.json({
            ok: true,
            email
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to clear incomplete session.' });
    }
});

app.get('/api/users/attempts', requireAuth, async (req, res) => {
    try {
        const email = toSafeEmail(req.auth?.email);

        const limit = Math.max(1, Math.min(100, Number(req.query?.limit) || 20));
        const attempts = await getRecentAttempts(email, limit);

        return res.json({
            email,
            attempts,
            count: attempts.length
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to fetch attempts.' });
    }
});

app.get('/api/users/paper-performance', requireAuth, async (req, res) => {
    try {
        const email = toSafeEmail(req.auth?.email);
        const target = toSafeString(req.query?.target || 'all').toLowerCase();

        const payload = await buildPaperPerformancePayload(email, target);
        if (!payload.ok) {
            return res.status(400).json({ message: payload.message });
        }

        return res.json(payload);
    } catch (error) {
        return res.status(500).json({ message: 'Unable to load paper performance.' });
    }
});

app.get('/api/users/paper-analysis', requireAuth, async (req, res) => {
    try {
        const email = toSafeEmail(req.auth?.email);
        const examId = toSafeString(req.query?.examId).toLowerCase();
        const paperId = toSafeString(req.query?.paperId).toLowerCase();

        if (!examId || !examById.has(examId)) {
            return res.status(400).json({ message: 'Valid examId is required.' });
        }

        if (!paperId) {
            return res.status(400).json({ message: 'paperId is required.' });
        }

        const supportedPaperIds = sanitizePaperIdList(examById.get(examId)?.paperConfig?.availablePaperIds);
        if (!supportedPaperIds.includes(paperId)) {
            return res.status(404).json({ message: 'Paper not found for selected exam.' });
        }

        const paperPayload = getValidatedPaperPayload(examId, paperId, 'en');
        if (!paperPayload.ok) {
            return res.status(404).json({
                message: 'Paper questions are not ready for analysis.',
                detail: paperPayload.message
            });
        }

        return res.json(await buildPaperAnalysisPayload(email, examId, paperId));
    } catch (error) {
        return res.status(500).json({ message: 'Unable to load paper analysis.' });
    }
});

app.get('/api/users/mock-card-performance', requireAuth, async (req, res) => {
    try {
        const email = toSafeEmail(req.auth?.email);
        return res.json(await buildMockCardPerformancePayload(email));
    } catch (error) {
        return res.status(500).json({ message: 'Unable to load mock card performance.' });
    }
});

app.get('/api/users/dashboard', requireAuth, async (req, res) => {
    try {
        const email = toSafeEmail(req.auth?.email);

        return res.json(await buildDashboardPayload(email));
    } catch (error) {
        return res.status(500).json({ message: 'Unable to load dashboard.' });
    }
});

app.get('/api/db/health', requireAuth, requireAdmin, async (req, res) => {
    try {
        const snapshot = getHealthSnapshot();
        let persistenceDiagnostics = {
            driver: USE_PRISMA_PERSISTENCE ? 'prisma' : 'sqlite-kv'
        };

        if (USE_PRISMA_PERSISTENCE) {
            persistenceDiagnostics = {
                ...persistenceDiagnostics,
                ...(await getPrismaDiagnostics())
            };
        }

        return res.json({
            ok: true,
            database: snapshot,
            diagnostics: {
                baselineRecords: baselineRecordStore.size,
                activeProfiles: USE_PRISMA_PERSISTENCE
                    ? Number(persistenceDiagnostics.activeProfiles || 0)
                    : personalizationStore.size,
                activeUsers: USE_PRISMA_PERSISTENCE
                    ? Number(persistenceDiagnostics.activeUsers || 0)
                    : authUserStore.size,
                attemptBuckets: USE_PRISMA_PERSISTENCE
                    ? Number(persistenceDiagnostics.attemptBuckets || 0)
                    : attemptStore.size,
                incompleteSessions: USE_PRISMA_PERSISTENCE
                    ? Number(persistenceDiagnostics.incompleteSessions || 0)
                    : incompleteSessionStore.size,
                persistence: persistenceDiagnostics
            }
        });
    } catch (error) {
        return res.status(500).json({
            ok: false,
            message: error.message || 'Database diagnostics unavailable.'
        });
    }
});

app.get('/mock/:examId', (req, res) => {
    const examId = toSafeString(req.params?.examId).toLowerCase();
    if (!examId || !examById.has(examId)) {
        return res.redirect('/');
    }

    return res.sendFile(path.join(FRONTEND_DIR, 'mocked-test.html'));
});

app.get('/all-exams', (req, res) => {
    return res.sendFile(path.join(FRONTEND_DIR, 'all-exams.html'));
});

app.get('/test-series', (req, res) => {
    return res.sendFile(path.join(FRONTEND_DIR, 'test-series.html'));
});

app.get('/chapter-wise', (req, res) => {
    return res.sendFile(path.join(FRONTEND_DIR, 'chapter-wise.html'));
});

app.get('/pyq-questions', (req, res) => {
    return res.sendFile(path.join(FRONTEND_DIR, 'pyq-questions.html'));
});

app.get('/analysis', (req, res) => {
    return res.sendFile(path.join(FRONTEND_DIR, 'analysis.html'));
});

app.use('/assets', express.static(ASSET_DATA_DIR));
app.use(express.static(FRONTEND_DIR));
app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
    const message = err && err.message ? err.message : 'Unexpected server error';
    res.status(500).json({ message });
});

if (require.main === module) {
    app.listen(PORT, async () => {
        try {
            await ensureDemoUserRecord();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn(`[auth] demo-user bootstrap at startup failed: ${error.message || 'unknown-error'}`);
        }

        logStartupDiagnostics();
        scheduleNightlyBackupRotation();
        // eslint-disable-next-line no-console
        console.log(`Mockly local server is running at http://localhost:${PORT}`);
    });
}

module.exports = {
    app,
    db,
    EXAMS,
    calculateAssessment,
    defaultPersonalizationProfile,
    sanitizeProfile,
    sanitizePreferences,
    sanitizeAttemptPayload,
    buildDashboardPayload,
    getValidatedPaperPayload,
    normalizeLanguageKey,
    getHealthSnapshot
};
