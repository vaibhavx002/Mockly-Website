document.addEventListener('DOMContentLoaded', async () => {
    // === Mobile Menu Logic ===
    const menuToggle = document.querySelector('.menu-toggle');
    const navContainer = document.querySelector('.nav-container');
    const navLinks = document.querySelector('.nav-links');
    const navActions = document.querySelector('.nav-actions');

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

    if (menuToggle && navContainer && navLinks && navActions) {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.addEventListener('click', () => {
            const isOpen = navContainer.classList.contains('mobile-open');
            if (isOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        navContainer.addEventListener('click', (event) => {
            if (event.target.closest('.nav-links a')) {
                closeMobileMenu();
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
    }

    // === Dark Mode Toggle Logic ===
    const themeToggle = document.getElementById('theme-toggle');
    
    // Check local storage for existing theme preference
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.body.classList.add(currentTheme);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            
            let theme = 'light-theme';
            if (document.body.classList.contains('dark-theme')) {
                theme = 'dark-theme';
            }
            
            // Save preference to localStorage
            localStorage.setItem('theme', theme);
        });
    }

    // === Hero Slider + Typing Effect ===
    const heroSlider = document.getElementById('hero-slider');
    const heroTrack = heroSlider ? heroSlider.querySelector('.hero-track') : null;
    const heroSlides = heroSlider ? Array.from(heroSlider.querySelectorAll('.hero-slide')) : [];
    const heroDots = heroSlider ? Array.from(heroSlider.querySelectorAll('.hero-dot')) : [];
    const heroPrevBtn = document.getElementById('hero-prev');
    const heroNextBtn = document.getElementById('hero-next');
    const heroSlide1Subtitle = document.getElementById('hero-slide1-subtitle');
    const heroSlide1Stat1Num = document.getElementById('hero-slide1-stat1-num');
    const heroSlide1Stat1Label = document.getElementById('hero-slide1-stat1-label');
    const heroSlide1Stat2Num = document.getElementById('hero-slide1-stat2-num');
    const heroSlide1Stat2Label = document.getElementById('hero-slide1-stat2-label');
    const heroSlide1Stat3Num = document.getElementById('hero-slide1-stat3-num');
    const heroSlide1Stat3Label = document.getElementById('hero-slide1-stat3-label');
    const heroSlide2Subtitle = document.getElementById('hero-slide2-subtitle');
    const heroSlide2Stat1Num = document.getElementById('hero-slide2-stat1-num');
    const heroSlide2Stat1Label = document.getElementById('hero-slide2-stat1-label');
    const heroSlide2Stat2Num = document.getElementById('hero-slide2-stat2-num');
    const heroSlide2Stat2Label = document.getElementById('hero-slide2-stat2-label');
    const heroSlide2Stat3Num = document.getElementById('hero-slide2-stat3-num');
    const heroSlide2Stat3Label = document.getElementById('hero-slide2-stat3-label');
    const heroSlide2InsightList = document.getElementById('hero-slide2-insight-list');
    const heroSlide2ProgressLabel = document.getElementById('hero-slide2-progress-label');
    const heroSlide2ProgressFill = document.getElementById('hero-slide2-progress-fill');

    let activeHeroIndex = 0;
    let heroAutoSlideTimer = null;
    let typingTimer = null;

    const clearTypingTimer = () => {
        if (typingTimer) {
            clearTimeout(typingTimer);
            typingTimer = null;
        }
    };

    const startTypingForSlide = (slide) => {
        clearTypingTimer();

        heroSlides.forEach((heroSlide) => {
            const typingEl = heroSlide.querySelector('.typing-text');
            if (typingEl && heroSlide !== slide) {
                typingEl.textContent = '';
            }
        });

        const typingEl = slide.querySelector('.typing-text');
        if (!typingEl) return;

        const textToType = typingEl.getAttribute('data-text') || '';
        typingEl.textContent = '';

        let charIndex = 0;
        const typeStep = () => {
            if (!slide.classList.contains('active')) return;

            if (charIndex <= textToType.length) {
                typingEl.textContent = textToType.slice(0, charIndex);
                charIndex += 1;
                typingTimer = setTimeout(typeStep, 55);
            }
        };

        typingTimer = setTimeout(typeStep, 180);
    };

    const updateHeroSlide = (nextIndex) => {
        if (!heroSlides.length || !heroTrack) return;

        activeHeroIndex = (nextIndex + heroSlides.length) % heroSlides.length;
        heroTrack.style.transform = `translateX(-${activeHeroIndex * 100}%)`;

        heroSlides.forEach((slide, index) => {
            const isActive = index === activeHeroIndex;
            slide.classList.toggle('active', isActive);
            slide.setAttribute('aria-hidden', String(!isActive));
        });

        heroDots.forEach((dot, index) => {
            dot.classList.toggle('active', index === activeHeroIndex);
        });

        startTypingForSlide(heroSlides[activeHeroIndex]);
    };

    const startHeroAutoSlide = () => {
        if (heroAutoSlideTimer) {
            clearInterval(heroAutoSlideTimer);
        }

        heroAutoSlideTimer = setInterval(() => {
            updateHeroSlide(activeHeroIndex + 1);
        }, 7000);
    };

    if (heroSlides.length > 1 && heroTrack) {
        updateHeroSlide(0);
        startHeroAutoSlide();

        if (heroPrevBtn) {
            heroPrevBtn.addEventListener('click', () => {
                updateHeroSlide(activeHeroIndex - 1);
                startHeroAutoSlide();
            });
        }

        if (heroNextBtn) {
            heroNextBtn.addEventListener('click', () => {
                updateHeroSlide(activeHeroIndex + 1);
                startHeroAutoSlide();
            });
        }

        heroDots.forEach((dot) => {
            dot.addEventListener('click', () => {
                const targetSlide = Number(dot.getAttribute('data-slide'));
                updateHeroSlide(targetSlide);
                startHeroAutoSlide();
            });
        });

        heroSlider.addEventListener('mouseenter', () => {
            if (heroAutoSlideTimer) {
                clearInterval(heroAutoSlideTimer);
            }
        });

        heroSlider.addEventListener('mouseleave', startHeroAutoSlide);
    }

    // === Exam Hub Filters + Reveal ===
    const examFilterWrap = document.getElementById('exam-filter-chips');
    const examGrid = document.getElementById('exam-grid');
    const trustAspirantsValue = document.getElementById('trust-aspirants-value');
    const trustSelectionsValue = document.getElementById('trust-selections-value');
    const trustRatingValue = document.getElementById('trust-rating-value');
    const mockLaunchShell = document.getElementById('mock-launch-shell');
    const mockLaunchCopy = document.getElementById('mock-launch-copy');
    const selectedExamTitle = document.getElementById('selected-exam-title');
    const selectedExamDuration = document.getElementById('selected-exam-duration');
    const selectedExamLevel = document.getElementById('selected-exam-level');
    const startSelectedMockBtn = document.getElementById('start-selected-mock-btn');
    const mockLaunchStatus = document.getElementById('mock-launch-status');
    const mockResumeIndicator = document.getElementById('mock-resume-indicator');
    const mockResumeText = document.getElementById('mock-resume-text');
    const mockResumeBtn = document.getElementById('mock-resume-btn');
    const examFilterButtons = examFilterWrap
        ? Array.from(examFilterWrap.querySelectorAll('.chip-btn'))
        : [];
    const EXAM_FILTER_QUERY_KEY = 'exam';
    const EXAM_FILTER_STORAGE_KEY = 'mockly_exam_filter';
    const MOCK_EXAM_QUERY_KEY = 'mock';
    const MOCK_EXAM_STORAGE_KEY = 'mockly_selected_exam';
    const MOCK_LAUNCH_LOCK_STORAGE_KEY = 'mockly_launch_lock';
    const INCOMPLETE_MOCK_STORAGE_KEY = 'mockly_incomplete_mock';
    const MOCK_LAUNCH_LOCK_TTL_MS = 4000;
    const AUTH_SESSION_STORAGE_KEY = 'mockly_auth_session';
    const CSRF_COOKIE_NAME = 'mockly_csrf_token';
    const CSRF_HEADER_NAME = 'x-csrf-token';
    const USER_PROGRESS_STORAGE_KEY = 'mockly_user_progress';
    let pendingMockExam = null;
    let authSession = { isAuthenticated: false, userEmail: '', userName: '' };
    let mockLaunchInProgress = false;
    let shouldLaunchAfterAuth = false;

    try {
        const savedAuthSession = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
        if (savedAuthSession) {
            const parsedSession = JSON.parse(savedAuthSession);
            authSession = {
                // Server session endpoint remains the source of truth.
                isAuthenticated: false,
                userEmail: String(parsedSession?.userEmail || ''),
                userName: String(parsedSession?.userName || '')
            };
        }
    } catch (error) {
        authSession = { isAuthenticated: false, userEmail: '', userName: '' };
    }

    const fallbackExamCatalog = [
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
            },
            ctaHref: '#test'
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
            },
            ctaHref: '#test'
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
            },
            ctaHref: '#test'
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
            },
            ctaHref: '#test'
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
            },
            ctaHref: '#test'
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
            },
            ctaHref: '#test'
        }
    ];

    const API_ENABLED = window.MOCKLY_ENABLE_API === true || String(window.MOCKLY_ENABLE_API || '').toLowerCase() === 'true';
    const API_BASE_URL = String(window.MOCKLY_API_BASE || '/api');
    const EXAM_API_ENDPOINT = `${API_BASE_URL}/exams`;
    const ASSESSMENT_API_ENDPOINT = `${API_BASE_URL}/assessment/recommend`;
    const MOCK_LAUNCH_API_ENDPOINT = `${API_BASE_URL}/mocks/launch`;
    const USER_PERSONALIZATION_API_ENDPOINT = `${API_BASE_URL}/users/personalization`;
    const USER_DASHBOARD_API_ENDPOINT = `${API_BASE_URL}/users/dashboard`;
    const USER_ATTEMPTS_API_ENDPOINT = `${API_BASE_URL}/users/attempts`;
    const USER_MOCK_CARD_PERFORMANCE_API_ENDPOINT = `${API_BASE_URL}/users/mock-card-performance`;
    const USER_INCOMPLETE_SESSION_API_ENDPOINT = `${API_BASE_URL}/users/incomplete-session`;
    const PLATFORM_STATS_API_ENDPOINT = `${API_BASE_URL}/stats`;
    const AUTH_LOGIN_API_ENDPOINT = `${API_BASE_URL}/auth/login`;
    const AUTH_SIGNUP_API_ENDPOINT = `${API_BASE_URL}/auth/signup`;
    const AUTH_SESSION_API_ENDPOINT = `${API_BASE_URL}/auth/session`;
    const AUTH_REFRESH_API_ENDPOINT = `${API_BASE_URL}/auth/refresh`;
    const AUTH_LOGOUT_API_ENDPOINT = `${API_BASE_URL}/auth/logout`;
    const API_TIMEOUT_MS = 5000;

    let examCatalog = [...fallbackExamCatalog];
    let examById = new Map(examCatalog.map((exam) => [exam.id, exam]));
    let activeExamFilterState = 'all';
    let selectedExamIdState = '';
    let mockCardPerformanceByExam = new Map();
    let mockCardMinimumCutoffPercent = 70;

    const normalizePaperConfig = (paperConfig, examId) => {
        const source = paperConfig && typeof paperConfig === 'object' ? paperConfig : {};
        const examKey = String(examId || '').trim().toLowerCase() || 'mock';

        const availablePaperIds = Array.isArray(source.availablePaperIds)
            ? source.availablePaperIds
                .map((paperId) => String(paperId || '').trim().toLowerCase())
                .filter(Boolean)
            : [];

        const defaultPaperIdRaw = String(source.defaultPaperId || '').trim().toLowerCase();
        const defaultPaperId = defaultPaperIdRaw
            || availablePaperIds[0]
            || `${examKey}-set1`;

        const normalizedAvailablePaperIds = availablePaperIds.length
            ? Array.from(new Set([...availablePaperIds, defaultPaperId]))
            : [defaultPaperId];

        const languageSupport = Array.isArray(source.languageSupport)
            ? source.languageSupport
                .map((language) => String(language || '').trim().toLowerCase())
                .filter(Boolean)
            : [];

        return {
            defaultPaperId,
            availablePaperIds: normalizedAvailablePaperIds,
            languageSupport: languageSupport.length
                ? Array.from(new Set(languageSupport))
                : ['en']
        };
    };

    const getDefaultUserProgress = () => ({
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

    const sanitizePreferences = (rawPreferences) => {
        const source = rawPreferences && typeof rawPreferences === 'object' ? rawPreferences : {};
        const preferredExamIdRaw = String(source.preferredExamId || '').trim().toLowerCase();
        const preferredLanguageRaw = String(source.preferredLanguage || '').trim().toLowerCase();
        const weeklyTargetRaw = Number(source.weeklyMockTarget);
        const focusAreaRaw = String(source.focusArea || '').trim().toLowerCase();

        const allowedFocusArea = new Set(['balanced', 'speed', 'accuracy', 'current-affairs', 'aptitude']);

        return {
            preferredExamId: examById.has(preferredExamIdRaw) ? preferredExamIdRaw : '',
            preferredLanguage: ['en', 'hi'].includes(preferredLanguageRaw) ? preferredLanguageRaw : 'en',
            weeklyMockTarget: Number.isFinite(weeklyTargetRaw)
                ? Math.max(1, Math.min(50, Math.floor(weeklyTargetRaw)))
                : 5,
            focusArea: allowedFocusArea.has(focusAreaRaw) ? focusAreaRaw : 'balanced'
        };
    };

    const normalizeEventSourceKey = (rawValue) => {
        const normalized = String(rawValue || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40);

        return normalized || 'unknown';
    };

    const sanitizeProgressCounter = (source) => {
        const safeCounter = {};
        const rawCounter = source && typeof source === 'object' ? source : {};

        Object.entries(rawCounter).forEach(([key, value]) => {
            const examId = String(key || '').trim().toLowerCase();
            const numericValue = Number(value);

            if (!examId) return;
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
            const examId = String(key || '').trim().toLowerCase();
            if (!examId || !examById.has(examId)) return;

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

    const sanitizeUserProgress = (rawProgress) => {
        const source = rawProgress && typeof rawProgress === 'object' ? rawProgress : {};

        return {
            lastSelectedExamId: String(source.lastSelectedExamId || '').trim().toLowerCase(),
            lastRecommendedExamId: String(source.lastRecommendedExamId || '').trim().toLowerCase(),
            selectionCountByExam: sanitizeProgressCounter(source.selectionCountByExam),
            launchCountByExam: sanitizeProgressCounter(source.launchCountByExam),
            recommendationCountByExam: sanitizeProgressCounter(source.recommendationCountByExam),
            eventSourceByExam: sanitizeEventSourceByExam(source.eventSourceByExam),
            preferences: sanitizePreferences(source.preferences),
            updatedAt: String(source.updatedAt || '').trim()
        };
    };

    const getProgressUserKey = () => {
        if (!authSession.isAuthenticated || !authSession.userEmail) return 'guest';
        return String(authSession.userEmail || '').trim().toLowerCase() || 'guest';
    };

    let userProgressStore = {};

    try {
        const rawProgressStore = localStorage.getItem(USER_PROGRESS_STORAGE_KEY);
        const parsedProgressStore = rawProgressStore ? JSON.parse(rawProgressStore) : {};

        if (parsedProgressStore && typeof parsedProgressStore === 'object') {
            userProgressStore = parsedProgressStore;
        }
    } catch (error) {
        userProgressStore = {};
    }

    let activeUserProgress = getDefaultUserProgress();

    const saveProgressStore = () => {
        try {
            localStorage.setItem(USER_PROGRESS_STORAGE_KEY, JSON.stringify(userProgressStore));
        } catch (error) {
            // localStorage may be unavailable in private browsing or restricted environments
        }
    };

    const loadActiveUserProgressFromStore = () => {
        const progressKey = getProgressUserKey();
        const rawProgress = userProgressStore[progressKey];
        activeUserProgress = rawProgress
            ? sanitizeUserProgress(rawProgress)
            : getDefaultUserProgress();

        return activeUserProgress;
    };

    const saveActiveUserProgress = ({ syncApi = true } = {}) => {
        const progressKey = getProgressUserKey();
        userProgressStore[progressKey] = sanitizeUserProgress(activeUserProgress);
        saveProgressStore();

        if (syncApi && API_ENABLED && authSession.isAuthenticated && authSession.userEmail) {
            void requestJson(USER_PERSONALIZATION_API_ENDPOINT, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    profile: userProgressStore[progressKey]
                })
            }).catch(() => null);
        }
    };

    const rebuildExamIndex = () => {
        examById = new Map(examCatalog.map((exam) => [exam.id, exam]));
    };

    const requestJson = async (url, options = {}, timeoutMs = API_TIMEOUT_MS, allowAuthRefresh = true) => {
        const controller = new AbortController();
        const timeoutHandle = window.setTimeout(() => controller.abort(), timeoutMs);

        const method = String(options?.method || 'GET').trim().toUpperCase();
        const isStateChangingRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
        const headers = {
            ...(options?.headers || {})
        };

        if (isStateChangingRequest) {
            const cookieEntries = String(document.cookie || '').split(';');
            const csrfEntry = cookieEntries.find((entry) => String(entry || '').trim().startsWith(`${CSRF_COOKIE_NAME}=`));
            const csrfToken = csrfEntry
                ? decodeURIComponent(String(csrfEntry.split('=').slice(1).join('=') || '').trim())
                : '';

            if (csrfToken) {
                headers[CSRF_HEADER_NAME] = csrfToken;
            }
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'same-origin',
                signal: controller.signal
            });

            const rawText = await response.text();
            let payload = null;

            if (rawText) {
                try {
                    payload = JSON.parse(rawText);
                } catch (parseError) {
                    payload = null;
                }
            }

            if (!response.ok) {
                if (
                    response.status === 401
                    && allowAuthRefresh
                    && API_ENABLED
                    && !String(url || '').includes('/api/auth/login')
                    && !String(url || '').includes('/api/auth/signup')
                    && !String(url || '').includes('/api/auth/refresh')
                ) {
                    try {
                        const refreshResponse = await fetch(AUTH_REFRESH_API_ENDPOINT, {
                            method: 'POST',
                            credentials: 'same-origin'
                        });

                        if (refreshResponse.ok) {
                            return requestJson(url, options, timeoutMs, false);
                        }
                    } catch (refreshError) {
                        // Fall through to standard 401 handling.
                    }
                }

                const message = payload?.message || `Request failed with status ${response.status}`;
                throw new Error(message);
            }

            return payload;
        } finally {
            clearTimeout(timeoutHandle);
        }
    };

    const getExamPersonalizationScore = (examId) => {
        const normalizedExamId = String(examId || '').trim().toLowerCase();
        if (!normalizedExamId) return 0;

        const selectionScore = Number(activeUserProgress.selectionCountByExam?.[normalizedExamId] || 0) * 2;
        const launchScore = Number(activeUserProgress.launchCountByExam?.[normalizedExamId] || 0) * 5;
        const recommendationScore = Number(activeUserProgress.recommendationCountByExam?.[normalizedExamId] || 0) * 4;
        const lastSelectedBoost = activeUserProgress.lastSelectedExamId === normalizedExamId ? 8 : 0;
        const lastRecommendedBoost = activeUserProgress.lastRecommendedExamId === normalizedExamId ? 6 : 0;

        return selectionScore + launchScore + recommendationScore + lastSelectedBoost + lastRecommendedBoost;
    };

    const getExamPersonalizationMeta = (examId) => {
        const normalizedExamId = String(examId || '').trim().toLowerCase();
        const score = getExamPersonalizationScore(normalizedExamId);
        const launchCount = Number(activeUserProgress.launchCountByExam?.[normalizedExamId] || 0);
        const recommendationCount = Number(activeUserProgress.recommendationCountByExam?.[normalizedExamId] || 0);

        let badgeText = '';
        if (activeUserProgress.lastSelectedExamId === normalizedExamId) {
            badgeText = 'Recently Picked';
        } else if (activeUserProgress.lastRecommendedExamId === normalizedExamId) {
            badgeText = 'Recommended';
        } else if (score > 0) {
            badgeText = 'For You';
        }

        return {
            score,
            launchCount,
            recommendationCount,
            badgeText
        };
    };

    const getPersonalizedCatalog = () => {
        const fallbackOrder = new Map(examCatalog.map((exam, index) => [exam.id, index]));

        return [...examCatalog].sort((leftExam, rightExam) => {
            if (!authSession.isAuthenticated) {
                return (fallbackOrder.get(leftExam.id) || 0) - (fallbackOrder.get(rightExam.id) || 0);
            }

            const scoreDelta = getExamPersonalizationScore(rightExam.id) - getExamPersonalizationScore(leftExam.id);
            if (scoreDelta !== 0) return scoreDelta;

            return (fallbackOrder.get(leftExam.id) || 0) - (fallbackOrder.get(rightExam.id) || 0);
        });
    };

    const hydratePersonalizationFromApi = async () => {
        if (!API_ENABLED || !authSession.isAuthenticated || !authSession.userEmail) return false;

        try {
            const payload = await requestJson(USER_PERSONALIZATION_API_ENDPOINT, {
                method: 'GET'
            });

            const profile = sanitizeUserProgress(payload?.profile || payload || {});
            activeUserProgress = profile;
            saveActiveUserProgress({ syncApi: false });
            return true;
        } catch (error) {
            return false;
        }
    };

    const trackPersonalizationEvent = (eventType, examId, options = {}) => {
        const { refreshUi = true, source = 'unknown' } = options;
        const normalizedExamId = String(examId || '').trim().toLowerCase();
        if (!normalizedExamId || !examById.has(normalizedExamId)) return;
        if (!['selected', 'launched', 'recommended'].includes(eventType)) return;

        const nextProgress = sanitizeUserProgress(activeUserProgress);
        const sourceKey = normalizeEventSourceKey(source);

        if (!nextProgress.eventSourceByExam[normalizedExamId]) {
            nextProgress.eventSourceByExam[normalizedExamId] = {
                selected: {},
                launched: {},
                recommended: {}
            };
        }

        if (eventType === 'selected') {
            nextProgress.lastSelectedExamId = normalizedExamId;
            nextProgress.selectionCountByExam[normalizedExamId] = Number(nextProgress.selectionCountByExam[normalizedExamId] || 0) + 1;
        }

        if (eventType === 'launched') {
            nextProgress.launchCountByExam[normalizedExamId] = Number(nextProgress.launchCountByExam[normalizedExamId] || 0) + 1;
        }

        if (eventType === 'recommended') {
            nextProgress.lastRecommendedExamId = normalizedExamId;
            nextProgress.recommendationCountByExam[normalizedExamId] = Number(nextProgress.recommendationCountByExam[normalizedExamId] || 0) + 1;
        }

        const sourceCounter = nextProgress.eventSourceByExam[normalizedExamId][eventType] || {};
        sourceCounter[sourceKey] = Number(sourceCounter[sourceKey] || 0) + 1;
        nextProgress.eventSourceByExam[normalizedExamId][eventType] = sourceCounter;

        nextProgress.updatedAt = new Date().toISOString();
        activeUserProgress = nextProgress;
        saveActiveUserProgress({ syncApi: true });
        dashboardDataCache = null;

        if (refreshUi) {
            if (authSession.isAuthenticated) {
                void loadMockCardPerformanceFromApi().then(() => {
                    refreshRenderedExamCards();
                });
            } else {
                refreshRenderedExamCards();
            }
        }
    };

    loadActiveUserProgressFromStore();

    const normalizeExamFromApi = (examItem) => {
        const examId = String(examItem?.id || '').trim().toLowerCase();
        const examTitle = String(examItem?.title || '').trim();

        if (!examId || !examTitle) return null;

        const tagsFromApi = Array.isArray(examItem?.tags)
            ? examItem.tags.map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean)
            : [];

        const streamFromApi = String(examItem?.stream || '').trim().toUpperCase();
        const normalizedStream = streamFromApi || examId.split('-')[0].toUpperCase();

        return {
            id: examId,
            stream: normalizedStream,
            title: examTitle,
            description: String(examItem?.description || '').trim() || 'Exam practice path and adaptive mock guidance.',
            iconClass: String(examItem?.iconClass || '').trim() || 'fa-solid fa-book-open',
            tags: tagsFromApi.length ? tagsFromApi : [normalizedStream.toLowerCase()],
            recommendedDuration: String(examItem?.recommendedDuration || '').trim() || '20 mins',
            recommendedLevel: String(examItem?.recommendedLevel || '').trim() || 'Moderate',
            paperConfig: normalizePaperConfig(examItem?.paperConfig, examId),
            ctaHref: '#test'
        };
    };

    const renderExamGridState = (state, message) => {
        if (!examGrid) return;

        const safeMessage = String(message || '').trim();

        if (state === 'loading') {
            examGrid.innerHTML = `
                <div class="exam-grid-state loading" role="status" aria-live="polite">
                    <span class="loader-dot" aria-hidden="true"></span>
                    <p>${safeMessage || 'Loading latest exam list...'}</p>
                </div>
            `;
            return;
        }

        if (state === 'empty') {
            examGrid.innerHTML = `
                <div class="exam-grid-state empty" role="status" aria-live="polite">
                    <p>${safeMessage || 'No exams are available right now. Please check again shortly.'}</p>
                    <button type="button" class="exam-grid-action" data-grid-action="retry">Retry</button>
                    <button type="button" class="exam-grid-action muted" data-grid-action="offline">Use Offline Exam List</button>
                </div>
            `;
            return;
        }

        if (state === 'error') {
            examGrid.innerHTML = `
                <div class="exam-grid-state error" role="status" aria-live="polite">
                    <p>${safeMessage || 'Could not load live exam data right now.'}</p>
                    <button type="button" class="exam-grid-action" data-grid-action="retry">Retry</button>
                    <button type="button" class="exam-grid-action muted" data-grid-action="offline">Use Offline Exam List</button>
                </div>
            `;
        }
    };

    const formatCompactStat = (value, options = {}) => {
        const { plusSuffix = false } = options;
        const numericValue = Number(value);

        if (!Number.isFinite(numericValue) || numericValue <= 0) {
            return '';
        }

        const absoluteValue = Math.abs(numericValue);
        let formatted = '';

        if (absoluteValue >= 1000000) {
            const raw = absoluteValue / 1000000;
            formatted = `${raw >= 10 ? raw.toFixed(0) : raw.toFixed(1)}`.replace(/\.0$/, '') + 'M';
        } else if (absoluteValue >= 1000) {
            const raw = absoluteValue / 1000;
            formatted = `${raw >= 100 ? raw.toFixed(0) : raw.toFixed(1)}`.replace(/\.0$/, '') + 'k';
        } else {
            formatted = String(Math.round(absoluteValue));
        }

        return plusSuffix ? `${formatted}+` : formatted;
    };

    const loadPlatformStatsFromApi = async () => {
        if (!API_ENABLED) return;
        if (!trustAspirantsValue && !trustSelectionsValue && !trustRatingValue) return;

        try {
            const payload = await requestJson(PLATFORM_STATS_API_ENDPOINT, { method: 'GET' });

            const aspirants = Number(payload?.aspirants || 0);
            const selections = Number(payload?.selections || 0);
            const rating = Number(payload?.rating || 0);

            const aspirantsText = formatCompactStat(aspirants, { plusSuffix: true });
            const selectionsText = formatCompactStat(selections, { plusSuffix: true });

            if (trustAspirantsValue && aspirantsText) {
                trustAspirantsValue.textContent = aspirantsText;
            }

            if (trustSelectionsValue && selectionsText) {
                trustSelectionsValue.textContent = selectionsText;
            }

            if (trustRatingValue && Number.isFinite(rating) && rating > 0) {
                trustRatingValue.textContent = rating.toFixed(1);
            }
        } catch (error) {
            // Keep default trust-strip values when live stats API is unavailable.
        }
    };

    const syncCatalogUiState = () => {
        setActiveExamFilter(activeExamFilterState, {
            syncUrl: false,
            syncStorage: false,
            usePushState: false
        });

        setSelectedExamState(selectedExamIdState, {
            syncUrl: false,
            syncStorage: true,
            usePushState: false,
            scrollToLaunch: false
        });
    };

    const loadOfflineCatalog = (statusMessage = 'Exam catalog is active in demo mode.', statusType = 'info', shouldUpdateStatus = true) => {
        examCatalog = [...fallbackExamCatalog];
        rebuildExamIndex();
        renderExamCards();
        syncCatalogUiState();
        if (shouldUpdateStatus) {
            setMockLaunchStatus(statusMessage, statusType);
        }
    };

    const loadExamCatalogFromApi = async () => {
        if (!API_ENABLED) {
            loadOfflineCatalog('Exam catalog loaded in demo mode.', 'info', false);
            return;
        }

        renderExamGridState('loading', 'Syncing latest exam catalog...');

        try {
            const payload = await requestJson(EXAM_API_ENDPOINT, { method: 'GET' });
            const remoteExams = Array.isArray(payload?.exams)
                ? payload.exams
                : Array.isArray(payload)
                    ? payload
                    : [];

            const normalizedExams = remoteExams
                .map((examItem) => normalizeExamFromApi(examItem))
                .filter(Boolean);

            if (!normalizedExams.length) {
                examCatalog = [];
                rebuildExamIndex();
                renderExamGridState('empty', 'Live catalog is currently empty. Retry or use offline exam list.');
                setSelectedExamState('', {
                    syncUrl: true,
                    syncStorage: true,
                    usePushState: false,
                    scrollToLaunch: false
                });
                setMockLaunchStatus('Live exam catalog is empty right now.', 'warn');
                return;
            }

            examCatalog = normalizedExams;
            rebuildExamIndex();
            renderExamCards();
            syncCatalogUiState();
        } catch (error) {
            loadOfflineCatalog('Live catalog sync failed. Offline exam list loaded automatically.', 'warn');
        }
    };

    const getApiAssessmentRecommendation = async (answers) => {
        if (!API_ENABLED) return null;

        try {
            const payload = await requestJson(ASSESSMENT_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ answers })
            });

            const recommendedExamId = normalizeExamId(String(payload?.examId || payload?.recommendedExamId || '').trim().toLowerCase());
            if (!recommendedExamId) return null;

            const recommendedExam = examById.get(recommendedExamId);
            if (!recommendedExam) return null;

            const reasonText = String(payload?.reason || payload?.explanation || '').trim() || 'Recommended using your latest assessment profile.';
            return {
                examId: recommendedExamId,
                exam: recommendedExam,
                reason: reasonText
            };
        } catch (error) {
            return null;
        }
    };

    const getMockLaunchPayloadFromApi = async (selectedExam) => {
        if (!API_ENABLED) return null;

        const requestedPaperId = String(selectedExam?.paperConfig?.defaultPaperId || '').trim().toLowerCase();

        try {
            const payload = await requestJson(MOCK_LAUNCH_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    examId: selectedExam.id,
                    paperId: requestedPaperId
                })
            });

            const message = String(payload?.message || '').trim();
            const startUrl = String(payload?.startUrl || '').trim();

            return {
                message,
                startUrl
            };
        } catch (error) {
            return null;
        }
    };

    const tryAcquireMockLaunchLock = () => {
        const now = Date.now();

        try {
            const rawLock = localStorage.getItem(MOCK_LAUNCH_LOCK_STORAGE_KEY);
            if (rawLock) {
                const parsedLock = JSON.parse(rawLock);
                const lockTime = Number(parsedLock?.time || 0);

                if (Number.isFinite(lockTime) && (now - lockTime) < MOCK_LAUNCH_LOCK_TTL_MS) {
                    return false;
                }
            }

            localStorage.setItem(MOCK_LAUNCH_LOCK_STORAGE_KEY, JSON.stringify({
                time: now
            }));
        } catch (error) {
            // If storage is blocked, continue with normal launch flow.
        }

        return true;
    };

    const openMockTestWindow = (startUrl) => {
        const targetUrl = String(startUrl || '').trim();
        if (!targetUrl) return false;

        if (!tryAcquireMockLaunchLock()) {
            return false;
        }

        // Use one deterministic navigation path and a short-lived lock
        // to prevent accidental duplicate launches.
        window.location.assign(targetUrl);
        return true;
    };

    const saveAuthSession = () => {
        const sessionHint = {
            userEmail: String(authSession.userEmail || '').trim(),
            userName: String(authSession.userName || '').trim(),
            updatedAt: new Date().toISOString()
        };

        try {
            localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(sessionHint));
        } catch (error) {
            // localStorage may be unavailable in private browsing or restricted environments
        }
    };

    const syncAuthSessionFromApi = async () => {
        if (!API_ENABLED) {
            return authSession.isAuthenticated;
        }

        try {
            const payload = await requestJson(AUTH_SESSION_API_ENDPOINT, { method: 'GET' });
            const authenticated = Boolean(payload?.authenticated && payload?.user?.email);

            if (!authenticated) {
                authSession = {
                    isAuthenticated: false,
                    userEmail: '',
                    userName: ''
                };
                saveAuthSession();
                return false;
            }

            authSession = {
                isAuthenticated: true,
                userEmail: String(payload?.user?.email || '').trim(),
                userName: String(payload?.user?.name || '').trim()
            };
            saveAuthSession();
            return true;
        } catch (error) {
            authSession = {
                isAuthenticated: false,
                userEmail: '',
                userName: ''
            };
            saveAuthSession();
            return false;
        }
    };

    const setMockLaunchStatus = (message, type = 'info') => {
        if (!mockLaunchStatus) return;

        mockLaunchStatus.textContent = message || '';
        mockLaunchStatus.classList.remove('status-success', 'status-info', 'status-warn');
        mockLaunchStatus.classList.add(`status-${type}`);
    };

    const normalizePercentValue = (value) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) return null;
        const clampedValue = Math.max(0, Math.min(100, numericValue));
        return Number(clampedValue.toFixed(2));
    };

    const normalizeMarkValue = (value) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) return null;
        return Number(Math.max(0, numericValue).toFixed(2));
    };

    const formatCardMarks = (value) => {
        const normalized = normalizeMarkValue(value);
        if (normalized === null) return '--';
        return normalized.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    };

    const clearMockCardPerformance = () => {
        mockCardPerformanceByExam = new Map();
        mockCardMinimumCutoffPercent = 70;
    };

    const setMockCardPerformanceFromPayload = (payload) => {
        const nextMap = new Map();
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const minimumCutoff = normalizePercentValue(payload?.minimumCutoffPercent);

        if (minimumCutoff !== null) {
            mockCardMinimumCutoffPercent = minimumCutoff;
        }

        items.forEach((entry) => {
            const examId = String(entry?.examId || '').trim().toLowerCase();
            if (!examId || !examById.has(examId)) return;

            const userLatestScorePercent = normalizePercentValue(entry?.userLatestScorePercent);
            const calculatedAverageScorePercent = normalizePercentValue(entry?.calculatedAverageScorePercent);
            const cutoffScorePercent = normalizePercentValue(entry?.cutoffScorePercent);
            const userLatestScore = normalizeMarkValue(entry?.userLatestScore);
            const userLatestMaxScore = normalizeMarkValue(entry?.userLatestMaxScore);
            const cutoffScore = normalizeMarkValue(entry?.cutoffScore);

            nextMap.set(examId, {
                examId,
                hasAttempt: Boolean(entry?.hasAttempt),
                paperId: String(entry?.paperId || '').trim().toLowerCase(),
                userLatestScore,
                userLatestMaxScore,
                userLatestScorePercent,
                calculatedAverageScorePercent,
                cutoffScorePercent: cutoffScorePercent === null ? mockCardMinimumCutoffPercent : cutoffScorePercent,
                cutoffScore,
                cutoffAttemptCount: Math.max(0, Number(entry?.cutoffAttemptCount || 0)),
                isAboveCutoff: Boolean(entry?.isAboveCutoff),
                submittedAt: String(entry?.submittedAt || '').trim()
            });
        });

        mockCardPerformanceByExam = nextMap;
    };

    const setMockCardPerformanceFromDashboardPayload = (payload) => {
        const recentActivity = Array.isArray(payload?.recentActivity) ? payload.recentActivity : [];
        if (!recentActivity.length) return false;

        const nextMap = new Map();

        recentActivity.forEach((attempt) => {
            const examId = String(attempt?.examId || '').trim().toLowerCase();
            if (!examId || !examById.has(examId) || nextMap.has(examId)) return;

            const userLatestScore = normalizeMarkValue(attempt?.score);
            const userLatestMaxScore = normalizeMarkValue(attempt?.maxScore);
            const userLatestScorePercent = normalizePercentValue(attempt?.scorePercent);
            if (userLatestScorePercent === null || userLatestScore === null) return;

            const cutoffScore = userLatestMaxScore === null
                ? null
                : Number(((userLatestMaxScore * mockCardMinimumCutoffPercent) / 100).toFixed(2));

            nextMap.set(examId, {
                examId,
                hasAttempt: true,
                paperId: String(attempt?.paperId || '').trim().toLowerCase(),
                userLatestScore,
                userLatestMaxScore,
                userLatestScorePercent,
                calculatedAverageScorePercent: null,
                cutoffScorePercent: mockCardMinimumCutoffPercent,
                cutoffScore,
                cutoffAttemptCount: 0,
                isAboveCutoff: cutoffScore === null
                    ? userLatestScorePercent >= mockCardMinimumCutoffPercent
                    : userLatestScore >= cutoffScore,
                submittedAt: String(attempt?.submittedAt || '').trim()
            });
        });

        if (!nextMap.size) return false;

        mockCardPerformanceByExam = nextMap;
        return true;
    };

    const loadMockCardPerformanceFromApi = async () => {
        if (!API_ENABLED || !authSession.isAuthenticated || !authSession.userEmail) {
            clearMockCardPerformance();
            return false;
        }

        try {
            const payload = await requestJson(USER_MOCK_CARD_PERFORMANCE_API_ENDPOINT, { method: 'GET' });
            setMockCardPerformanceFromPayload(payload || {});
            return true;
        } catch (error) {
            try {
                const dashboardFallbackPayload = await requestJson(USER_DASHBOARD_API_ENDPOINT, { method: 'GET' });
                if (setMockCardPerformanceFromDashboardPayload(dashboardFallbackPayload || {})) {
                    return true;
                }
            } catch (fallbackError) {
                // Ignore fallback errors and keep graceful empty state.
            }

            clearMockCardPerformance();
            return false;
        }
    };

    const renderExamCards = () => {
        if (!examGrid) return;

        const catalogForRender = getPersonalizedCatalog();

        examGrid.innerHTML = catalogForRender.map((exam) => {
            const meta = getExamPersonalizationMeta(exam.id);
            const badgeMarkup = meta.badgeText
                ? `<span class="exam-personal-chip">${meta.badgeText}</span>`
                : '';
            const progressMarkup = meta.launchCount > 0
                ? `<p class="exam-progress-note">${meta.launchCount} mock${meta.launchCount > 1 ? 's' : ''} started${meta.recommendationCount > 0 ? ` • ${meta.recommendationCount} recommendation${meta.recommendationCount > 1 ? 's' : ''}` : ''}</p>`
                : '';
            const performance = authSession.isAuthenticated ? mockCardPerformanceByExam.get(exam.id) : null;
            const hasAttempt = Boolean(performance?.hasAttempt && performance?.userLatestScore !== null);
            const scoreMarkup = hasAttempt
                ? (() => {
                    const userScoreMarks = normalizeMarkValue(performance?.userLatestScore);
                    const userMaxScore = normalizeMarkValue(performance?.userLatestMaxScore);
                    const cutoffMarks = normalizeMarkValue(performance?.cutoffScore)
                        ?? (userMaxScore === null
                            ? null
                            : Number(((userMaxScore * Number(performance?.cutoffScorePercent || mockCardMinimumCutoffPercent)) / 100).toFixed(2)));
                    const scoreProgressPercent = (() => {
                        if (userScoreMarks === null) return 0;

                        if (userMaxScore !== null && userMaxScore > 0) {
                            return Math.max(0, Math.min(100, Number(((userScoreMarks / userMaxScore) * 100).toFixed(2))));
                        }

                        return Math.max(0, Math.min(100, Number(performance?.userLatestScorePercent || 0)));
                    })();
                    const cutoffProgressPercent = (() => {
                        if (cutoffMarks !== null && userMaxScore !== null && userMaxScore > 0) {
                            return Math.max(0, Math.min(100, Number(((cutoffMarks / userMaxScore) * 100).toFixed(2))));
                        }

                        return Math.max(0, Math.min(100, Number(performance?.cutoffScorePercent || mockCardMinimumCutoffPercent)));
                    })();
                    const cutoffMarkerPercent = Math.max(1, Math.min(99, cutoffProgressPercent));
                    const cutoffMarkerClass = cutoffMarkerPercent <= 12
                        ? 'edge-left'
                        : (cutoffMarkerPercent >= 88 ? 'edge-right' : 'edge-center');
                    const scoreGapText = (() => {
                        if (userScoreMarks === null || cutoffMarks === null) return '';

                        const scoreDelta = Number((cutoffMarks - userScoreMarks).toFixed(2));
                        if (scoreDelta > 0) {
                            return `Need ${formatCardMarks(scoreDelta)} more to clear cutoff`;
                        }

                        return `Cleared cutoff by ${formatCardMarks(Math.abs(scoreDelta))}`;
                    })();

                    const isFail = cutoffMarks === null
                        ? Number(performance?.userLatestScorePercent || 0) < Number(performance?.cutoffScorePercent || mockCardMinimumCutoffPercent)
                        : Number(userScoreMarks || 0) < Number(cutoffMarks || 0);
                    const statusClass = isFail ? 'fail' : 'pass';
                    const userScoreText = formatCardMarks(userScoreMarks);
                    const cutoffText = formatCardMarks(cutoffMarks);

                    return `
                        <div class="exam-score-strip ${statusClass}">
                            <span class="exam-score-line-track" aria-hidden="true">
                                <span class="exam-score-line-fill ${statusClass}" style="width:${scoreProgressPercent}%"></span>
                                <span class="exam-score-cutoff-marker ${cutoffMarkerClass}" style="left:${cutoffMarkerPercent}%">
                                    <span class="exam-score-cutoff-pill">Cutoff</span>
                                </span>
                            </span>
                            <div class="exam-score-metrics">
                                <span>Your Score <strong>${userScoreText}</strong></span>
                                <span>Cutoff <strong>${cutoffText}</strong></span>
                            </div>
                            ${scoreGapText ? `<p class="exam-score-gap ${statusClass}">${scoreGapText}</p>` : ''}
                        </div>
                    `;
                })()
                : '';

            return `
            <article class="exam-card reveal-up in-view" data-tags="${exam.tags.join(' ')}" data-exam-id="${exam.id}" aria-current="false">
                <div class="exam-card-top">
                    <span class="exam-icon"><i class="${exam.iconClass}"></i></span>
                    <div class="exam-card-meta">
                        <span class="exam-pill">${exam.stream}</span>
                        ${badgeMarkup}
                    </div>
                </div>
                <h3>${exam.title}</h3>
                <p>${exam.description}</p>
                ${progressMarkup}
                ${scoreMarkup}
                <a href="${exam.ctaHref}" class="exam-card-btn" data-exam-id="${exam.id}" aria-label="Start free mock for ${exam.title}">Start Free Mock</a>
            </article>
        `;
        }).join('');

        if (!examCatalog.length) {
            renderExamGridState('empty', 'No exams are available right now. Retry or use offline exam list.');
        }
    };

    const refreshRenderedExamCards = () => {
        renderExamCards();
        applyExamFilter(activeExamFilterState);

        setSelectedExamState(selectedExamIdState, {
            syncUrl: false,
            syncStorage: false,
            usePushState: false,
            scrollToLaunch: false
        });
    };

    renderExamGridState('loading', 'Syncing latest exam catalog...');

    const availableExamFilters = new Set([
        'all',
        ...examFilterButtons.map((button) => button.getAttribute('data-filter') || 'all')
    ]);

    const normalizeExamFilter = (filterKey) => {
        if (!filterKey) return 'all';
        return availableExamFilters.has(filterKey) ? filterKey : 'all';
    };

    const normalizeExamId = (examId) => {
        if (!examId) return '';
        return examById.has(examId) ? examId : '';
    };

    const getFilterFromUrl = () => {
        const query = new URLSearchParams(window.location.search);
        const queryFilter = query.get(EXAM_FILTER_QUERY_KEY);
        return normalizeExamFilter(queryFilter || 'all');
    };

    const setFilterInUrl = (filterKey, usePushState = false) => {
        const currentUrl = new URL(window.location.href);

        if (filterKey === 'all') {
            currentUrl.searchParams.delete(EXAM_FILTER_QUERY_KEY);
        } else {
            currentUrl.searchParams.set(EXAM_FILTER_QUERY_KEY, filterKey);
        }

        const historyMethod = usePushState ? 'pushState' : 'replaceState';
        window.history[historyMethod]({}, '', currentUrl);
    };

    const getMockExamFromUrl = () => {
        const query = new URLSearchParams(window.location.search);
        return normalizeExamId(query.get(MOCK_EXAM_QUERY_KEY) || '');
    };

    const setMockExamInUrl = (examId, usePushState = false) => {
        const currentUrl = new URL(window.location.href);

        if (!examId) {
            currentUrl.searchParams.delete(MOCK_EXAM_QUERY_KEY);
        } else {
            currentUrl.searchParams.set(MOCK_EXAM_QUERY_KEY, examId);
        }

        const historyMethod = usePushState ? 'pushState' : 'replaceState';
        window.history[historyMethod]({}, '', currentUrl);
    };

    const getInitialExamFilter = () => {
        const params = new URLSearchParams(window.location.search);
        const hasFilterInUrl = params.has(EXAM_FILTER_QUERY_KEY);

        if (hasFilterInUrl) {
            return getFilterFromUrl();
        }

        try {
            const storedFilter = localStorage.getItem(EXAM_FILTER_STORAGE_KEY);
            return normalizeExamFilter(storedFilter || 'all');
        } catch (error) {
            return 'all';
        }
    };

    const getInitialMockExam = () => {
        const params = new URLSearchParams(window.location.search);
        const hasMockInUrl = params.has(MOCK_EXAM_QUERY_KEY);

        if (hasMockInUrl) {
            return getMockExamFromUrl();
        }

        try {
            const storedMockExam = localStorage.getItem(MOCK_EXAM_STORAGE_KEY);
            return normalizeExamId(storedMockExam || '');
        } catch (error) {
            return '';
        }
    };

    const removeFilterEmptyState = () => {
        if (!examGrid) return;

        const existingEmptyState = examGrid.querySelector('.exam-grid-state.filter-empty');
        if (existingEmptyState) {
            existingEmptyState.remove();
        }
    };

    const renderFilterEmptyState = (filterKey) => {
        if (!examGrid) return;

        const activeFilterBtn = examFilterButtons.find((button) => {
            const buttonFilter = button.getAttribute('data-filter') || 'all';
            return buttonFilter === filterKey;
        });
        const filterLabel = String(activeFilterBtn?.textContent || filterKey || 'selected filter').trim();

        const emptyState = document.createElement('div');
        emptyState.className = 'exam-grid-state empty filter-empty';
        emptyState.setAttribute('role', 'status');
        emptyState.setAttribute('aria-live', 'polite');
        emptyState.innerHTML = `<p>No exams found for ${filterLabel}. Try another filter.</p>`;
        examGrid.appendChild(emptyState);
    };

    const applyExamFilter = (filterKey) => {
        const examCards = examGrid ? Array.from(examGrid.querySelectorAll('.exam-card')) : [];
        let visibleCount = 0;

        removeFilterEmptyState();

        if (!examCards.length) {
            return;
        }

        examCards.forEach((card) => {
            const cardTags = (card.getAttribute('data-tags') || '').split(/\s+/);
            const isVisible = filterKey === 'all' || cardTags.includes(filterKey);
            card.classList.toggle('is-hidden', !isVisible);

            if (isVisible) {
                visibleCount += 1;
            }
        });

        if (visibleCount === 0) {
            renderFilterEmptyState(filterKey);
        }
    };

    const setActiveExamFilter = (filterKey, options = {}) => {
        const {
            syncUrl = true,
            syncStorage = true,
            usePushState = false
        } = options;

        const normalizedFilter = normalizeExamFilter(filterKey);
        activeExamFilterState = normalizedFilter;

        examFilterButtons.forEach((button) => {
            const buttonFilter = button.getAttribute('data-filter') || 'all';
            const isActive = buttonFilter === normalizedFilter;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });

        applyExamFilter(normalizedFilter);

        if (syncUrl) {
            setFilterInUrl(normalizedFilter, usePushState);
        }

        if (syncStorage) {
            try {
                localStorage.setItem(EXAM_FILTER_STORAGE_KEY, normalizedFilter);
            } catch (error) {
                // localStorage may be unavailable in private browsing or restricted environments
            }
        }
    };

    const setSelectedExamState = (examId, options = {}) => {
        const {
            syncUrl = true,
            syncStorage = true,
            usePushState = false,
            scrollToLaunch = false
        } = options;

        const normalizedExamId = normalizeExamId(examId);
        const selectedExam = normalizedExamId ? examById.get(normalizedExamId) : null;
        selectedExamIdState = selectedExam ? selectedExam.id : '';
        const examCards = examGrid ? Array.from(examGrid.querySelectorAll('.exam-card')) : [];

        examCards.forEach((card) => {
            const cardExamId = card.getAttribute('data-exam-id') || '';
            const isSelected = Boolean(selectedExam) && cardExamId === selectedExam.id;
            card.classList.toggle('selected', isSelected);

            if (isSelected) {
                card.setAttribute('aria-current', 'true');
            } else {
                card.setAttribute('aria-current', 'false');
            }
        });

        if (selectedExamTitle) {
            selectedExamTitle.textContent = selectedExam ? selectedExam.title : 'No exam selected';
        }

        if (selectedExamDuration) {
            selectedExamDuration.textContent = selectedExam ? selectedExam.recommendedDuration : '-';
        }

        if (selectedExamLevel) {
            selectedExamLevel.textContent = selectedExam ? selectedExam.recommendedLevel : '-';
        }

        if (mockLaunchCopy) {
            mockLaunchCopy.textContent = selectedExam
                ? `You selected ${selectedExam.title}. Continue to authentication and start your targeted mock flow.`
                : 'Pick an exam card above. We will lock the right track and guide you into the mock flow instantly.';
        }

        if (startSelectedMockBtn) {
            startSelectedMockBtn.disabled = !selectedExam;
            startSelectedMockBtn.setAttribute('data-exam-id', selectedExam ? selectedExam.id : '');
            startSelectedMockBtn.textContent = selectedExam
                ? (authSession.isAuthenticated ? `Start ${selectedExam.title} Now` : `Continue with ${selectedExam.title}`)
                : 'Continue with Selected Exam';
        }

        pendingMockExam = selectedExam;

        if (syncUrl) {
            setMockExamInUrl(selectedExam ? selectedExam.id : '', usePushState);
        }

        if (syncStorage) {
            try {
                if (selectedExam) {
                    localStorage.setItem(MOCK_EXAM_STORAGE_KEY, selectedExam.id);
                } else {
                    localStorage.removeItem(MOCK_EXAM_STORAGE_KEY);
                }
            } catch (error) {
                // localStorage may be unavailable in private browsing or restricted environments
            }
        }

        if (scrollToLaunch && selectedExam && mockLaunchShell) {
            mockLaunchShell.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (!selectedExam) {
            setMockLaunchStatus('Select an exam card to continue.', 'info');
        }
    };

    const launchSelectedExam = async (selectedExam, options = {}) => {
        if (!selectedExam) return;

        if (mockLaunchInProgress) {
            setMockLaunchStatus('A mock launch is already in progress. Please wait.', 'info');
            return;
        }

        const { fromAuth = false, launchSource = '' } = options;
        const resolvedLaunchSource = launchSource || (fromAuth ? 'auth-continue' : 'exam-launch');
        mockLaunchInProgress = true;

        if (startSelectedMockBtn) {
            startSelectedMockBtn.disabled = true;
        }

        setMockLaunchStatus(`Preparing ${selectedExam.title} mock...`, 'info');

        try {
            const apiLaunchPayload = await getMockLaunchPayloadFromApi(selectedExam);
            const userText = authSession.userEmail ? ` for ${authSession.userEmail}` : '';
            const sourceText = fromAuth ? 'after authentication' : 'instantly';
            const apiLaunchMessage = apiLaunchPayload?.message || '';
            const fallbackStartUrl = `/mock/${encodeURIComponent(selectedExam.id)}?source=demo`;
            const launchStartUrl = apiLaunchPayload?.startUrl || (!API_ENABLED ? fallbackStartUrl : '');
            const fallbackNote = apiLaunchMessage
                ? ` ${apiLaunchMessage}`
                : (API_ENABLED ? ' Live launch API is unavailable right now, so demo launch mode is active.' : '');

            if (!launchStartUrl) {
                setMockLaunchStatus('Could not start a verified mock right now. Please retry in a moment.', 'warn');
                return;
            }

            trackPersonalizationEvent('launched', selectedExam.id, {
                refreshUi: true,
                source: resolvedLaunchSource
            });
            setMockLaunchStatus(`Mock session for ${selectedExam.title} is ready${userText}. You can begin ${sourceText}.${fallbackNote}`, 'success');

            const didNavigate = openMockTestWindow(launchStartUrl);
            if (!didNavigate) {
                setMockLaunchStatus('Mock launch is already being processed. Please wait a moment.', 'info');
            }

            if (mockLaunchShell) {
                mockLaunchShell.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } finally {
            window.setTimeout(() => {
                mockLaunchInProgress = false;
                refreshSelectedExamCta();
            }, 1200);
        }
    };

    if (examFilterButtons.length) {
        examFilterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const filterKey = button.getAttribute('data-filter') || 'all';

                setActiveExamFilter(filterKey, {
                    syncUrl: true,
                    syncStorage: true,
                    usePushState: true
                });
            });
        });

        const initialFilter = getInitialExamFilter();
        setActiveExamFilter(initialFilter, {
            syncUrl: true,
            syncStorage: true,
            usePushState: false
        });

        window.addEventListener('popstate', () => {
            const filterFromUrl = getFilterFromUrl();
            setActiveExamFilter(filterFromUrl, {
                syncUrl: false,
                syncStorage: true,
                usePushState: false
            });

            const mockExamFromUrl = getMockExamFromUrl();
            setSelectedExamState(mockExamFromUrl, {
                syncUrl: false,
                syncStorage: true,
                usePushState: false,
                scrollToLaunch: false
            });
        });
    }

    if (examGrid) {
        examGrid.addEventListener('click', (event) => {
            if (mockLaunchInProgress) {
                event.preventDefault();
                return;
            }

            const gridActionBtn = event.target.closest('[data-grid-action]');
            if (gridActionBtn) {
                event.preventDefault();
                const actionType = gridActionBtn.getAttribute('data-grid-action') || '';

                if (actionType === 'retry') {
                    loadExamCatalogFromApi();
                    return;
                }

                if (actionType === 'offline') {
                    loadOfflineCatalog();
                    return;
                }
            }

            const triggerBtn = event.target.closest('.exam-card-btn');
            const triggerCard = event.target.closest('.exam-card');
            if (!triggerBtn && !triggerCard) return;

            event.preventDefault();
            const examId = triggerBtn?.getAttribute('data-exam-id')
                || triggerCard?.getAttribute('data-exam-id')
                || '';
            const selectionSource = triggerBtn ? 'exam-card-button' : 'exam-card';
            setSelectedExamState(examId, {
                syncUrl: true,
                syncStorage: true,
                usePushState: true,
                scrollToLaunch: false
            });
            trackPersonalizationEvent('selected', examId, {
                refreshUi: true,
                source: selectionSource
            });

            const selectedExam = examById.get(examId);
            if (!selectedExam) return;

            pendingMockExam = selectedExam;
            if (authSession.isAuthenticated) {
                launchSelectedExam(selectedExam, {
                    fromAuth: false,
                    launchSource: selectionSource
                });
                return;
            }

            setMockLaunchStatus(`Create an account or log in once to start ${selectedExam.title} mock.`, 'warn');
            openModal('signup', { preservePendingExam: true });
        });
    }

    if (startSelectedMockBtn) {
        startSelectedMockBtn.addEventListener('click', () => {
            if (mockLaunchInProgress) {
                setMockLaunchStatus('Mock launch is already in progress. Please wait.', 'info');
                return;
            }

            const examId = startSelectedMockBtn.getAttribute('data-exam-id') || '';
            const selectedExam = examById.get(examId);

            if (!selectedExam) return;

            pendingMockExam = selectedExam;
            if (authSession.isAuthenticated) {
                launchSelectedExam(selectedExam, {
                    fromAuth: false,
                    launchSource: 'start-selected-button'
                });
                return;
            }

            setMockLaunchStatus('Create an account or log in once to start your selected mock.', 'warn');
            openModal('signup', { preservePendingExam: true });
        });
    }

    const inlineExamSelectLinks = Array.from(document.querySelectorAll('[data-select-exam]'));
    if (inlineExamSelectLinks.length) {
        inlineExamSelectLinks.forEach((link) => {
            link.addEventListener('click', (event) => {
                const examId = String(link.getAttribute('data-select-exam') || '').trim().toLowerCase();
                if (!examId || !examById.has(examId)) return;

                event.preventDefault();
                setSelectedExamState(examId, {
                    syncUrl: true,
                    syncStorage: true,
                    usePushState: true,
                    scrollToLaunch: true
                });
                trackPersonalizationEvent('selected', examId, {
                    refreshUi: true,
                    source: 'inline-exam-link'
                });
            });
        });
    }

    const initialMockExam = getInitialMockExam();
    setSelectedExamState(initialMockExam, {
        syncUrl: true,
        syncStorage: true,
        usePushState: false,
        scrollToLaunch: false
    });

    if (!initialMockExam) {
        setMockLaunchStatus('Select an exam card to continue.', 'info');
    }

    loadExamCatalogFromApi();
    void loadPlatformStatsFromApi();

    if (authSession.isAuthenticated) {
        void hydratePersonalizationFromApi().then((didSync) => {
            if (didSync) {
                refreshRenderedExamCards();
            }
        });
    }

    // === Quick Assessment Flow ===
    const openAssessmentBtn = document.getElementById('open-assessment-btn');
    const heroStudyPlanBtn = document.getElementById('hero-study-plan-btn');
    const assessmentModal = document.getElementById('assessment-modal');
    const closeAssessmentBtn = document.getElementById('close-assessment-modal');
    const assessmentProgressLabel = document.getElementById('assessment-progress-label');
    const assessmentProgressFill = document.getElementById('assessment-progress-fill');
    const assessmentQuestionWrap = document.getElementById('assessment-question-wrap');
    const assessmentQuestionTitle = document.getElementById('assessment-question-title');
    const assessmentOptionsWrap = document.getElementById('assessment-options');
    const assessmentResult = document.getElementById('assessment-result');
    const assessmentRecommendedTitle = document.getElementById('assessment-recommended-title');
    const assessmentRecommendedReason = document.getElementById('assessment-recommended-reason');
    const assessmentRecommendedDuration = document.getElementById('assessment-recommended-duration');
    const assessmentRecommendedLevel = document.getElementById('assessment-recommended-level');
    const assessmentBackBtn = document.getElementById('assessment-back-btn');
    const assessmentNextBtn = document.getElementById('assessment-next-btn');

    const assessmentQuestions = [
        {
            id: 'target',
            title: 'Which exam stream are you preparing for right now?',
            options: [
                { label: 'SSC', value: 'ssc' },
                { label: 'RRB', value: 'rrb' },
                { label: 'UPSC', value: 'upsc' },
                { label: 'Not Sure Yet', value: 'unsure' }
            ]
        },
        {
            id: 'stage',
            title: 'How far have you progressed in preparation?',
            options: [
                { label: 'Just Started', value: 'beginner' },
                { label: 'Core Topics Done', value: 'intermediate' },
                { label: 'Mostly Revision Mode', value: 'advanced' }
            ]
        },
        {
            id: 'time',
            title: 'How much time can you give daily right now?',
            options: [
                { label: 'Below 1 Hour', value: 'low' },
                { label: '1 to 2 Hours', value: 'medium' },
                { label: 'More than 2 Hours', value: 'high' }
            ]
        },
        {
            id: 'focus',
            title: 'Which area do you want to improve first?',
            options: [
                { label: 'Speed and Time Management', value: 'speed' },
                { label: 'Accuracy and Error Reduction', value: 'accuracy' },
                { label: 'Current Affairs and Concepts', value: 'current-affairs' },
                { label: 'Aptitude and Reasoning', value: 'aptitude' }
            ]
        }
    ];

    let assessmentStep = 0;
    let isAssessmentResultView = false;
    let isAssessmentBusy = false;
    let assessmentRecommendation = null;
    const assessmentAnswers = {};

    const openAssessmentModal = () => {
        if (!assessmentModal) return;
        assessmentModal.classList.add('active');
        assessmentModal.setAttribute('aria-hidden', 'false');
        syncPageScrollLock();
    };

    const closeAssessmentModal = () => {
        if (!assessmentModal) return;
        assessmentModal.classList.remove('active');
        assessmentModal.setAttribute('aria-hidden', 'true');
        assessmentModal.setAttribute('aria-busy', 'false');
        syncPageScrollLock();
    };

    const getAssessmentRecommendation = (answers) => {
        const target = String(answers.target || '').toLowerCase();
        const stage = String(answers.stage || '').toLowerCase();
        const time = String(answers.time || '').toLowerCase();
        const focus = String(answers.focus || '').toLowerCase();

        let examId = 'ssc-cgl';

        if (target === 'ssc') {
            examId = (stage === 'beginner' || time === 'low') ? 'ssc-chsl' : 'ssc-cgl';
        } else if (target === 'rrb') {
            examId = (stage === 'beginner' || focus === 'speed') ? 'rrb-group-d' : 'rrb-ntpc';
        } else if (target === 'upsc') {
            examId = (focus === 'aptitude' || time === 'low') ? 'upsc-csat' : 'upsc-prelims';
        } else {
            // Candidate is unsure: use profile signals instead of defaulting to one exam.
            if (focus === 'current-affairs') {
                examId = 'upsc-prelims';
            } else if (focus === 'aptitude') {
                examId = 'upsc-csat';
            } else if (stage === 'beginner') {
                examId = time === 'low' ? 'ssc-chsl' : 'rrb-group-d';
            } else if (stage === 'advanced') {
                examId = focus === 'accuracy' ? 'ssc-cgl' : 'rrb-ntpc';
            } else {
                examId = 'rrb-ntpc';
            }
        }

        const exam = examById.get(examId);
        if (!exam) return null;

        const reasonParts = [];
        if (target && target !== 'unsure') reasonParts.push(`you selected ${target.toUpperCase()} as your target stream`);
        if (stage) reasonParts.push(`your preparation stage is ${stage}`);
        if (focus) reasonParts.push(`your current focus is ${focus.replace('-', ' ')}`);
        if (time) reasonParts.push(`your daily time availability is ${time}`);

        const reason = reasonParts.length
            ? `Recommended based on ${reasonParts.join(', ')}.`
            : 'This recommendation best matches your preparation stage and immediate focus area.';

        return {
            examId,
            exam,
            reason
        };
    };

    const resolveAssessmentRecommendation = async (answers) => {
        const localRecommendation = getAssessmentRecommendation(answers);
        const apiRecommendation = await getApiAssessmentRecommendation(answers);
        return apiRecommendation || localRecommendation;
    };

    const updateAssessmentProgress = () => {
        if (!assessmentProgressLabel || !assessmentProgressFill) return;

        if (isAssessmentResultView) {
            assessmentProgressLabel.textContent = 'Recommendation Ready';
            assessmentProgressFill.style.width = '100%';
            return;
        }

        const totalSteps = assessmentQuestions.length;
        const currentStep = assessmentStep + 1;
        const progress = (currentStep / totalSteps) * 100;

        assessmentProgressLabel.textContent = `Step ${currentStep} of ${totalSteps}`;
        assessmentProgressFill.style.width = `${progress}%`;
    };

    const renderAssessmentQuestion = () => {
        if (!assessmentQuestionTitle || !assessmentOptionsWrap || !assessmentNextBtn || !assessmentBackBtn) return;

        const question = assessmentQuestions[assessmentStep];
        const selectedValue = assessmentAnswers[question.id] || '';

        assessmentQuestionTitle.textContent = question.title;
        assessmentOptionsWrap.innerHTML = question.options.map((option) => {
            const isActive = option.value === selectedValue;
            return `
                <button type="button" class="assessment-option ${isActive ? 'active' : ''}" data-question-id="${question.id}" data-value="${option.value}" ${isAssessmentBusy ? 'disabled aria-disabled="true"' : ''}>
                    ${option.label}
                </button>
            `;
        }).join('');

        assessmentBackBtn.disabled = isAssessmentBusy || assessmentStep === 0;
        assessmentNextBtn.disabled = isAssessmentBusy || !selectedValue;
        assessmentNextBtn.textContent = isAssessmentBusy
            ? 'Calculating...'
            : (assessmentStep === assessmentQuestions.length - 1 ? 'See Recommendation' : 'Next');
    };

    const renderAssessmentResult = () => {
        if (!assessmentRecommendation || !assessmentResult || !assessmentRecommendedTitle || !assessmentRecommendedReason || !assessmentRecommendedDuration || !assessmentRecommendedLevel || !assessmentNextBtn || !assessmentBackBtn) return;

        isAssessmentBusy = false;
        if (assessmentModal) {
            assessmentModal.setAttribute('aria-busy', 'false');
        }

        assessmentRecommendedTitle.textContent = assessmentRecommendation.exam.title;
        assessmentRecommendedReason.textContent = assessmentRecommendation.reason;
        assessmentRecommendedDuration.textContent = assessmentRecommendation.exam.recommendedDuration;
        assessmentRecommendedLevel.textContent = assessmentRecommendation.exam.recommendedLevel;

        assessmentBackBtn.disabled = false;
        assessmentNextBtn.disabled = false;
        assessmentNextBtn.textContent = 'Use This Plan';
    };

    const renderAssessment = () => {
        if (!assessmentQuestionWrap || !assessmentResult) return;

        updateAssessmentProgress();

        if (isAssessmentResultView) {
            assessmentQuestionWrap.classList.add('hidden');
            assessmentResult.classList.remove('hidden');
            renderAssessmentResult();
            return;
        }

        assessmentQuestionWrap.classList.remove('hidden');
        assessmentResult.classList.add('hidden');
        renderAssessmentQuestion();
    };

    const resetAssessment = () => {
        assessmentStep = 0;
        isAssessmentResultView = false;
        isAssessmentBusy = false;
        assessmentRecommendation = null;

        if (assessmentModal) {
            assessmentModal.setAttribute('aria-busy', 'false');
        }

        Object.keys(assessmentAnswers).forEach((key) => {
            delete assessmentAnswers[key];
        });

        renderAssessment();
    };

    if (assessmentOptionsWrap) {
        assessmentOptionsWrap.addEventListener('click', (event) => {
            if (isAssessmentBusy) return;

            const optionBtn = event.target.closest('.assessment-option');
            if (!optionBtn) return;

            const questionId = optionBtn.getAttribute('data-question-id');
            const value = String(optionBtn.getAttribute('data-value') || '').trim().toLowerCase();
            if (!questionId || !value) return;

            assessmentAnswers[questionId] = value;
            renderAssessment();
        });
    }

    if (assessmentBackBtn) {
        assessmentBackBtn.addEventListener('click', () => {
            if (isAssessmentBusy) return;

            if (isAssessmentResultView) {
                isAssessmentResultView = false;
                assessmentStep = assessmentQuestions.length - 1;
                renderAssessment();
                return;
            }

            if (assessmentStep > 0) {
                assessmentStep -= 1;
                renderAssessment();
            }
        });
    }

    if (assessmentNextBtn) {
        assessmentNextBtn.addEventListener('click', async () => {
            if (isAssessmentBusy) return;

            if (isAssessmentResultView) {
                if (!assessmentRecommendation) return;

                setActiveExamFilter('all', {
                    syncUrl: true,
                    syncStorage: true,
                    usePushState: true
                });

                setSelectedExamState(assessmentRecommendation.examId, {
                    syncUrl: true,
                    syncStorage: true,
                    usePushState: true,
                    scrollToLaunch: true
                });
                trackPersonalizationEvent('selected', assessmentRecommendation.examId, {
                    refreshUi: true,
                    source: 'assessment-plan'
                });

                closeAssessmentModal();
                return;
            }

            const currentQuestion = assessmentQuestions[assessmentStep];
            if (!assessmentAnswers[currentQuestion.id]) return;

            if (assessmentStep === assessmentQuestions.length - 1) {
                isAssessmentBusy = true;
                if (assessmentModal) {
                    assessmentModal.setAttribute('aria-busy', 'true');
                }
                renderAssessment();

                assessmentRecommendation = await resolveAssessmentRecommendation(assessmentAnswers);

                isAssessmentBusy = false;
                if (assessmentModal) {
                    assessmentModal.setAttribute('aria-busy', 'false');
                }
                if (!assessmentRecommendation) {
                    renderAssessment();
                    return;
                }

                trackPersonalizationEvent('recommended', assessmentRecommendation.examId, {
                    refreshUi: false,
                    source: 'assessment-result'
                });
                isAssessmentResultView = true;
                renderAssessment();
                return;
            }

            assessmentStep += 1;
            renderAssessment();
        });
    }

    if (openAssessmentBtn) {
        openAssessmentBtn.addEventListener('click', () => {
            resetAssessment();
            openAssessmentModal();
        });
    }

    if (heroStudyPlanBtn) {
        heroStudyPlanBtn.addEventListener('click', (event) => {
            event.preventDefault();
            resetAssessment();
            openAssessmentModal();
        });
    }

    if (closeAssessmentBtn) {
        closeAssessmentBtn.addEventListener('click', closeAssessmentModal);
    }

    if (assessmentModal) {
        assessmentModal.addEventListener('click', (event) => {
            if (event.target === assessmentModal) {
                closeAssessmentModal();
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (!assessmentModal || !assessmentModal.classList.contains('active')) return;

        closeAssessmentModal();
    });

    renderAssessment();

    const revealTargets = Array.from(document.querySelectorAll('.reveal-up'));

    if ('IntersectionObserver' in window && revealTargets.length) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        revealTargets.forEach((item, index) => {
            const staggerDelay = Math.min(index % 6, 5) * 60;
            item.style.transitionDelay = `${staggerDelay}ms`;
            revealObserver.observe(item);
        });
    } else {
        revealTargets.forEach((item) => item.classList.add('in-view'));
    }

    // === Live Test Countdown + Current Affairs Carousel ===
    const liveTestCards = Array.from(document.querySelectorAll('.live-test-card[data-deadline]'));

    const updateLiveCountdown = () => {
        const now = Date.now();

        liveTestCards.forEach((card) => {
            const deadlineRaw = card.getAttribute('data-deadline');
            const deadlineMs = Date.parse(deadlineRaw || '');
            const countdownValues = {
                days: '00',
                hours: '00',
                minutes: '00',
                seconds: '00'
            };

            let isExpired = true;
            if (Number.isFinite(deadlineMs)) {
                const remainingMs = Math.max(0, deadlineMs - now);
                isExpired = remainingMs <= 0;

                const totalSeconds = Math.floor(remainingMs / 1000);
                const days = Math.floor(totalSeconds / 86400);
                const hours = Math.floor((totalSeconds % 86400) / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                countdownValues.days = String(days).padStart(2, '0');
                countdownValues.hours = String(hours).padStart(2, '0');
                countdownValues.minutes = String(minutes).padStart(2, '0');
                countdownValues.seconds = String(seconds).padStart(2, '0');
            }

            Object.entries(countdownValues).forEach(([key, value]) => {
                const node = card.querySelector(`[data-time="${key}"]`);
                if (node) {
                    node.textContent = value;
                }
            });

            const ctaBtn = card.querySelector('button');
            if (ctaBtn) {
                ctaBtn.disabled = isExpired;
                if (isExpired) {
                    ctaBtn.textContent = 'Registration Closed';
                }
            }
        });
    };

    if (liveTestCards.length) {
        updateLiveCountdown();
        window.setInterval(updateLiveCountdown, 1000);
    }

    const quizCarouselTrack = document.getElementById('quiz-carousel-track');
    const quizSlides = quizCarouselTrack ? Array.from(quizCarouselTrack.querySelectorAll('.quiz-card')) : [];
    const quizDots = Array.from(document.querySelectorAll('#quiz-carousel-dots .carousel-dot'));
    const quizPrevBtn = document.getElementById('carousel-prev');
    const quizNextBtn = document.getElementById('carousel-next');
    let activeQuizSlide = 0;
    let quizAutoSlideTimer = null;

    const updateQuizCarousel = (nextIndex) => {
        if (!quizCarouselTrack || !quizSlides.length) return;

        activeQuizSlide = (nextIndex + quizSlides.length) % quizSlides.length;
        quizCarouselTrack.style.transform = `translateX(-${activeQuizSlide * 100}%)`;

        quizSlides.forEach((slide, index) => {
            const isActive = index === activeQuizSlide;
            slide.classList.toggle('active', isActive);
            slide.setAttribute('aria-hidden', String(!isActive));
        });

        quizDots.forEach((dot, index) => {
            dot.classList.toggle('active', index === activeQuizSlide);
        });
    };

    const startQuizAutoSlide = () => {
        if (quizAutoSlideTimer) {
            clearInterval(quizAutoSlideTimer);
        }

        quizAutoSlideTimer = setInterval(() => {
            updateQuizCarousel(activeQuizSlide + 1);
        }, 5500);
    };

    if (quizSlides.length > 1) {
        updateQuizCarousel(0);
        startQuizAutoSlide();

        if (quizPrevBtn) {
            quizPrevBtn.addEventListener('click', () => {
                updateQuizCarousel(activeQuizSlide - 1);
                startQuizAutoSlide();
            });
        }

        if (quizNextBtn) {
            quizNextBtn.addEventListener('click', () => {
                updateQuizCarousel(activeQuizSlide + 1);
                startQuizAutoSlide();
            });
        }

        quizDots.forEach((dot) => {
            dot.addEventListener('click', () => {
                const targetIndex = Number(dot.getAttribute('data-slide'));
                updateQuizCarousel(targetIndex);
                startQuizAutoSlide();
            });
        });
    }

    // === Auth Modal Logic === //
    const authModal = document.getElementById('auth-modal');
    const loginBtnNav = document.getElementById('nav-login-btn');
    const signupBtnNav = document.getElementById('nav-signup-btn');
    const closeModal = document.getElementById('close-modal');

    const modalTitle = document.getElementById('modal-title');
    const modalSubtitle = document.getElementById('modal-subtitle');
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const footerText = document.getElementById('modal-footer-text');
    const authStatus = document.getElementById('auth-status');
    const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
    const passwordToggles = document.querySelectorAll('.toggle-password');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const signupNameInput = document.getElementById('signup-name');
    const signupPhoneInput = document.getElementById('signup-phone');
    const signupEmailInput = document.getElementById('signup-email');
    const signupPasswordInput = document.getElementById('signup-password');
    const signupConfirmPasswordInput = document.getElementById('signup-confirm-password');
    const signupTermsInput = signupForm ? signupForm.querySelector('.terms-check input[type="checkbox"]') : null;

    const dashboardModal = document.getElementById('dashboard-modal');
    const closeDashboardModalBtn = document.getElementById('close-dashboard-modal');
    const dashboardAvatar = document.getElementById('dashboard-avatar');
    const dashboardUserMeta = document.getElementById('dashboard-user-meta');
    const dashboardSpotlight = document.getElementById('dashboard-spotlight');
    const dashboardMetricLaunches = document.getElementById('dashboard-metric-launches');
    const dashboardMetricAttempts = document.getElementById('dashboard-metric-attempts');
    const dashboardMetricAvgScore = document.getElementById('dashboard-metric-avg-score');
    const dashboardMetricWeekAttempts = document.getElementById('dashboard-metric-week-attempts');
    const dashboardActivityCount = document.getElementById('dashboard-activity-count');
    const dashboardRecentActivity = document.getElementById('dashboard-recent-activity');
    const dashboardLastSummary = document.getElementById('dashboard-last-summary');
    const dashboardWeakTopics = document.getElementById('dashboard-weak-topics');
    const dashboardNextRecommended = document.getElementById('dashboard-next-recommended');
    const dashboardFocusPlan = document.getElementById('dashboard-focus-plan');
    const dashboardGoalThermometer = document.getElementById('dashboard-goal-thermometer');
    const dashboardRankTrajectory = document.getElementById('dashboard-rank-trajectory');
    const dashboardMistakeNotebook = document.getElementById('dashboard-mistake-notebook');
    const dashboardRoutinePlan = document.getElementById('dashboard-routine-plan');
    const dashboardAchievementLayer = document.getElementById('dashboard-achievement-layer');
    const dashboardTrendCharts = document.getElementById('dashboard-trend-charts');
    const dashboardRecommendedExams = document.getElementById('dashboard-recommended-exams');
    const dashboardExamShortcuts = document.getElementById('dashboard-exam-shortcuts');
    const dashboardPreferencesForm = document.getElementById('dashboard-preferences-form');
    const dashboardPrefExam = document.getElementById('dashboard-pref-exam');
    const dashboardPrefLanguage = document.getElementById('dashboard-pref-language');
    const dashboardPrefWeeklyTarget = document.getElementById('dashboard-pref-weekly-target');
    const dashboardPrefFocus = document.getElementById('dashboard-pref-focus');
    const dashboardPrefStatus = document.getElementById('dashboard-pref-status');
    const dashboardContinueLastBtn = document.getElementById('dashboard-continue-last-btn');
    const dashboardStartMockBtn = document.getElementById('dashboard-start-mock-btn');
    const dashboardLogoutBtn = document.getElementById('dashboard-logout-btn');
    const dashboardTabButtons = Array.from(document.querySelectorAll('[data-dashboard-tab]'));
    const dashboardPanels = Array.from(document.querySelectorAll('.dashboard-main-grid .dashboard-panel'));

    const DASHBOARD_HASH = '#dashboard';
    const DASHBOARD_ROUTINE_PROGRESS_STORAGE_KEY = 'mockly_dashboard_routine_progress_v1';
    const DASHBOARD_ACTIVE_TAB_STORAGE_KEY = 'mockly_dashboard_active_tab_v1';
    const DASHBOARD_TAB_IDS = new Set(['performance', 'plan', 'activity', 'preferences']);
    let activeDashboardTab = 'performance';
    let dashboardDataCache = null;

    let isLoginMode = true;

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const normalizeUiTextArtifacts = (rawText) => String(rawText || '')
        .replace(/\s*\/\>\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

    const scrubButtonSyntaxArtifacts = () => {
        const clickableNodes = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        clickableNodes.forEach((node) => {
            if (!node) return;

            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            const textNodes = [];
            let currentNode = walker.nextNode();
            while (currentNode) {
                textNodes.push(currentNode);
                currentNode = walker.nextNode();
            }

            textNodes.forEach((textNode) => {
                const originalText = String(textNode.nodeValue || '');
                if (!originalText.includes('/>')) return;
                const cleanedText = normalizeUiTextArtifacts(originalText);
                if (cleanedText && cleanedText !== originalText) {
                    textNode.nodeValue = cleanedText;
                }
            });
        });
    };

    const syncPageScrollLock = () => {
        const hasOverlayOpen = Boolean(
            authModal?.classList.contains('active')
            || dashboardModal?.classList.contains('active')
            || assessmentModal?.classList.contains('active')
        );
        document.body.style.overflow = hasOverlayOpen ? 'hidden' : '';
    };

    const setAuthStatus = (message = '', type = 'info') => {
        if (!authStatus) return;

        authStatus.textContent = String(message || '').trim();
        authStatus.classList.remove('success', 'error');

        if (type === 'success') {
            authStatus.classList.add('success');
        }

        if (type === 'error') {
            authStatus.classList.add('error');
        }
    };

    const formatPercent = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '0%';
        return `${numeric.toFixed(1).replace(/\.0$/, '')}%`;
    };

    const formatDateTime = (value) => {
        const date = new Date(value || Date.now());
        if (Number.isNaN(date.getTime())) return 'Unknown date';
        return date.toLocaleString([], {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDurationCompact = (seconds) => {
        const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
        const hrs = Math.floor(safeSeconds / 3600);
        const mins = Math.floor((safeSeconds % 3600) / 60);
        const secs = safeSeconds % 60;

        if (hrs > 0) {
            return `${hrs}h ${mins}m`;
        }

        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const readText = (element) => String(element?.textContent || '').trim();

    const heroDefaults = {
        slide1Subtitle: readText(heroSlide1Subtitle),
        slide1Stats: [
            { num: readText(heroSlide1Stat1Num), label: readText(heroSlide1Stat1Label) },
            { num: readText(heroSlide1Stat2Num), label: readText(heroSlide1Stat2Label) },
            { num: readText(heroSlide1Stat3Num), label: readText(heroSlide1Stat3Label) }
        ],
        slide2Subtitle: readText(heroSlide2Subtitle),
        slide2Stats: [
            { num: readText(heroSlide2Stat1Num), label: readText(heroSlide2Stat1Label) },
            { num: readText(heroSlide2Stat2Num), label: readText(heroSlide2Stat2Label) },
            { num: readText(heroSlide2Stat3Num), label: readText(heroSlide2Stat3Label) }
        ],
        slide2InsightHtml: heroSlide2InsightList ? heroSlide2InsightList.innerHTML : '',
        slide2ProgressLabel: readText(heroSlide2ProgressLabel),
        slide2ProgressWidth: heroSlide2ProgressFill ? String(heroSlide2ProgressFill.style.width || '86%').trim() : '86%'
    };

    const setHeroStatPair = (numberEl, labelEl, numberText, labelText) => {
        if (numberEl) numberEl.textContent = String(numberText || '').trim();
        if (labelEl) labelEl.textContent = String(labelText || '').trim();
    };

    const renderHeroInsightRows = (rows) => {
        if (!heroSlide2InsightList) return;
        if (!Array.isArray(rows) || !rows.length) {
            heroSlide2InsightList.innerHTML = heroDefaults.slide2InsightHtml;
            return;
        }

        heroSlide2InsightList.innerHTML = '';
        rows.forEach((row) => {
            const rowElement = document.createElement('div');
            rowElement.className = 'insight-row';

            const labelElement = document.createElement('span');
            labelElement.textContent = String(row?.label || '').trim();

            const valueElement = document.createElement('strong');
            valueElement.textContent = String(row?.value || '').trim();

            rowElement.appendChild(labelElement);
            rowElement.appendChild(valueElement);
            heroSlide2InsightList.appendChild(rowElement);
        });
    };

    const resetHeroHighlightsToDefault = () => {
        if (heroSlide1Subtitle) heroSlide1Subtitle.textContent = heroDefaults.slide1Subtitle;
        if (heroSlide2Subtitle) heroSlide2Subtitle.textContent = heroDefaults.slide2Subtitle;

        setHeroStatPair(heroSlide1Stat1Num, heroSlide1Stat1Label, heroDefaults.slide1Stats[0]?.num, heroDefaults.slide1Stats[0]?.label);
        setHeroStatPair(heroSlide1Stat2Num, heroSlide1Stat2Label, heroDefaults.slide1Stats[1]?.num, heroDefaults.slide1Stats[1]?.label);
        setHeroStatPair(heroSlide1Stat3Num, heroSlide1Stat3Label, heroDefaults.slide1Stats[2]?.num, heroDefaults.slide1Stats[2]?.label);

        setHeroStatPair(heroSlide2Stat1Num, heroSlide2Stat1Label, heroDefaults.slide2Stats[0]?.num, heroDefaults.slide2Stats[0]?.label);
        setHeroStatPair(heroSlide2Stat2Num, heroSlide2Stat2Label, heroDefaults.slide2Stats[1]?.num, heroDefaults.slide2Stats[1]?.label);
        setHeroStatPair(heroSlide2Stat3Num, heroSlide2Stat3Label, heroDefaults.slide2Stats[2]?.num, heroDefaults.slide2Stats[2]?.label);

        renderHeroInsightRows([]);

        if (heroSlide2ProgressLabel) heroSlide2ProgressLabel.textContent = heroDefaults.slide2ProgressLabel;
        if (heroSlide2ProgressFill) heroSlide2ProgressFill.style.width = heroDefaults.slide2ProgressWidth;
    };

    const updateHeroHighlightsFromDashboard = (dashboardData) => {
        if (!authSession.isAuthenticated || !dashboardData) {
            resetHeroHighlightsToDefault();
            return;
        }

        const activities = Array.isArray(dashboardData?.recentActivity) ? dashboardData.recentActivity : [];
        const latestSummary = dashboardData?.lastMockSummary || activities[0] || null;

        if (!latestSummary) {
            resetHeroHighlightsToDefault();
            return;
        }

        const latestExamId = String(latestSummary?.examId || '').trim().toLowerCase();
        const latestExamTitle = String(examById.get(latestExamId)?.title || latestExamId || 'latest exam').trim();
        const scorePercent = Number(latestSummary?.scorePercent || 0);
        const accuracyPercent = Number(latestSummary?.accuracyPercent || 0);
        const totalQuestions = Number(latestSummary?.totalQuestions || 0);
        const unanswered = Number(latestSummary?.unanswered || 0);
        const attempted = Math.max(0, totalQuestions - unanswered);

        if (heroSlide1Subtitle) {
            heroSlide1Subtitle.textContent = `Latest ${latestExamTitle} mock: ${formatPercent(scorePercent)} score and ${formatPercent(accuracyPercent)} accuracy.`;
        }

        setHeroStatPair(heroSlide1Stat1Num, heroSlide1Stat1Label, formatPercent(scorePercent), 'Latest Score');
        setHeroStatPair(heroSlide1Stat2Num, heroSlide1Stat2Label, formatPercent(accuracyPercent), 'Latest Accuracy');
        setHeroStatPair(
            heroSlide1Stat3Num,
            heroSlide1Stat3Label,
            totalQuestions > 0 ? `${attempted}/${totalQuestions}` : '--',
            'Questions Attempted'
        );

        const weakTopic = Array.isArray(dashboardData?.weakTopics) ? String(dashboardData.weakTopics[0] || '').trim() : '';
        if (heroSlide2Subtitle) {
            heroSlide2Subtitle.textContent = weakTopic
                ? `Focus area from your latest attempt: ${weakTopic}`
                : `Your learning plan is now personalized from ${activities.length} recent attempt${activities.length === 1 ? '' : 's'}.`;
        }

        const metrics = dashboardData?.metrics || {};
        const recentAttempts = Math.max(0, Number(metrics?.last7DaysAttempts || 0));
        const dailyStreak = Math.max(0, Number(metrics?.dailyStreak || 0));
        const previousScore = Number(activities[1]?.scorePercent || 0);
        const hasScoreTrend = activities.length >= 2;
        const scoreDelta = hasScoreTrend ? Number((scorePercent - previousScore).toFixed(1)) : 0;
        const scoreDeltaText = hasScoreTrend ? `${scoreDelta >= 0 ? '+' : ''}${scoreDelta.toFixed(1)}%` : '--';

        setHeroStatPair(heroSlide2Stat1Num, heroSlide2Stat1Label, String(recentAttempts), 'Mocks in Last 7 Days');
        setHeroStatPair(heroSlide2Stat2Num, heroSlide2Stat2Label, `${dailyStreak}d`, 'Current Daily Streak');
        setHeroStatPair(heroSlide2Stat3Num, heroSlide2Stat3Label, scoreDeltaText, hasScoreTrend ? 'Score Change vs Previous' : 'Score Change (Need 2 Mocks)');

        const sectionPerformance = Array.isArray(latestSummary?.sectionPerformance) ? latestSummary.sectionPerformance : [];
        const sectionRows = sectionPerformance.slice(0, 4).map((section) => ({
            label: String(section?.name || section?.sectionId || 'Section').trim(),
            value: formatPercent(section?.accuracyPercent || 0)
        }));

        if (!sectionRows.length) {
            sectionRows.push(
                { label: 'Score', value: formatPercent(scorePercent) },
                { label: 'Accuracy', value: formatPercent(accuracyPercent) },
                { label: 'Attempted', value: totalQuestions > 0 ? `${attempted}/${totalQuestions}` : '--' },
                { label: 'Time Used', value: formatDurationCompact(latestSummary?.timeTakenSeconds || 0) }
            );
        }

        renderHeroInsightRows(sectionRows);

        const weeklyTargetRaw = Number(metrics?.weeklyMockTarget || dashboardData?.profile?.preferences?.weeklyMockTarget || 5);
        const weeklyTarget = Math.max(1, weeklyTargetRaw);
        const targetProgress = Math.max(0, Math.min(100, Math.round((recentAttempts / weeklyTarget) * 100)));

        if (heroSlide2ProgressLabel) {
            heroSlide2ProgressLabel.textContent = `${targetProgress}% weekly target completion (${recentAttempts}/${weeklyTarget})`;
        }

        if (heroSlide2ProgressFill) {
            heroSlide2ProgressFill.style.width = `${targetProgress}%`;
        }
    };

    const buildSevenDayTrendSeries = (activities) => {
        const safeActivities = Array.isArray(activities) ? activities : [];
        const perDayBucket = new Map();
        const toLocalDayKey = (dateValue) => {
            const safeDate = new Date(dateValue);
            const year = safeDate.getFullYear();
            const month = String(safeDate.getMonth() + 1).padStart(2, '0');
            const day = String(safeDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        safeActivities.forEach((attempt) => {
            const submittedAt = String(attempt?.submittedAt || '').trim();
            const timestamp = Date.parse(submittedAt);
            if (!Number.isFinite(timestamp)) return;

            const dayKey = toLocalDayKey(timestamp);
            const current = perDayBucket.get(dayKey) || { scoreSum: 0, accuracySum: 0, count: 0 };
            current.scoreSum += Number(attempt?.scorePercent || 0);
            current.accuracySum += Number(attempt?.accuracyPercent || 0);
            current.count += 1;
            perDayBucket.set(dayKey, current);
        });

        const series = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let offset = 6; offset >= 0; offset -= 1) {
            const pointDate = new Date(today);
            pointDate.setDate(today.getDate() - offset);
            const dayKey = toLocalDayKey(pointDate);
            const label = pointDate.toLocaleDateString([], { weekday: 'short' }).slice(0, 1).toUpperCase();
            const bucket = perDayBucket.get(dayKey);
            const count = Number(bucket?.count || 0);

            series.push({
                dayKey,
                label,
                count,
                scorePercent: count > 0 ? Number((bucket.scoreSum / count).toFixed(2)) : 0,
                accuracyPercent: count > 0 ? Number((bucket.accuracySum / count).toFixed(2)) : 0
            });
        }

        return series;
    };

    const renderMiniTrendCard = (title, valueKey, points, toneClass) => {
        const safePoints = Array.isArray(points) ? points : [];
        const average = safePoints.length
            ? Number((safePoints.reduce((sum, point) => sum + Number(point?.[valueKey] || 0), 0) / safePoints.length).toFixed(1))
            : 0;
        const latest = safePoints.length
            ? Number(safePoints[safePoints.length - 1]?.[valueKey] || 0)
            : 0;

        const barsHtml = safePoints.map((point) => {
            const rawValue = Number(point?.[valueKey] || 0);
            const clampedValue = Math.max(0, Math.min(100, rawValue));
            const barHeight = Math.max(4, Math.round((clampedValue / 100) * 58));
            return `<span class="dashboard-trend-bar ${toneClass}" style="height:${barHeight}px" title="${escapeHtml(`${point.dayKey}: ${rawValue.toFixed(1)}%`)}"></span>`;
        }).join('');

        const labelsHtml = safePoints.map((point) => `<span>${escapeHtml(point.label)}</span>`).join('');

        return `
            <article class="dashboard-trend-card">
                <div class="dashboard-trend-head">
                    <strong>${escapeHtml(title)}</strong>
                    <span>7-day avg ${average.toFixed(1)}% • latest ${latest.toFixed(1)}%</span>
                </div>
                <div class="dashboard-trend-bars">${barsHtml}</div>
                <div class="dashboard-trend-labels">${labelsHtml}</div>
            </article>
        `;
    };

    const DASHBOARD_EXAM_DEADLINE_BY_ID = {
        'ssc-cgl-tier1-2025': '2026-02-08T09:00:00+05:30',
        'ssc-chsl-tier1-2025': '2026-01-19T09:00:00+05:30',
        'rrb-ntpc-cbt1-2025': '2026-03-12T09:00:00+05:30',
        'rrb-group-d-cbt-2025': '2026-03-24T09:00:00+05:30',
        'upsc-prelims-gs1-2025': '2026-05-31T09:30:00+05:30',
        'upsc-csat-2025': '2026-05-31T14:30:00+05:30'
    };

    const DASHBOARD_EXAM_POOL_BY_ID = {
        'ssc-cgl-tier1-2025': 360000,
        'ssc-chsl-tier1-2025': 310000,
        'rrb-ntpc-cbt1-2025': 470000,
        'rrb-group-d-cbt-2025': 520000,
        'upsc-prelims-gs1-2025': 1300000,
        'upsc-csat-2025': 1300000
    };

    const clampNumber = (value, min, max) => Math.max(min, Math.min(max, Number(value || 0)));

    const getDeadlineUrgency = (targetIsoDate) => {
        const timestamp = Date.parse(String(targetIsoDate || ''));
        if (!Number.isFinite(timestamp)) {
            return { isValid: false, status: 'calm', daysLeft: null, deadlineLabel: 'Date not available' };
        }

        const now = Date.now();
        const diffMs = timestamp - now;
        const daysLeft = Math.ceil(diffMs / 86400000);
        const hoursLeft = Math.max(0, Math.floor(diffMs / 3600000));
        const isOverdue = diffMs < 0;
        const status = isOverdue ? 'danger' : daysLeft <= 10 ? 'danger' : daysLeft <= 28 ? 'warn' : 'calm';

        let deadlineLabel = '';
        if (isOverdue) {
            deadlineLabel = 'Exam window is active or just passed';
        } else if (daysLeft <= 2) {
            deadlineLabel = `${hoursLeft}h left`;
        } else {
            deadlineLabel = `${daysLeft} days left`;
        }

        return {
            isValid: true,
            status,
            daysLeft,
            deadlineLabel,
            targetDisplay: new Date(timestamp).toLocaleString([], {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            })
        };
    };

    const estimateAttemptPercentile = (attempt) => {
        const score = clampNumber(attempt?.scorePercent, 0, 100);
        const accuracy = clampNumber(attempt?.accuracyPercent, 0, 100);
        return clampNumber((score * 0.72) + (accuracy * 0.28), 5, 99.8);
    };

    const calculateProjectedPercentile = (attempts) => {
        const safeAttempts = Array.isArray(attempts) ? attempts : [];
        if (!safeAttempts.length) return 0;

        const weighted = safeAttempts.reduce((acc, attempt, index) => {
            const weight = index + 1;
            acc.total += estimateAttemptPercentile(attempt) * weight;
            acc.weight += weight;
            return acc;
        }, { total: 0, weight: 0 });

        return weighted.weight ? Number((weighted.total / weighted.weight).toFixed(1)) : 0;
    };

    const buildProjectedRankBand = (projectedPercentile, candidatePoolSize) => {
        const pool = Math.max(10000, Math.floor(Number(candidatePoolSize || 0)));
        const percentile = clampNumber(projectedPercentile, 0, 99.9);
        const estimatedRank = Math.max(1, Math.ceil(((100 - percentile) / 100) * pool));
        const spread = Math.max(120, Math.round(estimatedRank * 0.08));
        return {
            start: Math.max(1, estimatedRank - spread),
            end: estimatedRank + spread
        };
    };

    const getRoutineStore = () => {
        try {
            const raw = localStorage.getItem(DASHBOARD_ROUTINE_PROGRESS_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            return {};
        }
    };

    const getRoutineProgressKey = () => {
        const scopedEmail = String(authSession.userEmail || 'guest').trim().toLowerCase() || 'guest';
        const today = new Date();
        const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return `${scopedEmail}::${dayKey}`;
    };

    const readTodayRoutineProgress = () => {
        const store = getRoutineStore();
        const key = getRoutineProgressKey();
        const bucket = store?.[key];
        if (!bucket || typeof bucket !== 'object') return {};
        return bucket;
    };

    const updateTodayRoutineProgress = (itemKey, isComplete) => {
        if (!itemKey) return;

        const store = getRoutineStore();
        const key = getRoutineProgressKey();
        const scopedBucket = store[key] && typeof store[key] === 'object' ? store[key] : {};
        scopedBucket[itemKey] = Boolean(isComplete);
        store[key] = scopedBucket;

        try {
            localStorage.setItem(DASHBOARD_ROUTINE_PROGRESS_STORAGE_KEY, JSON.stringify(store));
        } catch (error) {
            // Ignore write failures (private mode / quota limits).
        }
    };

    const readIncompleteMockStore = () => {
        try {
            const rawStore = localStorage.getItem(INCOMPLETE_MOCK_STORAGE_KEY);
            const parsed = rawStore ? JSON.parse(rawStore) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            return {};
        }
    };

    const normalizeIncompleteMock = (rawSession) => {
        if (!rawSession || typeof rawSession !== 'object') return null;

        const examId = String(rawSession.examId || '').trim().toLowerCase();
        const paperId = String(rawSession.paperId || '').trim().toLowerCase();
        if (!examById.has(examId) || !paperId) return null;

        const sessionId = String(rawSession.sessionId || rawSession.session || '').trim();
        const startUrl = String(rawSession.startUrl || '').trim();
        const fallbackUrl = `/mock/${examId}?paperId=${encodeURIComponent(paperId)}${sessionId ? `&session=${encodeURIComponent(sessionId)}` : ''}`;
        const baseUrl = startUrl.startsWith('/mock/') ? startUrl : fallbackUrl;
        const resumeUrl = String(rawSession.resumeUrl || '').trim()
            || (baseUrl.includes('resume=1') ? baseUrl : `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}resume=1`);

        return {
            examId,
            paperId,
            sessionId,
            startUrl: baseUrl,
            resumeUrl,
            progressPercent: Math.max(0, Math.min(100, Number(rawSession.progressPercent || 0))),
            currentQuestionIndex: Math.max(0, Math.floor(Number(rawSession.currentQuestionIndex) || 0)),
            totalQuestions: Math.max(0, Math.floor(Number(rawSession.totalQuestions) || 0)),
            timerSeconds: Math.max(0, Math.floor(Number(rawSession.timerSeconds) || 0)),
            updatedAt: String(rawSession.updatedAt || '').trim() || new Date().toISOString()
        };
    };

    const getLocalIncompleteMockForEmail = (emailValue) => {
        const normalizedEmail = String(emailValue || authSession.userEmail || '').trim().toLowerCase();
        if (!normalizedEmail) return null;

        const store = readIncompleteMockStore();
        const scopedSession = normalizeIncompleteMock(store?.[normalizedEmail]);
        if (scopedSession) return scopedSession;

        return normalizeIncompleteMock(store);
    };

    const setLandingResumeIndicator = (rawSession) => {
        if (!mockResumeIndicator || !mockResumeText || !mockResumeBtn) return;

        if (!authSession.isAuthenticated || !authSession.userEmail) {
            mockResumeIndicator.hidden = true;
            mockResumeBtn.dataset.resumeUrl = '';
            return;
        }

        const normalized = normalizeIncompleteMock(rawSession) || getLocalIncompleteMockForEmail(authSession.userEmail);
        if (!normalized?.resumeUrl) {
            mockResumeIndicator.hidden = true;
            mockResumeBtn.dataset.resumeUrl = '';
            return;
        }

        const examTitle = String(examById.get(normalized.examId)?.title || normalized.examId || 'mock').trim();
        const progress = Math.round(Number(normalized.progressPercent || 0));
        mockResumeText.textContent = `Resume ${examTitle} (${progress}% complete)`;
        mockResumeBtn.dataset.resumeUrl = normalized.resumeUrl;
        mockResumeIndicator.hidden = false;
    };

    const deriveWeakTopicsFromSummary = (summary, explicitWeakTopics) => {
        const weakTopics = Array.isArray(explicitWeakTopics)
            ? explicitWeakTopics.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6)
            : [];
        if (weakTopics.length) return weakTopics;

        const sections = Array.isArray(summary?.sectionPerformance) ? summary.sectionPerformance : [];
        if (!sections.length) return [];

        return [...sections]
            .sort((left, right) => Number(left?.accuracyPercent || 0) - Number(right?.accuracyPercent || 0))
            .slice(0, 3)
            .map((section) => {
                const name = String(section?.name || section?.sectionId || 'Section').trim();
                const accuracy = Number(section?.accuracyPercent || 0);
                return `${name}: ${formatPercent(accuracy)} accuracy`;
            });
    };

    const deriveLowScoreWarnings = (summary, explicitWarnings) => {
        const warnings = Array.isArray(explicitWarnings)
            ? explicitWarnings.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8)
            : [];
        if (warnings.length) return warnings;
        if (!summary) return [];

        const generatedWarnings = [];
        const scorePercent = Number(summary.scorePercent || 0);
        const accuracyPercent = Number(summary.accuracyPercent || 0);
        const totalQuestions = Number(summary.totalQuestions || 0);
        const unanswered = Number(summary.unanswered || 0);

        if (scorePercent < 45) {
            generatedWarnings.push('Your score is below 45%. Rebuild fundamentals before your next full mock.');
        }

        if (accuracyPercent < 60) {
            generatedWarnings.push('Accuracy is below 60%. Reduce blind attempts and focus on elimination strategy.');
        }

        if (totalQuestions > 0 && unanswered > Math.ceil(totalQuestions * 0.2)) {
            generatedWarnings.push('Too many unattempted questions. Improve section pacing and review cycle.');
        }

        return generatedWarnings.slice(0, 8);
    };

    const hydrateDashboardData = (rawData, fallbackData) => {
        const recentActivity = Array.isArray(rawData?.recentActivity)
            ? rawData.recentActivity
            : fallbackData.recentActivity;

        const lastActivity = recentActivity[0] || null;
        const fallbackSummary = lastActivity
            ? {
                examId: String(lastActivity?.examId || '').trim().toLowerCase(),
                paperId: String(lastActivity?.paperId || '').trim().toLowerCase(),
                score: Number(lastActivity?.score || 0),
                maxScore: Number(lastActivity?.maxScore || 0),
                scorePercent: Number(lastActivity?.scorePercent || 0),
                accuracyPercent: Number(lastActivity?.accuracyPercent || 0),
                correct: Number(lastActivity?.correct || 0),
                wrong: Number(lastActivity?.wrong || 0),
                unanswered: Number(lastActivity?.unanswered || 0),
                totalQuestions: Number(lastActivity?.totalQuestions || 0),
                timeTakenSeconds: Number(lastActivity?.timeTakenSeconds || 0),
                durationMinutes: Number(lastActivity?.durationMinutes || 0),
                submittedAt: lastActivity?.submittedAt,
                sectionPerformance: []
            }
            : null;

        const summary = rawData?.lastMockSummary || fallbackSummary;

        const weakTopics = deriveWeakTopicsFromSummary(summary, rawData?.weakTopics);
        const lowScoreWarnings = deriveLowScoreWarnings(summary, rawData?.lowScoreWarnings);

        const recommendedExams = Array.isArray(rawData?.recommendedExams) && rawData.recommendedExams.length
            ? rawData.recommendedExams
            : fallbackData.recommendedExams;

        const nextRecommendedTest = rawData?.nextRecommendedTest
            || (recommendedExams[0]
                ? {
                    examId: String(recommendedExams[0]?.examId || '').trim().toLowerCase(),
                    title: String(recommendedExams[0]?.title || '').trim(),
                    stream: String(recommendedExams[0]?.stream || '').trim(),
                    confidence: Number(recommendedExams[0]?.confidence || 0),
                    reason: weakTopics.length
                        ? `Recommended to improve ${weakTopics[0]}`
                        : 'Recommended based on your profile and recent activity.'
                }
                : null);

        const email = String(rawData?.email || fallbackData.email || authSession.userEmail || '').trim().toLowerCase();
        const incompleteMock = normalizeIncompleteMock(rawData?.incompleteMock)
            || getLocalIncompleteMockForEmail(email);

        return {
            ...fallbackData,
            ...rawData,
            email,
            profile: {
                ...fallbackData.profile,
                ...(rawData?.profile || {}),
                preferences: sanitizePreferences(rawData?.profile?.preferences || fallbackData.profile.preferences)
            },
            metrics: {
                ...fallbackData.metrics,
                ...(rawData?.metrics || {})
            },
            recentActivity,
            recommendedExams,
            quickExamShortcuts: Array.isArray(rawData?.quickExamShortcuts) && rawData.quickExamShortcuts.length
                ? rawData.quickExamShortcuts
                : fallbackData.quickExamShortcuts,
            lastMockSummary: summary,
            weakTopics,
            lowScoreWarnings,
            nextRecommendedTest,
            incompleteMock
        };
    };

    const getDisplayName = () => {
        const explicitName = String(authSession.userName || '').trim();
        if (explicitName) return explicitName;

        const email = String(authSession.userEmail || '').trim();
        if (!email) return 'User';

        const userPart = email.includes('@') ? email.split('@')[0] : email;
        if (!userPart) return 'User';
        return `${userPart.charAt(0).toUpperCase()}${userPart.slice(1)}`;
    };

    const buildFallbackDashboardData = () => {
        const totalLaunches = Object.values(activeUserProgress.launchCountByExam || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
        const totalRecommendations = Object.values(activeUserProgress.recommendationCountByExam || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
        const totalSelections = Object.values(activeUserProgress.selectionCountByExam || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
        const recommendedExams = getPersonalizedCatalog().slice(0, 3).map((exam, index) => ({
            examId: exam.id,
            title: exam.title,
            stream: exam.stream,
            confidence: Math.max(45, 85 - (index * 12))
        }));

        const quickExamShortcuts = examCatalog.map((exam) => ({
            examId: exam.id,
            title: exam.title,
            stream: exam.stream,
            recommendedDuration: exam.recommendedDuration,
            recommendedLevel: exam.recommendedLevel,
            defaultPaperId: String(exam?.paperConfig?.defaultPaperId || '').trim().toLowerCase(),
            isPreferred: activeUserProgress.preferences?.preferredExamId === exam.id
        }));

        return {
            email: String(authSession.userEmail || '').trim().toLowerCase(),
            user: {
                name: getDisplayName(),
                avatarInitial: getUserInitial(),
                lastActiveAt: activeUserProgress.updatedAt || new Date().toISOString()
            },
            profile: {
                ...activeUserProgress,
                preferences: sanitizePreferences(activeUserProgress.preferences)
            },
            metrics: {
                totalSelections,
                totalLaunches,
                totalRecommendations,
                totalAttempts: 0,
                last7DaysAttempts: 0,
                avgScorePercent: 0,
                bestScorePercent: 0,
                dailyStreak: 0,
                weeklyMockTarget: Number(activeUserProgress.preferences?.weeklyMockTarget || 5),
                weeklyMockGap: Number(activeUserProgress.preferences?.weeklyMockTarget || 5)
            },
            recentActivity: [],
            recommendedExams,
            quickExamShortcuts,
            nextRecommendedTest: recommendedExams[0]
                ? {
                    examId: recommendedExams[0].examId,
                    title: recommendedExams[0].title,
                    stream: recommendedExams[0].stream,
                    confidence: recommendedExams[0].confidence,
                    reason: 'Recommended from your recent Mockly activity.'
                }
                : null,
            lastMockSummary: null,
            weakTopics: [],
            lowScoreWarnings: [],
            incompleteMock: getLocalIncompleteMockForEmail(authSession.userEmail)
        };
    };

    const loadDashboardData = async ({ force = false } = {}) => {
        if (!authSession.isAuthenticated || !authSession.userEmail) {
            return null;
        }

        if (!force && dashboardDataCache) {
            return dashboardDataCache;
        }

        const fallbackData = buildFallbackDashboardData();

        if (!API_ENABLED) {
            dashboardDataCache = hydrateDashboardData(fallbackData, fallbackData);
            return dashboardDataCache;
        }

        try {
            const remoteData = await requestJson(USER_DASHBOARD_API_ENDPOINT, { method: 'GET' });

            dashboardDataCache = hydrateDashboardData(remoteData || {}, fallbackData);
        } catch (error) {
            dashboardDataCache = hydrateDashboardData(fallbackData, fallbackData);
        }

        return dashboardDataCache;
    };

    const refreshHeroHighlights = async ({ force = false } = {}) => {
        if (!authSession.isAuthenticated || !authSession.userEmail) {
            updateHeroHighlightsFromDashboard(null);
            return;
        }

        const dashboardData = await loadDashboardData({ force });
        updateHeroHighlightsFromDashboard(dashboardData);
    };

    const renderDashboardEmpty = (targetElement, message) => {
        if (!targetElement) return;
        targetElement.innerHTML = `<div class="dashboard-empty-state">${escapeHtml(message)}</div>`;
    };

    const ensureDashboardPanelResolved = (targetElement, fallbackMessage) => {
        if (!targetElement) return;
        const panelText = String(targetElement.textContent || '').trim().toLowerCase();
        if (!panelText) {
            renderDashboardEmpty(targetElement, fallbackMessage);
            return;
        }

        if (panelText.includes('loading') || panelText.includes('calibrating') || panelText.includes('building')) {
            renderDashboardEmpty(targetElement, fallbackMessage);
        }
    };

    const normalizeDashboardTab = (value) => {
        const normalized = String(value || '').trim().toLowerCase();
        return DASHBOARD_TAB_IDS.has(normalized) ? normalized : 'performance';
    };

    const applyDashboardTabState = () => {
        const safeTab = normalizeDashboardTab(activeDashboardTab);
        activeDashboardTab = safeTab;

        dashboardTabButtons.forEach((button) => {
            const tabId = normalizeDashboardTab(button.getAttribute('data-dashboard-tab'));
            const isActive = tabId === safeTab;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });

        dashboardPanels.forEach((panel) => {
            const panelTab = normalizeDashboardTab(panel.getAttribute('data-dashboard-group'));
            const isVisible = panelTab === safeTab;
            panel.classList.toggle('is-tab-hidden', !isVisible);
            panel.toggleAttribute('hidden', !isVisible);
        });
    };

    const setDashboardTab = (tabId, { persist = true } = {}) => {
        activeDashboardTab = normalizeDashboardTab(tabId);
        applyDashboardTabState();

        if (persist) {
            try {
                localStorage.setItem(DASHBOARD_ACTIVE_TAB_STORAGE_KEY, activeDashboardTab);
            } catch (error) {
                // Ignore storage failures.
            }
        }
    };

    const renderDashboard = (dashboardData) => {
        if (!dashboardData) return;

        if (dashboardModal) {
            dashboardModal.classList.remove('dashboard-animate');
            void dashboardModal.offsetWidth;
            dashboardModal.classList.add('dashboard-animate');
        }

        const avatarText = String(dashboardData?.user?.avatarInitial || getUserInitial() || 'U').trim().toUpperCase().slice(0, 1) || 'U';
        if (dashboardAvatar) dashboardAvatar.textContent = avatarText;

        if (dashboardUserMeta) {
            const nameText = String(dashboardData?.user?.name || getDisplayName() || 'User').trim() || 'User';
            const emailText = String(dashboardData?.email || authSession.userEmail || '').trim();
            const lastActiveText = formatDateTime(dashboardData?.user?.lastActiveAt || dashboardData?.profile?.updatedAt);
            dashboardUserMeta.textContent = `${nameText} • ${emailText || 'no-email'} • Last active ${lastActiveText}`;
        }

        const metrics = dashboardData?.metrics || {};
        if (dashboardMetricLaunches) dashboardMetricLaunches.textContent = String(Number(metrics.totalLaunches || 0));
        if (dashboardMetricAttempts) dashboardMetricAttempts.textContent = String(Number(metrics.totalAttempts || 0));
        if (dashboardMetricAvgScore) dashboardMetricAvgScore.textContent = formatPercent(metrics.avgScorePercent || 0);
        if (dashboardMetricWeekAttempts) {
            dashboardMetricWeekAttempts.textContent = String(Number(metrics.last7DaysAttempts || 0));
            const streak = Number(metrics.dailyStreak || 0);
            dashboardMetricWeekAttempts.setAttribute('title', streak > 0 ? `Current streak: ${streak} day${streak === 1 ? '' : 's'}` : 'Current streak: 0 days');
        }

        const activities = Array.isArray(dashboardData?.recentActivity) ? dashboardData.recentActivity : [];
        const lastSummary = dashboardData?.lastMockSummary || null;
        const nextRecommendedTest = dashboardData?.nextRecommendedTest || null;
        const weeklyTarget = Math.max(1, Number(metrics?.weeklyMockTarget || dashboardData?.profile?.preferences?.weeklyMockTarget || 5));
        const weeklyDone = Math.max(0, Number(metrics?.last7DaysAttempts || 0));
        const weeklyProgress = Math.max(0, Math.min(100, Math.round((weeklyDone / weeklyTarget) * 100)));

        if (dashboardSpotlight) {
            const scorePercent = Number(lastSummary?.scorePercent || 0);
            const scoreLabel = scorePercent > 0 ? formatPercent(scorePercent) : 'No score yet';
            const streakCount = Math.max(0, Number(metrics?.dailyStreak || 0));
            const topWarning = Array.isArray(dashboardData?.lowScoreWarnings) ? String(dashboardData.lowScoreWarnings[0] || '').trim() : '';
            const focusLine = topWarning || (nextRecommendedTest?.reason ? String(nextRecommendedTest.reason).trim() : 'Keep momentum with one timed mock and one revision block today.');

            dashboardSpotlight.innerHTML = `
                <div class="dashboard-spotlight-main">
                    <div>
                        <strong>${escapeHtml(String(dashboardData?.user?.name || 'Candidate'))}, this dashboard is your command center.</strong>
                        <span>${escapeHtml(focusLine)}</span>
                    </div>
                </div>
                <div class="dashboard-spotlight-chip-row">
                    <span class="dashboard-spotlight-chip">Latest Score ${escapeHtml(scoreLabel)}</span>
                    <span class="dashboard-spotlight-chip">Streak ${streakCount} day${streakCount === 1 ? '' : 's'}</span>
                    <span class="dashboard-spotlight-chip">Weekly Target ${weeklyDone}/${weeklyTarget}</span>
                    ${nextRecommendedTest?.examId ? `<span class="dashboard-spotlight-chip">Next ${escapeHtml(String(examById.get(String(nextRecommendedTest.examId || '').toLowerCase())?.title || nextRecommendedTest.examId || 'Mock'))}</span>` : ''}
                </div>
            `;
        }

        updateHeroHighlightsFromDashboard(dashboardData);

        const incompleteMock = normalizeIncompleteMock(dashboardData?.incompleteMock);
        setLandingResumeIndicator(incompleteMock);
        if (dashboardContinueLastBtn) {
            if (incompleteMock?.resumeUrl) {
                const progressPercent = Number(incompleteMock.progressPercent || 0);
                dashboardContinueLastBtn.textContent = progressPercent > 0
                    ? `Continue Incomplete Mock (${Math.round(progressPercent)}%)`
                    : 'Continue Incomplete Mock';
                dashboardContinueLastBtn.dataset.resumeUrl = incompleteMock.resumeUrl;
                dashboardContinueLastBtn.dataset.resumeExamId = incompleteMock.examId;
            } else {
                dashboardContinueLastBtn.textContent = 'Continue Last Exam';
                dashboardContinueLastBtn.dataset.resumeUrl = '';
                dashboardContinueLastBtn.dataset.resumeExamId = '';
            }
        }

        if (dashboardLastSummary) {
            if (!lastSummary) {
                renderDashboardEmpty(dashboardLastSummary, 'No completed attempts yet. Submit one mock to unlock section analytics.');
            } else {
                const summaryExam = examById.get(String(lastSummary?.examId || '').trim().toLowerCase());
                const summaryTitle = summaryExam?.title || String(lastSummary?.examId || 'Exam').toUpperCase();
                const sectionPerformance = Array.isArray(lastSummary?.sectionPerformance) ? lastSummary.sectionPerformance : [];
                const summaryTone = Number(lastSummary?.scorePercent || 0) >= 55 ? 'success' : 'warning';
                const attempted = Math.max(0, Number(lastSummary?.totalQuestions || 0) - Number(lastSummary?.unanswered || 0));

                dashboardLastSummary.innerHTML = `
                    <div class="dashboard-list-item ${summaryTone}">
                        <strong>${escapeHtml(summaryTitle)} • ${Number(lastSummary?.score || 0).toFixed(2)} / ${Number(lastSummary?.maxScore || 0).toFixed(2)}</strong>
                        <p>${escapeHtml(formatDateTime(lastSummary?.submittedAt))}</p>
                        <div class="dashboard-kpi-row">
                            <span class="dashboard-kpi">Score ${formatPercent(lastSummary?.scorePercent || 0)}</span>
                            <span class="dashboard-kpi">Accuracy ${formatPercent(lastSummary?.accuracyPercent || 0)}</span>
                            <span class="dashboard-kpi">Attempted ${attempted}/${Number(lastSummary?.totalQuestions || 0)}</span>
                            <span class="dashboard-kpi">Time ${formatDurationCompact(lastSummary?.timeTakenSeconds || 0)}</span>
                            ${lastSummary?.isAutoSubmitted ? '<span class="dashboard-kpi">Auto-submitted</span>' : ''}
                        </div>
                    </div>
                    ${sectionPerformance.slice(0, 4).map((section) => `
                        <div class="dashboard-list-item ${Number(section?.accuracyPercent || 0) < 50 ? 'warning' : ''}">
                            <strong>${escapeHtml(String(section?.name || section?.sectionId || 'Section'))}</strong>
                            <div class="dashboard-kpi-row">
                                <span class="dashboard-kpi">Accuracy ${formatPercent(section?.accuracyPercent || 0)}</span>
                                <span class="dashboard-kpi">Attempts ${Number(section?.attempted || 0)}/${Number(section?.total || 0)}</span>
                                <span class="dashboard-kpi">Time ${formatDurationCompact(section?.timeTakenSeconds || 0)}</span>
                            </div>
                        </div>
                    `).join('')}
                `;
            }
        }

        if (dashboardWeakTopics) {
            const weakTopics = Array.isArray(dashboardData?.weakTopics) ? dashboardData.weakTopics : [];
            const lowScoreWarnings = Array.isArray(dashboardData?.lowScoreWarnings) ? dashboardData.lowScoreWarnings : [];

            if (!weakTopics.length && !lowScoreWarnings.length) {
                renderDashboardEmpty(dashboardWeakTopics, 'No weak-topic alerts yet. Attempt more mocks for actionable feedback.');
            } else {
                dashboardWeakTopics.innerHTML = `
                    ${weakTopics.slice(0, 4).map((topic, index) => `
                        <div class="dashboard-list-item">
                            <strong>Weak Topic ${index + 1}</strong>
                            <p>${escapeHtml(String(topic || ''))}</p>
                        </div>
                    `).join('')}
                    ${lowScoreWarnings.slice(0, 4).map((warning, index) => `
                        <div class="dashboard-list-item warning">
                            <strong>Warning ${index + 1}</strong>
                            <p>${escapeHtml(String(warning || ''))}</p>
                        </div>
                    `).join('')}
                `;
            }
        }

        if (dashboardFocusPlan) {
            const weakTopic = Array.isArray(dashboardData?.weakTopics) ? String(dashboardData.weakTopics[0] || '').trim() : '';
            const recommendedExamId = String(nextRecommendedTest?.examId || '').trim().toLowerCase();
            const recommendedExamTitle = String(examById.get(recommendedExamId)?.title || nextRecommendedTest?.title || recommendedExamId || 'next mock').trim();
            const preferredFocus = String(dashboardData?.profile?.preferences?.focusArea || 'balanced').trim();
            const completionHint = weeklyProgress >= 100
                ? 'Target achieved. Add one challenge mock for an edge.'
                : `${weeklyTarget - weeklyDone} more mock${weeklyTarget - weeklyDone === 1 ? '' : 's'} to hit weekly target.`;

            dashboardFocusPlan.innerHTML = `
                <div class="dashboard-focus-list">
                    <div class="dashboard-focus-item">
                        <span>Today&apos;s Objective</span>
                        <strong>${escapeHtml(recommendedExamTitle)}</strong>
                        <p>${escapeHtml(nextRecommendedTest?.reason || 'Attempt one full timed mock to maintain rank momentum.')}</p>
                    </div>
                    <div class="dashboard-focus-item">
                        <span>Recovery Topic</span>
                        <strong>${escapeHtml(weakTopic || 'No weak topic flagged')}</strong>
                        <p>${escapeHtml(weakTopic ? 'Spend 30 focused minutes here before your next attempt.' : 'Keep consistency and review recent mistakes to prevent drift.')}</p>
                    </div>
                    <div class="dashboard-focus-item">
                        <span>Weekly Progress</span>
                        <strong>${weeklyDone}/${weeklyTarget} (${weeklyProgress}%)</strong>
                        <p>${escapeHtml(completionHint)}</p>
                    </div>
                    <div class="dashboard-focus-item">
                        <span>Preparation Mode</span>
                        <strong>${escapeHtml(preferredFocus.charAt(0).toUpperCase() + preferredFocus.slice(1))}</strong>
                        <p>${escapeHtml(activities.length ? `Built from ${activities.length} recent attempt${activities.length === 1 ? '' : 's'}.` : 'Start your first mock to unlock deeper guidance.')}</p>
                    </div>
                </div>
            `;
        }

        const weakTopics = Array.isArray(dashboardData?.weakTopics) ? dashboardData.weakTopics : [];
        const lowScoreWarnings = Array.isArray(dashboardData?.lowScoreWarnings) ? dashboardData.lowScoreWarnings : [];
        const summarySections = Array.isArray(lastSummary?.sectionPerformance) ? lastSummary.sectionPerformance : [];
        const preferredExamId = String(
            dashboardData?.profile?.preferences?.preferredExamId
            || nextRecommendedTest?.examId
            || lastSummary?.examId
            || activities[0]?.examId
            || ''
        ).trim().toLowerCase();
        const preferredExam = examById.get(preferredExamId);

        if (dashboardGoalThermometer) {
            try {
                const monthlyTarget = Math.max(4, weeklyTarget * 4);
                const nowTime = Date.now();
                const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
                const monthlyDone = activities.filter((attempt) => {
                    const timestamp = Date.parse(String(attempt?.submittedAt || ''));
                    return Number.isFinite(timestamp) && (nowTime - timestamp) <= thirtyDaysMs;
                }).length;
                const monthlyProgress = Math.max(0, Math.min(100, Math.round((monthlyDone / monthlyTarget) * 100)));
                const weeklyToneClass = weeklyProgress >= 70 ? '' : (weeklyProgress >= 40 ? 'goal-warn' : 'goal-danger');
                const monthlyToneClass = monthlyProgress >= 70 ? '' : (monthlyProgress >= 40 ? 'goal-warn' : 'goal-danger');
                const deadlineIso = DASHBOARD_EXAM_DEADLINE_BY_ID[preferredExamId];
                const deadlineInfo = getDeadlineUrgency(deadlineIso);
                const deadlineChipClass = deadlineInfo.status === 'danger'
                    ? 'danger'
                    : (deadlineInfo.status === 'warn' ? 'warn' : '');
                const deadlineTitle = String(preferredExam?.title || nextRecommendedTest?.title || preferredExamId || 'Your target exam').trim();

                dashboardGoalThermometer.innerHTML = `
                    <div class="dashboard-goal-stack">
                        <div class="dashboard-goal-row">
                            <div class="dashboard-goal-row-head">
                                <strong>Weekly Mission</strong>
                                <span>${weeklyDone}/${weeklyTarget}</span>
                            </div>
                            <div class="dashboard-goal-track">
                                <span class="dashboard-goal-fill ${weeklyToneClass}" style="width:${weeklyProgress}%"></span>
                            </div>
                        </div>
                        <div class="dashboard-goal-row">
                            <div class="dashboard-goal-row-head">
                                <strong>Monthly Mission</strong>
                                <span>${monthlyDone}/${monthlyTarget}</span>
                            </div>
                            <div class="dashboard-goal-track">
                                <span class="dashboard-goal-fill ${monthlyToneClass}" style="width:${monthlyProgress}%"></span>
                            </div>
                        </div>
                        <div class="dashboard-deadline-card">
                            <strong>${escapeHtml(deadlineTitle)}</strong>
                            <p>${escapeHtml(deadlineInfo.isValid ? `Target exam on ${deadlineInfo.targetDisplay}.` : 'Select a preferred exam to unlock deadline countdown mode.')}</p>
                            <span class="dashboard-deadline-chip ${deadlineChipClass}">${escapeHtml(deadlineInfo.deadlineLabel)}</span>
                        </div>
                    </div>
                `;
            } catch (error) {
                renderDashboardEmpty(dashboardGoalThermometer, 'Goal thermometer is temporarily unavailable. Refresh to retry.');
            }
        }

        if (dashboardRankTrajectory) {
            const trajectoryAttempts = activities.slice(0, 10).reverse();
            if (!trajectoryAttempts.length) {
                renderDashboardEmpty(dashboardRankTrajectory, 'Need recent attempts to project your rank trajectory.');
            } else {
                const projectedPercentile = calculateProjectedPercentile(trajectoryAttempts);
                const poolSize = DASHBOARD_EXAM_POOL_BY_ID[preferredExamId] || 400000;
                const rankBand = buildProjectedRankBand(projectedPercentile, poolSize);
                const barMarkup = trajectoryAttempts.map((attempt) => {
                    const percentile = estimateAttemptPercentile(attempt);
                    const barHeight = Math.max(8, Math.round((percentile / 100) * 70));
                    const stamp = formatDateTime(attempt?.submittedAt);
                    return `<span class="dashboard-rank-bar" style="height:${barHeight}px" title="${escapeHtml(`${stamp}: ${percentile.toFixed(1)} percentile`)}"></span>`;
                }).join('');
                const firstStamp = trajectoryAttempts[0]?.submittedAt ? formatDateTime(trajectoryAttempts[0].submittedAt) : 'Earlier';
                const lastStamp = trajectoryAttempts[trajectoryAttempts.length - 1]?.submittedAt
                    ? formatDateTime(trajectoryAttempts[trajectoryAttempts.length - 1].submittedAt)
                    : 'Now';

                dashboardRankTrajectory.innerHTML = `
                    <div class="dashboard-rank-shell">
                        <strong>Projected percentile ${projectedPercentile.toFixed(1)}%</strong>
                        <p>Estimated rank band ${formatCompactStat(rankBand.start)}-${formatCompactStat(rankBand.end)} in ~${formatCompactStat(poolSize, { plusSuffix: true })} aspirants.</p>
                        <div class="dashboard-rank-bars">${barMarkup}</div>
                        <div class="dashboard-rank-labels"><span>${escapeHtml(firstStamp)}</span><span>${escapeHtml(lastStamp)}</span></div>
                    </div>
                `;
            }
        }

        if (dashboardMistakeNotebook) {
            try {
                const lowAccuracySection = summarySections.find((section) => Number(section?.accuracyPercent || 0) < 65);
                const mistakeCards = [];

                if (weakTopics[0]) {
                    mistakeCards.push({
                        title: `Concept gap: ${String(weakTopics[0]).trim()}`,
                        detail: 'Revise notes and attempt 12 focused questions with full accuracy tracking.'
                    });
                }

                if (lowScoreWarnings[0]) {
                    mistakeCards.push({
                        title: 'Score pattern alert',
                        detail: String(lowScoreWarnings[0]).trim()
                    });
                }

                if (lowAccuracySection) {
                    mistakeCards.push({
                        title: `${String(lowAccuracySection?.name || lowAccuracySection?.sectionId || 'Section')} needs repair`,
                        detail: `Accuracy ${formatPercent(lowAccuracySection?.accuracyPercent || 0)}. Run one timed sectional drill before your next mock.`
                    });
                }

                if (!mistakeCards.length) {
                    renderDashboardEmpty(dashboardMistakeNotebook, 'No recurring mistake clusters detected yet. Keep attempting mocks for notebook insights.');
                } else {
                    const drillExamId = preferredExamId || String(nextRecommendedTest?.examId || '').trim().toLowerCase();
                    dashboardMistakeNotebook.innerHTML = mistakeCards.slice(0, 3).map((item) => `
                        <div class="dashboard-mistake-card">
                            <strong>${escapeHtml(item.title)}</strong>
                            <p>${escapeHtml(item.detail)}</p>
                            ${drillExamId ? `<button type="button" class="dashboard-cta-btn" data-dashboard-exam-id="${escapeHtml(drillExamId)}" data-dashboard-launch-source="dashboard-mistake-notebook">Start Revision Drill</button>` : ''}
                        </div>
                    `).join('');
                }
            } catch (error) {
                renderDashboardEmpty(dashboardMistakeNotebook, 'Mistake notebook is temporarily unavailable. Refresh to retry.');
            }
        }

        if (dashboardRoutinePlan) {
            const routineTasks = [
                {
                    key: 'routine-20',
                    duration: '20 min',
                    title: `Rapid recall: ${String(weakTopics[0] || 'core fundamentals').trim()}`,
                    detail: 'Review formulas and solve 8 precision-first questions.'
                },
                {
                    key: 'routine-40',
                    duration: '40 min',
                    title: `Timed sectional drill: ${String(weakTopics[1] || weakTopics[0] || 'priority weak area').trim()}`,
                    detail: 'One medium-intensity drill with strict pacing and error tagging.'
                },
                {
                    key: 'routine-60',
                    duration: '60 min',
                    title: `Full simulation: ${String(preferredExam?.title || nextRecommendedTest?.title || 'next recommended mock').trim()}`,
                    detail: 'Attempt one complete mock and spend final 10 minutes on mistake review.'
                }
            ];
            const todayRoutineProgress = readTodayRoutineProgress();
            const completedCount = routineTasks.reduce((count, task) => count + (todayRoutineProgress?.[task.key] ? 1 : 0), 0);

            dashboardRoutinePlan.innerHTML = `
                <div class="dashboard-list-item ${completedCount === routineTasks.length ? 'success' : ''}">
                    <strong>Daily execution score ${completedCount}/${routineTasks.length}</strong>
                    <p>${escapeHtml(completedCount === routineTasks.length ? 'Perfect day. Keep this rhythm tomorrow too.' : 'Mark each block complete as you finish it.')}</p>
                </div>
                <div class="dashboard-routine-list">
                    ${routineTasks.map((task) => {
                        const isDone = Boolean(todayRoutineProgress?.[task.key]);
                        return `
                            <label class="dashboard-routine-item ${isDone ? 'done' : ''}">
                                <input type="checkbox" data-routine-item-key="${escapeHtml(task.key)}" ${isDone ? 'checked' : ''} aria-label="${escapeHtml(`Mark ${task.duration} task complete`)}">
                                <div class="dashboard-routine-item-content">
                                    <strong>${escapeHtml(task.duration)} • ${escapeHtml(task.title)}</strong>
                                    <p>${escapeHtml(task.detail)}</p>
                                </div>
                            </label>
                        `;
                    }).join('')}
                </div>
            `;
        }

        if (dashboardAchievementLayer) {
            const dailyStreak = Math.max(0, Number(metrics?.dailyStreak || 0));
            const averageScore = Number(metrics?.avgScorePercent || 0);
            const todayKey = new Date().toISOString().slice(0, 10);
            const todayAttemptCount = activities.filter((attempt) => String(attempt?.submittedAt || '').slice(0, 10) === todayKey).length;

            const consistencyMedal = dailyStreak >= 21
                ? 'Legend streak medal'
                : (dailyStreak >= 10 ? 'Consistency pro medal' : (dailyStreak >= 4 ? 'Momentum builder medal' : 'Starter medal'));
            const accuracyMedal = averageScore >= 75
                ? 'Precision medal'
                : (averageScore >= 60 ? 'Rising score medal' : 'Foundation medal');
            const todayWin = todayAttemptCount > 0
                ? `You completed ${todayAttemptCount} mock${todayAttemptCount === 1 ? '' : 's'} today.`
                : (weeklyProgress >= 100 ? 'You have already crossed your weekly target.' : 'Your next win is one focused mock away.');

            dashboardAchievementLayer.innerHTML = `
                <div class="dashboard-achievement-grid">
                    <div class="dashboard-achievement-card">
                        <span>Current streak</span>
                        <strong>${dailyStreak} day${dailyStreak === 1 ? '' : 's'}</strong>
                        <div class="dashboard-medal-chip">${escapeHtml(consistencyMedal)}</div>
                    </div>
                    <div class="dashboard-achievement-card">
                        <span>Score quality</span>
                        <strong>${formatPercent(averageScore)}</strong>
                        <div class="dashboard-medal-chip">${escapeHtml(accuracyMedal)}</div>
                    </div>
                    <div class="dashboard-achievement-card">
                        <span>Weekly mission</span>
                        <strong>${weeklyProgress}% complete</strong>
                        <p>${escapeHtml(weeklyProgress >= 100 ? 'Target conquered. Add one challenge mock.' : `${Math.max(0, weeklyTarget - weeklyDone)} mock${Math.max(0, weeklyTarget - weeklyDone) === 1 ? '' : 's'} remaining this week.`)}</p>
                    </div>
                </div>
                <div class="dashboard-today-win">
                    <strong>Today&apos;s Win</strong>
                    <p>${escapeHtml(todayWin)}</p>
                </div>
            `;
        }

        if (dashboardNextRecommended) {
            if (!nextRecommendedTest || !String(nextRecommendedTest?.examId || '').trim()) {
                renderDashboardEmpty(dashboardNextRecommended, 'No next-test recommendation yet. Keep using exam filters to personalize.');
            } else {
                const nextExamId = String(nextRecommendedTest.examId || '').trim().toLowerCase();
                const nextExam = examById.get(nextExamId);
                const nextTitle = nextExam?.title || String(nextRecommendedTest?.title || nextExamId || 'Exam');
                dashboardNextRecommended.innerHTML = `
                    <div class="dashboard-list-item success">
                        <strong>${escapeHtml(nextTitle)}</strong>
                        <p>${escapeHtml(String(nextRecommendedTest?.reason || nextRecommendedTest?.stream || 'Recommended based on your trend.'))}</p>
                        <div class="dashboard-kpi-row">
                            <span class="dashboard-kpi">Confidence ${formatPercent(nextRecommendedTest?.confidence || 0)}</span>
                            <span class="dashboard-kpi">${escapeHtml(String(nextExam?.recommendedDuration || 'Timed mock'))}</span>
                        </div>
                        <button type="button" class="dashboard-cta-btn" data-dashboard-exam-id="${escapeHtml(nextExamId)}" data-dashboard-launch-source="dashboard-next-recommended">Start This Mock</button>
                    </div>
                    ${incompleteMock?.resumeUrl ? `
                        <div class="dashboard-list-item">
                            <strong>Incomplete attempt detected</strong>
                            <p>Resume ${escapeHtml(examById.get(incompleteMock.examId)?.title || incompleteMock.examId)} from your saved progress.</p>
                        </div>
                    ` : ''}
                `;
            }
        }

        if (dashboardActivityCount) {
            dashboardActivityCount.textContent = `${activities.length} attempt${activities.length === 1 ? '' : 's'}`;
        }

        if (dashboardTrendCharts) {
            const trendPoints = buildSevenDayTrendSeries(activities);
            dashboardTrendCharts.innerHTML = `
                <div class="dashboard-trend-grid">
                    ${renderMiniTrendCard('Score Trend', 'scorePercent', trendPoints, 'score')}
                    ${renderMiniTrendCard('Accuracy Trend', 'accuracyPercent', trendPoints, 'accuracy')}
                </div>
            `;
        }

        if (dashboardRecentActivity) {
            if (!activities.length) {
                renderDashboardEmpty(dashboardRecentActivity, 'No attempts yet. Start a mock to build your activity timeline.');
            } else {
                dashboardRecentActivity.innerHTML = activities.map((attempt) => {
                    const exam = examById.get(String(attempt?.examId || '').toLowerCase());
                    const examTitle = exam?.title || String(attempt?.examId || 'Exam').toUpperCase();
                    const score = Number(attempt?.score || 0);
                    const maxScore = Number(attempt?.maxScore || 0);
                    const scorePercent = Number(attempt?.scorePercent || 0);
                    const accuracyPercent = Number(attempt?.accuracyPercent || 0);
                    return `
                        <div class="dashboard-list-item">
                            <strong>${escapeHtml(examTitle)} • ${score.toFixed(2)} / ${maxScore.toFixed(2)}</strong>
                            <p>${escapeHtml(formatDateTime(attempt?.submittedAt))}</p>
                            <div class="dashboard-chip-row">
                                <span class="dashboard-chip">Score ${formatPercent(scorePercent)}</span>
                                <span class="dashboard-chip">Accuracy ${formatPercent(accuracyPercent)}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        const recommendedExams = Array.isArray(dashboardData?.recommendedExams) ? dashboardData.recommendedExams : [];
        if (dashboardRecommendedExams) {
            const nextExamId = String(nextRecommendedTest?.examId || '').trim().toLowerCase();
            const alternateRecommendations = recommendedExams
                .filter((item) => String(item?.examId || '').trim().toLowerCase() !== nextExamId)
                .slice(0, 4);

            if (!alternateRecommendations.length) {
                renderDashboardEmpty(dashboardRecommendedExams, 'No recommendation yet. Use assessment or start mocks to personalize.');
            } else {
                dashboardRecommendedExams.innerHTML = alternateRecommendations.map((item) => {
                    const exam = examById.get(String(item?.examId || '').toLowerCase());
                    const examTitle = exam?.title || String(item?.title || item?.examId || 'Exam');
                    const examId = String(item?.examId || '').trim().toLowerCase();
                    const confidence = Number(item?.confidence || 0);
                    return `
                        <div class="dashboard-list-item">
                            <strong>${escapeHtml(examTitle)}</strong>
                            <p>${escapeHtml(String(item?.stream || exam?.stream || ''))}</p>
                            <div class="dashboard-chip-row">
                                <span class="dashboard-chip">Confidence ${formatPercent(confidence)}</span>
                            </div>
                            <button type="button" class="dashboard-cta-btn" data-dashboard-exam-id="${escapeHtml(examId)}" data-dashboard-launch-source="dashboard-recommended-alt">Launch Mock</button>
                        </div>
                    `;
                }).join('');
            }
        }

        const shortcuts = Array.isArray(dashboardData?.quickExamShortcuts) ? dashboardData.quickExamShortcuts : [];
        if (dashboardExamShortcuts) {
            if (!shortcuts.length) {
                renderDashboardEmpty(dashboardExamShortcuts, 'Exam shortcuts are not available right now.');
            } else {
                const latestAttemptByExam = new Map();
                activities.forEach((attempt) => {
                    const examId = String(attempt?.examId || '').trim().toLowerCase();
                    if (!examId || latestAttemptByExam.has(examId)) return;
                    latestAttemptByExam.set(examId, attempt);
                });

                dashboardExamShortcuts.innerHTML = shortcuts.map((exam) => {
                    const examId = String(exam?.examId || '').trim().toLowerCase();
                    const examTitle = String(exam?.title || examId || 'Exam').trim();
                    const duration = String(exam?.recommendedDuration || '').trim();
                    const level = String(exam?.recommendedLevel || '').trim();
                    const preferredChip = exam?.isPreferred ? '<span class="dashboard-chip">Preferred</span>' : '';
                    const recentAttempt = latestAttemptByExam.get(examId);
                    const lowScore = Number(recentAttempt?.scorePercent || 0) > 0 && Number(recentAttempt?.scorePercent || 0) < 45;
                    const lowAccuracy = Number(recentAttempt?.accuracyPercent || 0) > 0 && Number(recentAttempt?.accuracyPercent || 0) < 60;
                    const alertText = lowScore
                        ? 'Low score alert'
                        : (lowAccuracy ? 'Low accuracy alert' : '');
                    const alertMarkup = alertText
                        ? `<span class="dashboard-alert-badge">${escapeHtml(alertText)}</span>`
                        : '';

                    return `
                        <button type="button" class="dashboard-shortcut-btn" data-dashboard-exam-id="${escapeHtml(examId)}">
                            <div class="dashboard-shortcut-head">
                                <strong>${escapeHtml(examTitle)}</strong>
                                ${alertMarkup}
                            </div>
                            <span>${escapeHtml(duration)} • ${escapeHtml(level)}</span>
                            ${preferredChip}
                        </button>
                    `;
                }).join('');
            }
        }

        const preferences = sanitizePreferences(dashboardData?.profile?.preferences || {});
        if (dashboardPrefExam) {
            const examOptions = examCatalog.map((exam) => {
                const isSelected = preferences.preferredExamId === exam.id;
                return `<option value="${escapeHtml(exam.id)}" ${isSelected ? 'selected' : ''}>${escapeHtml(exam.title)}</option>`;
            }).join('');

            dashboardPrefExam.innerHTML = `<option value="">Auto (Based on activity)</option>${examOptions}`;
            dashboardPrefExam.value = preferences.preferredExamId || '';
        }

        if (dashboardPrefLanguage) dashboardPrefLanguage.value = preferences.preferredLanguage || 'en';
        if (dashboardPrefWeeklyTarget) dashboardPrefWeeklyTarget.value = String(preferences.weeklyMockTarget || 5);
        if (dashboardPrefFocus) dashboardPrefFocus.value = preferences.focusArea || 'balanced';

        if (dashboardPrefStatus) {
            dashboardPrefStatus.textContent = '';
            dashboardPrefStatus.classList.remove('success', 'warn');
        }

        ensureDashboardPanelResolved(dashboardGoalThermometer, 'Goal thermometer is not available yet. Start one mock to activate this widget.');
        ensureDashboardPanelResolved(dashboardMistakeNotebook, 'Mistake notebook is waiting for attempt data. Start and submit one mock to unlock it.');
        scrubButtonSyntaxArtifacts();
        applyDashboardTabState();
    };

    const openDashboardModal = async ({ syncHash = true, forceReload = false } = {}) => {
        if (!authSession.isAuthenticated) {
            openModal('login');
            return;
        }

        if (!dashboardModal) return;

        if (!forceReload && dashboardModal.classList.contains('active')) {
            return;
        }

        if (authModal?.classList.contains('active')) {
            closeAuthModal();
        }

        dashboardModal.classList.add('active');
        dashboardModal.setAttribute('aria-hidden', 'false');
        syncPageScrollLock();

        renderDashboardEmpty(dashboardRecentActivity, 'Loading dashboard...');
        renderDashboardEmpty(dashboardSpotlight, 'Preparing your command center...');
        renderDashboardEmpty(dashboardLastSummary, 'Loading latest summary...');
        renderDashboardEmpty(dashboardFocusPlan, 'Building today\'s focus plan...');
        renderDashboardEmpty(dashboardGoalThermometer, 'Calibrating your goal thermometer...');
        renderDashboardEmpty(dashboardRankTrajectory, 'Projecting your rank trajectory...');
        renderDashboardEmpty(dashboardMistakeNotebook, 'Building your mistake notebook...');
        renderDashboardEmpty(dashboardRoutinePlan, 'Generating daily routine blocks...');
        renderDashboardEmpty(dashboardAchievementLayer, 'Unlocking achievement layer...');
        renderDashboardEmpty(dashboardWeakTopics, 'Analyzing weak topics...');
        renderDashboardEmpty(dashboardNextRecommended, 'Finding your next best test...');
        renderDashboardEmpty(dashboardTrendCharts, 'Loading 7-day trends...');
        renderDashboardEmpty(dashboardRecommendedExams, 'Loading recommendations...');
        renderDashboardEmpty(dashboardExamShortcuts, 'Loading shortcuts...');

        const dashboardData = await loadDashboardData({ force: forceReload });
        renderDashboard(dashboardData);

        ensureDashboardPanelResolved(dashboardGoalThermometer, 'Goal thermometer is not available yet. Start one mock to activate this widget.');
        ensureDashboardPanelResolved(dashboardMistakeNotebook, 'Mistake notebook is waiting for attempt data. Start and submit one mock to unlock it.');

        if (syncHash && window.location.hash !== DASHBOARD_HASH) {
            window.location.hash = 'dashboard';
        }
    };

    const closeDashboardModal = ({ syncHash = true } = {}) => {
        if (!dashboardModal) return;

        dashboardModal.classList.remove('active');
        dashboardModal.setAttribute('aria-hidden', 'true');
        syncPageScrollLock();

        if (syncHash && window.location.hash === DASHBOARD_HASH) {
            const nextUrl = new URL(window.location.href);
            nextUrl.hash = '';
            window.history.replaceState({}, '', nextUrl);
        }
    };

    const applyPendingMockContext = () => {
        if (!pendingMockExam) return;

        if (isLoginMode) {
            modalSubtitle.textContent = `Log in to continue with ${pendingMockExam.title} mock.`;
        } else {
            modalSubtitle.textContent = `Create an account to start your ${pendingMockExam.title} mock.`;
        }
    };

    const setAuthMode = (mode) => {
        isLoginMode = mode === 'login';

        loginTab.classList.toggle('active', isLoginMode);
        signupTab.classList.toggle('active', !isLoginMode);
        loginTab.setAttribute('aria-selected', String(isLoginMode));
        signupTab.setAttribute('aria-selected', String(!isLoginMode));

        loginForm.classList.toggle('hidden', !isLoginMode);
        signupForm.classList.toggle('hidden', isLoginMode);

        if (isLoginMode) {
            modalTitle.textContent = 'Welcome Back';
            modalSubtitle.textContent = 'Log in to continue your preparation.';
            footerText.innerHTML = "Don't have an account? <button type=\"button\" class=\"text-link\" id=\"toggle-auth-mode\">Sign up for free</button>";
        } else {
            modalTitle.textContent = 'Create Your Account';
            modalSubtitle.textContent = 'Join Mockly and start improving your rank today.';
            footerText.innerHTML = "Already have an account? <button type=\"button\" class=\"text-link\" id=\"toggle-auth-mode\">Log in here</button>";
        }

        setAuthStatus('');

        applyPendingMockContext();

        const nextToggle = document.getElementById('toggle-auth-mode');
        if (nextToggle) {
            nextToggle.addEventListener('click', () => {
                setAuthMode(isLoginMode ? 'signup' : 'login');
            });
        }
    };

    const openModal = (mode, options = {}) => {
        const { preservePendingExam = false } = options;

        if (!preservePendingExam) {
            pendingMockExam = null;
        }

        shouldLaunchAfterAuth = Boolean(preservePendingExam && pendingMockExam);

        closeDashboardModal({ syncHash: false });

        authModal.classList.add('active');
        authModal.setAttribute('aria-hidden', 'false');
        setAuthStatus('');
        syncPageScrollLock();
        setAuthMode(mode);
    };

    const closeAuthModal = () => {
        authModal.classList.remove('active');
        authModal.setAttribute('aria-hidden', 'true');
        syncPageScrollLock();
    };

    const handleAuthSuccess = (emailValue, nameValue = '') => {
        const normalizedEmail = String(emailValue || '').trim();
        const normalizedName = String(nameValue || '').trim() || (normalizedEmail.includes('@') ? normalizedEmail.split('@')[0] : '');

        authSession = {
            isAuthenticated: true,
            userEmail: normalizedEmail,
            userName: normalizedName
        };
        saveAuthSession();
        loadActiveUserProgressFromStore();
        updateNavbarAuthUI();
        clearMockCardPerformance();
        void loadMockCardPerformanceFromApi().then(() => {
            refreshRenderedExamCards();
        });

        void hydratePersonalizationFromApi().then((didSync) => {
            if (didSync) {
                refreshRenderedExamCards();
                dashboardDataCache = null;
            }
        });

        const examForLaunch = shouldLaunchAfterAuth ? pendingMockExam : null;
        shouldLaunchAfterAuth = false;
        pendingMockExam = null;

        closeAuthModal();

        if (examForLaunch) {
            setSelectedExamState(examForLaunch.id, {
                syncUrl: true,
                syncStorage: true,
                usePushState: false,
                scrollToLaunch: false
            });
            launchSelectedExam(examForLaunch, {
                fromAuth: true,
                launchSource: 'auth-success'
            });
        } else {
            setMockLaunchStatus('You are logged in. Select an exam to begin your mock.', 'info');
            void openDashboardModal({ syncHash: true, forceReload: true });
        }
    };

    const isValidEmail = (emailValue) => {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        return emailPattern.test(String(emailValue || '').trim());
    };

    const isValidPhoneNumber = (phoneValue) => {
        const phonePattern = /^\d{10}$/;
        return phonePattern.test(String(phoneValue || '').trim());
    };

    const submitAuthRequest = async (endpoint, payload) => {
        if (!API_ENABLED) return null;

        return requestJson(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
    };

    const getUserInitial = () => {
        const sourceText = String(authSession.userName || authSession.userEmail || '').trim();
        if (!sourceText) return 'U';

        const baseText = sourceText.includes('@') ? sourceText.split('@')[0] : sourceText;
        const firstValidChar = baseText.match(/[A-Za-z0-9]/);
        return (firstValidChar ? firstValidChar[0] : 'U').toUpperCase();
    };

    const refreshSelectedExamCta = () => {
        const selectedExamId = String(startSelectedMockBtn?.getAttribute('data-exam-id') || '').trim();

        if (!selectedExamId) {
            setSelectedExamState('', {
                syncUrl: false,
                syncStorage: false,
                usePushState: false,
                scrollToLaunch: false
            });
            return;
        }

        setSelectedExamState(selectedExamId, {
            syncUrl: false,
            syncStorage: false,
            usePushState: false,
            scrollToLaunch: false
        });
    };

    const updateNavbarAuthUI = () => {
        if (!loginBtnNav || !signupBtnNav) return;

        if (authSession.isAuthenticated) {
            const userInitial = getUserInitial();

            loginBtnNav.classList.add('nav-user-chip');
            loginBtnNav.innerHTML = `<span class="nav-avatar" aria-hidden="true">${userInitial}</span><span class="nav-user-text">Hi, <span class="nav-user-char">${userInitial}</span></span>`;
            loginBtnNav.setAttribute('aria-label', `Open dashboard for ${authSession.userEmail || 'user'}`);
            loginBtnNav.setAttribute('title', 'Open your dashboard');

            signupBtnNav.textContent = 'Log Out';
            signupBtnNav.setAttribute('title', 'Log out');
        } else {
            loginBtnNav.classList.remove('nav-user-chip');
            loginBtnNav.textContent = 'Log In';
            loginBtnNav.removeAttribute('aria-label');
            loginBtnNav.removeAttribute('title');

            signupBtnNav.textContent = 'Sign Up';
            signupBtnNav.removeAttribute('title');
        }

        refreshSelectedExamCta();
        setLandingResumeIndicator(getLocalIncompleteMockForEmail(authSession.userEmail));

        if (authSession.isAuthenticated) {
            void refreshHeroHighlights({ force: false });
        } else {
            updateHeroHighlightsFromDashboard(null);
        }
    };

    const logoutSession = async () => {
        if (API_ENABLED) {
            try {
                await requestJson(AUTH_LOGOUT_API_ENDPOINT, { method: 'POST' });
            } catch (error) {
                // Continue local cleanup even if remote logout fails.
            }
        }

        closeDashboardModal({ syncHash: true });
        authSession = {
            isAuthenticated: false,
            userEmail: '',
            userName: ''
        };
        dashboardDataCache = null;
        clearMockCardPerformance();
        saveAuthSession();
        loadActiveUserProgressFromStore();
        updateNavbarAuthUI();
        setLandingResumeIndicator(null);
        refreshRenderedExamCards();
        setMockLaunchStatus('You are logged out. Log in again to continue your selected mock.', 'warn');
    };

    if (loginBtnNav) {
        loginBtnNav.addEventListener('click', () => {
            if (authSession.isAuthenticated) {
                void openDashboardModal({ syncHash: true, forceReload: true });
                return;
            }

            openModal('login');
        });
    }

    if (signupBtnNav) {
        signupBtnNav.addEventListener('click', () => {
            if (authSession.isAuthenticated) {
                logoutSession();
                return;
            }

            openModal('signup');
        });
    }

    if (closeModal) closeModal.addEventListener('click', closeAuthModal);
    if (loginTab) loginTab.addEventListener('click', () => setAuthMode('login'));
    if (signupTab) signupTab.addEventListener('click', () => setAuthMode('signup'));
    if (toggleAuthModeBtn) {
        toggleAuthModeBtn.addEventListener('click', () => {
            setAuthMode('signup');
        });
    }

    if (closeDashboardModalBtn) {
        closeDashboardModalBtn.addEventListener('click', () => {
            closeDashboardModal({ syncHash: true });
        });
    }

    if (dashboardTabButtons.length) {
        dashboardTabButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-dashboard-tab');
                setDashboardTab(tabId, { persist: true });
            });
        });
    }

    if (dashboardModal) {
        dashboardModal.addEventListener('click', (event) => {
            if (event.target === dashboardModal) {
                closeDashboardModal({ syncHash: true });
            }
        });
    }

    const launchExamFromDashboard = (examIdValue, launchSource = 'dashboard-cta') => {
        const examId = String(examIdValue || '').trim().toLowerCase();
        const selectedExam = examById.get(examId);
        if (!selectedExam) return false;

        setSelectedExamState(examId, {
            syncUrl: true,
            syncStorage: true,
            usePushState: true,
            scrollToLaunch: true
        });
        trackPersonalizationEvent('selected', examId, {
            refreshUi: true,
            source: launchSource
        });
        closeDashboardModal({ syncHash: true });

        launchSelectedExam(selectedExam, {
            fromAuth: false,
            launchSource
        });

        return true;
    };

    if (dashboardExamShortcuts) {
        dashboardExamShortcuts.addEventListener('click', (event) => {
            const shortcutButton = event.target.closest('[data-dashboard-exam-id]');
            if (!shortcutButton) return;

            const examId = String(shortcutButton.getAttribute('data-dashboard-exam-id') || '').trim().toLowerCase();
            launchExamFromDashboard(examId, 'dashboard-shortcut');
        });
    }

    if (dashboardNextRecommended) {
        dashboardNextRecommended.addEventListener('click', (event) => {
            const ctaButton = event.target.closest('[data-dashboard-exam-id]');
            if (!ctaButton) return;

            const examId = String(ctaButton.getAttribute('data-dashboard-exam-id') || '').trim().toLowerCase();
            const launchSource = String(ctaButton.getAttribute('data-dashboard-launch-source') || 'dashboard-next-recommended').trim();
            launchExamFromDashboard(examId, launchSource);
        });
    }

    if (dashboardRecommendedExams) {
        dashboardRecommendedExams.addEventListener('click', (event) => {
            const ctaButton = event.target.closest('[data-dashboard-exam-id]');
            if (!ctaButton) return;

            const examId = String(ctaButton.getAttribute('data-dashboard-exam-id') || '').trim().toLowerCase();
            const launchSource = String(ctaButton.getAttribute('data-dashboard-launch-source') || 'dashboard-recommended-alt').trim();
            launchExamFromDashboard(examId, launchSource);
        });
    }

    if (dashboardMistakeNotebook) {
        dashboardMistakeNotebook.addEventListener('click', (event) => {
            const ctaButton = event.target.closest('[data-dashboard-exam-id]');
            if (!ctaButton) return;

            const examId = String(ctaButton.getAttribute('data-dashboard-exam-id') || '').trim().toLowerCase();
            const launchSource = String(ctaButton.getAttribute('data-dashboard-launch-source') || 'dashboard-mistake-notebook').trim();
            launchExamFromDashboard(examId, launchSource);
        });
    }

    if (dashboardRoutinePlan) {
        dashboardRoutinePlan.addEventListener('change', (event) => {
            const routineCheckbox = event.target.closest('input[type="checkbox"][data-routine-item-key]');
            if (!routineCheckbox) return;

            const itemKey = String(routineCheckbox.getAttribute('data-routine-item-key') || '').trim();
            updateTodayRoutineProgress(itemKey, Boolean(routineCheckbox.checked));

            const parentItem = routineCheckbox.closest('.dashboard-routine-item');
            if (parentItem) {
                parentItem.classList.toggle('done', Boolean(routineCheckbox.checked));
            }

            if (dashboardDataCache) {
                renderDashboard(dashboardDataCache);
            }
        });
    }

    if (dashboardContinueLastBtn) {
        dashboardContinueLastBtn.addEventListener('click', () => {
            const resumeUrl = String(dashboardContinueLastBtn.dataset.resumeUrl || '').trim();
            if (resumeUrl) {
                closeDashboardModal({ syncHash: true });
                window.location.href = resumeUrl;
                return;
            }

            const dashboardData = dashboardDataCache || buildFallbackDashboardData();
            const fallbackExamId = String(activeUserProgress.lastSelectedExamId || selectedExamIdState || '').trim().toLowerCase();
            const examId = String(dashboardData?.profile?.lastSelectedExamId || fallbackExamId || '').trim().toLowerCase();
            const selectedExam = examById.get(examId);

            if (!selectedExam) {
                setMockLaunchStatus('No recent exam found yet. Pick an exam card to start.', 'warn');
                return;
            }

            setSelectedExamState(examId, {
                syncUrl: true,
                syncStorage: true,
                usePushState: true,
                scrollToLaunch: true
            });
            closeDashboardModal({ syncHash: true });

            launchSelectedExam(selectedExam, {
                fromAuth: false,
                launchSource: 'dashboard-continue-last'
            });
        });
    }

    if (mockResumeBtn) {
        mockResumeBtn.addEventListener('click', () => {
            const resumeUrl = String(mockResumeBtn.dataset.resumeUrl || '').trim();
            if (!resumeUrl) return;
            window.location.href = resumeUrl;
        });
    }

    if (dashboardStartMockBtn) {
        dashboardStartMockBtn.addEventListener('click', () => {
            const dashboardData = dashboardDataCache || buildFallbackDashboardData();
            const preferredExamId = String(dashboardData?.profile?.preferences?.preferredExamId || '').trim().toLowerCase();
            const fallbackExamId = String(selectedExamIdState || activeUserProgress.lastSelectedExamId || '').trim().toLowerCase();
            const examId = preferredExamId || fallbackExamId;
            const selectedExam = examById.get(examId);

            if (!selectedExam) {
                setMockLaunchStatus('Choose an exam first, then start your mock.', 'warn');
                closeDashboardModal({ syncHash: true });
                return;
            }

            setSelectedExamState(examId, {
                syncUrl: true,
                syncStorage: true,
                usePushState: true,
                scrollToLaunch: true
            });
            closeDashboardModal({ syncHash: true });

            launchSelectedExam(selectedExam, {
                fromAuth: false,
                launchSource: 'dashboard-start-mock'
            });
        });
    }

    if (dashboardLogoutBtn) {
        dashboardLogoutBtn.addEventListener('click', () => {
            logoutSession();
        });
    }

    if (dashboardPreferencesForm) {
        dashboardPreferencesForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!authSession.isAuthenticated) return;

            const nextPreferences = sanitizePreferences({
                preferredExamId: dashboardPrefExam?.value,
                preferredLanguage: dashboardPrefLanguage?.value,
                weeklyMockTarget: dashboardPrefWeeklyTarget?.value,
                focusArea: dashboardPrefFocus?.value
            });

            activeUserProgress = sanitizeUserProgress({
                ...activeUserProgress,
                preferences: nextPreferences,
                updatedAt: new Date().toISOString()
            });

            saveActiveUserProgress({ syncApi: true });
            dashboardDataCache = null;

            if (dashboardPrefStatus) {
                dashboardPrefStatus.textContent = 'Preferences saved.';
                dashboardPrefStatus.classList.remove('warn');
                dashboardPrefStatus.classList.add('success');
            }

            await loadDashboardData({ force: true });
            renderDashboard(dashboardDataCache);
            if (authSession.isAuthenticated) {
                await loadMockCardPerformanceFromApi();
            }
            refreshRenderedExamCards();
        });
    }

    window.addEventListener('hashchange', () => {
        if (window.location.hash === DASHBOARD_HASH) {
            if (authSession.isAuthenticated) {
                void openDashboardModal({ syncHash: false, forceReload: true });
            } else {
                openModal('login');
            }
            return;
        }

        if (dashboardModal?.classList.contains('active')) {
            closeDashboardModal({ syncHash: false });
        }
    });

    try {
        const savedTab = localStorage.getItem(DASHBOARD_ACTIVE_TAB_STORAGE_KEY);
        if (savedTab) {
            activeDashboardTab = normalizeDashboardTab(savedTab);
        }
    } catch (error) {
        activeDashboardTab = 'performance';
    }
    applyDashboardTabState();

    await syncAuthSessionFromApi();
    loadActiveUserProgressFromStore();
    updateNavbarAuthUI();
    if (authSession.isAuthenticated) {
        await loadMockCardPerformanceFromApi();
    } else {
        clearMockCardPerformance();
    }
    refreshRenderedExamCards();
    scrubButtonSyntaxArtifacts();

    if (authSession.isAuthenticated) {
        void hydratePersonalizationFromApi().then((didSync) => {
            if (didSync) {
                refreshRenderedExamCards();
                dashboardDataCache = null;
            }
        });
    }

    if (loginForm) {
        loginForm.setAttribute('novalidate', 'true');
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const emailValue = String(loginEmailInput?.value || '').trim();
            const passwordValue = String(loginPasswordInput?.value || '').trim();
            const loginSubmitBtn = loginForm.querySelector('button[type="submit"]');
            const defaultBtnText = loginSubmitBtn ? loginSubmitBtn.textContent : 'Log In';

            if (!emailValue || !passwordValue) {
                modalSubtitle.textContent = 'Please fill your email and password to continue.';
                setAuthStatus('Email and password are required.', 'error');
                return;
            }

            if (!isValidEmail(emailValue)) {
                modalSubtitle.textContent = 'Please enter a valid email address.';
                setAuthStatus('Please enter a valid email address.', 'error');
                return;
            }

            setAuthStatus('');

            if (loginSubmitBtn) {
                loginSubmitBtn.disabled = true;
                loginSubmitBtn.textContent = 'Signing in...';
            }

            try {
                if (API_ENABLED) {
                    const payload = await submitAuthRequest(AUTH_LOGIN_API_ENDPOINT, {
                        email: emailValue,
                        password: passwordValue
                    });

                    const userEmail = String(payload?.user?.email || '').trim() || emailValue;
                    const userName = String(payload?.user?.name || '').trim();
                    handleAuthSuccess(userEmail, userName);
                } else {
                    handleAuthSuccess(emailValue);
                }
            } catch (error) {
                const message = String(error?.message || 'Login failed. Please try again.');
                modalSubtitle.textContent = message;
                setAuthStatus(message, 'error');
            } finally {
                if (loginSubmitBtn) {
                    loginSubmitBtn.disabled = false;
                    loginSubmitBtn.textContent = defaultBtnText;
                }
            }
        });
    }

    if (signupForm) {
        signupForm.setAttribute('novalidate', 'true');
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const nameValue = String(signupNameInput?.value || '').trim();
            const phoneValue = String(signupPhoneInput?.value || '').trim();
            const emailValue = String(signupEmailInput?.value || '').trim();
            const passwordValue = String(signupPasswordInput?.value || '').trim();
            const confirmPasswordValue = String(signupConfirmPasswordInput?.value || '').trim();
            const hasAcceptedTerms = Boolean(signupTermsInput?.checked);
            const signupSubmitBtn = signupForm.querySelector('button[type="submit"]');
            const defaultBtnText = signupSubmitBtn ? signupSubmitBtn.textContent : 'Create Account';

            if (!nameValue || !emailValue || !passwordValue || !confirmPasswordValue) {
                modalSubtitle.textContent = 'Please complete all required details to continue.';
                setAuthStatus('Please complete all required details to continue.', 'error');
                return;
            }

            if (!isValidPhoneNumber(phoneValue)) {
                modalSubtitle.textContent = 'Please enter a valid 10-digit phone number.';
                setAuthStatus('Please enter a valid 10-digit phone number.', 'error');
                return;
            }

            if (!isValidEmail(emailValue)) {
                modalSubtitle.textContent = 'Please enter a valid email address.';
                setAuthStatus('Please enter a valid email address.', 'error');
                return;
            }

            if (passwordValue.length < 6) {
                modalSubtitle.textContent = 'Password should be at least 6 characters.';
                setAuthStatus('Password should be at least 6 characters.', 'error');
                return;
            }

            if (passwordValue !== confirmPasswordValue) {
                modalSubtitle.textContent = 'Passwords do not match. Please re-check.';
                setAuthStatus('Passwords do not match. Please re-check.', 'error');
                return;
            }

            if (!hasAcceptedTerms) {
                modalSubtitle.textContent = 'Please accept Terms and Privacy Policy to continue.';
                setAuthStatus('Please accept Terms and Privacy Policy to continue.', 'error');
                return;
            }

            setAuthStatus('');

            if (signupSubmitBtn) {
                signupSubmitBtn.disabled = true;
                signupSubmitBtn.textContent = 'Creating account...';
            }

            try {
                if (API_ENABLED) {
                    const payload = await submitAuthRequest(AUTH_SIGNUP_API_ENDPOINT, {
                        name: nameValue,
                        phone: phoneValue,
                        email: emailValue,
                        password: passwordValue
                    });

                    const userEmail = String(payload?.user?.email || '').trim() || emailValue;
                    const userName = String(payload?.user?.name || '').trim() || nameValue;
                    handleAuthSuccess(userEmail, userName);
                } else {
                    handleAuthSuccess(emailValue, nameValue);
                }
            } catch (error) {
                const message = String(error?.message || 'Signup failed. Please try again.');
                modalSubtitle.textContent = message;
                setAuthStatus(message, 'error');
            } finally {
                if (signupSubmitBtn) {
                    signupSubmitBtn.disabled = false;
                    signupSubmitBtn.textContent = defaultBtnText;
                }
            }
        });
    }

    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            closeAuthModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;

        if (dashboardModal?.classList.contains('active')) {
            closeDashboardModal({ syncHash: true });
            return;
        }

        if (authModal.classList.contains('active')) {
            closeAuthModal();
        }
    });

    if (authSession.isAuthenticated && window.location.hash === DASHBOARD_HASH) {
        void openDashboardModal({ syncHash: false, forceReload: true });
    } else if (!authSession.isAuthenticated && window.location.hash === DASHBOARD_HASH) {
        openModal('login');
    }

    passwordToggles.forEach((toggleBtn) => {
        toggleBtn.addEventListener('click', () => {
            const targetId = toggleBtn.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            const icon = toggleBtn.querySelector('i');

            if (!targetInput || !icon) return;

            const shouldShow = targetInput.type === 'password';
            targetInput.type = shouldShow ? 'text' : 'password';

            icon.classList.toggle('fa-eye', !shouldShow);
            icon.classList.toggle('fa-eye-slash', shouldShow);

            toggleBtn.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password');
            toggleBtn.setAttribute('title', shouldShow ? 'Hide password' : 'Show password');
        });
    });

});