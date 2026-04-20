(function () {
    const API_BASE = String(window.MOCKLY_API_BASE || '/api');
    const SORT_OPTIONS = new Set(['newly-added', 'most-given', 'easy', 'moderate', 'hard']);
    const PAPER_PERFORMANCE_API_ENDPOINT = `${API_BASE}/users/paper-performance`;
    const PAPER_ANALYSIS_API_ENDPOINT = `${API_BASE}/users/paper-analysis`;

    const state = {
        target: 'all',
        sort: 'newly-added',
        subjectId: '',
        chapterId: '',
        topicId: '',
        chapterSubjects: [],
        searchText: '',
        page: 1,
        limit: 20,
        isLoading: false,
        hasMore: true,
        total: 0,
        tests: [],
        paperPerformanceByKey: new Map(),
        paperPerformanceTarget: ''
    };
    const AUTH_SESSION_STORAGE_KEY = 'mockly_auth_session';
    const AUTH_SESSION_API_ENDPOINT = `${API_BASE}/auth/session`;
    const AUTH_LOGOUT_API_ENDPOINT = `${API_BASE}/auth/logout`;
    const CSRF_COOKIE_NAME = 'mockly_csrf_token';
    const CSRF_HEADER_NAME = 'x-csrf-token';

    let authState = {
        isAuthenticated: false,
        userEmail: '',
        userName: ''
    };

    try {
        const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            const userEmail = String(parsed?.userEmail || '').trim();
            const userName = String(parsed?.userName || '').trim();

            authState = {
                isAuthenticated: Boolean(userEmail),
                userEmail,
                userName
            };
        }
    } catch (error) {
        authState = { isAuthenticated: false, userEmail: '', userName: '' };
    }

    const catalogExamById = new Map();

    const targetLabel = document.getElementById('target-label');
    const hudTotal = document.getElementById('hud-total');
    const hudLoaded = document.getElementById('hud-loaded');
    const hudRating = document.getElementById('hud-rating');
    const hudAspirants = document.getElementById('hud-aspirants');
    const hudFocus = document.getElementById('hud-focus');
    const hudFocusCopy = document.getElementById('hud-focus-copy');
    const seriesSort = document.getElementById('series-sort');
    const seriesSubject = document.getElementById('series-subject');
    const seriesChapter = document.getElementById('series-chapter');
    const seriesTopic = document.getElementById('series-topic');
    const seriesSearch = document.getElementById('series-search');
    const seriesStatus = document.getElementById('series-status');
    const seriesGrid = document.getElementById('series-grid');
    const seriesEmpty = document.getElementById('series-empty');
    const seriesResetBtn = document.getElementById('series-reset-btn');
    const seriesLoading = document.getElementById('series-loading');
    const scrollSentinel = document.getElementById('scroll-sentinel');
    const sortChips = Array.from(document.querySelectorAll('.series-chip'));
    const themeToggle = document.getElementById('theme-toggle');
    const menuToggle = document.querySelector('.menu-toggle');
    const navContainer = document.querySelector('.nav-container');
    const navLinks = document.querySelector('.nav-links');
    const navActions = document.querySelector('.nav-actions');
    const navLoginBtn = document.getElementById('nav-login-btn');
    const navSignupBtn = document.getElementById('nav-signup-btn');

    let observer = null;
    let metricObserver = null;

    const toSafeString = (value) => String(value || '').trim();
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const canRunMotionEffects = () => {
        return !prefersReducedMotion && !document.documentElement.classList.contains('performance-lite');
    };

    const normalizeTarget = (value) => {
        const normalized = toSafeString(value).toLowerCase();
        return normalized || 'all';
    };

    const buildPaperKey = (examId, paperId) => `${normalizeTarget(examId)}::${normalizeTarget(paperId)}`;

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

    const isStreamTarget = (value) => ['ssc', 'rrb', 'upsc'].includes(normalizeTarget(value));

    const updateTargetHeading = () => {
        if (!targetLabel) return;

        const normalizedTarget = normalizeTarget(state.target);
        const catalogExam = catalogExamById.get(normalizedTarget);

        if (catalogExam?.title) {
            targetLabel.textContent = catalogExam.title;
            return;
        }

        targetLabel.textContent = formatTargetLabel(normalizedTarget);
    };

    const normalizeSort = (value) => {
        const normalized = toSafeString(value).toLowerCase();
        return SORT_OPTIONS.has(normalized) ? normalized : 'newly-added';
    };

    const normalizeChapterFilter = (value) => toSafeString(value)
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const setSelectOptions = (selectElement, options, emptyLabel) => {
        if (!selectElement) return;

        const safeOptions = Array.isArray(options) ? options : [];
        selectElement.innerHTML = '';

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = emptyLabel;
        selectElement.appendChild(emptyOption);

        safeOptions.forEach((item) => {
            const option = document.createElement('option');
            option.value = normalizeChapterFilter(item?.id);
            option.textContent = toSafeString(item?.name) || option.value;
            selectElement.appendChild(option);
        });
    };

    const getSelectedSubjectRecord = () => state.chapterSubjects
        .find((subject) => normalizeChapterFilter(subject.subjectId) === state.subjectId) || null;

    const getSelectedChapterRecord = () => {
        const subject = getSelectedSubjectRecord();
        if (!subject) return null;

        return (Array.isArray(subject.chapters) ? subject.chapters : [])
            .find((chapter) => normalizeChapterFilter(chapter.chapterId) === state.chapterId) || null;
    };

    const syncChapterFilterOptions = () => {
        setSelectOptions(
            seriesSubject,
            state.chapterSubjects.map((subject) => ({ id: subject.subjectId, name: subject.name })),
            'Subject: All'
        );

        if (seriesSubject) {
            seriesSubject.value = state.subjectId;
        }

        const selectedSubject = getSelectedSubjectRecord();
        const chapterOptions = selectedSubject
            ? (Array.isArray(selectedSubject.chapters) ? selectedSubject.chapters : []).map((chapter) => ({
                id: chapter.chapterId,
                name: chapter.name
            }))
            : [];

        setSelectOptions(seriesChapter, chapterOptions, 'Chapter: All');

        if (seriesChapter) {
            seriesChapter.value = state.chapterId;
        }

        const selectedChapter = getSelectedChapterRecord();
        const topicOptions = selectedChapter
            ? (Array.isArray(selectedChapter.topics) ? selectedChapter.topics : []).map((topic) => ({
                id: topic.topicId,
                name: topic.name
            }))
            : [];

        setSelectOptions(seriesTopic, topicOptions, 'Topic: All');

        if (seriesTopic) {
            seriesTopic.value = state.topicId;
        }
    };

    const setChapterFilterAvailability = (enabled) => {
        [seriesSubject, seriesChapter, seriesTopic].forEach((element) => {
            if (!element) return;
            element.disabled = !enabled;
        });
    };

    const clearChapterFilters = () => {
        state.subjectId = '';
        state.chapterId = '';
        state.topicId = '';
    };

    const getFirstName = () => {
        const safeName = toSafeString(authState.userName);
        if (safeName) {
            return safeName.split(/\s+/)[0];
        }

        return authState.userEmail.includes('@') ? authState.userEmail.split('@')[0] : '';
    };

    const persistAuthHint = () => {
        try {
            localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({
                userEmail: toSafeString(authState.userEmail),
                userName: toSafeString(authState.userName),
                updatedAt: new Date().toISOString()
            }));
        } catch (error) {
            // Ignore local storage failures.
        }
    };

    const readCookieValue = (name) => {
        const target = `${name}=`;
        const entry = String(document.cookie || '')
            .split(';')
            .map((part) => part.trim())
            .find((part) => part.startsWith(target));

        if (!entry) return '';
        return decodeURIComponent(entry.slice(target.length));
    };

    const applyAuthNavState = () => {
        if (authState.isAuthenticated) {
            const firstName = getFirstName();
            if (navLoginBtn) {
                navLoginBtn.textContent = firstName ? `Hi, ${firstName}` : 'Dashboard';
                navLoginBtn.title = 'Open dashboard';
                navLoginBtn.onclick = () => {
                    window.location.assign('/#dashboard');
                };
            }

            if (navSignupBtn) {
                navSignupBtn.textContent = 'Log Out';
                navSignupBtn.title = 'Sign out';
                navSignupBtn.onclick = async () => {
                    navSignupBtn.disabled = true;

                    try {
                        const csrfToken = readCookieValue(CSRF_COOKIE_NAME);
                        const headers = csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {};

                        await fetch(AUTH_LOGOUT_API_ENDPOINT, {
                            method: 'POST',
                            headers,
                            credentials: 'same-origin'
                        });
                    } catch (error) {
                        // Continue with local reset even if API logout fails.
                    } finally {
                        authState = { isAuthenticated: false, userEmail: '', userName: '' };
                        persistAuthHint();
                        applyAuthNavState();
                        navSignupBtn.disabled = false;
                    }
                };
            }

            return;
        }

        if (navLoginBtn) {
            navLoginBtn.textContent = 'Log In';
            navLoginBtn.title = 'Log in';
            navLoginBtn.onclick = () => {
                window.location.assign('/#login');
            };
        }

        if (navSignupBtn) {
            navSignupBtn.textContent = 'Sign Up';
            navSignupBtn.title = 'Create account';
            navSignupBtn.onclick = () => {
                window.location.assign('/#signup');
            };
        }
    };

    const syncAuthSessionFromApi = async () => {
        try {
            const response = await fetch(AUTH_SESSION_API_ENDPOINT, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Session request failed with ${response.status}`);
            }

            const payload = await response.json();
            const isAuthenticated = Boolean(payload?.authenticated && payload?.user?.email);

            if (!isAuthenticated) {
                authState = { isAuthenticated: false, userEmail: '', userName: '' };
            } else {
                authState = {
                    isAuthenticated: true,
                    userEmail: toSafeString(payload?.user?.email),
                    userName: toSafeString(payload?.user?.name)
                };
            }
        } catch (error) {
            authState = { isAuthenticated: false, userEmail: '', userName: '' };
        }

        persistAuthHint();
        applyAuthNavState();

        if (!authState.isAuthenticated) {
            state.paperPerformanceByKey = new Map();
            state.paperPerformanceTarget = '';
            renderTests();
        }
    };

    const formatCompact = (value, suffix = '') => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return `--${suffix}`;
        }

        return `${new Intl.NumberFormat('en-IN', {
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(numeric)}${suffix}`;
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

    const formatDurationShort = (seconds) => {
        const numeric = Number(seconds);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return '0s';
        }

        if (numeric >= 3600) {
            const hours = Math.floor(numeric / 3600);
            const minutes = Math.round((numeric % 3600) / 60);
            if (minutes === 0) return `${hours}h`;
            return `${hours}h ${minutes}m`;
        }

        if (numeric >= 60) {
            const minutes = Math.floor(numeric / 60);
            const remainder = Math.round(numeric % 60);
            if (remainder === 0) return `${minutes}m`;
            return `${minutes}m ${remainder}s`;
        }

        return `${Math.round(numeric)}s`;
    };

    const loadPaperPerformanceForTarget = async (force = false) => {
        if (!authState.isAuthenticated) {
            state.paperPerformanceByKey = new Map();
            state.paperPerformanceTarget = '';
            return;
        }

        const targetKey = normalizeTarget(state.target);
        if (!force && state.paperPerformanceTarget === targetKey && state.paperPerformanceByKey.size) {
            return;
        }

        try {
            const url = new URL(PAPER_PERFORMANCE_API_ENDPOINT, window.location.origin);
            url.searchParams.set('target', targetKey);

            const response = await fetch(url.toString(), {
                method: 'GET',
                credentials: 'same-origin',
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    authState = { isAuthenticated: false, userEmail: '', userName: '' };
                    persistAuthHint();
                    applyAuthNavState();
                    state.paperPerformanceByKey = new Map();
                    state.paperPerformanceTarget = '';
                }
                return;
            }

            const payload = await response.json();
            const items = Array.isArray(payload?.items) ? payload.items : [];
            const nextMap = new Map();

            items.forEach((item) => {
                const key = buildPaperKey(item?.examId, item?.paperId);
                if (!key) return;
                nextMap.set(key, item);
            });

            state.paperPerformanceByKey = nextMap;
            state.paperPerformanceTarget = targetKey;
        } catch (error) {
            // Keep series list functional even if performance endpoint fails.
        }
    };

    const formatRelativeDays = (isoDate) => {
        const timestamp = Date.parse(toSafeString(isoDate));
        if (!Number.isFinite(timestamp)) return 'Freshly synced';

        const dayMs = 24 * 60 * 60 * 1000;
        const days = Math.max(0, Math.floor((Date.now() - timestamp) / dayMs));
        if (days === 0) return 'Added today';
        if (days === 1) return 'Added 1 day ago';
        if (days < 7) return `Added ${days} days ago`;
        if (days < 30) return `Added ${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
        return `Added ${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
    };

    const getPressureState = (attemptCount) => {
        const attempts = Number(attemptCount || 0);
        if (attempts >= 7000) {
            return { label: 'Very High', score: 96, tag: 'Rank Heat' };
        }

        if (attempts >= 4000) {
            return { label: 'High', score: 78, tag: 'High Competition' };
        }

        if (attempts >= 1800) {
            return { label: 'Moderate', score: 58, tag: 'Balanced Pressure' };
        }

        return { label: 'Low', score: 36, tag: 'Warmup Friendly' };
    };

    const getPressureHint = (pressureLabel) => {
        const label = toSafeString(pressureLabel).toLowerCase();
        if (label === 'very high') return 'Best if you want full exam pressure simulation.';
        if (label === 'high') return 'Great for sharpening speed against active competition.';
        if (label === 'moderate') return 'Balanced choice for consistency and confidence.';
        return 'Good warm-up before moving to harder pressure bands.';
    };

    const getStreamIconClass = (streamName) => {
        const stream = toSafeString(streamName).toUpperCase();
        if (stream === 'SSC') return 'fa-solid fa-building-columns';
        if (stream === 'RRB') return 'fa-solid fa-train-subway';
        if (stream === 'UPSC') return 'fa-solid fa-landmark-dome';
        return 'fa-solid fa-layer-group';
    };

    const updateHudFocus = () => {
        if (!hudFocus || !hudFocusCopy) return;

        const streamName = formatTargetLabel(state.target);
        const sortCopy = {
            'newly-added': 'Stay aligned with newly refreshed mock patterns.',
            'most-given': 'Practice where candidate competition is strongest.',
            easy: 'Build confidence first, then climb pressure bands.',
            moderate: 'Stabilize timing and accuracy at realistic pressure.',
            hard: 'Stress-test exam temperament under peak difficulty.'
        };

        const selectedSubject = getSelectedSubjectRecord();
        const selectedChapter = getSelectedChapterRecord();
        const selectedTopic = selectedChapter
            ? (Array.isArray(selectedChapter.topics) ? selectedChapter.topics : [])
                .find((topic) => normalizeChapterFilter(topic.topicId) === state.topicId)
            : null;

        const chapterFocusTrail = [selectedSubject?.name, selectedChapter?.name, selectedTopic?.name]
            .filter(Boolean)
            .join(' -> ');

        hudFocus.textContent = `${streamName} Focus`;
        hudFocusCopy.textContent = chapterFocusTrail
            ? `${chapterFocusTrail} • ${sortCopy[state.sort] || sortCopy['newly-added']}`
            : (sortCopy[state.sort] || sortCopy['newly-added']);
    };

    const formatTargetLabel = (value) => {
        const normalized = normalizeTarget(value);
        const catalogExam = catalogExamById.get(normalized);
        if (catalogExam?.title) return catalogExam.title;

        if (normalized === 'all') return 'All Exams';
        if (normalized === 'ssc' || normalized === 'rrb' || normalized === 'upsc') {
            return normalized.toUpperCase();
        }

        return normalized
            .split('-')
            .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
            .join(' ');
    };

    const syncUrlState = () => {
        const url = new URL(window.location.href);

        if (state.target === 'all') {
            url.searchParams.delete('target');
        } else {
            url.searchParams.set('target', state.target);
        }

        url.searchParams.set('sort', state.sort);

        if (state.searchText) {
            url.searchParams.set('q', state.searchText);
        } else {
            url.searchParams.delete('q');
        }

        url.searchParams.delete('subject');
        url.searchParams.delete('chapter');
        url.searchParams.delete('topic');

        window.history.replaceState({}, '', url.toString());
    };

    const readUrlState = () => {
        const params = new URLSearchParams(window.location.search);
        state.target = normalizeTarget(params.get('target') || 'all');
        state.sort = normalizeSort(params.get('sort') || 'newly-added');
        state.searchText = toSafeString(params.get('q'));
        clearChapterFilters();

        if (seriesSort) seriesSort.value = state.sort;
        if (seriesSearch) seriesSearch.value = state.searchText;
        updateTargetHeading();
        updateHudFocus();
    };

    const loadExamCatalog = async () => {
        const mapCatalogPayload = (payload) => {
            const exams = Array.isArray(payload?.exams) ? payload.exams : [];
            catalogExamById.clear();

            exams.forEach((exam) => {
                const examId = normalizeTarget(exam?.id);
                if (!examId || examId === 'all') return;
                catalogExamById.set(examId, exam);
            });

            const target = normalizeTarget(state.target);
            if (target !== 'all' && !isStreamTarget(target) && !catalogExamById.has(target)) {
                state.target = 'all';
            }

            updateTargetHeading();
            updateHudFocus();
            syncUrlState();
        };

        try {
            const response = await fetch(`${API_BASE}/exam-catalog`, { headers: { Accept: 'application/json' } });
            if (!response.ok) {
                throw new Error(`Catalog request failed with ${response.status}`);
            }

            mapCatalogPayload(await response.json());
            return;
        } catch (error) {
            try {
                const fallbackResponse = await fetch(`${API_BASE}/exams`, { headers: { Accept: 'application/json' } });
                if (!fallbackResponse.ok) return;
                mapCatalogPayload(await fallbackResponse.json());
            } catch (nestedError) {
                // Keep URL-derived target label when catalog is unavailable.
            }
        }
    };

    const loadChapterwiseForTarget = async () => {
        const target = normalizeTarget(state.target);
        const hasSpecificExamTarget = target !== 'all' && !isStreamTarget(target) && catalogExamById.has(target);

        if (!hasSpecificExamTarget) {
            state.chapterSubjects = [];
            clearChapterFilters();
            syncChapterFilterOptions();
            setChapterFilterAvailability(false);
            updateHudFocus();
            syncUrlState();
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/chapterwise/${encodeURIComponent(target)}`, {
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Chapterwise request failed with ${response.status}`);
            }

            const payload = await response.json();
            const subjects = Array.isArray(payload?.subjects) ? payload.subjects : [];
            state.chapterSubjects = subjects;

            const hasSubject = subjects.some((subject) => normalizeChapterFilter(subject.subjectId) === state.subjectId);
            if (!hasSubject) {
                clearChapterFilters();
            }

            const selectedSubject = subjects.find((subject) => normalizeChapterFilter(subject.subjectId) === state.subjectId);
            const chapterList = Array.isArray(selectedSubject?.chapters) ? selectedSubject.chapters : [];
            const hasChapter = chapterList.some((chapter) => normalizeChapterFilter(chapter.chapterId) === state.chapterId);
            if (!hasChapter) {
                state.chapterId = '';
                state.topicId = '';
            }

            const selectedChapter = chapterList.find((chapter) => normalizeChapterFilter(chapter.chapterId) === state.chapterId);
            const topicList = Array.isArray(selectedChapter?.topics) ? selectedChapter.topics : [];
            const hasTopic = topicList.some((topic) => normalizeChapterFilter(topic.topicId) === state.topicId);
            if (!hasTopic) {
                state.topicId = '';
            }

            syncChapterFilterOptions();
            setChapterFilterAvailability(true);
            updateHudFocus();
            syncUrlState();
        } catch (error) {
            state.chapterSubjects = [];
            clearChapterFilters();
            syncChapterFilterOptions();
            setChapterFilterAvailability(false);
            updateHudFocus();
            syncUrlState();
        }
    };

    const updateSortUi = () => {
        sortChips.forEach((chip) => {
            const isActive = normalizeSort(chip.dataset.sort) === state.sort;
            chip.classList.toggle('active', isActive);
        });

        if (seriesSort) seriesSort.value = state.sort;
    };

    const setLoading = (visible) => {
        if (!seriesLoading) return;
        seriesLoading.hidden = !visible;
    };

    const getVisibleTests = () => {
        const query = state.searchText.toLowerCase();
        if (!query) return state.tests;

        return state.tests.filter((test) => {
            const searchable = [
                test.title,
                test.examTitle,
                test.stream,
                test.difficulty,
                test.subjectName,
                test.chapterName,
                test.topicName
            ].join(' ').toLowerCase();

            return searchable.includes(query);
        });
    };

    const animateMetricElement = (element) => {
        if (!element || element.dataset.metricAnimated === 'true') return;

        const rawTarget = Number(element.dataset.animTarget || 0);
        if (!Number.isFinite(rawTarget) || rawTarget <= 0) {
            element.dataset.metricAnimated = 'true';
            return;
        }

        const format = toSafeString(element.dataset.animFormat || 'int').toLowerCase();
        const duration = 760;
        const startTime = performance.now();

        const renderValue = (numericValue) => {
            if (format === 'compact') {
                element.textContent = formatCompact(numericValue);
                return;
            }

            element.textContent = String(Math.round(numericValue));
        };

        const step = (timestamp) => {
            const elapsed = Math.max(0, timestamp - startTime);
            const progress = Math.min(1, elapsed / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            renderValue(rawTarget * eased);

            if (progress < 1) {
                window.requestAnimationFrame(step);
                return;
            }

            renderValue(rawTarget);
            element.dataset.metricAnimated = 'true';
        };

        window.requestAnimationFrame(step);
    };

    const animateCardMetrics = (card) => {
        if (!card) return;

        const metrics = card.querySelectorAll('[data-anim-target]');
        metrics.forEach((metric) => animateMetricElement(metric));
    };

    const registerCardEffects = (card) => {
        if (!card) return;

        if (!canRunMotionEffects()) {
            card.classList.add('micro-static');
            return;
        }

        if (typeof IntersectionObserver !== 'function') {
            animateCardMetrics(card);
            return;
        }

        if (!metricObserver) {
            metricObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    animateCardMetrics(entry.target);
                    metricObserver.unobserve(entry.target);
                });
            }, {
                root: null,
                rootMargin: '120px 0px',
                threshold: 0.2
            });
        }

        metricObserver.observe(card);
    };

    const ensureAnalysisModal = () => {
        let modal = document.getElementById('series-analysis-modal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'series-analysis-modal';
        modal.className = 'series-analysis-modal';
        modal.hidden = true;
        modal.innerHTML = `
            <div class="series-analysis-dialog" role="dialog" aria-modal="true" aria-labelledby="series-analysis-title">
                <div class="series-analysis-head">
                    <h3 id="series-analysis-title">Mock Analysis</h3>
                    <button type="button" class="series-analysis-close" data-action="close-analysis" aria-label="Close analysis">x</button>
                </div>
                <div id="series-analysis-body" class="series-analysis-body"></div>
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
            <div class="series-analysis-empty">
                <h4>No Attempt Yet</h4>
                <p>Start this mock once. Complete analysis will appear here with section insights, topper comparison, and per-question pacing.</p>
                <div class="series-analysis-grid">
                    <article><span>Current Cutoff</span><strong>${formatPercent(benchmark?.cutoffScorePercent)}</strong></article>
                    <article><span>Topper Score</span><strong>${Number.isFinite(Number(benchmark?.topperScore)) ? formatMarks(benchmark.topperScore) : '--'}</strong></article>
                    <article><span>Attempts</span><strong>${Math.max(0, Number(benchmark?.attemptCount || 0))}</strong></article>
                </div>
            </div>
        `;

        const summaryMarkup = hasAttempt
            ? `
                <div class="series-analysis-grid">
                    <article><span>Your Score</span><strong>${formatMarks(latestAttempt?.score)} / ${formatMarks(latestAttempt?.maxScore)}</strong></article>
                    <article><span>Cutoff</span><strong>${Number.isFinite(Number(benchmark?.cutoffScore)) ? formatMarks(benchmark.cutoffScore) : '--'} (${formatPercent(benchmark?.cutoffScorePercent)})</strong></article>
                    <article><span>Topper</span><strong>${Number.isFinite(Number(benchmark?.topperScore)) ? formatMarks(benchmark.topperScore) : '--'} (${formatPercent(benchmark?.topperScorePercent)})</strong></article>
                    <article><span>Time Gap vs Topper</span><strong>${Number.isFinite(Number(comparison?.timeGapVsTopperSeconds)) ? formatDurationShort(Math.abs(Number(comparison.timeGapVsTopperSeconds))) : '--'}</strong></article>
                </div>
            `
            : noAttemptMarkup;

        const insightsMarkup = briefAnalysis.length
            ? `<ul class="series-analysis-insights">${briefAnalysis.map((item) => `<li>${toSafeString(item)}</li>`).join('')}</ul>`
            : '<p class="series-analysis-muted">No brief analysis available yet.</p>';

        const questionTableMarkup = questionRows.length
            ? `
                <div class="series-analysis-table-wrap">
                    <table class="series-analysis-table">
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
                                        <td><span class="series-analysis-delta ${deltaClass}">${deltaText}</span></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `
            : '<p class="series-analysis-muted">Per-question time comparison will appear after your next attempt (with question-level timing).</p>';

        return `
            <div class="series-analysis-title-block">
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
        const body = document.getElementById('series-analysis-body');
        if (!modal || !body) return;
        const safeExamId = toSafeString(examId);
        const safePaperId = toSafeString(paperId);

        if (!authState.isAuthenticated) {
            body.innerHTML = '<p class="series-analysis-muted">Please log in to view complete analysis.</p>';
            modal.hidden = false;
            return;
        }

        if (!safeExamId || !safePaperId) {
            body.innerHTML = '<p class="series-analysis-muted">Analysis is not available for this test yet.</p>';
            modal.hidden = false;
            return;
        }

        body.innerHTML = '<p class="series-analysis-muted">Loading complete analysis...</p>';
        modal.hidden = false;

        try {
            const url = new URL(PAPER_ANALYSIS_API_ENDPOINT, window.location.origin);
            url.searchParams.set('examId', safeExamId);
            url.searchParams.set('paperId', safePaperId);

            const response = await fetch(url.toString(), {
                method: 'GET',
                credentials: 'same-origin',
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    authState = { isAuthenticated: false, userEmail: '', userName: '' };
                    persistAuthHint();
                    applyAuthNavState();
                    body.innerHTML = '<p class="series-analysis-muted">Session expired. Log in again to view analysis.</p>';
                    return;
                }

                throw new Error(`Analysis request failed with ${response.status}`);
            }

            const payload = await response.json();
            body.innerHTML = renderAnalysisPayload(payload, title);
        } catch (error) {
            body.innerHTML = '<p class="series-analysis-muted">Unable to load analysis right now. Please try again in a moment.</p>';
        }
    };

    const attachSeriesCardActions = (card, test) => {
        const analysisButton = card.querySelector('[data-action="view-analysis"]');
        if (!analysisButton) return;

        analysisButton.addEventListener('click', () => {
            void openAnalysisModal({
                examId: test?.examId,
                paperId: test?.paperId,
                title: test?.title
            });
        });
    };

    const createSeriesCard = (test, index) => {
        const card = document.createElement('article');
        card.className = 'series-card';
        const staggerIndex = Number.isFinite(index) ? Math.max(0, Math.min(10, index)) : 0;
        card.style.setProperty('--card-stagger-ms', `${staggerIndex * 48}ms`);

        const difficulty = toSafeString(test?.difficulty).toLowerCase() || 'moderate';
        const languages = Array.isArray(test?.languageSupport) && test.languageSupport.length
            ? test.languageSupport.join(', ')
            : 'EN';
        const examId = normalizeTarget(test?.examId);
        const catalogExam = catalogExamById.get(examId);
        const examTitle = toSafeString(catalogExam?.title || test?.examTitle) || 'Exam Series';
        const launchUrl = toSafeString(test?.launchUrl) || '/#test';
        const isLive = catalogExam ? catalogExam.isLive !== false : test?.isLive !== false;
        const attemptsValue = Math.max(0, Number(test?.attemptCount || 0));
        const questionsValue = Math.max(0, Number(test?.questionCount || 0));
        const durationValue = Math.max(0, Number(test?.durationMinutes || 0));
        const freshness = formatRelativeDays(test?.createdAt);
        const pressure = getPressureState(test?.attemptCount);
        const pressureHint = getPressureHint(pressure.label);
        const stream = toSafeString(test?.stream) || 'GENERAL';
        const streamIcon = getStreamIconClass(stream);
        const availabilityLabel = isLive ? 'Live' : 'In Build';
        const analysisUrl = buildAnalysisLink({
            examId: test?.examId,
            paperId: test?.paperId,
            title: test?.title,
            source: 'test-series'
        });
        const performance = state.paperPerformanceByKey.get(buildPaperKey(examId, test?.paperId));
        const hasAttempt = Boolean(
            performance?.hasAttempt
            && Number.isFinite(Number(performance?.userLatestScore))
            && Number.isFinite(Number(performance?.userLatestMaxScore))
        );
        const scoreBoardMarkup = (() => {
            if (!authState.isAuthenticated) {
                return '<div class="series-score-note">Log in to track marks, cutoff, and topper gap.</div>';
            }

            if (!performance) {
                return '<div class="series-score-note">Syncing performance...</div>';
            }

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
                <div class="series-score-board">
                    <div><span>Your Marks</span><strong>${yourMarks}</strong></div>
                    <div><span>Cutoff</span><strong>${cutoffMarks}</strong></div>
                    <div><span>Topper</span><strong>${topperMarks}</strong></div>
                </div>
            `;
        })();

        card.innerHTML = `
            <div class="series-card-top">
                <span class="series-pill">${stream}</span>
                <span class="series-rank-chip ${isLive ? 'live' : 'planned'}">${availabilityLabel}</span>
            </div>
            <div class="series-card-headline">
                <div class="series-icon-wrap" aria-hidden="true">
                    <i class="${streamIcon}"></i>
                </div>
                <div class="series-title-wrap">
                    <h3>${toSafeString(test?.title) || 'Mock Test'}</h3>
                    <p>${examTitle} • ${toSafeString(test?.id) || 'series'}</p>
                </div>
            </div>
            <div class="series-card-meta-line">
                <span class="series-meta-pill">${freshness}</span>
                <span class="series-meta-pill">${test?.isBilingual ? 'EN/HI Mode' : 'EN Mode'}</span>
                <span class="series-difficulty ${difficulty}">${difficulty}</span>
            </div>
            <div class="series-card-metrics">
                <div class="series-metric">
                    <span>Attempts</span>
                    <strong data-anim-target="${attemptsValue}" data-anim-format="compact">${formatCompact(attemptsValue)}</strong>
                </div>
                <div class="series-metric">
                    <span>Questions</span>
                    <strong data-anim-target="${questionsValue}" data-anim-format="int">${questionsValue || '--'}</strong>
                </div>
                <div class="series-metric">
                    <span>Duration</span>
                    <strong data-anim-target="${durationValue}" data-anim-format="int">${durationValue || '--'}</strong>
                    <span class="series-metric-unit">mins</span>
                </div>
            </div>
            <div class="series-pressure">
                <div class="series-pressure-head">
                    <span>Competition Pressure</span>
                    <strong>${pressure.label}</strong>
                </div>
                <div class="series-pressure-track">
                    <div class="series-pressure-fill" style="--pressure-scale: ${(pressure.score / 100).toFixed(2)};"></div>
                </div>
                <p class="series-pressure-copy">${pressureHint}</p>
            </div>
            <div class="series-card-meta">
                <span>${languages}</span>
                <span>${test?.isBilingual ? 'EN/HI' : 'EN'}</span>
            </div>
            ${scoreBoardMarkup}
            <div class="series-card-footer">
                ${isLive
        ? `<a class="btn btn-primary" href="${launchUrl}">Start Mock</a>`
        : '<button class="btn btn-primary series-disabled-btn" type="button" disabled>Coming Soon</button>'}
                <a class="series-secondary-btn" href="${analysisUrl}">View Analysis</a>
            </div>
        `;

        return card;
    };

    const renderTests = () => {
        const visibleTests = getVisibleTests();
        seriesGrid.innerHTML = '';

        visibleTests.forEach((test, index) => {
            const card = createSeriesCard(test, index);
            seriesGrid.appendChild(card);
            registerCardEffects(card);
            attachSeriesCardActions(card, test);
        });

        if (seriesEmpty) {
            seriesEmpty.hidden = visibleTests.length !== 0;
        }

        if (hudLoaded) {
            hudLoaded.textContent = String(visibleTests.length);
        }

        if (hudTotal) {
            hudTotal.textContent = formatCompact(state.total, '+');
        }

        if (seriesStatus) {
            const loadedLabel = `${visibleTests.length} visible`;
            const poolLabel = Number.isFinite(state.total) && state.total > 0
                ? `${formatCompact(state.total, '+')} total`
                : 'total unavailable';
            const moreLabel = state.hasMore ? 'infinite feed active' : 'you reached the end';
            seriesStatus.textContent = `${loadedLabel} • ${poolLabel} • ${moreLabel}`;
        }
    };

    const loadSeriesPage = async ({ reset = false } = {}) => {
        if (state.isLoading) return;
        if (!state.hasMore && !reset) return;

        state.isLoading = true;
        setLoading(true);

        if (reset) {
            state.page = 1;
            state.hasMore = true;
            state.tests = [];
            state.total = 0;
            renderTests();
        }

        try {
            const url = new URL(`${API_BASE}/test-series`, window.location.origin);
            if (state.target && state.target !== 'all') {
                url.searchParams.set('target', state.target);
            }
            url.searchParams.set('sort', state.sort);
            url.searchParams.set('page', String(state.page));
            url.searchParams.set('limit', String(state.limit));

            const response = await fetch(url.toString(), {
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Request failed with ${response.status}`);
            }

            const payload = await response.json();
            const items = Array.isArray(payload?.items) ? payload.items : [];

            state.target = normalizeTarget(payload?.target || state.target);
            clearChapterFilters();
            updateTargetHeading();
            updateHudFocus();
            syncUrlState();

            state.tests = state.tests.concat(items);
            state.total = Number(payload?.total || state.total || 0);
            state.hasMore = Boolean(payload?.hasMore);
            state.page += 1;

            await loadPaperPerformanceForTarget(reset);

            renderTests();
        } catch (error) {
            state.hasMore = false;
            if (seriesStatus) {
                seriesStatus.textContent = 'Unable to load test series right now. Please retry in a moment.';
            }
            renderTests();
        } finally {
            state.isLoading = false;
            setLoading(false);
        }
    };

    const initInfiniteScroll = () => {
        if (!scrollSentinel || typeof IntersectionObserver !== 'function') return;

        observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    void loadSeriesPage();
                }
            });
        }, {
            root: null,
            rootMargin: '500px 0px',
            threshold: 0.01
        });

        observer.observe(scrollSentinel);
    };

    const initToolbar = () => {
        seriesSort?.addEventListener('change', (event) => {
            state.sort = normalizeSort(event.target.value);
            updateSortUi();
            updateHudFocus();
            syncUrlState();
            void loadSeriesPage({ reset: true });
        });

        sortChips.forEach((chip) => {
            chip.addEventListener('click', () => {
                state.sort = normalizeSort(chip.dataset.sort);
                updateSortUi();
                updateHudFocus();
                syncUrlState();
                void loadSeriesPage({ reset: true });
            });
        });

        document.getElementById('series-toolbar-form')?.addEventListener('submit', (event) => {
            event.preventDefault();
            renderTests();
            syncUrlState();
        });

        seriesSearch?.addEventListener('input', (event) => {
            state.searchText = toSafeString(event.target.value);
            renderTests();
            syncUrlState();
        });

        seriesSubject?.addEventListener('change', (event) => {
            state.subjectId = normalizeChapterFilter(event.target.value);
            state.chapterId = '';
            state.topicId = '';
            syncChapterFilterOptions();
            updateHudFocus();
            syncUrlState();
            void loadSeriesPage({ reset: true });
        });

        seriesChapter?.addEventListener('change', (event) => {
            state.chapterId = normalizeChapterFilter(event.target.value);
            state.topicId = '';
            syncChapterFilterOptions();
            updateHudFocus();
            syncUrlState();
            void loadSeriesPage({ reset: true });
        });

        seriesTopic?.addEventListener('change', (event) => {
            state.topicId = normalizeChapterFilter(event.target.value);
            updateHudFocus();
            syncUrlState();
            void loadSeriesPage({ reset: true });
        });

        seriesResetBtn?.addEventListener('click', () => {
            state.searchText = '';
            state.sort = 'newly-added';
            clearChapterFilters();
            if (seriesSearch) seriesSearch.value = '';
            syncChapterFilterOptions();
            updateSortUi();
            updateHudFocus();
            syncUrlState();
            void loadSeriesPage({ reset: true });
        });
    };

    const applyThemePreference = () => {
        try {
            const currentTheme = localStorage.getItem('theme');
            if (currentTheme) {
                document.body.classList.add(currentTheme);
            }
        } catch (error) {
            // Ignore storage failures.
        }
    };

    const initThemeToggle = () => {
        applyThemePreference();

        if (!themeToggle) return;
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const nextTheme = document.body.classList.contains('dark-theme') ? 'dark-theme' : 'light-theme';
            try {
                localStorage.setItem('theme', nextTheme);
            } catch (error) {
                // Ignore storage failures.
            }
        });
    };

    const closeMobileMenu = () => {
        if (!menuToggle || !navContainer) return;

        navContainer.classList.remove('mobile-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        const icon = menuToggle.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    };

    const openMobileMenu = () => {
        if (!menuToggle || !navContainer) return;

        navContainer.classList.add('mobile-open');
        menuToggle.setAttribute('aria-expanded', 'true');
        const icon = menuToggle.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        }
    };

    const initMobileMenu = () => {
        if (!menuToggle || !navContainer || !navLinks || !navActions) return;

        menuToggle.addEventListener('click', () => {
            const isOpen = navContainer.classList.contains('mobile-open');
            if (isOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        document.addEventListener('click', (event) => {
            if (!navContainer.classList.contains('mobile-open')) return;
            if (event.target.closest('.nav-container')) return;
            closeMobileMenu();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeMobileMenu();
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                closeMobileMenu();
            }
        });
    };

    const initNavButtons = () => {
        applyAuthNavState();
        void syncAuthSessionFromApi();
    };

    const loadHudStats = async () => {
        try {
            const response = await fetch(`${API_BASE}/stats`, { headers: { Accept: 'application/json' } });
            if (!response.ok) throw new Error(`Stats request failed with ${response.status}`);

            const payload = await response.json();
            if (hudRating) {
                hudRating.textContent = `${Number(payload?.rating || 4.9).toFixed(1)}/5`;
            }
            if (hudAspirants) {
                hudAspirants.textContent = formatCompact(payload?.aspirants, '+');
            }
        } catch (error) {
            if (hudRating) hudRating.textContent = '4.9/5';
            if (hudAspirants) hudAspirants.textContent = '800k+';
        }
    };

    const initPage = async () => {
        readUrlState();
        initThemeToggle();
        initMobileMenu();
        initNavButtons();
        initToolbar();
        initInfiniteScroll();
        syncChapterFilterOptions();
        setChapterFilterAvailability(false);
        updateSortUi();
        await loadExamCatalog();
        clearChapterFilters();
        syncChapterFilterOptions();
        setChapterFilterAvailability(false);
        syncUrlState();
        void loadHudStats();
        void loadSeriesPage({ reset: true });
    };

    void initPage();
})();
