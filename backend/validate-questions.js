const fs = require('fs');
const path = require('path');
const { getExamPatternRule } = require('./exam-pattern-rules');

const DATA_DIR = path.join(__dirname, 'data');
const PAPERS_DIR = path.join(DATA_DIR, 'papers');
const QUESTIONS_DIR = path.join(DATA_DIR, 'questions');
const ASSETS_DIR = path.join(DATA_DIR, 'assets');

const REQUIRED_PAPER_FIELDS = [
    'paperId',
    'examId',
    'title',
    'totalQuestions',
    'durationMinutes',
    'marksPerQuestion',
    'maxScore',
    'negativeMarks',
    'sections'
];

const readJsonFileSafe = (filePath) => {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
};

const toSafeString = (value) => String(value || '').trim();

const isNonEmptyText = (value) => toSafeString(value).length > 0;

const normalizeQuestionList = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.questions)) return payload.questions;
    return [];
};

const getQuestionTextAndOptions = (question) => {
    const fallbackText = toSafeString(question?.questionText);
    const fallbackOptions = Array.isArray(question?.options) ? question.options : [];

    const content = question?.content && typeof question.content === 'object'
        ? question.content
        : null;

    const english = content?.en && typeof content.en === 'object'
        ? content.en
        : null;

    const text = toSafeString(english?.questionText) || fallbackText;
    const options = Array.isArray(english?.options)
        ? english.options
        : fallbackOptions;

    return {
        text,
        options: options.map((option) => toSafeString(option))
    };
};

const getLanguageContent = (question, languageCode) => {
    const content = question?.content && typeof question.content === 'object'
        ? question.content
        : null;

    const languagePayload = content?.[languageCode] && typeof content[languageCode] === 'object'
        ? content[languageCode]
        : null;

    return {
        text: toSafeString(languagePayload?.questionText),
        options: Array.isArray(languagePayload?.options)
            ? languagePayload.options.map((option) => toSafeString(option))
            : []
    };
};

const hasStructuredExplanation = (question) => {
    const explanation = question?.explanation;

    if (typeof explanation === 'string') {
        return isNonEmptyText(explanation);
    }

    if (explanation && typeof explanation === 'object') {
        const en = toSafeString(explanation.en);
        const hi = toSafeString(explanation.hi);
        return Boolean(en || hi);
    }

    return false;
};

const validateMediaReferences = (question, failures) => {
    const media = question?.media && typeof question.media === 'object' ? question.media : {};
    const refs = [];

    const qRef = toSafeString(media.questionImageUrl);
    if (qRef) refs.push(qRef);

    const optionRefs = Array.isArray(media.optionImageUrls) ? media.optionImageUrls : [];
    optionRefs.forEach((ref) => {
        const safeRef = toSafeString(ref);
        if (safeRef) refs.push(safeRef);
    });

    refs.forEach((ref) => {
        if (/^https?:\/\//i.test(ref)) {
            return;
        }

        if (!ref.startsWith('/assets/')) {
            failures.push(`Invalid media reference format: ${ref}`);
            return;
        }

        const diskPath = path.join(ASSETS_DIR, ref.replace(/^\/assets\//, '').replace(/\//g, path.sep));
        if (!fs.existsSync(diskPath)) {
            failures.push(`Missing media asset file: ${ref}`);
        }
    });
};

const run = () => {
    const failures = [];
    const warnings = [];
    const summary = {
        papersValidated: 0,
        questionsValidated: 0,
        filesChecked: 0
    };

    const paperFiles = fs.existsSync(PAPERS_DIR)
        ? fs.readdirSync(PAPERS_DIR)
            .filter((name) => name.endsWith('.json') && name.toLowerCase() !== 'index.json')
            .sort()
        : [];

    if (!paperFiles.length) {
        failures.push('No paper metadata files found.');
    }

    paperFiles.forEach((paperFile) => {
        summary.filesChecked += 1;
        const paperPath = path.join(PAPERS_DIR, paperFile);
        const paper = readJsonFileSafe(paperPath);

        if (!paper || typeof paper !== 'object') {
            failures.push(`Invalid paper JSON: ${paperFile}`);
            return;
        }

        REQUIRED_PAPER_FIELDS.forEach((field) => {
            if (paper[field] === undefined || paper[field] === null || (typeof paper[field] === 'string' && !isNonEmptyText(paper[field]))) {
                failures.push(`${paperFile}: missing required field ${field}`);
            }
        });

        const examId = toSafeString(paper.examId).toLowerCase();
        const paperId = toSafeString(paper.paperId).toLowerCase();
        const totalQuestions = Number(paper.totalQuestions);
        const durationMinutes = Number(paper.durationMinutes);
        const marksPerQuestion = Number(paper.marksPerQuestion);
        const maxScore = Number(paper.maxScore);
        const negativeMarks = Number(paper.negativeMarks);
        const sections = Array.isArray(paper.sections) ? paper.sections : [];

        if (!examId || !paperId) {
            failures.push(`${paperFile}: examId/paperId must be non-empty.`);
            return;
        }

        if (paperFile.replace('.json', '').toLowerCase() !== paperId) {
            failures.push(`${paperFile}: file name must match paperId.`);
        }

        if (!Number.isInteger(totalQuestions) || totalQuestions <= 0) {
            failures.push(`${paperFile}: totalQuestions must be a positive integer.`);
        }

        if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
            failures.push(`${paperFile}: durationMinutes must be a positive integer.`);
        }

        if (!Number.isFinite(marksPerQuestion) || marksPerQuestion <= 0) {
            failures.push(`${paperFile}: marksPerQuestion must be a positive number.`);
        }

        if (!Number.isFinite(maxScore) || maxScore <= 0) {
            failures.push(`${paperFile}: maxScore must be a positive number.`);
        }

        if (!Number.isFinite(negativeMarks) || negativeMarks < 0) {
            failures.push(`${paperFile}: negativeMarks must be zero or positive.`);
        }

        const expectedMaxScore = Number((totalQuestions * marksPerQuestion).toFixed(2));
        if (Math.abs(maxScore - expectedMaxScore) > 0.01) {
            failures.push(`${paperFile}: maxScore mismatch. expected=${expectedMaxScore}`);
        }

        if (!sections.length) {
            failures.push(`${paperFile}: sections must be a non-empty array.`);
        }

        const sectionIds = new Set();
        const sectionTotal = sections.reduce((sum, section) => {
            const sectionId = toSafeString(section?.sectionId).toLowerCase();
            const name = toSafeString(section?.name);
            const questionCount = Number(section?.questionCount);

            if (!sectionId || !name || !Number.isInteger(questionCount) || questionCount <= 0) {
                failures.push(`${paperFile}: invalid section entry.`);
                return sum;
            }

            if (sectionIds.has(sectionId)) {
                failures.push(`${paperFile}: duplicate sectionId ${sectionId}.`);
            }
            sectionIds.add(sectionId);

            return sum + questionCount;
        }, 0);

        if (sectionTotal !== totalQuestions) {
            failures.push(`${paperFile}: section totals (${sectionTotal}) must match totalQuestions (${totalQuestions}).`);
        }

        const rule = getExamPatternRule(examId);
        if (!rule) {
            failures.push(`${paperFile}: no exam pattern rule configured for examId=${examId}.`);
        } else {
            if (rule.totalQuestions !== totalQuestions) {
                failures.push(`${paperFile}: totalQuestions does not match exam pattern rule (${rule.totalQuestions}).`);
            }

            if (rule.durationMinutes !== durationMinutes) {
                failures.push(`${paperFile}: durationMinutes does not match exam pattern rule (${rule.durationMinutes}).`);
            }

            if (Math.abs(Number(rule.marksPerQuestion) - marksPerQuestion) > 0.01) {
                failures.push(`${paperFile}: marksPerQuestion does not match exam pattern rule (${rule.marksPerQuestion}).`);
            }

            if (Math.abs(Number(rule.negativeMarks) - negativeMarks) > 0.01) {
                failures.push(`${paperFile}: negativeMarks does not match exam pattern rule (${rule.negativeMarks}).`);
            }

            if (rule.sections.length !== sections.length) {
                failures.push(`${paperFile}: section count does not match exam pattern rule.`);
            } else {
                for (let index = 0; index < rule.sections.length; index += 1) {
                    const ruleSection = rule.sections[index];
                    const paperSection = sections[index] || {};
                    const paperSectionId = toSafeString(paperSection.sectionId).toLowerCase();
                    const paperSectionCount = Number(paperSection.questionCount || 0);

                    if (paperSectionId !== ruleSection.sectionId) {
                        failures.push(`${paperFile}: section order mismatch at index ${index + 1}. expected=${ruleSection.sectionId}`);
                    }

                    if (paperSectionCount !== Number(ruleSection.questionCount)) {
                        failures.push(`${paperFile}: section count mismatch for ${ruleSection.sectionId}. expected=${ruleSection.questionCount}`);
                    }
                }
            }
        }

        const questionFilePath = path.join(QUESTIONS_DIR, `${paperId}.json`);
        if (!fs.existsSync(questionFilePath)) {
            failures.push(`${paperFile}: question file not found (${paperId}.json).`);
            return;
        }

        summary.filesChecked += 1;
        const questionPayload = readJsonFileSafe(questionFilePath);
        if (!questionPayload || typeof questionPayload !== 'object') {
            failures.push(`${paperId}.json: invalid question payload.`);
            return;
        }

        const payloadExamId = toSafeString(questionPayload.examId).toLowerCase();
        const payloadPaperId = toSafeString(questionPayload.paperId).toLowerCase();
        if (payloadExamId && payloadExamId !== examId) {
            failures.push(`${paperId}.json: root examId mismatch.`);
        }
        if (payloadPaperId && payloadPaperId !== paperId) {
            failures.push(`${paperId}.json: root paperId mismatch.`);
        }

        const questions = normalizeQuestionList(questionPayload);
        if (!questions.length) {
            failures.push(`${paperId}.json: questions array is empty.`);
            return;
        }

        if (questions.length !== totalQuestions) {
            failures.push(`${paperId}.json: question count (${questions.length}) must match totalQuestions (${totalQuestions}).`);
        }

        const questionIds = new Set();
        const questionSectionCounts = {};

        questions.forEach((question, index) => {
            summary.questionsValidated += 1;
            const rowPrefix = `${paperId}.json#${index + 1}`;

            if (!question || typeof question !== 'object') {
                failures.push(`${rowPrefix}: question must be an object.`);
                return;
            }

            const questionId = toSafeString(question.questionId);
            const questionExamId = toSafeString(question.examId).toLowerCase();
            const questionPaperId = toSafeString(question.paperId).toLowerCase();
            const sectionId = toSafeString(question.sectionId).toLowerCase();
            const correctOptionIndex = Number(question.correctOptionIndex);

            if (!questionId) {
                failures.push(`${rowPrefix}: missing questionId.`);
            } else if (questionIds.has(questionId)) {
                failures.push(`${rowPrefix}: duplicate questionId ${questionId}.`);
            }
            questionIds.add(questionId);

            if (questionExamId !== examId) {
                failures.push(`${rowPrefix}: examId mismatch.`);
            }

            if (questionPaperId !== paperId) {
                failures.push(`${rowPrefix}: paperId mismatch.`);
            }

            if (!sectionIds.has(sectionId)) {
                failures.push(`${rowPrefix}: invalid sectionId ${sectionId}.`);
            }
            questionSectionCounts[sectionId] = Number(questionSectionCounts[sectionId] || 0) + 1;

            const normalized = getQuestionTextAndOptions(question);
            if (!isNonEmptyText(normalized.text)) {
                failures.push(`${rowPrefix}: missing question text.`);
            }

            if (!Array.isArray(normalized.options) || normalized.options.length !== 4 || normalized.options.some((option) => !isNonEmptyText(option))) {
                failures.push(`${rowPrefix}: options must contain exactly 4 non-empty values.`);
            }

            if (examId === 'ssc-cgl') {
                const englishPayload = getLanguageContent(question, 'en');
                const hasEnglish = isNonEmptyText(englishPayload.text)
                    && englishPayload.options.length === 4
                    && englishPayload.options.every((option) => isNonEmptyText(option));

                if (!hasEnglish) {
                    failures.push(`${rowPrefix}: SSC CGL requires English questionText and 4 English options.`);
                }

                if (sectionId !== 'english') {
                    const hindiPayload = getLanguageContent(question, 'hi');
                    const hasHindi = isNonEmptyText(hindiPayload.text)
                        && hindiPayload.options.length === 4
                        && hindiPayload.options.every((option) => isNonEmptyText(option));

                    if (!hasHindi) {
                        failures.push(`${rowPrefix}: SSC CGL non-English sections require Hindi questionText and 4 Hindi options.`);
                    }
                }
            }

            if (!Number.isInteger(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3) {
                failures.push(`${rowPrefix}: correctOptionIndex must be in range 0..3.`);
            }

            if (!hasStructuredExplanation(question)) {
                warnings.push(`${rowPrefix}: explanation missing (fallback explanation will be used).`);
            }

            validateMediaReferences(question, failures);
        });

        sections.forEach((section) => {
            const sectionId = toSafeString(section.sectionId).toLowerCase();
            const expected = Number(section.questionCount || 0);
            const actual = Number(questionSectionCounts[sectionId] || 0);
            if (actual !== expected) {
                failures.push(`${paperId}.json: section question count mismatch for ${sectionId}. expected=${expected}, actual=${actual}`);
            }
        });

        summary.papersValidated += 1;
    });

    const output = {
        ok: failures.length === 0,
        summary,
        failures,
        warnings
    };

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(output, null, 2));
    process.exitCode = failures.length ? 1 : 0;
};

run();
