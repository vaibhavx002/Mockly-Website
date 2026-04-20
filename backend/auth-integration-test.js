const { app } = require('./server');

const TEST_EMAIL = `auth-integration-${Date.now()}@mockly.in`;
const TEST_PASSWORD = 'authPass123';

const getSetCookieArray = (response) => {
    if (!response || !response.headers) return [];

    if (typeof response.headers.getSetCookie === 'function') {
        return response.headers.getSetCookie();
    }

    const merged = String(response.headers.get('set-cookie') || '').trim();
    if (!merged) return [];

    return merged
        .split(/,\s*(?=[^;,]+=)/)
        .map((item) => item.trim())
        .filter(Boolean);
};

const writeCookiesToJar = (jar, response) => {
    const setCookies = getSetCookieArray(response);
    setCookies.forEach((cookieLine) => {
        const firstChunk = String(cookieLine || '').split(';')[0] || '';
        const [name, ...valueParts] = firstChunk.split('=');
        const safeName = String(name || '').trim();
        if (!safeName) return;

        const value = valueParts.join('=').trim();
        if (!value) {
            delete jar[safeName];
            return;
        }

        jar[safeName] = value;
    });
};

const makeCookieHeader = (jar) => Object.entries(jar)
    .filter(([, value]) => String(value || '').length > 0)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

const getCsrfToken = (jar) => String(jar.mockly_csrf_token || '').trim();

const requestJson = async (baseUrl, jar, path, options = {}) => {
    const headers = {
        Accept: 'application/json',
        ...(options.headers || {})
    };

    const cookieHeader = makeCookieHeader(jar);
    if (cookieHeader) {
        headers.Cookie = cookieHeader;
    }

    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers
    });

    writeCookiesToJar(jar, response);

    const text = await response.text();
    let payload = null;
    if (text) {
        try {
            payload = JSON.parse(text);
        } catch (error) {
            payload = null;
        }
    }

    return {
        ok: response.ok,
        status: response.status,
        payload,
        response
    };
};

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const run = async () => {
    const server = app.listen(0);

    try {
        await new Promise((resolve, reject) => {
            server.once('listening', resolve);
            server.once('error', reject);
        });

        const port = server.address().port;
        const baseUrl = `http://127.0.0.1:${port}`;

        const cookieJar = {};
        const results = {
            signup: false,
            login: false,
            protectedDeniedWithoutAuth: false,
            protectedDeniedWithoutCsrf: false,
            protectedAllowedWithCsrf: false,
            dbHealthDeniedForNonAdmin: false,
            dbHealthAllowedForAdmin: false,
            refresh: false,
            logout: false,
            deniedAfterLogout: false,
            bearerBypassCsrf: false
        };

        const deniedWithoutAuth = await requestJson(baseUrl, {}, '/api/users/dashboard', { method: 'GET' });
        assert(deniedWithoutAuth.status === 401, 'Expected /api/users/dashboard to deny unauthenticated request.');
        results.protectedDeniedWithoutAuth = true;

        const signup = await requestJson(baseUrl, cookieJar, '/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Auth Integration User',
                phone: '9876543210',
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            })
        });
        assert(signup.status === 201, 'Signup failed.');
        assert(Boolean(signup.payload?.authenticated), 'Signup response missing authenticated=true.');
        assert(Boolean(getCsrfToken(cookieJar)), 'CSRF cookie missing after signup.');
        results.signup = true;

        const csrfToken = getCsrfToken(cookieJar);
        const protectedWithoutCsrf = await requestJson(baseUrl, cookieJar, '/api/users/incomplete-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session: {
                    examId: 'rrb-group-d',
                    paperId: 'rrb-group-d-cbt-2025-set1',
                    sessionId: 'integration-a',
                    startUrl: '/mock/rrb-group-d?paperId=rrb-group-d-cbt-2025-set1&session=integration-a',
                    resumeUrl: '/mock/rrb-group-d?paperId=rrb-group-d-cbt-2025-set1&session=integration-a&resume=1',
                    totalQuestions: 20,
                    currentQuestionIndex: 1,
                    currentSectionIndex: 0,
                    durationMinutes: 20,
                    timerSeconds: 1000,
                    progressPercent: 5,
                    selectedLanguage: 'en',
                    questionStates: [],
                    sectionTimeById: {}
                }
            })
        });
        assert(protectedWithoutCsrf.status === 403, 'Expected CSRF rejection without x-csrf-token header.');
        results.protectedDeniedWithoutCsrf = true;

        const protectedWithCsrf = await requestJson(baseUrl, cookieJar, '/api/users/incomplete-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken
            },
            body: JSON.stringify({
                session: {
                    examId: 'rrb-group-d',
                    paperId: 'rrb-group-d-cbt-2025-set1',
                    sessionId: 'integration-b',
                    startUrl: '/mock/rrb-group-d?paperId=rrb-group-d-cbt-2025-set1&session=integration-b',
                    resumeUrl: '/mock/rrb-group-d?paperId=rrb-group-d-cbt-2025-set1&session=integration-b&resume=1',
                    totalQuestions: 20,
                    currentQuestionIndex: 2,
                    currentSectionIndex: 0,
                    durationMinutes: 20,
                    timerSeconds: 900,
                    progressPercent: 10,
                    selectedLanguage: 'en',
                    questionStates: [],
                    sectionTimeById: {}
                }
            })
        });
        assert(protectedWithCsrf.status === 200, 'Expected protected write success with CSRF token.');
        results.protectedAllowedWithCsrf = true;

        const loginJar = {};
        const login = await requestJson(baseUrl, loginJar, '/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            })
        });
        assert(login.status === 200, 'Login failed.');
        assert(Boolean(login.payload?.authenticated), 'Login response missing authenticated=true.');
        assert(Boolean(login.payload?.accessToken), 'Login response missing accessToken.');
        assert(Boolean(getCsrfToken(loginJar)), 'CSRF cookie missing after login.');
        results.login = true;

        const bearerAttempt = await requestJson(baseUrl, {}, '/api/users/attempts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${String(login.payload?.accessToken || '').trim()}`
            },
            body: JSON.stringify({
                attempt: {
                    examId: 'rrb-group-d',
                    paperId: 'rrb-group-d-cbt-2025-set1',
                    score: 10,
                    maxScore: 20,
                    correct: 10,
                    wrong: 0,
                    unanswered: 10,
                    durationMinutes: 20,
                    timeTakenSeconds: 1000,
                    launchMode: 'dynamic'
                }
            })
        });
        assert(bearerAttempt.status === 200, 'Bearer token write should bypass CSRF cookie requirement.');
        results.bearerBypassCsrf = true;

        const dbHealthDenied = await requestJson(baseUrl, {}, '/api/db/health', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${String(login.payload?.accessToken || '').trim()}`
            }
        });
        assert(dbHealthDenied.status === 403, 'Expected /api/db/health to deny non-admin users.');
        results.dbHealthDeniedForNonAdmin = true;

        const adminLogin = await requestJson(baseUrl, {}, '/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'demo@mockly.in',
                password: 'demo1234'
            })
        });
        assert(adminLogin.status === 200, 'Admin login failed for DB health check.');

        const adminDbHealth = await requestJson(baseUrl, {}, '/api/db/health', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${String(adminLogin.payload?.accessToken || '').trim()}`
            }
        });
        assert(adminDbHealth.status === 200, 'Expected admin access to /api/db/health.');
        results.dbHealthAllowedForAdmin = true;

        const loginCsrf = getCsrfToken(loginJar);
        const refreshFailWithoutCsrf = await requestJson(baseUrl, loginJar, '/api/auth/refresh', {
            method: 'POST'
        });
        assert(refreshFailWithoutCsrf.status === 403, 'Refresh should fail without CSRF header.');

        const refresh = await requestJson(baseUrl, loginJar, '/api/auth/refresh', {
            method: 'POST',
            headers: {
                'x-csrf-token': loginCsrf
            }
        });
        assert(refresh.status === 200, 'Refresh failed with valid CSRF header.');
        assert(Boolean(refresh.payload?.authenticated), 'Refresh response missing authenticated=true.');
        results.refresh = true;

        const postLogoutDenied = await requestJson(baseUrl, {}, '/api/users/dashboard', { method: 'GET' });
        assert(postLogoutDenied.status === 401, 'Expected unauthenticated denial in isolated check.');

        const logoutCsrf = getCsrfToken(loginJar);
        const logout = await requestJson(baseUrl, loginJar, '/api/auth/logout', {
            method: 'POST',
            headers: {
                'x-csrf-token': logoutCsrf
            }
        });
        assert(logout.status === 200, 'Logout failed with valid CSRF header.');
        results.logout = true;

        const deniedAfterLogout = await requestJson(baseUrl, loginJar, '/api/users/dashboard', { method: 'GET' });
        assert(deniedAfterLogout.status === 401, 'Expected protected route denial after logout.');
        results.deniedAfterLogout = true;

        // eslint-disable-next-line no-console
        console.log(JSON.stringify({
            ok: true,
            results
        }, null, 2));

        process.exitCode = 0;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(JSON.stringify({
            ok: false,
            message: error.message || 'Auth integration test failed'
        }, null, 2));
        process.exitCode = 1;
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
};

run();
