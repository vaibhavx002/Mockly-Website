(function () {
    const API_BASE = String(window.MOCKLY_API_BASE || '/api');
    const AUTH_SESSION_API_ENDPOINT = `${API_BASE}/auth/session`;
    const PAPER_PERFORMANCE_API_ENDPOINT = `${API_BASE}/users/paper-performance`;
    const PAPER_ANALYSIS_API_ENDPOINT = `${API_BASE}/users/paper-analysis`;

    const state = {
        examId: '',
        subjectId: '',
        chapterId: '',
        topicId: '',
        exams: [],
        subjects: [],
        stats: { subjectCount: 0, chapterCount: 0, topicCount: 0 },
        chapterTests: [],
        paperPerformanceByKey: new Map(),
        isAuthenticated: false
    };

    const chapterExam = document.getElementById('chapter-exam');
    const chapterSubject = document.getElementById('chapter-subject');
    const chapterChapter = document.getElementById('chapter-chapter');
    const chapterTopic = document.getElementById('chapter-topic');
    const chapterStatus = document.getElementById('chapter-status');
    const chapterGrid = document.getElementById('chapter-grid');
    const chapterEmpty = document.getElementById('chapter-empty');
    const chapterTestsSection = document.getElementById('chapter-tests-section');
    const chapterTestsStatus = document.getElementById('chapter-tests-status');
    const chapterTestsGrid = document.getElementById('chapter-tests-grid');
    const chapterTestsEmpty = document.getElementById('chapter-tests-empty');

    const toSafeString = (value) => String(value || '').trim();
    const normalizeId = (value) => toSafeString(value).toLowerCase();
    const buildPaperKey = (examId, paperId) => `${normalizeId(examId)}::${normalizeId(paperId)}`;
    const buildAnalysisLink = ({ examId, paperId, title, source }) => {
        const safeExamId = toSafeString(examId);
        const safePaperId = toSafeString(paperId);
        if (!safeExamId || !safePaperId) return '/analysis';

        const url = new URL('/analysis', window.location.origin);
        url.searchParams.set('examId', safeExamId);
        url.searchParams.set('paperId', safePaperId);
        if (toSafeString(title)) {
            url.searchParams.set('title', toSafeString(title));
        }
        if (toSafeString(source)) {
            url.searchParams.set('source', toSafeString(source));
        }

        return `${url.pathname}${url.search}`;
    };

    const formatMarks = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '--';
        const fixed = Number(numeric.toFixed(2));
        return Number.isInteger(fixed) ? String(fixed) : fixed.toFixed(2).replace(/\.?0+$/, '');
    };

    const formatPercent = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '--';
        return `${numeric.toFixed(1)}%`;
    };

    const formatDurationShort = (secondsValue) => {
        const totalSeconds = Math.max(0, Math.floor(Number(secondsValue) || 0));
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const setSelectOptions = (element, options, emptyLabel) => {
        if (!element) return;

        const list = Array.isArray(options) ? options : [];
        element.innerHTML = '';

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = emptyLabel;
        element.appendChild(emptyOption);

        list.forEach((item) => {
            const option = document.createElement('option');
            option.value = normalizeId(item.id);
            option.textContent = toSafeString(item.name) || option.value;
            element.appendChild(option);
        });
    };

    const getSelectedSubject = () => {
        return state.subjects.find((item) => normalizeId(item.subjectId) === state.subjectId) || null;
    };

    const getSelectedChapter = () => {
        const subject = getSelectedSubject();
        if (!subject) return null;

        const chapters = Array.isArray(subject.chapters) ? subject.chapters : [];
        return chapters.find((item) => normalizeId(item.chapterId) === state.chapterId) || null;
    };

    const syncHierarchyFilters = () => {
        const subjectOptions = state.subjects.map((subject) => ({
            id: subject.subjectId,
            name: subject.name
        }));
        setSelectOptions(chapterSubject, subjectOptions, 'Subject: All');
        chapterSubject.value = state.subjectId;

        const selectedSubject = getSelectedSubject();
        const chapterOptions = selectedSubject
            ? (Array.isArray(selectedSubject.chapters) ? selectedSubject.chapters : []).map((chapter) => ({
                id: chapter.chapterId,
                name: chapter.name
            }))
            : [];
        setSelectOptions(chapterChapter, chapterOptions, 'Chapter: All');
        chapterChapter.value = state.chapterId;

        const selectedChapter = getSelectedChapter();
        const topicOptions = selectedChapter
            ? (Array.isArray(selectedChapter.topics) ? selectedChapter.topics : []).map((topic) => ({
                id: topic.topicId,
                name: topic.name
            }))
            : [];
        setSelectOptions(chapterTopic, topicOptions, 'Topic: All');
        chapterTopic.value = state.topicId;

        chapterSubject.disabled = !state.subjects.length;
        chapterChapter.disabled = !chapterOptions.length;
        chapterTopic.disabled = !topicOptions.length;
    };

    const syncUrl = () => {
        const url = new URL(window.location.href);

        if (state.examId) {
            url.searchParams.set('exam', state.examId);
        } else {
            url.searchParams.delete('exam');
        }

        if (state.subjectId) {
            url.searchParams.set('subject', state.subjectId);
        } else {
            url.searchParams.delete('subject');
        }

        if (state.chapterId) {
            url.searchParams.set('chapter', state.chapterId);
        } else {
            url.searchParams.delete('chapter');
        }

        if (state.topicId) {
            url.searchParams.set('topic', state.topicId);
        } else {
            url.searchParams.delete('topic');
        }

        window.history.replaceState({}, '', url.toString());
    };

    const readUrl = () => {
        const params = new URLSearchParams(window.location.search);
        state.examId = normalizeId(params.get('exam'));
        state.subjectId = normalizeId(params.get('subject'));
        state.chapterId = normalizeId(params.get('chapter'));
        state.topicId = normalizeId(params.get('topic'));
    };

    const buildMockLaunchLink = (examId, paperId) => {
        const safeExamId = normalizeId(examId);
        const safePaperId = normalizeId(paperId);
        if (!safeExamId) return '/#test';
        if (!safePaperId) return '/mock/' + encodeURIComponent(safeExamId);
        return '/mock/' + encodeURIComponent(safeExamId) + '?paperId=' + encodeURIComponent(safePaperId);
    };

    const setChapterFiltersAndLoadTests = ({ subjectId = '', chapterId = '', topicId = '' }) => {
        state.subjectId = normalizeId(subjectId);
        state.chapterId = normalizeId(chapterId);
        state.topicId = normalizeId(topicId);
        syncHierarchyFilters();
        render();
        syncUrl();
        void loadChapterTests({ scrollIntoView: true });
    };

    const hydrateAuthSession = async () => {
        try {
            const response = await fetch(AUTH_SESSION_API_ENDPOINT, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                state.isAuthenticated = false;
                return;
            }

            const payload = await response.json();
            state.isAuthenticated = Boolean(payload?.authenticated && payload?.user?.email);
        } catch (error) {
            state.isAuthenticated = false;
        }
    };

    const loadPaperPerformance = async () => {
        state.paperPerformanceByKey = new Map();

        if (!state.isAuthenticated || !state.examId) {
            return;
        }

        try {
            const url = new URL(PAPER_PERFORMANCE_API_ENDPOINT, window.location.origin);
            url.searchParams.set('target', state.examId);

            const response = await fetch(url.toString(), {
                method: 'GET',
                credentials: 'same-origin',
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    state.isAuthenticated = false;
                }
                return;
            }

            const payload = await response.json();
            const items = Array.isArray(payload?.items) ? payload.items : [];

            items.forEach((item) => {
                const key = buildPaperKey(item?.examId, item?.paperId);
                if (!key) return;
                state.paperPerformanceByKey.set(key, item);
            });
        } catch (error) {
            // Keep cards usable without performance metrics on transient failures.
        }
    };

    const getCardPerformanceMarkup = (examId, paperId) => {
        const key = buildPaperKey(examId, paperId);
        const performance = state.paperPerformanceByKey.get(key);

        if (!state.isAuthenticated) {
            return '<div class="chapter-test-performance-note">Log in to track marks and cutoff progress.</div>';
        }

        if (!performance) {
            return '<div class="chapter-test-performance-note">Performance sync in progress...</div>';
        }

        const userScore = Number(performance?.userLatestScore);
        const userMax = Number(performance?.userLatestMaxScore);
        const hasAttempt = Boolean(performance?.hasAttempt && Number.isFinite(userScore) && Number.isFinite(userMax) && userMax > 0);
        const cutoffScore = Number(performance?.cutoffScore);
        const cutoffPercent = Number(performance?.cutoffScorePercent);
        const topperScore = Number(performance?.topperScore);

        const yourMarksText = hasAttempt
            ? `${formatMarks(userScore)} / ${formatMarks(userMax)}`
            : 'Not attempted';
        const cutoffText = Number.isFinite(cutoffScore)
            ? `${formatMarks(cutoffScore)} (${formatPercent(cutoffPercent)})`
            : formatPercent(cutoffPercent);
        const topperText = Number.isFinite(topperScore)
            ? `${formatMarks(topperScore)} (${formatPercent(performance?.topperScorePercent)})`
            : '--';

        return `
            <div class="chapter-test-performance">
                <div class="chapter-test-performance-row"><span>Your Marks</span><strong>${yourMarksText}</strong></div>
                <div class="chapter-test-performance-row"><span>Cutoff</span><strong>${cutoffText}</strong></div>
                <div class="chapter-test-performance-row"><span>Topper</span><strong>${topperText}</strong></div>
            </div>
        `;
    };

    const ensureAnalysisModal = () => {
        let modal = document.getElementById('chapter-analysis-modal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'chapter-analysis-modal';
        modal.className = 'chapter-analysis-modal';
        modal.hidden = true;
        modal.innerHTML = `
            <div class="chapter-analysis-dialog" role="dialog" aria-modal="true" aria-labelledby="chapter-analysis-title">
                <div class="chapter-analysis-head">
                    <h3 id="chapter-analysis-title">Mock Analysis</h3>
                    <button type="button" class="chapter-analysis-close" data-action="close-analysis" aria-label="Close analysis">x</button>
                </div>
                <div id="chapter-analysis-body" class="chapter-analysis-body"></div>
            </div>
        `;

        modal.addEventListener('click', (event) => {
            if (event.target === modal || event.target?.closest('[data-action="close-analysis"]')) {
                modal.hidden = true;
            }
        });

        document.body.appendChild(modal);
        return modal;
    };

    const renderAnalysisPayload = (payload, testTitle) => {
        const safeTitle = toSafeString(testTitle) || 'Selected Mock';
        const hasAttempt = Boolean(payload?.hasAttempt);
        const benchmark = payload?.benchmark || {};
        const latestAttempt = payload?.latestAttempt || null;
        const comparison = payload?.comparison || {};
        const briefAnalysis = Array.isArray(payload?.briefAnalysis) ? payload.briefAnalysis : [];
        const questionRows = Array.isArray(payload?.questionTimeComparison) ? payload.questionTimeComparison : [];

        const noAttemptMarkup = `
            <div class="chapter-analysis-empty">
                <h4>No Attempt Yet</h4>
                <p>Start this mock once. Analysis will appear here with section insights, topper comparison, and per-question pacing.</p>
                <div class="chapter-analysis-grid">
                    <article><span>Current Cutoff</span><strong>${formatPercent(benchmark?.cutoffScorePercent)}</strong></article>
                    <article><span>Topper Score</span><strong>${Number.isFinite(Number(benchmark?.topperScore)) ? formatMarks(benchmark.topperScore) : '--'}</strong></article>
                    <article><span>Attempts</span><strong>${Math.max(0, Number(benchmark?.attemptCount || 0))}</strong></article>
                </div>
            </div>
        `;

        const summaryMarkup = hasAttempt
            ? `
                <div class="chapter-analysis-grid">
                    <article><span>Your Score</span><strong>${formatMarks(latestAttempt?.score)} / ${formatMarks(latestAttempt?.maxScore)}</strong></article>
                    <article><span>Cutoff</span><strong>${Number.isFinite(Number(benchmark?.cutoffScore)) ? formatMarks(benchmark.cutoffScore) : '--'} (${formatPercent(benchmark?.cutoffScorePercent)})</strong></article>
                    <article><span>Topper</span><strong>${Number.isFinite(Number(benchmark?.topperScore)) ? formatMarks(benchmark.topperScore) : '--'} (${formatPercent(benchmark?.topperScorePercent)})</strong></article>
                    <article><span>Time Gap vs Topper</span><strong>${Number.isFinite(Number(comparison?.timeGapVsTopperSeconds)) ? formatDurationShort(Math.abs(Number(comparison.timeGapVsTopperSeconds))) : '--'}</strong></article>
                </div>
            `
            : noAttemptMarkup;

        const insightsMarkup = briefAnalysis.length
            ? `<ul class="chapter-analysis-insights">${briefAnalysis.map((item) => `<li>${toSafeString(item)}</li>`).join('')}</ul>`
            : '<p class="chapter-analysis-muted">No brief analysis available yet.</p>';

        const questionTableMarkup = questionRows.length
            ? `
                <div class="chapter-analysis-table-wrap">
                    <table class="chapter-analysis-table">
                        <thead>
                            <tr>
                                <th>Q No.</th>
                                <th>Status</th>
                                <th>Your Time</th>
                                <th>Avg Time</th>
                                <th>Topper Avg</th>
                                <th>Delta vs Avg</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${questionRows.map((row) => {
                                const delta = Number(row?.deltaVsAverageSeconds);
                                const deltaText = Number.isFinite(delta)
                                    ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}s`
                                    : '--';
                                const deltaClass = Number.isFinite(delta)
                                    ? (delta > 0 ? 'slow' : 'fast')
                                    : 'neutral';

                                return `
                                    <tr>
                                        <td>${Math.max(1, Number(row?.questionNumber || 0))}</td>
                                        <td>${toSafeString(row?.status || 'not-visited')}</td>
                                        <td>${formatDurationShort(Number(row?.userTimeSeconds || 0))}</td>
                                        <td>${Number.isFinite(Number(row?.averageTimeSeconds)) ? formatDurationShort(Number(row.averageTimeSeconds)) : '--'}</td>
                                        <td>${Number.isFinite(Number(row?.topperAverageTimeSeconds)) ? formatDurationShort(Number(row.topperAverageTimeSeconds)) : '--'}</td>
                                        <td><span class="chapter-analysis-delta ${deltaClass}">${deltaText}</span></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `
            : '<p class="chapter-analysis-muted">Per-question time comparison will appear after your next attempt (with question-level timing).</p>';

        return `
            <div class="chapter-analysis-title-block">
                <h4>${safeTitle}</h4>
                <p>${toSafeString(payload?.examId).toUpperCase()} • ${toSafeString(payload?.paperId)}</p>
            </div>
            ${summaryMarkup}
            <section>
                <h5>Brief Analysis</h5>
                ${insightsMarkup}
            </section>
            <section>
                <h5>Question Time vs Average</h5>
                ${questionTableMarkup}
            </section>
        `;
    };

    const openAnalysisModal = async ({ examId, paperId, title }) => {
        const modal = ensureAnalysisModal();
        const body = document.getElementById('chapter-analysis-body');
        if (!modal || !body) return;

        if (!state.isAuthenticated) {
            body.innerHTML = '<p class="chapter-analysis-muted">Please log in to view detailed analysis.</p>';
            modal.hidden = false;
            return;
        }

        body.innerHTML = '<p class="chapter-analysis-muted">Loading analysis...</p>';
        modal.hidden = false;

        try {
            const url = new URL(PAPER_ANALYSIS_API_ENDPOINT, window.location.origin);
            url.searchParams.set('examId', normalizeId(examId));
            url.searchParams.set('paperId', normalizeId(paperId));

            const response = await fetch(url.toString(), {
                method: 'GET',
                credentials: 'same-origin',
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    state.isAuthenticated = false;
                    body.innerHTML = '<p class="chapter-analysis-muted">Session expired. Log in again to view analysis.</p>';
                    return;
                }

                throw new Error(`Analysis request failed with ${response.status}`);
            }

            const payload = await response.json();
            body.innerHTML = renderAnalysisPayload(payload, title);
        } catch (error) {
            body.innerHTML = '<p class="chapter-analysis-muted">Unable to load analysis right now. Please try again in a moment.</p>';
        }
    };

    const attachTestCardActions = (card, test) => {
        const analysisButton = card.querySelector('[data-action="view-analysis"]');
        if (!analysisButton) return;

        analysisButton.addEventListener('click', () => {
            void openAnalysisModal({
                examId: state.examId,
                paperId: test.paperId,
                title: test.title
            });
        });
    };

    const renderChapterTests = (tests) => {
        if (!chapterTestsGrid || !chapterTestsStatus || !chapterTestsEmpty) return;

        const safeTests = Array.isArray(tests) ? tests : [];
        chapterTestsGrid.innerHTML = '';

        if (!safeTests.length) {
            chapterTestsEmpty.hidden = false;
            return;
        }

        chapterTestsEmpty.hidden = true;

        safeTests.forEach((test) => {
            const title = toSafeString(test.title || test.id || 'Mock Test');
            const difficulty = toSafeString(test.difficulty || 'moderate');
            const languageSupport = Array.isArray(test.languageSupport) ? test.languageSupport.join('/') : 'EN';
            const questionCount = Number(test.questionCount || 0);
            const durationMinutes = Number(test.durationMinutes || 0);
            const attemptCount = Number(test.attemptCount || 0);
            const launchUrl = buildMockLaunchLink(state.examId, test.paperId);
            const analysisUrl = buildAnalysisLink({
                examId: state.examId,
                paperId: test.paperId,
                title,
                source: 'chapter-wise'
            });
            const performanceMarkup = getCardPerformanceMarkup(state.examId, test.paperId);

            const card = document.createElement('article');
            card.className = 'chapter-test-card';
            card.innerHTML = `
                <h3>${title}</h3>
                <div class="chapter-test-meta">
                    <span>${difficulty}</span>
                    <span>${questionCount} Q</span>
                    <span>${durationMinutes} min</span>
                    <span>${languageSupport}</span>
                    <span>${attemptCount} attempts</span>
                </div>
                ${performanceMarkup}
                <div class="chapter-test-actions">
                    <a class="btn btn-primary" href="${launchUrl}">Start Mock</a>
                    <a class="btn btn-outline" href="${analysisUrl}">View Analysis</a>
                </div>
            `;

            chapterTestsGrid.appendChild(card);
            attachTestCardActions(card, test);
        });
    };

    const loadChapterTests = async ({ scrollIntoView = false } = {}) => {
        if (!chapterTestsStatus) return;

        if (!state.examId) {
            chapterTestsStatus.textContent = 'Choose an exam first to load chapter tests.';
            state.chapterTests = [];
            renderChapterTests([]);
            return;
        }

        chapterTestsStatus.textContent = 'Loading chapter tests...';

        try {
            const url = new URL(API_BASE + '/chapter-tests', window.location.origin);
            url.searchParams.set('target', state.examId);
            url.searchParams.set('sort', 'newly-added');
            url.searchParams.set('limit', '12');

            if (state.subjectId) url.searchParams.set('subjectId', state.subjectId);
            if (state.chapterId) url.searchParams.set('chapterId', state.chapterId);
            if (state.topicId) url.searchParams.set('topicId', state.topicId);

            const response = await fetch(url.toString(), {
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Test list request failed with ' + response.status);
            }

            const payload = await response.json();
            const items = Array.isArray(payload.items) ? payload.items : [];
            state.chapterTests = items;

            await loadPaperPerformance();

            const scopeLabel = [state.subjectId, state.chapterId, state.topicId].filter(Boolean).join(' / ') || 'Selected exam';
            chapterTestsStatus.textContent = scopeLabel + ' • ' + items.length + ' test(s) loaded';
            renderChapterTests(items);

            if (scrollIntoView && chapterTestsSection) {
                chapterTestsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } catch (error) {
            chapterTestsStatus.textContent = 'Unable to load tests right now. Please try again in a moment.';
            state.chapterTests = [];
            renderChapterTests([]);
        }
    };

    const render = () => {
        if (!chapterGrid || !chapterStatus || !chapterEmpty) return;

        chapterGrid.innerHTML = '';

        if (!state.examId) {
            chapterStatus.textContent = 'Choose an exam to view chapter-wise practice.';
            chapterEmpty.hidden = false;
            chapterEmpty.textContent = 'Select an exam from the dropdown above.';
            return;
        }

        const selectedExam = state.exams.find((item) => normalizeId(item.id) === state.examId);
        const filteredCards = [];

        state.subjects.forEach((subject) => {
            if (state.subjectId && normalizeId(subject.subjectId) !== state.subjectId) return;

            const chapters = Array.isArray(subject.chapters) ? subject.chapters : [];
            chapters.forEach((chapter) => {
                if (state.chapterId && normalizeId(chapter.chapterId) !== state.chapterId) return;

                const topics = (Array.isArray(chapter.topics) ? chapter.topics : [])
                    .filter((topic) => !state.topicId || normalizeId(topic.topicId) === state.topicId);

                if (!topics.length) return;

                filteredCards.push({ subject, chapter, topics });
            });
        });

        chapterStatus.textContent =
            (selectedExam ? selectedExam.title : state.examId)
            + ' • '
            + state.stats.subjectCount + ' subjects • '
            + state.stats.chapterCount + ' chapters • '
            + state.stats.topicCount + ' topics';

        if (!filteredCards.length) {
            chapterEmpty.hidden = false;
            chapterEmpty.textContent = 'No chapter data found for this filter. Try changing subject or chapter.';
            return;
        }

        chapterEmpty.hidden = true;

        filteredCards.forEach((item) => {
            const card = document.createElement('article');
            card.className = 'chapter-card';
            card.innerHTML = `
                <h3>${toSafeString(item.chapter.name)}</h3>
                <p class="chapter-meta">${toSafeString(item.subject.name)} • ${item.topics.length} topics</p>
                <div class="chapter-topic-list">
                    ${item.topics.map((topic) => `
                        <button type="button" class="chapter-topic-btn" data-action="open-topic-tests" data-subject-id="${toSafeString(item.subject.subjectId)}" data-chapter-id="${toSafeString(item.chapter.chapterId)}" data-topic-id="${toSafeString(topic.topicId)}">${toSafeString(topic.name)}</button>
                    `).join('')}
                </div>
                <div class="chapter-actions">
                    <button type="button" class="btn btn-primary" data-action="open-chapter-tests" data-subject-id="${toSafeString(item.subject.subjectId)}" data-chapter-id="${toSafeString(item.chapter.chapterId)}">Open Chapter Tests</button>
                    <button type="button" class="btn btn-outline" data-action="open-subject-tests" data-subject-id="${toSafeString(item.subject.subjectId)}">Open Subject Tests</button>
                </div>
            `;

            const topicButtons = card.querySelectorAll('[data-action="open-topic-tests"]');
            topicButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    setChapterFiltersAndLoadTests({
                        subjectId: button.getAttribute('data-subject-id'),
                        chapterId: button.getAttribute('data-chapter-id'),
                        topicId: button.getAttribute('data-topic-id')
                    });
                });
            });

            const openChapterTestsButton = card.querySelector('[data-action="open-chapter-tests"]');
            if (openChapterTestsButton) {
                openChapterTestsButton.addEventListener('click', () => {
                    setChapterFiltersAndLoadTests({
                        subjectId: openChapterTestsButton.getAttribute('data-subject-id'),
                        chapterId: openChapterTestsButton.getAttribute('data-chapter-id'),
                        topicId: ''
                    });
                });
            }

            const openSubjectTestsButton = card.querySelector('[data-action="open-subject-tests"]');
            if (openSubjectTestsButton) {
                openSubjectTestsButton.addEventListener('click', () => {
                    setChapterFiltersAndLoadTests({
                        subjectId: openSubjectTestsButton.getAttribute('data-subject-id'),
                        chapterId: '',
                        topicId: ''
                    });
                });
            }

            chapterGrid.appendChild(card);
        });
    };

    const loadChapterwise = async () => {
        state.subjects = [];
        state.stats = { subjectCount: 0, chapterCount: 0, topicCount: 0 };

        if (!state.examId) {
            syncHierarchyFilters();
            render();
            syncUrl();
            return;
        }

        try {
            const response = await fetch(API_BASE + '/chapterwise/' + encodeURIComponent(state.examId), {
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Chapterwise request failed with ' + response.status);
            }

            const payload = await response.json();
            const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];
            state.subjects = subjects;
            state.stats = payload && payload.stats ? payload.stats : state.stats;

            if (!subjects.some((item) => normalizeId(item.subjectId) === state.subjectId)) {
                state.subjectId = '';
                state.chapterId = '';
                state.topicId = '';
            }

            const selectedSubject = getSelectedSubject();
            const chapterList = selectedSubject && Array.isArray(selectedSubject.chapters) ? selectedSubject.chapters : [];
            if (!chapterList.some((item) => normalizeId(item.chapterId) === state.chapterId)) {
                state.chapterId = '';
                state.topicId = '';
            }

            const selectedChapter = getSelectedChapter();
            const topicList = selectedChapter && Array.isArray(selectedChapter.topics) ? selectedChapter.topics : [];
            if (!topicList.some((item) => normalizeId(item.topicId) === state.topicId)) {
                state.topicId = '';
            }
        } catch (error) {
            state.subjects = [];
            state.stats = { subjectCount: 0, chapterCount: 0, topicCount: 0 };
            if (chapterStatus) {
                chapterStatus.textContent = 'Unable to load chapter data right now. Please try again in a moment.';
            }
        }

        syncHierarchyFilters();
        render();
        syncUrl();
    };

    const loadCatalog = async () => {
        try {
            const response = await fetch(API_BASE + '/exam-catalog', {
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Catalog request failed with ' + response.status);
            }

            const payload = await response.json();
            const exams = Array.isArray(payload.exams) ? payload.exams : [];
            state.exams = exams;

            const options = exams.map((item) => ({
                id: item.id,
                name: item.title + (item.isLive === false ? ' (Planned)' : '')
            }));
            setSelectOptions(chapterExam, options, 'Select Exam');

            if (!state.examId || !exams.some((item) => normalizeId(item.id) === state.examId)) {
                state.examId = exams.length ? normalizeId(exams[0].id) : '';
            }

            chapterExam.value = state.examId;
        } catch (error) {
            if (chapterStatus) {
                chapterStatus.textContent = 'Unable to load exam catalog right now.';
            }
        }
    };

    const initEvents = () => {
        chapterExam.addEventListener('change', (event) => {
            state.examId = normalizeId(event.target.value);
            state.subjectId = '';
            state.chapterId = '';
            state.topicId = '';
            void loadChapterwise().then(() => loadChapterTests());
        });

        chapterSubject.addEventListener('change', (event) => {
            state.subjectId = normalizeId(event.target.value);
            state.chapterId = '';
            state.topicId = '';
            syncHierarchyFilters();
            render();
            syncUrl();
            void loadChapterTests();
        });

        chapterChapter.addEventListener('change', (event) => {
            state.chapterId = normalizeId(event.target.value);
            state.topicId = '';
            syncHierarchyFilters();
            render();
            syncUrl();
            void loadChapterTests();
        });

        chapterTopic.addEventListener('change', (event) => {
            state.topicId = normalizeId(event.target.value);
            render();
            syncUrl();
            void loadChapterTests();
        });
    };

    const init = async () => {
        readUrl();
        initEvents();
        await hydrateAuthSession();
        await loadCatalog();
        await loadChapterwise();
        await loadChapterTests();
    };

    void init();
})();
