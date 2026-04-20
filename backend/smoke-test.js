const { app, EXAMS } = require('./server');

const resolveSmokeExam = () => {
    const requestedExamId = String(process.env.MOCKLY_SMOKE_EXAM_ID || 'rrb-group-d').trim().toLowerCase();
    const exam = EXAMS.find((item) => String(item?.id || '').trim().toLowerCase() === requestedExamId)
        || EXAMS.find((item) => item.id === 'rrb-group-d')
        || EXAMS[0];

    const expectedPaperId = String(exam?.paperConfig?.defaultPaperId || '').trim().toLowerCase();

    return {
        examId: String(exam?.id || '').trim().toLowerCase(),
        examTitle: String(exam?.title || '').trim(),
        expectedPaperId
    };
};

const run = async () => {
    const smokeExam = resolveSmokeExam();
    const server = app.listen(0);

    try {
        await new Promise((resolve, reject) => {
            server.once('listening', resolve);
            server.once('error', reject);
        });

        const port = server.address().port;
        const baseUrl = `http://127.0.0.1:${port}`;

        const examsResponse = await fetch(`${baseUrl}/api/exams`);
        const examsJson = await examsResponse.json();

        const recommendationResponse = await fetch(`${baseUrl}/api/assessment/recommend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                answers: {
                    target: 'rrb',
                    stage: 'beginner',
                    time: 'low',
                    focus: 'speed'
                }
            })
        });
        const recommendationJson = await recommendationResponse.json();

        const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'demo@mockly.in',
                password: 'demo1234'
            })
        });
        const loginJson = await loginResponse.json();
        const accessToken = String(loginJson?.accessToken || '').trim();
        const authHeaders = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
        };

        const launchResponse = await fetch(`${baseUrl}/api/mocks/launch`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                examId: smokeExam.examId,
                paperId: smokeExam.expectedPaperId
            })
        });
        const launchJson = await launchResponse.json();

        const examDetailsResponse = await fetch(`${baseUrl}/api/exams/${encodeURIComponent(smokeExam.examId)}`);
        const examDetailsJson = await examDetailsResponse.json();

        const papersResponse = await fetch(`${baseUrl}/api/papers/${encodeURIComponent(smokeExam.examId)}`);
        const papersJson = await papersResponse.json();

        const questionsResponse = await fetch(`${baseUrl}/api/questions/${encodeURIComponent(smokeExam.examId)}/${encodeURIComponent(smokeExam.expectedPaperId)}?lang=en`);
        const questionsJson = await questionsResponse.json();

        const resolvedStartUrl = String(launchJson?.startUrl || '').trim();
        const testWindowResponse = await fetch(`${baseUrl}${resolvedStartUrl || '/mock/rrb-group-d'}`);
        const testWindowHtml = await testWindowResponse.text();

        const homeResponse = await fetch(`${baseUrl}/`);
        const homeHtml = await homeResponse.text();

        const scriptResponse = await fetch(`${baseUrl}/script.js`);
        const scriptSource = await scriptResponse.text();

        const styleResponse = await fetch(`${baseUrl}/style.css`);
        const styleSource = await styleResponse.text();

        const statsResponse = await fetch(`${baseUrl}/api/stats`);
        const statsJson = await statsResponse.json();

        const personalizationUpdateResponse = await fetch(`${baseUrl}/api/users/personalization`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({
                profile: {
                    lastSelectedExamId: smokeExam.examId,
                    lastRecommendedExamId: smokeExam.examId,
                    selectionCountByExam: { [smokeExam.examId]: 3 },
                    launchCountByExam: { [smokeExam.examId]: 2 },
                    recommendationCountByExam: { [smokeExam.examId]: 1 },
                    eventSourceByExam: {
                        [smokeExam.examId]: {
                            selected: { 'exam-card': 2 },
                            launched: { 'start-selected-button': 1 },
                            recommended: { 'assessment-result': 1 }
                        }
                    },
                    preferences: {
                        preferredExamId: smokeExam.examId,
                        preferredLanguage: 'en',
                        weeklyMockTarget: 5,
                        focusArea: 'accuracy'
                    }
                }
            })
        });
        const personalizationUpdateJson = await personalizationUpdateResponse.json();

        const personalizationReadResponse = await fetch(`${baseUrl}/api/users/personalization`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const personalizationReadJson = await personalizationReadResponse.json();

        const attemptCreateResponse = await fetch(`${baseUrl}/api/users/attempts`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                attempt: {
                    examId: smokeExam.examId,
                    paperId: smokeExam.expectedPaperId,
                    score: 18,
                    maxScore: 25,
                    correct: 18,
                    wrong: 5,
                    unanswered: 2,
                    durationMinutes: 30,
                    timeTakenSeconds: 1200
                }
            })
        });
        const attemptCreateJson = await attemptCreateResponse.json();

        const attemptsReadResponse = await fetch(`${baseUrl}/api/users/attempts`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const attemptsReadJson = await attemptsReadResponse.json();

        const dashboardResponse = await fetch(`${baseUrl}/api/users/dashboard`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const dashboardJson = await dashboardResponse.json();

        const healthResponse = await fetch(`${baseUrl}/api/health`);
        const healthJson = await healthResponse.json();

        const output = {
            examsCount: examsJson.count,
            examPaperConfigReady: Array.isArray(examsJson?.exams)
                && examsJson.exams.every((exam) => {
                    const paperConfig = exam?.paperConfig;
                    return Boolean(exam?.id)
                        && Boolean(paperConfig?.defaultPaperId)
                        && Array.isArray(paperConfig?.availablePaperIds)
                        && paperConfig.availablePaperIds.length > 0
                        && Array.isArray(paperConfig?.languageSupport)
                        && paperConfig.languageSupport.length > 0;
                }),
            recommendedExamId: recommendationJson.examId,
            launchMessage: launchJson.message,
            authLoginHealthy: loginResponse.ok
                && Boolean(loginJson?.authenticated)
                && Boolean(accessToken),
            healthOk: healthJson.ok === true,
            profileSynced: Boolean(personalizationUpdateJson?.ok),
            profileLastSelected: String(personalizationReadJson?.profile?.lastSelectedExamId || ''),
            profileSourceSynced: Boolean(personalizationReadJson?.profile?.eventSourceByExam?.[smokeExam.examId]),
            profilePreferencesSynced:
                String(personalizationReadJson?.profile?.preferences?.preferredExamId || '') === smokeExam.examId
                && Number(personalizationReadJson?.profile?.preferences?.weeklyMockTarget || 0) >= 1,
            examDetailsTitle: String(examDetailsJson?.exam?.title || ''),
            launchPaperId: String(launchJson?.paperId || ''),
            launchMode: String(launchJson?.launchMode || ''),
            smokeExamId: smokeExam.examId,
            papersApiReady: papersResponse.ok
                && Number(papersJson?.count) >= 1
                && Array.isArray(papersJson?.papers),
            questionsApiReady: questionsResponse.ok
                && Number(questionsJson?.count) > 0
                && Array.isArray(questionsJson?.questions)
                && String(questionsJson?.paper?.paperId || '') === smokeExam.expectedPaperId,
            mockWindowReachable: testWindowResponse.ok && testWindowHtml.includes('Mockly Test Window'),
            examTrackShellReady: homeResponse.ok
                && homeHtml.includes('id="exam-grid"')
                && homeHtml.includes('id="open-assessment-btn"')
                && homeHtml.includes('id="start-selected-mock-btn"'),
            dashboardShellReady: homeResponse.ok
                && homeHtml.includes('id="dashboard-modal"')
                && homeHtml.includes('id="dashboard-metric-launches"')
                && homeHtml.includes('id="dashboard-metric-attempts"')
                && homeHtml.includes('id="dashboard-recent-activity"')
                && homeHtml.includes('id="dashboard-preferences-form"'),
            trustStripBindingsReady: homeResponse.ok
                && homeHtml.includes('id="trust-aspirants-value"')
                && homeHtml.includes('id="trust-selections-value"')
                && homeHtml.includes('id="trust-rating-value"'),
            examTrackStreamFiltersReady: [
                'data-filter="ssc"',
                'data-filter="rrb"',
                'data-filter="upsc"'
            ].every((token) => homeHtml.includes(token)),
            filterEmptyStateWired: scriptResponse.ok
                && scriptSource.includes('renderFilterEmptyState')
                && scriptSource.includes('No exams found for'),
            sourceTrackingWired: scriptResponse.ok
                && scriptSource.includes('eventSourceByExam')
                && scriptSource.includes('launchSource'),
            dashboardBindingsReady: scriptResponse.ok
                && scriptSource.includes('openDashboardModal')
                && scriptSource.includes('dashboardModal')
                && scriptSource.includes('DASHBOARD_HASH'),
            focusVisibleStylesReady: styleResponse.ok
                && styleSource.includes('.chip-btn:focus-visible')
                && styleSource.includes('.exam-card-btn:focus-visible'),
            attemptsApiHealthy: attemptCreateResponse.ok
                && Boolean(attemptCreateJson?.ok)
                && attemptsReadResponse.ok
                && Number(attemptsReadJson?.count || 0) >= 1
                && Array.isArray(attemptsReadJson?.attempts)
                && attemptsReadJson.attempts.some((attempt) => String(attempt?.paperId || '') === smokeExam.expectedPaperId),
            dashboardApiHealthy: dashboardResponse.ok
                && typeof dashboardJson === 'object'
                && dashboardJson !== null
                && String(dashboardJson?.email || '') === 'demo@mockly.in'
                && Number(dashboardJson?.metrics?.totalAttempts || 0) >= 1
                && Array.isArray(dashboardJson?.recentActivity)
                && String(dashboardJson?.profile?.preferences?.preferredExamId || '') === smokeExam.examId,
            statsApiHealthy: statsResponse.ok
                && Number(statsJson?.aspirants) > 0
                && Number(statsJson?.selections) > 0
                && Number(statsJson?.rating) > 0
        };

        // eslint-disable-next-line no-console
        console.log(JSON.stringify(output, null, 2));

        const isValid = output.examsCount >= 6
            && output.examPaperConfigReady
            && Boolean(output.recommendedExamId)
            && Boolean(output.launchMessage)
            && output.authLoginHealthy
            && output.healthOk
            && output.profileSynced
            && output.profileLastSelected === smokeExam.examId
            && output.profileSourceSynced
            && output.profilePreferencesSynced
            && output.examDetailsTitle === smokeExam.examTitle
            && output.launchPaperId === smokeExam.expectedPaperId
            && output.launchMode === 'dynamic'
            && output.papersApiReady
            && output.questionsApiReady
            && output.mockWindowReachable
            && output.examTrackShellReady
            && output.dashboardShellReady
            && output.trustStripBindingsReady
            && output.examTrackStreamFiltersReady
            && output.filterEmptyStateWired
            && output.sourceTrackingWired
            && output.dashboardBindingsReady
            && output.focusVisibleStylesReady
            && output.attemptsApiHealthy
            && output.dashboardApiHealthy
            && output.statsApiHealthy;

        process.exitCode = isValid ? 0 : 1;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error.message || 'Smoke test failed');
        process.exitCode = 1;
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
};

run();
