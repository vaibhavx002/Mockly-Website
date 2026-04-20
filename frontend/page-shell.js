(function () {
    const API_BASE = String(window.MOCKLY_API_BASE || '/api');
    const AUTH_SESSION_STORAGE_KEY = 'mockly_auth_session';
    const AUTH_SESSION_API_ENDPOINT = API_BASE + '/auth/session';
    const AUTH_LOGOUT_API_ENDPOINT = API_BASE + '/auth/logout';
    const CSRF_COOKIE_NAME = 'mockly_csrf_token';
    const CSRF_HEADER_NAME = 'x-csrf-token';

    const toSafeString = (value) => String(value || '').trim();

    let authState = {
        isAuthenticated: false,
        userEmail: '',
        userName: ''
    };

    const readCookieValue = (name) => {
        const target = name + '=';
        const entry = String(document.cookie || '')
            .split(';')
            .map((part) => part.trim())
            .find((part) => part.startsWith(target));

        if (!entry) return '';
        return decodeURIComponent(entry.slice(target.length));
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

    const getFirstName = () => {
        const userName = toSafeString(authState.userName);
        if (userName) {
            return userName.split(/\s+/)[0];
        }

        const email = toSafeString(authState.userEmail);
        return email.includes('@') ? email.split('@')[0] : '';
    };

    const applyAuthNavState = () => {
        const navLoginBtn = document.getElementById('nav-login-btn');
        const navSignupBtn = document.getElementById('nav-signup-btn');

        if (!navLoginBtn || !navSignupBtn) return;

        if (authState.isAuthenticated) {
            const firstName = getFirstName();
            navLoginBtn.textContent = firstName ? 'Hi, ' + firstName : 'Dashboard';
            navLoginBtn.title = 'Open dashboard';
            navLoginBtn.onclick = () => {
                window.location.assign('/#dashboard');
            };

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

            return;
        }

        navLoginBtn.textContent = 'Log In';
        navLoginBtn.title = 'Log in';
        navLoginBtn.onclick = () => {
            window.location.assign('/#login');
        };

        navSignupBtn.textContent = 'Sign Up';
        navSignupBtn.title = 'Create account';
        navSignupBtn.onclick = () => {
            window.location.assign('/#signup');
        };
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
                throw new Error('Session request failed with ' + response.status);
            }

            const payload = await response.json();
            const isAuthenticated = Boolean(payload && payload.authenticated && payload.user && payload.user.email);

            if (!isAuthenticated) {
                authState = { isAuthenticated: false, userEmail: '', userName: '' };
            } else {
                authState = {
                    isAuthenticated: true,
                    userEmail: toSafeString(payload.user.email),
                    userName: toSafeString(payload.user.name)
                };
            }
        } catch (error) {
            authState = { isAuthenticated: false, userEmail: '', userName: '' };
        }

        persistAuthHint();
        applyAuthNavState();
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
        const themeToggle = document.getElementById('theme-toggle');
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
        const menuToggle = document.querySelector('.menu-toggle');
        const navContainer = document.querySelector('.nav-container');

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
        const menuToggle = document.querySelector('.menu-toggle');
        const navContainer = document.querySelector('.nav-container');

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
        const menuToggle = document.querySelector('.menu-toggle');
        const navContainer = document.querySelector('.nav-container');

        if (!menuToggle || !navContainer) return;

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

    const init = async () => {
        try {
            const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                const userEmail = toSafeString(parsed && parsed.userEmail);
                const userName = toSafeString(parsed && parsed.userName);

                authState = {
                    isAuthenticated: Boolean(userEmail),
                    userEmail,
                    userName
                };
            }
        } catch (error) {
            authState = { isAuthenticated: false, userEmail: '', userName: '' };
        }

        initThemeToggle();
        initMobileMenu();
        applyAuthNavState();
        await syncAuthSessionFromApi();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            void init();
        });
    } else {
        void init();
    }
})();
