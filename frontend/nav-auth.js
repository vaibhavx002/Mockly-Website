(function () {
    const API_BASE = String(window.MOCKLY_API_BASE || '/api');
    const AUTH_SESSION_STORAGE_KEY = 'mockly_auth_session';
    const AUTH_SESSION_API_ENDPOINT = `${API_BASE}/auth/session`;
    const AUTH_LOGOUT_API_ENDPOINT = `${API_BASE}/auth/logout`;
    const CSRF_COOKIE_NAME = 'mockly_csrf_token';
    const CSRF_HEADER_NAME = 'x-csrf-token';

    const toSafeString = (value) => String(value || '').trim();

    const readCookieValue = (name) => {
        const target = `${name}=`;
        const entry = String(document.cookie || '')
            .split(';')
            .map((part) => part.trim())
            .find((part) => part.startsWith(target));

        if (!entry) return '';
        return decodeURIComponent(entry.slice(target.length));
    };

    const getElements = () => {
        const loginLink = document.getElementById('nav-login-link');
        const signupLink = document.getElementById('nav-signup-link');

        if (!loginLink || !signupLink) return null;
        return { loginLink, signupLink };
    };

    const persistAuthHint = (authState) => {
        try {
            localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({
                userEmail: toSafeString(authState.userEmail),
                userName: toSafeString(authState.userName),
                updatedAt: new Date().toISOString()
            }));
        } catch (error) {
            // Ignore storage failures.
        }
    };

    const getFirstName = (authState) => {
        const safeName = toSafeString(authState.userName);
        if (safeName) return safeName.split(/\s+/)[0];

        const safeEmail = toSafeString(authState.userEmail);
        return safeEmail.includes('@') ? safeEmail.split('@')[0] : '';
    };

    const applyLoggedOutState = (elements) => {
        elements.loginLink.textContent = 'Log In';
        elements.loginLink.setAttribute('href', '/#login');
        elements.loginLink.setAttribute('title', 'Log in');

        elements.signupLink.textContent = 'Sign Up';
        elements.signupLink.setAttribute('href', '/#signup');
        elements.signupLink.setAttribute('title', 'Create account');
        elements.signupLink.onclick = null;
    };

    const applyLoggedInState = (elements, authState) => {
        const firstName = getFirstName(authState);

        elements.loginLink.textContent = firstName ? `Hi, ${firstName}` : 'Dashboard';
        elements.loginLink.setAttribute('href', '/#dashboard');
        elements.loginLink.setAttribute('title', 'Open dashboard');

        elements.signupLink.textContent = 'Log Out';
        elements.signupLink.setAttribute('href', '#');
        elements.signupLink.setAttribute('title', 'Sign out');
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
                return {
                    isAuthenticated: false,
                    userEmail: '',
                    userName: ''
                };
            }

            return {
                isAuthenticated: true,
                userEmail: toSafeString(payload?.user?.email),
                userName: toSafeString(payload?.user?.name)
            };
        } catch (error) {
            return {
                isAuthenticated: false,
                userEmail: '',
                userName: ''
            };
        }
    };

    const attachLogoutHandler = (elements, getAuthState, setAuthState) => {
        elements.signupLink.onclick = async (event) => {
            event.preventDefault();
            elements.signupLink.style.pointerEvents = 'none';

            try {
                const csrfToken = readCookieValue(CSRF_COOKIE_NAME);
                const headers = csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {};

                await fetch(AUTH_LOGOUT_API_ENDPOINT, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers
                });
            } catch (error) {
                // Continue with local reset even if API logout fails.
            } finally {
                setAuthState({ isAuthenticated: false, userEmail: '', userName: '' });
                persistAuthHint(getAuthState());
                applyLoggedOutState(elements);
                elements.signupLink.style.pointerEvents = '';
            }
        };
    };

    const bootstrap = async () => {
        const elements = getElements();
        if (!elements) return;

        let authState = { isAuthenticated: false, userEmail: '', userName: '' };

        try {
            const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                const userEmail = toSafeString(parsed?.userEmail);
                const userName = toSafeString(parsed?.userName);

                authState = {
                    isAuthenticated: Boolean(userEmail),
                    userEmail,
                    userName
                };
            }
        } catch (error) {
            authState = { isAuthenticated: false, userEmail: '', userName: '' };
        }

        if (authState.isAuthenticated) {
            applyLoggedInState(elements, authState);
            attachLogoutHandler(
                elements,
                () => authState,
                (nextState) => {
                    authState = nextState;
                }
            );
        } else {
            applyLoggedOutState(elements);
        }

        const latestState = await syncAuthSessionFromApi();
        authState = latestState;
        persistAuthHint(authState);

        if (authState.isAuthenticated) {
            applyLoggedInState(elements, authState);
            attachLogoutHandler(
                elements,
                () => authState,
                (nextState) => {
                    authState = nextState;
                }
            );
        } else {
            applyLoggedOutState(elements);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            void bootstrap();
        });
    } else {
        void bootstrap();
    }
})();
