(function () {
    const API_BASE = String(window.MOCKLY_API_BASE || '/api');
    const AUTH_SESSION_API_ENDPOINT = `${API_BASE}/auth/session`;
    const PAPER_PERFORMANCE_API_ENDPOINT = `${API_BASE}/users/paper-performance`;

    const state = {
        examId: '',
        exams: [],
        papers: [],
        isAuthenticated: false,
        paperPerformanceByKey: new Map()
    };

    const pyqExam = document.getElementById('pyq-exam');
    const pyqStatus = document.getElementById('pyq-status');
    const pyqGrid = document.getElementById('pyq-grid');
    const pyqEmpty = document.getElementById('pyq-empty');

    const toSafeString = (value) => String(value || '').trim();
    const normalizeId = (value) => toSafeString(value).toLowerCase();
    const buildPaperKey = (examId, paperId) => `${normalizeId(examId)}::${normalizeId(paperId)}`;

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
        if (!state.isAuthenticated || !state.examId) return;

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
            // Keep PYQ list usable if performance API fails.
        }
    };

    const getPerformanceMarkup = (paperId) => {
        if (!state.isAuthenticated) {
            return '<div class="pyq-score-note">Log in to track marks and cutoff progress.</div>';
        }

        const performance = state.paperPerformanceByKey.get(buildPaperKey(state.examId, paperId));
        if (!performance) {
            return '<div class="pyq-score-note">Performance sync in progress...</div>';
        }

        const hasAttempt = Boolean(
            performance?.hasAttempt
            && Number.isFinite(Number(performance?.userLatestScore))
            && Number.isFinite(Number(performance?.userLatestMaxScore))
        );
        const yourMarks = hasAttempt
            ? `${formatMarks(performance?.userLatestScore)} / ${formatMarks(performance?.userLatestMaxScore)}`
            : 'Not attempted';
        const cutoffMarks = Number.isFinite(Number(performance?.cutoffScore))
            ? `${formatMarks(performance?.cutoffScore)} (${formatPercent(performance?.cutoffScorePercent)})`
            : formatPercent(performance?.cutoffScorePercent);
        const topperMarks = Number.isFinite(Number(performance?.topperScore))
            ? `${formatMarks(performance?.topperScore)} (${formatPercent(performance?.topperScorePercent)})`
            : '--';

        return `
            <div class="pyq-score-board">
                <div><span>Your Marks</span><strong>${yourMarks}</strong></div>
                <div><span>Cutoff</span><strong>${cutoffMarks}</strong></div>
                <div><span>Topper</span><strong>${topperMarks}</strong></div>
            </div>
        `;
    };

    const setExamOptions = () => {
        if (!pyqExam) return;

        pyqExam.innerHTML = '';
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Select Exam';
        pyqExam.appendChild(emptyOption);

        state.exams.forEach((exam) => {
            const option = document.createElement('option');
            option.value = normalizeId(exam.id);
            option.textContent = toSafeString(exam.title) + (exam.isLive === false ? ' (Planned)' : '');
            pyqExam.appendChild(option);
        });

        pyqExam.value = state.examId;
    };

    const syncUrl = () => {
        const url = new URL(window.location.href);
        if (state.examId) {
            url.searchParams.set('exam', state.examId);
        } else {
            url.searchParams.delete('exam');
        }
        window.history.replaceState({}, '', url.toString());
    };

    const readUrl = () => {
        const params = new URLSearchParams(window.location.search);
        state.examId = normalizeId(params.get('exam'));
    };

    const render = () => {
        if (!pyqGrid || !pyqStatus || !pyqEmpty) return;

        pyqGrid.innerHTML = '';

        if (!state.examId) {
            pyqStatus.textContent = 'Select an exam to view PYQ papers.';
            pyqEmpty.hidden = false;
            pyqEmpty.textContent = 'Choose an exam from the dropdown above.';
            return;
        }

        const selectedExam = state.exams.find((item) => normalizeId(item.id) === state.examId);
        const examTitle = selectedExam ? selectedExam.title : state.examId;

        if (!state.papers.length) {
            pyqStatus.textContent = examTitle + ' • 0 papers available';
            pyqEmpty.hidden = false;
            pyqEmpty.textContent = 'No PYQ papers found for this exam right now.';
            return;
        }

        pyqEmpty.hidden = true;
        pyqStatus.textContent = examTitle + ' • ' + state.papers.length + ' PYQ paper(s) available';

        state.papers.forEach((paper) => {
            const paperId = normalizeId(paper.paperId);
            const launchUrl = '/mock/' + encodeURIComponent(state.examId) + '?paperId=' + encodeURIComponent(paperId);
            const sectionCount = Array.isArray(paper.sections) ? paper.sections.length : 0;
            const performanceMarkup = getPerformanceMarkup(paperId);

            const card = document.createElement('article');
            card.className = 'pyq-card';
            card.innerHTML = `
                <h3>${toSafeString(paper.title) || paperId}</h3>
                <div class="pyq-meta">
                    <span>Paper ID: ${paperId}</span>
                    <span>Questions: ${Number(paper.totalQuestions || 0)}</span>
                    <span>Duration: ${Number(paper.durationMinutes || 0)} mins</span>
                    <span>Sections: ${sectionCount}</span>
                </div>
                ${performanceMarkup}
                <div class="pyq-actions">
                    <a class="btn btn-primary" href="${launchUrl}">Start PYQ Mock</a>
                    <a class="btn btn-outline" href="/test-series?target=${encodeURIComponent(state.examId)}">View Test Series</a>
                </div>
            `;
            pyqGrid.appendChild(card);
        });
    };

    const loadPapers = async () => {
        state.papers = [];

        if (!state.examId) {
            render();
            syncUrl();
            return;
        }

        try {
            const response = await fetch(API_BASE + '/papers/' + encodeURIComponent(state.examId), {
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Papers request failed with ' + response.status);
            }

            const payload = await response.json();
            state.papers = Array.isArray(payload.papers) ? payload.papers : [];
            await loadPaperPerformance();
        } catch (error) {
            state.papers = [];
            if (pyqStatus) {
                pyqStatus.textContent = 'Unable to load PYQ papers right now. Please try again in a moment.';
            }
        }

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

            if (!state.examId || !exams.some((item) => normalizeId(item.id) === state.examId)) {
                state.examId = exams.length ? normalizeId(exams[0].id) : '';
            }

            setExamOptions();
        } catch (error) {
            if (pyqStatus) {
                pyqStatus.textContent = 'Unable to load exam catalog right now.';
            }
        }
    };

    const initEvents = () => {
        pyqExam.addEventListener('change', (event) => {
            state.examId = normalizeId(event.target.value);
            void loadPapers();
        });
    };

    const init = async () => {
        readUrl();
        initEvents();
        await hydrateAuthSession();
        await loadCatalog();
        await loadPapers();
    };

    void init();
})();
