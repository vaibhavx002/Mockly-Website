(function () {
    const API_BASE = String(window.MOCKLY_API_BASE || '/api');
    const fallbackExams = [
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

    const examMeta = {
        'ssc-cgl': {
            badge: 'Most Popular',
            stages: 'Tier I, Tier II',
            totalMocks: 42,
            freeTests: 5,
            pyqs: 18,
            coverage: '94%',
            competition: 'Very High',
            updated: 'Updated 3 days ago',
            sortUpdated: 4,
            fit: [
                'You want a graduate-level target with strong long-term value.',
                'You need both speed and accuracy to improve together.',
                'You prefer bilingual preparation with tier-wise analytics.'
            ],
            freeItems: [
                'Selected starter mocks and exam overview.',
                'Level, language, and stage visibility before launch.',
                'Basic decision support through filters and comparison.'
            ],
            premiumItems: [
                'Deeper rank context and topic-level analytics.',
                'Full tier-wise mock coverage with premium solutions.',
                'Better revision planning for recurring weak areas.'
            ],
            trustNote: 'Strong choice for aspirants who want both opportunity scale and structured practice.',
            summary: 'Best for aspirants aiming at a broad central government career path with competitive but highly structured preparation.',
            compareFocus: 'Balanced',
            candidateLabel: 'Graduate track',
            premiumReason: 'Worth it when you need deep analytics over multiple tiers.'
        },
        'ssc-chsl': {
            badge: 'Fast Start',
            stages: 'Tier I, Tier II',
            totalMocks: 30,
            freeTests: 4,
            pyqs: 14,
            coverage: '91%',
            competition: 'High',
            updated: 'Updated 5 days ago',
            sortUpdated: 3,
            fit: [
                'You want a clearer and more beginner-friendly SSC entry point.',
                'You prefer fast revision cycles and straightforward daily practice.',
                'You want to build confidence before moving toward harder tracks.'
            ],
            freeItems: [
                'Starter mocks with easy-to-read structure.',
                'Exam card comparison and level visibility.',
                'Quick view of free versus Premium support.'
            ],
            premiumItems: [
                'Full library for repetition-based score growth.',
                'Smarter chapter diagnostics and practice depth.',
                'More detailed solution paths for weak-topic recovery.'
            ],
            trustNote: 'Good for candidates who want momentum early and need a simpler SSC preparation entry.',
            summary: 'A strong path for aspirants who want faster ramp-up, clearer basics, and less intimidation at the start.',
            compareFocus: 'Beginner',
            candidateLabel: 'Foundation track',
            premiumReason: 'Worth it when repetition and topic confidence are your main bottlenecks.'
        },
        'rrb-ntpc': {
            badge: 'High Demand',
            stages: 'CBT 1, CBT 2',
            totalMocks: 36,
            freeTests: 5,
            pyqs: 16,
            coverage: '92%',
            competition: 'Very High',
            updated: 'Updated 2 days ago',
            sortUpdated: 5,
            fit: [
                'You want a railway path with heavy emphasis on speed plus consistency.',
                'You prefer mock rhythm that mirrors real-paper sequencing.',
                'You like bilingual support and predictable mock progression.'
            ],
            freeItems: [
                'Starter CBT-style mocks and exam fit view.',
                'Language visibility and compare mode.',
                'Clear recommendation support if you are deciding between RRB tracks.'
            ],
            premiumItems: [
                'Broader test library with tighter speed analysis.',
                'Deeper attempt review and performance tracking.',
                'Smarter planning when timing pressure becomes the main issue.'
            ],
            trustNote: 'Ideal when you want a serious railway target and care about pacing discipline.',
            summary: 'A practical pick for aspirants who need a competitive railway track with heavy mock-driven progress.',
            compareFocus: 'Speed',
            candidateLabel: 'Railway track',
            premiumReason: 'Worth it if your score is capped by timing and not just knowledge.'
        },
        'rrb-group-d': {
            badge: 'Beginner Friendly',
            stages: 'CBT',
            totalMocks: 28,
            freeTests: 4,
            pyqs: 12,
            coverage: '89%',
            competition: 'High',
            updated: 'Updated 6 days ago',
            sortUpdated: 2,
            fit: [
                'You want a simpler start inside railway preparation.',
                'You are building consistency before aiming at harder competitive layers.',
                'You need memory-friendly revision and lighter daily targets.'
            ],
            freeItems: [
                'Foundational mock access for early confidence.',
                'Simple card comparison and launch shortcuts.',
                'Clear view of languages and preparation level.'
            ],
            premiumItems: [
                'Larger repetition bank and mistake tracking.',
                'Deeper analysis once you want to move beyond basics.',
                'Better planning support for routine-led consistency.'
            ],
            trustNote: 'Strong for candidates who want to build exam habit first and optimize later.',
            summary: 'Useful when you need a lower-friction railway path with easier onboarding and repetition.',
            compareFocus: 'Routine',
            candidateLabel: 'Starter railway path',
            premiumReason: 'Worth it when basic mock access is no longer enough for steady improvement.'
        },
        'upsc-prelims': {
            badge: 'Concept Heavy',
            stages: 'Prelims',
            totalMocks: 24,
            freeTests: 3,
            pyqs: 11,
            coverage: '90%',
            competition: 'Extreme',
            updated: 'Updated 4 days ago',
            sortUpdated: 4,
            fit: [
                'You are comfortable with advanced preparation and concept density.',
                'You want current-affairs integration with disciplined analysis.',
                'You care more about quality of reasoning than volume alone.'
            ],
            freeItems: [
                'Selected concept-first mock access.',
                'Clear exam spotlight with realistic difficulty framing.',
                'Honest comparison against other UPSC paths.'
            ],
            premiumItems: [
                'Deeper analysis for elimination patterns and subject balance.',
                'Higher mock depth with better revision support.',
                'Stronger guidance when accuracy under pressure matters most.'
            ],
            trustNote: 'A serious path that needs precision; the page should not oversimplify it.',
            summary: 'Best for committed UPSC aspirants who want realistic difficulty framing and deeper strategic value.',
            compareFocus: 'Current Affairs',
            candidateLabel: 'Advanced strategy track',
            premiumReason: 'Worth it when detailed analysis and disciplined review affect outcomes.'
        },
        'upsc-csat': {
            badge: 'Aptitude Focus',
            stages: 'CSAT',
            totalMocks: 22,
            freeTests: 3,
            pyqs: 10,
            coverage: '88%',
            competition: 'High',
            updated: 'Updated 1 day ago',
            sortUpdated: 6,
            fit: [
                'You want targeted aptitude improvement inside UPSC preparation.',
                'You need better precision with timed practice.',
                'You are fixing elimination and decision-making under pressure.'
            ],
            freeItems: [
                'Starter aptitude mocks and exam overview.',
                'Practical compare view against UPSC Prelims.',
                'Quick recommendation support for focus selection.'
            ],
            premiumItems: [
                'Deeper timed-practice analytics and improvement cues.',
                'More mock depth for precision-building.',
                'Stronger pattern review for recurring aptitude mistakes.'
            ],
            trustNote: 'Useful when aptitude is the bottleneck and you want focused intervention.',
            summary: 'A focused path for aspirants who need targeted CSAT improvement instead of general browsing.',
            compareFocus: 'Aptitude',
            candidateLabel: 'UPSC aptitude track',
            premiumReason: 'Worth it when you want deeper correction on repeated timed mistakes.'
        }
    };

    const state = {
        exams: fallbackExams.slice(),
        catalogVersion: '',
        liveCount: 0,
        plannedCount: 0,
        bodies: [],
        streamFilter: 'all',
        searchText: '',
        sortKey: 'popular',
        compareIds: [],
        selectedExamId: '',
        recommendedExamId: ''
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

    const examGrid = document.getElementById('exam-grid');
    const examEmpty = document.getElementById('exam-empty');
    const catalogStatus = document.getElementById('catalog-status');
    const compareBar = document.getElementById('compare-bar');
    const comparePanel = document.getElementById('compare-panel');
    const searchInputs = [
        document.getElementById('hero-search'),
        document.getElementById('exam-search')
    ].filter(Boolean);
    const sortSelect = document.getElementById('catalog-sort');
    const chipButtons = Array.from(document.querySelectorAll('.chip-btn'));
    const heroFilterButtons = Array.from(document.querySelectorAll('.hero-chip'));
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const spotlightTitle = document.getElementById('spotlight-title');
    const spotlightCopy = document.getElementById('spotlight-copy');
    const spotlightMetrics = document.getElementById('spotlight-metrics');
    const spotlightFitList = document.getElementById('spotlight-fit-list');
    const spotlightFreeList = document.getElementById('spotlight-free-list');
    const spotlightPremiumList = document.getElementById('spotlight-premium-list');
    const spotlightConfidenceTitle = document.getElementById('spotlight-confidence-title');
    const spotlightConfidenceCopy = document.getElementById('spotlight-confidence-copy');
    const spotlightStartBtn = document.getElementById('spotlight-start-btn');
    const spotlightCompareBtn = document.getElementById('spotlight-compare-btn');
    const assessmentForm = document.getElementById('assessment-form');
    const assessmentResult = document.getElementById('assessment-result');
    const themeToggle = document.getElementById('theme-toggle');
    const menuToggle = document.querySelector('.menu-toggle');
    const navContainer = document.querySelector('.nav-container');
    const navLinks = document.querySelector('.nav-links');
    const navActions = document.querySelector('.nav-actions');
    const navLoginBtn = document.getElementById('nav-login-btn');
    const navSignupBtn = document.getElementById('nav-signup-btn');
    const heroHighlightTitle = document.getElementById('hero-highlight-title');
    const heroHighlightCopy = document.getElementById('hero-highlight-copy');
    const heroHighlightBadge = document.getElementById('hero-highlight-badge');
    const heroHighlightMocks = document.getElementById('hero-highlight-mocks');
    const heroHighlightFree = document.getElementById('hero-highlight-free');
    const heroHighlightLanguages = document.getElementById('hero-highlight-languages');
    const heroHighlightLevel = document.getElementById('hero-highlight-level');

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

    const normalizeExamId = (value) => String(value || '').trim().toLowerCase();
    const normalizeFilter = (value) => String(value || '').trim().toLowerCase();
    const toSafeNumber = (value, fallback = 0) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : fallback;
    };
    const toSafeName = (value) => String(value || '').trim();
    const getFirstName = () => {
        const userName = toSafeName(authState.userName);
        if (userName) {
            return userName.split(/\s+/)[0];
        }

        const email = toSafeName(authState.userEmail);
        return email.includes('@') ? email.split('@')[0] : '';
    };
    const persistAuthHint = () => {
        try {
            localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({
                userEmail: toSafeName(authState.userEmail),
                userName: toSafeName(authState.userName),
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
                    userEmail: toSafeName(payload?.user?.email),
                    userName: toSafeName(payload?.user?.name)
                };
            }
        } catch (error) {
            authState = { isAuthenticated: false, userEmail: '', userName: '' };
        }

        persistAuthHint();
        applyAuthNavState();
    };

    const getMeta = (exam) => examMeta[normalizeExamId(exam?.id)] || {};
    const getBodyTitle = (bodyId, stream) => {
        const normalizedBodyId = normalizeFilter(bodyId);
        const mappedBody = state.bodies.find((body) => normalizeFilter(body?.id) === normalizedBodyId);
        if (mappedBody?.title) return String(mappedBody.title).trim();
        return String(stream || 'GENERAL').trim().toUpperCase();
    };

    const buildExamModel = (exam) => {
        const meta = getMeta(exam);
        const id = normalizeExamId(exam?.id);
        const title = String(exam?.title || id || 'Exam').trim();
        const stream = String(exam?.stream || 'GENERAL').trim().toUpperCase();
        const availablePaperIds = Array.isArray(exam?.paperConfig?.availablePaperIds)
            ? exam.paperConfig.availablePaperIds
            : [];
        const defaultPaperId = String(exam?.paperConfig?.defaultPaperId || availablePaperIds[0] || '').trim();
        const isLive = exam?.isLive !== false;
        const bodyId = normalizeFilter(exam?.bodyId || stream);
        const bodyTitle = getBodyTitle(bodyId, stream);
        const chapterStats = exam?.chapterStats && typeof exam.chapterStats === 'object' ? exam.chapterStats : {};
        const chapterCount = Math.max(0, Math.floor(toSafeNumber(chapterStats.chapterCount, 0)));
        const topicCount = Math.max(0, Math.floor(toSafeNumber(chapterStats.topicCount, 0)));
        const subjectCount = Math.max(0, Math.floor(toSafeNumber(chapterStats.subjectCount, 0)));
        const languageSupport = Array.isArray(exam?.paperConfig?.languageSupport)
            ? exam.paperConfig.languageSupport.map((item) => String(item).toUpperCase())
            : ['EN'];
        const exploreHref = `/test-series?target=${encodeURIComponent(id)}`;
        const launchHref = defaultPaperId
            ? `/mock/${encodeURIComponent(id)}?paperId=${encodeURIComponent(defaultPaperId)}`
            : '/#test';

        return {
            ...exam,
            id,
            title,
            stream,
            iconClass: String(exam?.iconClass || 'fa-solid fa-book-open').trim(),
            tags: Array.isArray(exam?.tags) ? exam.tags.map((tag) => String(tag).trim().toLowerCase()) : [],
            description: String(exam?.description || 'Practice with exam-focused mock tests.').trim(),
            recommendedDuration: String(exam?.recommendedDuration || '20 mins').trim(),
            recommendedLevel: String(exam?.recommendedLevel || 'Moderate').trim(),
            isLive,
            bodyId,
            bodyTitle,
            chapterCount,
            topicCount,
            subjectCount,
            languageSupport,
            defaultPaperId,
            availablePaperIds,
            badge: String(meta.badge || (isLive ? (stream === 'UPSC' ? 'Focused Track' : 'Candidate Pick') : 'Coming Soon')).trim(),
            stages: String(meta.stages || 'Exam Stages').trim(),
            totalMocks: Number(meta.totalMocks || Math.max(availablePaperIds.length * 8, 18)),
            freeTests: Number(meta.freeTests || 3),
            pyqs: Number(meta.pyqs || Math.max(availablePaperIds.length * 3, 8)),
            coverage: String(meta.coverage || '90%').trim(),
            competition: String(meta.competition || 'High').trim(),
            updated: String(meta.updated || (isLive ? 'Live in catalog' : 'Planned in catalog')).trim(),
            sortUpdated: Number(meta.sortUpdated || 1),
            fit: Array.isArray(meta.fit) ? meta.fit : ['Useful for structured practice and exam-focused progression.'],
            freeItems: Array.isArray(meta.freeItems) ? meta.freeItems : ['Selected free mocks and guided exam discovery.'],
            premiumItems: Array.isArray(meta.premiumItems) ? meta.premiumItems : ['Deeper analytics and a broader mock library.'],
            trustNote: String(meta.trustNote || 'Transparent positioning helps candidates decide faster.').trim(),
            summary: String(meta.summary || 'A practical path with exam-specific practice and decision support.').trim(),
            compareFocus: String(meta.compareFocus || 'Balanced').trim(),
            candidateLabel: String(meta.candidateLabel || 'Focused preparation').trim(),
            premiumReason: String(meta.premiumReason || 'Useful when you need more depth than starter practice alone.').trim(),
            availabilityLabel: isLive ? 'Live' : 'Planned',
            exploreHref,
            launchHref
        };
    };

    const readUrlState = () => {
        const params = new URLSearchParams(window.location.search);
        const stream = normalizeFilter(params.get('stream') || 'all');
        const query = String(params.get('q') || '').trim();
        const selectedExam = normalizeExamId(params.get('exam') || '');
        state.streamFilter = ['all', 'ssc', 'rrb', 'upsc', 'beginner', 'advanced', 'bilingual', 'popular'].includes(stream)
            ? stream
            : 'all';
        state.searchText = query;
        state.selectedExamId = selectedExam;
    };

    const syncUrlState = () => {
        const url = new URL(window.location.href);
        if (state.streamFilter === 'all') {
            url.searchParams.delete('stream');
        } else {
            url.searchParams.set('stream', state.streamFilter);
        }

        if (state.searchText) {
            url.searchParams.set('q', state.searchText);
        } else {
            url.searchParams.delete('q');
        }

        if (state.selectedExamId) {
            url.searchParams.set('exam', state.selectedExamId);
        } else {
            url.searchParams.delete('exam');
        }

        window.history.replaceState({}, '', url.toString());
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

    const updateFilterButtons = () => {
        chipButtons.forEach((button) => {
            const isActive = normalizeFilter(button.dataset.filter) === state.streamFilter;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });

        heroFilterButtons.forEach((button) => {
            const isActive = normalizeFilter(button.dataset.heroFilter) === state.streamFilter;
            button.classList.toggle('active', isActive);
        });
    };

    const syncSearchInputs = () => {
        searchInputs.forEach((input) => {
            if (input) input.value = state.searchText;
        });
    };

    const sortExams = (exams) => {
        const list = exams.slice();
        switch (state.sortKey) {
            case 'free':
                return list.sort((left, right) => right.freeTests - left.freeTests || right.totalMocks - left.totalMocks);
            case 'mocks':
                return list.sort((left, right) => right.totalMocks - left.totalMocks || right.freeTests - left.freeTests);
            case 'updated':
                return list.sort((left, right) => right.sortUpdated - left.sortUpdated || right.totalMocks - left.totalMocks);
            case 'level':
                return list.sort((left, right) => {
                    const leftScore = /beginner/i.test(left.recommendedLevel) ? 0 : /moderate/i.test(left.recommendedLevel) ? 1 : 2;
                    const rightScore = /beginner/i.test(right.recommendedLevel) ? 0 : /moderate/i.test(right.recommendedLevel) ? 1 : 2;
                    return leftScore - rightScore || right.totalMocks - left.totalMocks;
                });
            case 'popular':
            default:
                return list.sort((left, right) => {
                    const leftPopular = left.tags.includes('popular') ? 1 : 0;
                    const rightPopular = right.tags.includes('popular') ? 1 : 0;
                    return rightPopular - leftPopular || right.totalMocks - left.totalMocks || right.freeTests - left.freeTests;
                });
        }
    };

    const toSearchableText = (exam) => [
        exam.id,
        exam.title,
        exam.stream,
        exam.description,
        exam.recommendedLevel,
        exam.stages,
        exam.competition,
        exam.updated,
        exam.tags.join(' '),
        exam.fit.join(' ')
    ].join(' ').toLowerCase();

    const examMatchesFilter = (exam) => {
        const filter = state.streamFilter;
        if (filter === 'all') return true;
        if (['ssc', 'rrb', 'upsc'].includes(filter)) {
            return exam.stream.toLowerCase() === filter;
        }

        if (filter === 'beginner') {
            return /beginner/i.test(exam.recommendedLevel) || exam.tags.includes('beginner');
        }

        if (filter === 'advanced') {
            return /advanced/i.test(exam.recommendedLevel) || exam.tags.includes('advanced');
        }

        return exam.tags.includes(filter);
    };

    const getFilteredExams = () => {
        const query = state.searchText.trim().toLowerCase();
        const filtered = state.exams
            .map(buildExamModel)
            .filter((exam) => {
                const filterMatch = examMatchesFilter(exam);
                const textMatch = !query || toSearchableText(exam).includes(query);
                return filterMatch && textMatch;
            });

        return sortExams(filtered);
    };

    const renderList = (element, items) => {
        if (!element) return;
        element.innerHTML = '';
        items.forEach((item) => {
            const li = document.createElement('li');
            li.textContent = item;
            element.appendChild(li);
        });
    };

    const renderSpotlight = (examId) => {
        const exam = state.exams.map(buildExamModel).find((item) => item.id === normalizeExamId(examId))
            || getFilteredExams()[0]
            || state.exams.map(buildExamModel)[0];

        if (!exam) return;

        state.selectedExamId = exam.id;
        spotlightTitle.textContent = `${exam.title} is a ${exam.candidateLabel.toLowerCase()} with ${exam.compareFocus.toLowerCase()} preparation emphasis.`;
        spotlightCopy.textContent = exam.summary;

        spotlightMetrics.innerHTML = '';
        [
            { label: 'Stages', value: exam.stages },
            { label: 'Free Tests', value: String(exam.freeTests) },
            { label: 'Total Mocks', value: String(exam.totalMocks) },
            { label: 'Languages', value: exam.languageSupport.join(', ') }
        ].forEach((metric) => {
            const div = document.createElement('div');
            div.className = 'spotlight-metric';
            div.innerHTML = `<span>${metric.label}</span><strong>${metric.value}</strong>`;
            spotlightMetrics.appendChild(div);
        });

        renderList(spotlightFitList, exam.fit);
        renderList(spotlightFreeList, exam.freeItems);
        renderList(spotlightPremiumList, exam.premiumItems);

        spotlightConfidenceTitle.textContent = exam.trustNote;
        spotlightConfidenceCopy.textContent = exam.premiumReason;
        spotlightStartBtn.href = exam.exploreHref;
        spotlightStartBtn.textContent = exam.isLive ? 'Explore Test Series' : 'Preview Test Series';
        spotlightCompareBtn.dataset.examId = exam.id;
        spotlightCompareBtn.textContent = state.compareIds.includes(exam.id) ? 'Remove From Compare' : 'Add To Compare';

        updateHeroHighlight(exam);
        syncUrlState();
        renderGridSelectionState();
    };

    const updateHeroHighlight = (exam) => {
        if (!exam) return;
        heroHighlightTitle.textContent = exam.title;
        heroHighlightCopy.textContent = exam.summary;
        heroHighlightBadge.textContent = exam.stream;
        heroHighlightMocks.textContent = String(exam.totalMocks);
        heroHighlightFree.textContent = String(exam.freeTests);
        heroHighlightLanguages.textContent = exam.languageSupport.join(', ');
        heroHighlightLevel.textContent = exam.recommendedLevel;
    };

    const renderGridSelectionState = () => {
        Array.from(examGrid.querySelectorAll('.catalog-card')).forEach((card) => {
            const examId = normalizeExamId(card.dataset.examId);
            const isSelected = examId === state.selectedExamId;
            card.classList.toggle('is-selected', isSelected);
            card.setAttribute('aria-current', String(isSelected));
        });
    };

    const toggleCompare = (examId) => {
        const normalizedExamId = normalizeExamId(examId);
        if (!normalizedExamId) return;

        const exists = state.compareIds.includes(normalizedExamId);
        if (exists) {
            state.compareIds = state.compareIds.filter((id) => id !== normalizedExamId);
        } else if (state.compareIds.length < 3) {
            state.compareIds = state.compareIds.concat(normalizedExamId);
        } else {
            state.compareIds = state.compareIds.slice(1).concat(normalizedExamId);
        }

        renderCompare();
        renderGrid();
        renderSpotlight(state.selectedExamId || normalizedExamId);
    };

    const renderCompare = () => {
        const selected = state.exams
            .map(buildExamModel)
            .filter((exam) => state.compareIds.includes(exam.id));

        if (!selected.length) {
            compareBar.classList.add('is-hidden');
            comparePanel.classList.add('is-hidden');
            compareBar.innerHTML = '';
            comparePanel.innerHTML = '';
            return;
        }

        compareBar.classList.remove('is-hidden');
        compareBar.innerHTML = `
            <div>
                <strong>${selected.length} exam${selected.length > 1 ? 's' : ''} in compare</strong>
                <div class="compare-summary">${selected.map((exam) => `<span>${exam.title}</span>`).join('')}</div>
            </div>
            <div class="compare-actions">
                <button type="button" class="catalog-utility-btn" data-compare-action="clear">Clear Compare</button>
                <button type="button" class="catalog-utility-btn" data-compare-action="focus">${selected.length >= 2 ? 'View Comparison' : 'Select one more exam'}</button>
            </div>
        `;

        const shouldRenderPanel = selected.length >= 2;
        comparePanel.classList.toggle('is-hidden', !shouldRenderPanel);
        if (!shouldRenderPanel) {
            comparePanel.innerHTML = '';
            return;
        }

        const rows = [
            { label: 'Level', value: (exam) => exam.recommendedLevel },
            { label: 'Stages', value: (exam) => exam.stages },
            { label: 'Free Tests', value: (exam) => String(exam.freeTests) },
            { label: 'Total Mocks', value: (exam) => String(exam.totalMocks) },
            { label: 'Languages', value: (exam) => exam.languageSupport.join(', ') },
            { label: 'Competition', value: (exam) => exam.competition },
            { label: 'Best For', value: (exam) => exam.compareFocus }
        ];

        comparePanel.innerHTML = `
            <div class="compare-panel-grid" style="--compare-columns: ${selected.length};">
                ${rows.map((row) => `
                    <div class="compare-cell label">${row.label}</div>
                    ${selected.map((exam) => `
                        <div class="compare-cell">
                            <strong>${exam.title}</strong>
                            <span>${row.value(exam)}</span>
                        </div>
                    `).join('')}
                `).join('')}
            </div>
        `;
    };

    const createExamCard = (exam) => {
        const card = document.createElement('article');
        const isCompared = state.compareIds.includes(exam.id);
        const isSelected = exam.id === state.selectedExamId;
        card.className = `catalog-card${isSelected ? ' is-selected' : ''}`;
        card.dataset.examId = exam.id;
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-current', String(isSelected));
        card.innerHTML = `
            <div class="catalog-card-head">
                <span class="catalog-stream">${exam.stream}</span>
                <span class="catalog-live-pill ${exam.isLive ? 'live' : 'planned'}">${exam.availabilityLabel}</span>
            </div>
            <div class="catalog-card-main">
                <div class="catalog-icon"><i class="${exam.iconClass}" aria-hidden="true"></i></div>
                <div>
                    <h3>${exam.title}</h3>
                    <p>${exam.description}</p>
                </div>
            </div>
            <div class="catalog-metrics">
                <div class="catalog-metric">
                    <span>Mocks</span>
                    <strong>${exam.totalMocks}</strong>
                </div>
                <div class="catalog-metric">
                    <span>Free</span>
                    <strong>${exam.freeTests}</strong>
                </div>
                <div class="catalog-metric">
                    <span>Stages</span>
                    <strong>${exam.stages}</strong>
                </div>
                <div class="catalog-metric">
                    <span>Level</span>
                    <strong>${exam.recommendedLevel}</strong>
                </div>
            </div>
            <div class="catalog-tags">
                ${[
                    `Body: ${exam.bodyTitle}`,
                    `Chapters: ${exam.chapterCount || '--'}`,
                    `Topics: ${exam.topicCount || '--'}`,
                    `PYQ: ${exam.pyqs}`,
                    `Coverage: ${exam.coverage}`,
                    `Languages: ${exam.languageSupport.join('/')}`,
                    `Updated: ${exam.updated.replace('Updated ', '')}`
                ].map((item) => `<span>${item}</span>`).join('')}
            </div>
            <div class="catalog-trust">
                <span>${exam.trustNote}</span>
            </div>
            <div class="catalog-actions">
                <a href="${exam.exploreHref}" class="btn btn-primary">${exam.isLive ? 'Explore Test Series' : 'Preview Series'}</a>
                <button type="button" class="catalog-utility-btn" data-action="compare" data-exam-id="${exam.id}">
                    ${isCompared ? 'Remove Compare' : 'Compare'}
                </button>
            </div>
        `;

        const compareButton = card.querySelector('[data-action="compare"]');
        if (compareButton) {
            compareButton.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleCompare(event.currentTarget.dataset.examId);
            });
        }

        card.addEventListener('click', () => {
            renderSpotlight(exam.id);
            document.getElementById('exam-spotlight')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                renderSpotlight(exam.id);
                document.getElementById('exam-spotlight')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        return card;
    };

    const renderGrid = () => {
        const filteredExams = getFilteredExams();
        examGrid.innerHTML = '';

        if (!filteredExams.length) {
            examEmpty.style.display = 'block';
            catalogStatus.textContent = '0 exams matched your filters.';
            return;
        }

        const liveInView = filteredExams.filter((exam) => exam.isLive).length;
        const plannedInView = filteredExams.length - liveInView;
        examEmpty.style.display = 'none';
        catalogStatus.textContent = `${filteredExams.length} exams loaded • ${liveInView} live • ${plannedInView} planned.`;

        filteredExams.forEach((exam) => {
            examGrid.appendChild(createExamCard(exam));
        });

        if (!filteredExams.some((exam) => exam.id === state.selectedExamId)) {
            renderSpotlight(filteredExams[0].id);
        } else {
            renderGridSelectionState();
        }
    };

    const setFilterState = (filterKey) => {
        state.streamFilter = normalizeFilter(filterKey) || 'all';
        updateFilterButtons();
        syncUrlState();
        renderGrid();
    };

    const updateStatsUi = (payload) => {
        const aspirantsValue = formatCompact(payload?.aspirants, '+');
        const selectionsValue = formatCompact(payload?.selections, '+');
        const ratingValue = `${Number(payload?.rating || 4.9).toFixed(1)}/5`;
        const trustRatingValue = Number(payload?.rating || 4.9).toFixed(1);

        [
            ['hero-aspirants', aspirantsValue],
            ['trust-aspirants', aspirantsValue],
            ['hero-selections', selectionsValue],
            ['trust-selections', selectionsValue],
            ['hero-rating', ratingValue],
            ['trust-rating', trustRatingValue]
        ].forEach(([id, text]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = text;
        });
    };

    const loadStats = async () => {
        try {
            const response = await fetch(`${API_BASE}/stats`, { headers: { Accept: 'application/json' } });
            if (!response.ok) {
                throw new Error(`Stats request failed with ${response.status}`);
            }

            updateStatsUi(await response.json());
        } catch (error) {
            updateStatsUi({ aspirants: 800000, selections: 12000, rating: 4.9 });
        }
    };

    const loadExams = async () => {
        try {
            const response = await fetch(`${API_BASE}/exam-catalog`, { headers: { Accept: 'application/json' } });
            if (!response.ok) {
                throw new Error(`Catalog request failed with ${response.status}`);
            }

            const payload = await response.json();
            if (Array.isArray(payload?.exams) && payload.exams.length) {
                state.exams = payload.exams;
                state.catalogVersion = String(payload?.version || '').trim();
                state.liveCount = Math.max(0, Math.floor(toSafeNumber(payload?.liveExams || payload?.liveCount, 0)));
                state.plannedCount = Math.max(0, Math.floor(toSafeNumber(payload?.plannedExams || payload?.plannedCount, 0)));
                state.bodies = Array.isArray(payload?.bodies) ? payload.bodies : [];
                catalogStatus.textContent = `Catalog v${state.catalogVersion || 'local'} loaded • ${state.liveCount} live • ${state.plannedCount} planned.`;
            } else {
                catalogStatus.textContent = 'Using fallback exam catalog because API returned no exams.';
            }
        } catch (error) {
            try {
                const examsResponse = await fetch(`${API_BASE}/exams`, { headers: { Accept: 'application/json' } });
                if (examsResponse.ok) {
                    const payload = await examsResponse.json();
                    if (Array.isArray(payload?.exams) && payload.exams.length) {
                        state.exams = payload.exams;
                    }
                    state.catalogVersion = String(payload?.catalogVersion || '').trim();
                    state.liveCount = Math.max(0, Math.floor(toSafeNumber(payload?.liveCount, 0)));
                    state.plannedCount = Math.max(0, Math.floor(toSafeNumber(payload?.plannedCount, 0)));
                    state.bodies = Array.isArray(payload?.bodies) ? payload.bodies : [];
                    catalogStatus.textContent = `Exam API loaded${state.catalogVersion ? ` (catalog v${state.catalogVersion})` : ''}.`;
                } else {
                    catalogStatus.textContent = 'Using fallback exam catalog because API is unavailable.';
                }
            } catch (nestedError) {
                catalogStatus.textContent = 'Using fallback exam catalog because API is unavailable.';
            }
        }

        renderGrid();
        renderCompare();
    };

    const localRecommendation = (answers) => {
        const target = normalizeFilter(answers?.target || 'ssc');
        const stage = normalizeFilter(answers?.stage || 'beginner');
        const focus = normalizeFilter(answers?.focus || 'balanced');

        const chooseLiveExam = (stream, preferredIds) => {
            const candidates = state.exams
                .map(buildExamModel)
                .filter((exam) => exam.stream.toLowerCase() === stream && exam.isLive);

            const preferred = preferredIds
                .map((id) => normalizeExamId(id))
                .find((id) => candidates.some((exam) => exam.id === id));

            if (preferred) return preferred;
            if (candidates.length) return candidates[0].id;

            return normalizeExamId(
                state.exams
                    .map(buildExamModel)
                    .find((exam) => exam.stream.toLowerCase() === stream)?.id
            );
        };

        if (target === 'upsc') {
            return {
                recommendedExamId: focus === 'aptitude'
                    ? chooseLiveExam('upsc', ['upsc-csat', 'upsc-prelims'])
                    : chooseLiveExam('upsc', ['upsc-prelims', 'upsc-csat']),
                confidence: stage === 'advanced' ? 'High' : 'Moderate',
                reason: focus === 'aptitude'
                    ? 'Your focus points to a targeted CSAT aptitude build.'
                    : 'Your answers suggest a concept-heavy UPSC preparation route.'
            };
        }

        if (target === 'rrb') {
            return {
                recommendedExamId: stage === 'beginner'
                    ? chooseLiveExam('rrb', ['rrb-group-d', 'rrb-ntpc'])
                    : chooseLiveExam('rrb', ['rrb-ntpc', 'rrb-group-d']),
                confidence: 'High',
                reason: stage === 'beginner'
                    ? 'You look better suited to a lower-friction railway start.'
                    : 'Your answers point to a more competitive railway track with stronger speed demands.'
            };
        }

        return {
            recommendedExamId: stage === 'beginner'
                ? chooseLiveExam('ssc', ['ssc-chsl', 'ssc-cgl'])
                : chooseLiveExam('ssc', ['ssc-cgl', 'ssc-chsl']),
            confidence: stage === 'beginner' ? 'High' : 'Moderate',
            reason: stage === 'beginner'
                ? 'You likely need a simpler SSC starting point to build confidence quickly.'
                : 'You look ready for a broader SSC target with stronger long-term payoff.'
        };
    };

    const renderAssessmentResult = (result) => {
        const examId = normalizeExamId(result?.recommendedExamId || result?.examId);
        const exam = state.exams.map(buildExamModel).find((item) => item.id === examId);

        if (!exam) {
            assessmentResult.innerHTML = `
                <strong>Recommendation unavailable.</strong>
                <p>Please try again with another combination.</p>
            `;
            return;
        }

        state.recommendedExamId = exam.id;
        assessmentResult.innerHTML = `
            <strong>${exam.title} looks like your best next track.</strong>
            <p>${String(result?.reason || exam.summary).trim()}</p>
            <p>Confidence: <strong>${String(result?.confidence || 'Moderate')}</strong></p>
        `;

        renderSpotlight(exam.id);
    };

    const initAssessment = () => {
        if (!assessmentForm) return;

        assessmentForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(assessmentForm);
            const answers = Object.fromEntries(formData.entries());
            assessmentResult.innerHTML = `
                <strong>Finding the best exam path...</strong>
                <p>Checking your answers against the recommendation rules.</p>
            `;

            try {
                const response = await fetch(`${API_BASE}/assessment/recommend`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    body: JSON.stringify({ answers })
                });

                if (!response.ok) {
                    throw new Error(`Recommendation request failed with ${response.status}`);
                }

                renderAssessmentResult(await response.json());
            } catch (error) {
                renderAssessmentResult(localRecommendation(answers));
            }
        });
    };

    const initSearch = () => {
        searchInputs.forEach((input) => {
            input.addEventListener('input', (event) => {
                state.searchText = String(event.target.value || '');
                syncSearchInputs();
                syncUrlState();
                renderGrid();
            });
        });

        document.getElementById('hero-search-form')?.addEventListener('submit', (event) => {
            event.preventDefault();
            document.getElementById('exam-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    const initSort = () => {
        if (!sortSelect) return;
        sortSelect.value = state.sortKey;
        sortSelect.addEventListener('change', (event) => {
            state.sortKey = String(event.target.value || 'popular');
            renderGrid();
        });
    };

    const initFilters = () => {
        chipButtons.forEach((button) => {
            button.addEventListener('click', () => {
                setFilterState(button.dataset.filter || 'all');
            });
        });

        heroFilterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const filterKey = button.dataset.heroFilter || 'all';
                setFilterState(filterKey);
                document.getElementById('exam-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        clearFiltersBtn?.addEventListener('click', () => {
            state.searchText = '';
            state.streamFilter = 'all';
            state.sortKey = 'popular';
            syncSearchInputs();
            if (sortSelect) sortSelect.value = state.sortKey;
            updateFilterButtons();
            syncUrlState();
            renderGrid();
        });
    };

    const initCompareActions = () => {
        compareBar.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-compare-action]');
            if (!actionButton) return;

            const action = actionButton.getAttribute('data-compare-action');
            if (action === 'clear') {
                state.compareIds = [];
            } else if (action === 'focus' && state.compareIds.length >= 2) {
                comparePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            renderCompare();
            renderGrid();
            renderSpotlight(state.selectedExamId);
        });

        spotlightCompareBtn?.addEventListener('click', (event) => {
            const examId = event.currentTarget.dataset.examId;
            toggleCompare(examId);
        });
    };

    const initPage = () => {
        readUrlState();
        initThemeToggle();
        initMobileMenu();
        initNavButtons();
        initSearch();
        initSort();
        initFilters();
        initCompareActions();
        initAssessment();
        syncSearchInputs();
        updateFilterButtons();
        if (sortSelect) sortSelect.value = state.sortKey;
        void loadStats();
        void loadExams();
    };

    initPage();
})();
