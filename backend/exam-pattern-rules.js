const toSafeString = (value) => String(value || '').trim();

const normalizeSectionRule = (rawSectionRule) => {
    const sectionId = toSafeString(rawSectionRule?.sectionId).toLowerCase();
    const name = toSafeString(rawSectionRule?.name);
    const questionCount = Math.max(0, Number.parseInt(String(rawSectionRule?.questionCount || 0), 10) || 0);

    return {
        sectionId,
        name,
        questionCount
    };
};

const EXAM_PATTERN_RULES = {
    'ssc-cgl': {
        examId: 'ssc-cgl',
        title: 'SSC CGL Tier-I',
        totalQuestions: 100,
        durationMinutes: 60,
        marksPerQuestion: 2,
        negativeMarks: 0.5,
        forcedSectionSequence: false,
        sections: [
            { sectionId: 'reasoning', name: 'General Intelligence & Reasoning', questionCount: 25 },
            { sectionId: 'awareness', name: 'General Awareness', questionCount: 25 },
            { sectionId: 'quant', name: 'Quantitative Aptitude', questionCount: 25 },
            { sectionId: 'english', name: 'English Comprehension', questionCount: 25 }
        ]
    },
    'ssc-chsl': {
        examId: 'ssc-chsl',
        title: 'SSC CHSL Tier-I',
        totalQuestions: 100,
        durationMinutes: 60,
        marksPerQuestion: 2,
        negativeMarks: 0.5,
        forcedSectionSequence: false,
        sections: [
            { sectionId: 'reasoning', name: 'General Intelligence', questionCount: 25 },
            { sectionId: 'awareness', name: 'General Awareness', questionCount: 25 },
            { sectionId: 'quant', name: 'Quantitative Aptitude', questionCount: 25 },
            { sectionId: 'english', name: 'English Language', questionCount: 25 }
        ]
    },
    'rrb-ntpc': {
        examId: 'rrb-ntpc',
        title: 'RRB NTPC CBT-1',
        totalQuestions: 20,
        durationMinutes: 25,
        marksPerQuestion: 1,
        negativeMarks: 0.33,
        forcedSectionSequence: false,
        sections: [
            { sectionId: 'reasoning', name: 'General Intelligence and Reasoning', questionCount: 7 },
            { sectionId: 'awareness', name: 'General Awareness', questionCount: 7 },
            { sectionId: 'math', name: 'Mathematics', questionCount: 6 }
        ]
    },
    'rrb-group-d': {
        examId: 'rrb-group-d',
        title: 'RRB Group D CBT',
        totalQuestions: 20,
        durationMinutes: 18,
        marksPerQuestion: 1,
        negativeMarks: 0.33,
        forcedSectionSequence: false,
        sections: [
            { sectionId: 'math', name: 'Mathematics', questionCount: 5 },
            { sectionId: 'reasoning', name: 'General Intelligence and Reasoning', questionCount: 5 },
            { sectionId: 'science', name: 'General Science', questionCount: 5 },
            { sectionId: 'awareness', name: 'General Awareness and Current Affairs', questionCount: 5 }
        ]
    },
    'upsc-prelims': {
        examId: 'upsc-prelims',
        title: 'UPSC Prelims GS Paper-I',
        totalQuestions: 20,
        durationMinutes: 30,
        marksPerQuestion: 2,
        negativeMarks: 0.66,
        forcedSectionSequence: false,
        sections: [
            { sectionId: 'gs', name: 'General Studies', questionCount: 20 }
        ]
    },
    'upsc-csat': {
        examId: 'upsc-csat',
        title: 'UPSC CSAT',
        totalQuestions: 20,
        durationMinutes: 25,
        marksPerQuestion: 2,
        negativeMarks: 0.66,
        forcedSectionSequence: false,
        sections: [
            { sectionId: 'reasoning', name: 'Logical Reasoning', questionCount: 10 },
            { sectionId: 'aptitude', name: 'Quantitative Aptitude', questionCount: 10 }
        ]
    }
};

const getExamPatternRule = (examId) => {
    const safeExamId = toSafeString(examId).toLowerCase();
    const source = EXAM_PATTERN_RULES[safeExamId];
    if (!source) return null;

    return {
        ...source,
        sections: Array.isArray(source.sections)
            ? source.sections.map(normalizeSectionRule).filter((section) => section.sectionId && section.questionCount > 0)
            : []
    };
};

const listExamPatternRules = () => Object.keys(EXAM_PATTERN_RULES)
    .sort()
    .map((examId) => getExamPatternRule(examId))
    .filter(Boolean);

module.exports = {
    getExamPatternRule,
    listExamPatternRules
};
