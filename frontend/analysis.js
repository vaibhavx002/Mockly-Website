(function () {
    const API_BASE = String(window.MOCKLY_API_BASE || '/api');
    const AUTH_SESSION_API_ENDPOINT = `${API_BASE}/auth/session`;
    const PAPER_ANALYSIS_API_ENDPOINT = `${API_BASE}/users/paper-analysis`;

    const titleNode = document.getElementById('analysis-title');
    const metaNode = document.getElementById('analysis-meta');
    const statusNode = document.getElementById('analysis-status');
    const summaryNode = document.getElementById('analysis-summary');
    const insightsSection = document.getElementById('analysis-insights-section');
    const insightsNode = document.getElementById('analysis-insights');
    const tableSection = document.getElementById('analysis-table-section');
    const tableBody = document.getElementById('analysis-table-body');
    const startLink = document.getElementById('analysis-start-link');
    const copyLinkButton = document.getElementById('analysis-copy-link');

    const toSafeString = (value) => String(value || '').trim();

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

    const escapeHtml = (value) => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const parseQuery = () => {
        const params = new URLSearchParams(window.location.search);
        return {
            examId: toSafeString(params.get('examId')).toLowerCase(),
            paperId: toSafeString(params.get('paperId')).toLowerCase(),
            title: toSafeString(params.get('title')),
            source: toSafeString(params.get('source'))
        };
    };

    const updateHeader = ({ examId, paperId, title, source }) => {
        const heading = title || 'Mock Analysis';
        if (titleNode) {
            titleNode.textContent = heading;
        }

        const parts = [];
        if (examId) parts.push(examId.toUpperCase());
        if (paperId) parts.push(paperId);
        if (source) parts.push(source.replace(/-/g, ' '));

        if (metaNode) {
            metaNode.textContent = parts.length ? parts.join(' • ') : 'Shareable analysis view';
        }

        if (startLink && examId) {
            startLink.href = paperId
                ? `/mock/${encodeURIComponent(examId)}?paperId=${encodeURIComponent(paperId)}`
                : `/mock/${encodeURIComponent(examId)}`;
        }
    };

    const setStatus = (text) => {
        if (statusNode) {
            statusNode.textContent = text;
        }
    };

    const renderSummary = (payload) => {
        if (!summaryNode) return;

        const benchmark = payload?.benchmark || {};
        const latestAttempt = payload?.latestAttempt || {};
        const comparison = payload?.comparison || {};
        const hasAttempt = Boolean(payload?.hasAttempt);

        const cards = hasAttempt
            ? [
                { label: 'Your Score', value: `${formatMarks(latestAttempt?.score)} / ${formatMarks(latestAttempt?.maxScore)}` },
                { label: 'Cutoff', value: `${Number.isFinite(Number(benchmark?.cutoffScore)) ? formatMarks(benchmark?.cutoffScore) : '--'} (${formatPercent(benchmark?.cutoffScorePercent)})` },
                { label: 'Topper', value: `${Number.isFinite(Number(benchmark?.topperScore)) ? formatMarks(benchmark?.topperScore) : '--'} (${formatPercent(benchmark?.topperScorePercent)})` },
                { label: 'Time Gap vs Topper', value: Number.isFinite(Number(comparison?.timeGapVsTopperSeconds)) ? formatDurationShort(Math.abs(Number(comparison?.timeGapVsTopperSeconds))) : '--' }
            ]
            : [
                { label: 'Attempt Status', value: 'Not attempted' },
                { label: 'Current Cutoff', value: formatPercent(benchmark?.cutoffScorePercent) },
                { label: 'Topper Score', value: Number.isFinite(Number(benchmark?.topperScore)) ? formatMarks(benchmark?.topperScore) : '--' },
                { label: 'Attempts', value: String(Math.max(0, Number(benchmark?.attemptCount || 0))) }
            ];

        summaryNode.innerHTML = cards
            .map((card) => `<article><span>${escapeHtml(card.label)}</span><strong>${escapeHtml(card.value)}</strong></article>`)
            .join('');
        summaryNode.hidden = false;
    };

    const renderInsights = (payload) => {
        if (!insightsSection || !insightsNode) return;

        const insights = Array.isArray(payload?.briefAnalysis) ? payload.briefAnalysis : [];
        if (!insights.length) {
            insightsNode.innerHTML = '<li>No brief analysis available yet.</li>';
        } else {
            insightsNode.innerHTML = insights
                .map((item) => `<li>${escapeHtml(toSafeString(item))}</li>`)
                .join('');
        }

        insightsSection.hidden = false;
    };

    const renderQuestionTable = (payload) => {
        if (!tableSection || !tableBody) return;

        const rows = Array.isArray(payload?.questionTimeComparison) ? payload.questionTimeComparison : [];

        if (!rows.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6">Per-question time comparison will appear after your next attempt (with question-level timing).</td>
                </tr>
            `;
            tableSection.hidden = false;
            return;
        }

        tableBody.innerHTML = rows.map((row) => {
            const delta = Number(row?.deltaVsAverageSeconds);
            const deltaClass = Number.isFinite(delta)
                ? (delta > 0 ? 'analysis-delta-slow' : 'analysis-delta-fast')
                : 'analysis-delta-neutral';
            const deltaText = Number.isFinite(delta)
                ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}s`
                : '--';

            return `
                <tr>
                    <td>${Math.max(1, Number(row?.questionNumber || 0))}</td>
                    <td>${escapeHtml(toSafeString(row?.status || 'not-visited'))}</td>
                    <td>${formatDurationShort(Number(row?.userTimeSeconds || 0))}</td>
                    <td>${Number.isFinite(Number(row?.averageTimeSeconds)) ? formatDurationShort(Number(row?.averageTimeSeconds)) : '--'}</td>
                    <td>${Number.isFinite(Number(row?.topperAverageTimeSeconds)) ? formatDurationShort(Number(row?.topperAverageTimeSeconds)) : '--'}</td>
                    <td><span class="${deltaClass}">${deltaText}</span></td>
                </tr>
            `;
        }).join('');

        tableSection.hidden = false;
    };

    const loadAuthState = async () => {
        try {
            const response = await fetch(AUTH_SESSION_API_ENDPOINT, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) return false;
            const payload = await response.json();
            return Boolean(payload?.authenticated && payload?.user?.email);
        } catch (error) {
            return false;
        }
    };

    const loadAnalysis = async ({ examId, paperId }) => {
        const url = new URL(PAPER_ANALYSIS_API_ENDPOINT, window.location.origin);
        url.searchParams.set('examId', examId);
        url.searchParams.set('paperId', paperId);

        const response = await fetch(url.toString(), {
            method: 'GET',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
            const error = new Error(`Analysis request failed with ${response.status}`);
            error.status = response.status;
            throw error;
        }

        return response.json();
    };

    const initCopyLink = () => {
        if (!copyLinkButton) return;

        copyLinkButton.addEventListener('click', async () => {
            const originalText = copyLinkButton.textContent;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(window.location.href);
                    copyLinkButton.textContent = 'Link Copied';
                } else {
                    copyLinkButton.textContent = 'Copy Not Supported';
                }
            } catch (error) {
                copyLinkButton.textContent = 'Copy Failed';
            }

            window.setTimeout(() => {
                copyLinkButton.textContent = originalText;
            }, 1200);
        });
    };

    const init = async () => {
        const query = parseQuery();
        updateHeader(query);
        initCopyLink();

        if (!query.examId || !query.paperId) {
            setStatus('Missing examId or paperId in URL. Open analysis from a test card.');
            return;
        }

        const isAuthenticated = await loadAuthState();
        if (!isAuthenticated) {
            setStatus('Please log in to view complete analysis for this test.');
            return;
        }

        setStatus('Loading complete analysis...');

        try {
            const payload = await loadAnalysis(query);
            renderSummary(payload);
            renderInsights(payload);
            renderQuestionTable(payload);
            setStatus('Complete analysis loaded. Share this link to revisit this report anytime.');
        } catch (error) {
            if (error.status === 401) {
                setStatus('Session expired. Log in again to view this analysis.');
                return;
            }

            setStatus('Unable to load analysis right now. Please try again in a moment.');
        }
    };

    void init();
})();
