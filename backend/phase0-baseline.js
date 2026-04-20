const fs = require('fs/promises');
const path = require('path');

const { app, EXAMS } = require('./server');

const BASELINE_OUTPUT_DIR = path.join(__dirname, 'baseline');
const REQUEST_TIMEOUT_MS = 8000;

const withTimeout = async (promise, timeoutMs = REQUEST_TIMEOUT_MS) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`Request timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        clearTimeout(timeoutId);
    }
};

const fetchJson = async (url, options = {}) => {
    const response = await withTimeout(fetch(url, options));
    const isJson = String(response.headers.get('content-type') || '').toLowerCase().includes('application/json');
    const payload = isJson ? await response.json() : null;
    return {
        ok: response.ok,
        status: response.status,
        payload
    };
};

const createAttemptPayload = (examId, paperId) => ({
    examId,
    paperId,
    score: 18,
    maxScore: 40,
    correct: 10,
    wrong: 4,
    unanswered: 6,
    durationMinutes: 20,
    timeTakenSeconds: 900,
    launchMode: 'dynamic'
});

const run = async () => {
    const server = app.listen(0);
    const now = new Date();
    const timestampIso = now.toISOString();

    const baseline = {
        timestamp: timestampIso,
        nodeVersion: process.version,
        service: 'mockly-local-api',
        checks: {},
        risks: {},
        paperProfiles: [],
        notes: []
    };

    try {
        await new Promise((resolve, reject) => {
            server.once('listening', resolve);
            server.once('error', reject);
        });

        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        const baseUrl = `http://127.0.0.1:${port}`;

        const firstExam = EXAMS[0] || null;
        const fallbackExamId = String(firstExam?.id || '').trim().toLowerCase();
        const fallbackPaperId = String(firstExam?.paperConfig?.defaultPaperId || '').trim().toLowerCase();

        baseline.checks.health = await fetchJson(`${baseUrl}/api/health`);
        baseline.checks.exams = await fetchJson(`${baseUrl}/api/exams`);

        const launch = await fetchJson(`${baseUrl}/api/mocks/launch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                examId: fallbackExamId,
                paperId: fallbackPaperId,
                userEmail: 'phase0-user@mockly.in'
            })
        });
        baseline.checks.launch = launch;

        const signupEmail = `phase0-${Date.now()}@mockly.in`;
        baseline.checks.authSignup = await fetchJson(`${baseUrl}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Phase Zero User',
                email: signupEmail,
                phone: '9876543210',
                password: 'phase0pass'
            })
        });

        baseline.checks.authLogin = await fetchJson(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: signupEmail,
                password: 'phase0pass'
            })
        });

        const launchPaperId = String(launch?.payload?.paperId || fallbackPaperId).trim().toLowerCase();
        const launchExamId = String(launch?.payload?.examId || fallbackExamId).trim().toLowerCase();

        baseline.checks.attemptWriteWithoutToken = await fetchJson(`${baseUrl}/api/users/attempts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'victim-user@mockly.in',
                attempt: createAttemptPayload(launchExamId, launchPaperId)
            })
        });

        baseline.checks.dashboardReadByEmailWithoutToken = await fetchJson(
            `${baseUrl}/api/users/dashboard?email=${encodeURIComponent('victim-user@mockly.in')}`
        );

        baseline.checks.incompleteSessionWriteWithoutToken = await fetchJson(`${baseUrl}/api/users/incomplete-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'victim-user@mockly.in',
                session: {
                    examId: launchExamId,
                    paperId: launchPaperId,
                    sessionId: 'phase0',
                    startUrl: `/mock/${launchExamId}?paperId=${launchPaperId}&session=phase0`,
                    resumeUrl: `/mock/${launchExamId}?paperId=${launchPaperId}&session=phase0&resume=1`,
                    totalQuestions: 20,
                    currentQuestionIndex: 2,
                    currentSectionIndex: 0,
                    durationMinutes: 20,
                    timerSeconds: 1000,
                    progressPercent: 10,
                    selectedLanguage: 'en',
                    questionStates: [],
                    sectionTimeById: {}
                }
            })
        });

        const mockWindow = await withTimeout(fetch(`${baseUrl}/mock/${encodeURIComponent(launchExamId)}?paperId=${encodeURIComponent(launchPaperId)}`));
        const mockHtml = await mockWindow.text();
        baseline.checks.mockWindow = {
            ok: mockWindow.ok,
            status: mockWindow.status,
            autoSubmitHookFound: mockHtml.includes('submitTest({ autoSubmitted: true });'),
            resultBreakdownFound: mockHtml.includes('Section-wise Breakdown'),
            resultExplanationFound: mockHtml.includes('<th>Explanation</th>')
        };

        for (const exam of EXAMS) {
            const examId = String(exam?.id || '').trim().toLowerCase();
            if (!examId) continue;

            const papersResponse = await fetchJson(`${baseUrl}/api/papers/${encodeURIComponent(examId)}`);
            const firstPaper = Array.isArray(papersResponse.payload?.papers)
                ? papersResponse.payload.papers[0]
                : null;

            baseline.paperProfiles.push({
                examId,
                title: String(firstPaper?.title || exam?.title || ''),
                totalQuestions: Number(firstPaper?.totalQuestions || 0),
                durationMinutes: Number(firstPaper?.durationMinutes || 0),
                marksPerQuestion: Number(firstPaper?.marksPerQuestion || 0),
                negativeMarks: Number(firstPaper?.negativeMarks || 0)
            });
        }

        const serverSource = await fs.readFile(path.join(__dirname, 'server.js'), 'utf8');
        baseline.risks.inMemoryStoreDetected =
            /const\s+personalizationStore\s*=\s*new\s+Map\(/.test(serverSource)
            && /const\s+attemptStore\s*=\s*new\s+Map\(/.test(serverSource)
            && /const\s+authUserStore\s*=\s*new\s+Map\(/.test(serverSource);
        baseline.risks.unsaltedSha256PasswordHashDetected = /const\s+hashPassword\s*=\s*\([^)]*\)\s*=>\s*crypto\.createHash\('sha256'\)/.test(serverSource);
        baseline.risks.tokenAuthRoutesDetected =
            /\/api\/auth\/refresh/.test(serverSource)
            || /\/api\/auth\/logout/.test(serverSource)
            || /Authorization/i.test(serverSource);

        baseline.risks.emailScopedAttemptWriteWithoutAuth = Boolean(baseline.checks.attemptWriteWithoutToken.ok);
        baseline.risks.emailScopedDashboardReadWithoutAuth = Boolean(baseline.checks.dashboardReadByEmailWithoutToken.ok);
        baseline.risks.emailScopedIncompleteSessionWriteWithoutAuth = Boolean(baseline.checks.incompleteSessionWriteWithoutToken.ok);

        baseline.notes.push('Phase 0 baseline captures current behavior before security and persistence hardening.');
        baseline.notes.push('Security risk flags being true here are expected pre-hardening and should flip in later phases.');

        await fs.mkdir(BASELINE_OUTPUT_DIR, { recursive: true });

        const latestPath = path.join(BASELINE_OUTPUT_DIR, 'phase0-baseline-latest.json');
        const snapshotName = `phase0-baseline-${timestampIso.replace(/[:.]/g, '-')}.json`;
        const snapshotPath = path.join(BASELINE_OUTPUT_DIR, snapshotName);

        const content = `${JSON.stringify(baseline, null, 2)}\n`;
        await fs.writeFile(latestPath, content, 'utf8');
        await fs.writeFile(snapshotPath, content, 'utf8');

        // eslint-disable-next-line no-console
        console.log(JSON.stringify({
            ok: true,
            latest: latestPath,
            snapshot: snapshotPath,
            summary: {
                inMemoryStoreDetected: baseline.risks.inMemoryStoreDetected,
                unsaltedSha256PasswordHashDetected: baseline.risks.unsaltedSha256PasswordHashDetected,
                emailScopedAttemptWriteWithoutAuth: baseline.risks.emailScopedAttemptWriteWithoutAuth,
                emailScopedDashboardReadWithoutAuth: baseline.risks.emailScopedDashboardReadWithoutAuth,
                emailScopedIncompleteSessionWriteWithoutAuth: baseline.risks.emailScopedIncompleteSessionWriteWithoutAuth,
                autoSubmitHookFound: baseline.checks.mockWindow.autoSubmitHookFound,
                resultBreakdownFound: baseline.checks.mockWindow.resultBreakdownFound,
                resultExplanationFound: baseline.checks.mockWindow.resultExplanationFound
            }
        }, null, 2));

        process.exitCode = 0;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(JSON.stringify({ ok: false, message: error.message || 'Phase 0 baseline failed' }, null, 2));
        process.exitCode = 1;
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
};

run();
