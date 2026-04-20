const { EXAMS, getValidatedPaperPayload } = require('./server');

const run = () => {
    const failures = [];
    const warnings = [];
    const summary = [];

    EXAMS.forEach((exam) => {
        const examId = String(exam?.id || '').trim().toLowerCase();
        const isLive = exam?.isLive !== false;
        const paperIds = Array.isArray(exam?.paperConfig?.availablePaperIds)
            ? exam.paperConfig.availablePaperIds.map((paperId) => String(paperId || '').trim().toLowerCase()).filter(Boolean)
            : [];

        if (!examId) {
            failures.push('Found exam record with missing id.');
            return;
        }

        if (!paperIds.length) {
            if (isLive) {
                failures.push(`Exam ${examId} has no configured paper ids.`);
            } else {
                warnings.push(`Exam ${examId} is not live and has no configured paper ids yet.`);
            }

            summary.push({
                examId,
                isLive,
                configuredPapers: 0,
                validatedPapers: 0
            });
            return;
        }

        let readyCount = 0;
        paperIds.forEach((paperId) => {
            const validation = getValidatedPaperPayload(examId, paperId, 'en');
            if (!validation.ok) {
                if (isLive) {
                    failures.push(`${examId}/${paperId}: ${validation.message}`);
                } else {
                    warnings.push(`${examId}/${paperId}: skipped for non-live exam (${validation.message})`);
                }
                return;
            }

            readyCount += 1;
        });

        summary.push({
            examId,
            isLive,
            configuredPapers: paperIds.length,
            validatedPapers: readyCount
        });
    });

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ summary, failures, warnings }, null, 2));

    process.exitCode = failures.length ? 1 : 0;
};

run();
