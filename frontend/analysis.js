(function () {
    const API_BASE = String(window.MOCKLY_API_BASE || '/api');
    const AUTH_SESSION_API_ENDPOINT = `${API_BASE}/auth/session`;
    const PAPER_ANALYSIS_API_ENDPOINT = `${API_BASE}/users/paper-analysis`;

    const titleNode = document.getElementById('analysis-title');
    const metaNode = document.getElementById('analysis-meta');
    const statusNode = document.getElementById('analysis-status');
    const statusActionsNode = document.getElementById('analysis-status-actions');
    const reattemptLink = document.getElementById('analysis-reattempt-link');
    const summaryNode = document.getElementById('analysis-summary');
    const compareSection = document.getElementById('analysis-compare-section');
    const compareBarsNode = document.getElementById('analysis-compare-bars');
    const sectionsSection = document.getElementById('analysis-sections-section');
    const sectionsBody = document.getElementById('analysis-sections-body');
    const insightsSection = document.getElementById('analysis-insights-section');
    const insightsNode = document.getElementById('analysis-insights');
    const actionPlanSection = document.getElementById('analysis-action-plan-section');
    const actionPlanNode = document.getElementById('analysis-action-plan');
    const reviewSection = document.getElementById('analysis-review-section');
    const sectionButtonsNode = document.getElementById('analysis-section-buttons');
    const reviewGroupsNode = document.getElementById('analysis-review-groups');
    const languageToggleNode = document.getElementById('analysis-language-toggle');
    const filterLanguageNode = document.getElementById('analysis-filter-language');
    const filterChapterNode = document.getElementById('analysis-filter-chapter');
    const filterTopicNode = document.getElementById('analysis-filter-topic');
    const questionDetailTitleNode = document.getElementById('analysis-question-detail-title');
    const questionDetailMetaNode = document.getElementById('analysis-question-detail-meta');
    const questionDetailTextNode = document.getElementById('analysis-question-detail-text');
    const questionDetailOptionsNode = document.getElementById('analysis-question-detail-options');
    const questionDetailAnswersNode = document.getElementById('analysis-question-detail-answers');
    const questionDetailTimeNode = document.getElementById('analysis-question-detail-time');
    const questionDetailExplanationNode = document.getElementById('analysis-question-detail-explanation');
    const questionDetailImageWrapNode = document.getElementById('analysis-question-detail-image-wrap');
    const questionDetailImageNode = document.getElementById('analysis-question-detail-image');
    const questionDetailImageCaptionNode = document.getElementById('analysis-question-detail-image-caption');
    const startLink = document.getElementById('analysis-start-link');
    const copyLinkButton = document.getElementById('analysis-copy-link');

    let currentQuery = null;
    let currentLanguage = 'en';
    let latestAnalysisPayload = null;
    let latestChapterwisePayload = null;
    let languageRequestId = 0;
    let reviewItems = [];
    let reviewState = {
        sectionId: '',
        chapterId: '',
        topicId: '',
        questionKey: ''
    };

    const toSafeString = (value) => String(value || '').trim();
    const toSafeNumber = (value, fallback = 0) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : fallback;
    };

    const escapeHtml = (value) => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');

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

    const formatCount = (value) => {
        const numeric = Math.max(0, Math.floor(toSafeNumber(value, 0)));
        return String(numeric);
    };

    const formatDurationShort = (secondsValue) => {
        const totalSeconds = Math.max(0, Math.floor(Number(secondsValue) || 0));
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const formatDateTime = (value) => {
        const date = new Date(value || '');
        if (Number.isNaN(date.getTime())) return 'N/A';
        return date.toLocaleString([], {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatSignedGapMarks = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '--';
        if (numeric > 0) return `${formatMarks(numeric)} below target`;
        if (numeric < 0) return `${formatMarks(Math.abs(numeric))} above target`;
        return 'On target';
    };

    const formatSignedSeconds = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '--';
        if (numeric === 0) return 'On pace';
        const direction = numeric > 0 ? 'slower' : 'faster';
        return `${formatDurationShort(Math.abs(numeric))} ${direction}`;
    };

    const formatTitleFromId = (value) => {
        const text = toSafeString(value).replace(/[_-]+/g, ' ').trim();
        if (!text) return 'General';
        return text
            .split(/\s+/)
            .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : '')
            .join(' ')
            .trim();
    };

    const toSafeIdentifier = (value) => toSafeString(value)
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const normalizeLanguage = (value) => {
        const safe = toSafeString(value).toLowerCase();
        if (safe === 'hi' || safe === 'hindi') return 'hi';
        return 'en';
    };

    const normalizeStatusLabel = (value) => {
        const text = toSafeString(value).toLowerCase();
        if (!text) return 'Not Visited';
        return text.split('-').map((part) => {
            if (!part) return '';
            return `${part[0].toUpperCase()}${part.slice(1)}`;
        }).join(' ');
    };

    const parseQuery = () => {
        const params = new URLSearchParams(window.location.search);
        return {
            examId: toSafeString(params.get('examId')).toLowerCase(),
            paperId: toSafeString(params.get('paperId')).toLowerCase(),
            title: toSafeString(params.get('title')),
            source: toSafeString(params.get('source')),
            lang: normalizeLanguage(params.get('lang'))
        };
    };

    const syncLanguageFilterControl = () => {
        const safeLanguage = normalizeLanguage(currentLanguage);
        if (filterLanguageNode) {
            filterLanguageNode.value = safeLanguage;
        }
        if (languageToggleNode) {
            languageToggleNode.value = safeLanguage;
        }
    };

    const updateLanguageInUrl = (language) => {
        const safeLanguage = normalizeLanguage(language);
        const url = new URL(window.location.href);
        url.searchParams.set('lang', safeLanguage);
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
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

        if (reattemptLink) {
            reattemptLink.href = startLink ? startLink.href : '/#test';
        }
    };

    const setStatus = (text, options = {}) => {
        if (!statusNode) return;

        statusNode.textContent = text;
        statusNode.dataset.tone = String(options.tone || 'neutral').trim().toLowerCase();

        if (statusActionsNode) {
            statusActionsNode.hidden = !Boolean(options.showActions);
        }
    };

    const resetSections = () => {
        if (summaryNode) {
            summaryNode.hidden = true;
            summaryNode.innerHTML = '';
        }

        if (compareSection) {
            compareSection.hidden = true;
        }
        if (compareBarsNode) {
            compareBarsNode.innerHTML = '';
        }

        if (sectionsSection) {
            sectionsSection.hidden = true;
        }
        if (sectionsBody) {
            sectionsBody.innerHTML = '';
        }

        if (insightsSection) {
            insightsSection.hidden = true;
        }
        if (insightsNode) {
            insightsNode.innerHTML = '';
        }

        if (actionPlanSection) {
            actionPlanSection.hidden = true;
        }
        if (actionPlanNode) {
            actionPlanNode.innerHTML = '';
        }

        if (reviewSection) {
            reviewSection.hidden = true;
        }
        if (sectionButtonsNode) {
            sectionButtonsNode.innerHTML = '';
        }
        if (reviewGroupsNode) {
            reviewGroupsNode.innerHTML = '';
        }
        if (questionDetailTitleNode) {
            questionDetailTitleNode.textContent = 'Select a question';
        }
        if (questionDetailMetaNode) {
            questionDetailMetaNode.textContent = 'Click any question button to view complete answer and explanation.';
        }
        if (questionDetailTextNode) {
            questionDetailTextNode.textContent = 'Question details will appear here.';
        }
        if (questionDetailOptionsNode) {
            questionDetailOptionsNode.innerHTML = '';
        }
        if (questionDetailAnswersNode) {
            questionDetailAnswersNode.innerHTML = '';
        }
        if (questionDetailTimeNode) {
            questionDetailTimeNode.innerHTML = '';
        }
        if (questionDetailExplanationNode) {
            questionDetailExplanationNode.innerHTML = '<strong>Explanation:</strong> Complete explanation will appear here.';
        }
        if (questionDetailImageNode) {
            questionDetailImageNode.removeAttribute('src');
        }
        if (questionDetailImageWrapNode) {
            questionDetailImageWrapNode.hidden = true;
        }
        if (questionDetailImageCaptionNode) {
            questionDetailImageCaptionNode.textContent = 'Explanation image';
        }
        syncLanguageFilterControl();
        latestAnalysisPayload = null;
        latestChapterwisePayload = null;
        languageRequestId = 0;
        reviewItems = [];
        reviewState = {
            sectionId: '',
            chapterId: '',
            topicId: '',
            questionKey: ''
        };
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
                { label: 'Your Accuracy', value: formatPercent(latestAttempt?.accuracyPercent) },
                { label: 'Gap vs Cutoff', value: formatSignedGapMarks(comparison?.scoreGapVsCutoff) },
                { label: 'Gap vs Topper', value: formatSignedGapMarks(comparison?.scoreGapVsTopper) },
                { label: 'Your Time', value: formatDurationShort(latestAttempt?.timeTakenSeconds) },
                { label: 'Pace vs Topper', value: formatSignedSeconds(comparison?.timeGapVsTopperSeconds) },
                { label: 'Benchmark Attempts', value: formatCount(benchmark?.attemptCount) },
                { label: 'Last Attempt', value: formatDateTime(latestAttempt?.submittedAt) }
            ]
            : [
                { label: 'Attempt Status', value: 'Not Attempted' },
                { label: 'Current Cutoff', value: `${formatMarks(benchmark?.cutoffScore)} (${formatPercent(benchmark?.cutoffScorePercent)})` },
                { label: 'Topper Score', value: `${formatMarks(benchmark?.topperScore)} (${formatPercent(benchmark?.topperScorePercent)})` },
                { label: 'Benchmark Attempts', value: formatCount(benchmark?.attemptCount) },
                { label: 'Average Time', value: formatDurationShort(benchmark?.averageTimeTakenSeconds) },
                { label: 'Topper Time', value: formatDurationShort(benchmark?.topperTimeTakenSeconds) },
                { label: 'Readiness', value: 'Start this paper once to unlock personalized insights.' },
                { label: 'Next Step', value: 'Launch mock from Start Mock button.' }
            ];

        summaryNode.innerHTML = cards
            .map((card) => `<article><span>${escapeHtml(card.label)}</span><strong>${escapeHtml(card.value)}</strong></article>`)
            .join('');
        summaryNode.hidden = false;
    };

    const renderComparisonBars = (payload) => {
        if (!compareSection || !compareBarsNode) return;

        const benchmark = payload?.benchmark || {};
        const latestAttempt = payload?.latestAttempt || {};
        const hasAttempt = Boolean(payload?.hasAttempt);

        const rows = [
            { label: 'Topper', percent: toSafeNumber(benchmark?.topperScorePercent, NaN), tone: 'topper' },
            { label: 'Cutoff', percent: toSafeNumber(benchmark?.cutoffScorePercent, NaN), tone: 'cutoff' },
            { label: 'You', percent: hasAttempt ? toSafeNumber(latestAttempt?.scorePercent, NaN) : NaN, tone: 'you' },
            { label: 'Average', percent: toSafeNumber(benchmark?.averageScorePercent, NaN), tone: 'average' }
        ].filter((row) => Number.isFinite(row.percent));

        if (!rows.length) {
            compareBarsNode.innerHTML = '<p class="analysis-empty-text">Comparison bars will appear when benchmark values are available.</p>';
            compareSection.hidden = false;
            return;
        }

        compareBarsNode.innerHTML = rows.map((row) => {
            const bounded = Math.max(0, Math.min(100, Number(row.percent)));
            return `
                <div class="analysis-compare-row">
                    <div class="analysis-compare-label">${escapeHtml(row.label)}</div>
                    <div class="analysis-compare-track">
                        <span class="analysis-compare-fill analysis-compare-fill-${escapeHtml(row.tone)}" style="width:${bounded.toFixed(2)}%"></span>
                    </div>
                    <div class="analysis-compare-value">${bounded.toFixed(1)}%</div>
                </div>
            `;
        }).join('');

        compareSection.hidden = false;
    };

    const getSectionSignal = (section) => {
        const accuracy = toSafeNumber(section?.accuracyPercent, 0);
        const attemptPercent = toSafeNumber(section?.attemptPercent, 0);
        if (accuracy >= 75 && attemptPercent >= 70) {
            return { label: 'Strong', className: 'analysis-signal-strong' };
        }
        if (accuracy >= 55 && attemptPercent >= 55) {
            return { label: 'Stable', className: 'analysis-signal-stable' };
        }
        return { label: 'Needs Work', className: 'analysis-signal-weak' };
    };

    const renderSectionDiagnostics = (payload) => {
        if (!sectionsSection || !sectionsBody) return;

        const rows = Array.isArray(payload?.latestAttempt?.sectionStats)
            ? payload.latestAttempt.sectionStats
            : [];

        if (!rows.length) {
            sectionsBody.innerHTML = `
                <tr>
                    <td colspan="6">Section diagnostics will appear after your first completed attempt.</td>
                </tr>
            `;
            sectionsSection.hidden = false;
            return;
        }

        sectionsBody.innerHTML = rows.map((section) => {
            const total = Math.max(0, Math.floor(toSafeNumber(section?.total, 0)));
            const attempted = Math.max(0, Math.floor(toSafeNumber(section?.attempted, 0)));
            const signal = getSectionSignal(section);
            return `
                <tr>
                    <td>${escapeHtml(toSafeString(section?.name || 'Section'))}</td>
                    <td>${formatMarks(section?.score)}</td>
                    <td>${formatPercent(section?.accuracyPercent)}</td>
                    <td>${attempted}/${Math.max(0, total)} (${formatPercent(section?.attemptPercent)})</td>
                    <td>${formatDurationShort(Math.round(toSafeNumber(section?.timeMs, 0) / 1000))}</td>
                    <td><span class="analysis-signal-pill ${escapeHtml(signal.className)}">${escapeHtml(signal.label)}</span></td>
                </tr>
            `;
        }).join('');

        sectionsSection.hidden = false;
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

    const buildActionPlan = (payload) => {
        const latestAttempt = payload?.latestAttempt || {};
        const comparison = payload?.comparison || {};
        const benchmark = payload?.benchmark || {};
        const sectionStats = Array.isArray(latestAttempt?.sectionStats) ? latestAttempt.sectionStats : [];

        const actions = [];
        const scoreGapVsCutoff = Number(comparison?.scoreGapVsCutoff);
        if (Number.isFinite(scoreGapVsCutoff) && scoreGapVsCutoff > 0) {
            actions.push(`Recover at least ${formatMarks(scoreGapVsCutoff)} marks to cross the current cutoff.`);
        }

        const accuracy = Number(latestAttempt?.accuracyPercent);
        if (Number.isFinite(accuracy) && accuracy < 65) {
            actions.push('Run one accuracy-first mock: attempt fewer questions but keep precision above 70%.');
        }

        const unanswered = Math.max(0, Math.floor(toSafeNumber(latestAttempt?.unanswered, 0)));
        const attempted = Math.max(0, Math.floor(toSafeNumber(latestAttempt?.correct, 0)) + Math.max(0, Math.floor(toSafeNumber(latestAttempt?.wrong, 0))));
        if (unanswered > Math.max(5, Math.floor((unanswered + attempted) * 0.2))) {
            actions.push(`Reduce unattempted questions from ${unanswered} by using a two-pass scan strategy in next mock.`);
        }

        const timeGap = Number(comparison?.timeGapVsTopperSeconds);
        if (Number.isFinite(timeGap) && timeGap > 0) {
            actions.push(`Improve pacing by at least ${Math.max(1, Math.round(timeGap / 60))} minute(s) with timed sectional drills.`);
        }

        const weakSections = sectionStats
            .slice()
            .sort((left, right) => toSafeNumber(left?.accuracyPercent, 0) - toSafeNumber(right?.accuracyPercent, 0))
            .slice(0, 2)
            .filter((section) => toSafeString(section?.name));

        weakSections.forEach((section) => {
            actions.push(`Prioritize ${toSafeString(section.name)}: target ${formatPercent(Math.max(0, toSafeNumber(section?.accuracyPercent, 0) + 12))} accuracy next.`);
        });

        if (!actions.length) {
            actions.push('Maintain consistency with 2 full mocks this week and keep revision notes updated after each test.');
            if (Number.isFinite(Number(benchmark?.topperScorePercent))) {
                actions.push(`Next milestone: close the topper gap and approach ${formatPercent(benchmark.topperScorePercent)}.`);
            }
        }

        return actions.slice(0, 5);
    };

    const renderActionPlan = (payload) => {
        if (!actionPlanSection || !actionPlanNode) return;

        const hasAttempt = Boolean(payload?.hasAttempt);
        if (!hasAttempt) {
            actionPlanNode.innerHTML = '<li>Complete one attempt to unlock your personalized action plan.</li>';
            actionPlanSection.hidden = false;
            return;
        }

        const actions = buildActionPlan(payload);
        actionPlanNode.innerHTML = actions
            .map((item) => `<li>${escapeHtml(toSafeString(item))}</li>`)
            .join('');
        actionPlanSection.hidden = false;
    };

    const loadQuestions = async ({ examId, paperId, language }) => {
        const safeLanguage = normalizeLanguage(language || currentLanguage);
        const response = await fetch(`/api/questions/${encodeURIComponent(examId)}/${encodeURIComponent(paperId)}?lang=${encodeURIComponent(safeLanguage)}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Unable to load paper questions for explanation review.');
        }

        return response.json();
    };

    const loadChapterwise = async (examId) => {
        const response = await fetch(`/api/chapterwise/${encodeURIComponent(examId)}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
            return null;
        }

        return response.json();
    };

    const getQuestionStatsFromLatestAttempt = (payload) => {
        const sections = Array.isArray(payload?.latestAttempt?.sectionStats)
            ? payload.latestAttempt.sectionStats
            : [];

        const stats = [];
        sections.forEach((section) => {
            const sectionStats = Array.isArray(section?.questionStats) ? section.questionStats : [];
            sectionStats.forEach((item) => {
                stats.push({
                    questionNumber: Math.max(1, Math.floor(toSafeNumber(item?.questionNumber, 0))),
                    questionId: toSafeString(item?.questionId),
                    sectionId: toSafeString(item?.sectionId || section?.sectionId).toLowerCase(),
                    status: toSafeString(item?.status || 'not-visited').toLowerCase(),
                    timeTakenSeconds: Math.max(0, Math.floor(toSafeNumber(item?.timeTakenSeconds, 0))),
                    selectedOptionIndex: Math.floor(toSafeNumber(item?.selectedOptionIndex, -1)),
                    correctOptionIndex: Math.floor(toSafeNumber(item?.correctOptionIndex, -1))
                });
            });
        });

        return stats;
    };

    const resolveQuestionTaxonomy = ({ question, sectionId, sectionName, index, chapterwisePayload }) => {
        const subjectIdDirect = toSafeIdentifier(question?.subjectId || question?.subject?.subjectId || question?.subject?.id || question?.subject?.name);
        const subjectNameDirect = toSafeString(question?.subjectName || question?.subject?.name || question?.subject?.title);
        const chapterIdDirect = toSafeIdentifier(question?.chapterId || question?.chapter?.chapterId || question?.chapter?.id || question?.chapter?.name);
        const chapterNameDirect = toSafeString(question?.chapterName || question?.chapter?.name || question?.chapter?.title);
        const topicIdDirect = toSafeIdentifier(question?.topicId || question?.topic?.topicId || question?.topic?.id || question?.topic?.name);
        const topicNameDirect = toSafeString(question?.topicName || question?.topic?.name || question?.topic?.title);

        if (subjectIdDirect && chapterIdDirect && topicIdDirect) {
            return {
                subjectId: subjectIdDirect,
                subjectName: subjectNameDirect || formatTitleFromId(subjectIdDirect),
                chapterId: chapterIdDirect,
                chapterName: chapterNameDirect || formatTitleFromId(chapterIdDirect),
                topicId: topicIdDirect,
                topicName: topicNameDirect || formatTitleFromId(topicIdDirect)
            };
        }

        const subjects = Array.isArray(chapterwisePayload?.subjects) ? chapterwisePayload.subjects : [];
        const normalizedSectionId = toSafeIdentifier(sectionId || sectionName);
        const matchingSubject = subjects.find((subject) => toSafeIdentifier(subject?.subjectId) === normalizedSectionId)
            || subjects.find((subject) => {
                const subjectName = toSafeString(subject?.name).toLowerCase();
                const targetName = toSafeString(sectionName).toLowerCase();
                return subjectName && targetName && (subjectName.includes(targetName) || targetName.includes(subjectName));
            });

        if (matchingSubject) {
            const chapters = Array.isArray(matchingSubject?.chapters) ? matchingSubject.chapters : [];
            const chapter = chapters.length ? chapters[Math.max(0, index) % chapters.length] : null;
            const topics = Array.isArray(chapter?.topics) ? chapter.topics : [];
            const topic = topics.length ? topics[Math.max(0, index) % topics.length] : null;

            return {
                subjectId: toSafeIdentifier(matchingSubject?.subjectId),
                subjectName: toSafeString(matchingSubject?.name) || formatTitleFromId(matchingSubject?.subjectId),
                chapterId: toSafeIdentifier(chapter?.chapterId),
                chapterName: toSafeString(chapter?.name) || formatTitleFromId(chapter?.chapterId),
                topicId: toSafeIdentifier(topic?.topicId),
                topicName: toSafeString(topic?.name) || formatTitleFromId(topic?.topicId)
            };
        }

        const fallbackSubjectId = normalizedSectionId || 'general';
        const fallbackSubjectName = toSafeString(sectionName) || formatTitleFromId(fallbackSubjectId);

        return {
            subjectId: fallbackSubjectId,
            subjectName: fallbackSubjectName,
            chapterId: `${fallbackSubjectId}-mixed`,
            chapterName: `${fallbackSubjectName} Mixed Concepts`,
            topicId: `${fallbackSubjectId}-core`,
            topicName: `${fallbackSubjectName} Core`
        };
    };

    const normalizeExplanationBlock = (value) => {
        if (typeof value === 'string') {
            return toSafeString(value);
        }

        if (Array.isArray(value)) {
            const text = value
                .map((entry) => normalizeExplanationBlock(entry))
                .filter((entry) => Boolean(toSafeString(entry)))
                .join('\n');
            return toSafeString(text);
        }

        if (!value || typeof value !== 'object') {
            return '';
        }

        const lines = [];
        const pushLine = (line) => {
            const text = toSafeString(line);
            if (!text) return;
            if (!lines.includes(text)) {
                lines.push(text);
            }
        };

        const directTextKeys = ['text', 'detail', 'summary', 'reason', 'explanation', 'solution', 'value'];
        directTextKeys.forEach((key) => {
            const candidate = normalizeExplanationBlock(value?.[key]);
            if (candidate) {
                candidate.split(/\r?\n/).forEach((part) => pushLine(part));
            }
        });

        const languageKeys = ['en', 'english', 'hi', 'hindi'];
        languageKeys.forEach((key) => {
            const candidate = value?.[key];
            if (typeof candidate === 'string') {
                candidate.split(/\r?\n/).forEach((part) => pushLine(part));
                return;
            }

            if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
                const labels = Object.keys(candidate)
                    .map((entryKey) => ({ entryKey, weight: ['a', 'b', 'c', 'd'].indexOf(toSafeString(entryKey).toLowerCase()) }))
                    .sort((left, right) => {
                        if (left.weight === -1 && right.weight === -1) return left.entryKey.localeCompare(right.entryKey);
                        if (left.weight === -1) return 1;
                        if (right.weight === -1) return -1;
                        return left.weight - right.weight;
                    });

                labels.forEach(({ entryKey }) => {
                    const text = normalizeExplanationBlock(candidate[entryKey]);
                    if (!text) return;
                    const optionLabel = toSafeString(entryKey).toUpperCase();
                    pushLine(`${optionLabel}) ${text}`);
                });
            }
        });

        if (!lines.length) {
            Object.entries(value).forEach(([key, candidate]) => {
                const text = normalizeExplanationBlock(candidate);
                if (!text) return;
                if (['en', 'english', 'hi', 'hindi', 'text', 'detail', 'summary', 'reason', 'explanation', 'solution', 'value'].includes(toSafeString(key).toLowerCase())) {
                    return;
                }
                const safeKey = toSafeString(key);
                if (safeKey && safeKey.length <= 5) {
                    pushLine(`${safeKey.toUpperCase()}) ${text}`);
                } else {
                    pushLine(text);
                }
            });
        }

        return lines.join('\n');
    };

    const extractQuestionExplanation = (question) => {
        const candidates = [
            question?.explanation,
            question?.explanations,
            question?.explanationText,
            question?.answerExplanation,
            question?.solution,
            question?.reasoning,
            question?.en,
            question?.hi,
            question?.reasonMap,
            question?.optionReasoning,
            question?.optionWiseExplanation
        ];

        const snippets = [];
        candidates.forEach((candidate) => {
            const normalized = normalizeExplanationBlock(candidate);
            if (normalized && !snippets.includes(normalized)) {
                snippets.push(normalized);
            }
        });

        return toSafeString(snippets.join('\n\n'));
    };

    const extractQuestionExplanationImageUrl = (question) => {
        const candidates = [
            question?.explanationImageUrl,
            question?.explanationImage,
            question?.explanation?.image,
            question?.explanation?.imageUrl,
            question?.solutionImage,
            question?.solutionImageUrl,
            question?.media?.explanationImage,
            question?.media?.explanationImageUrl
        ];

        for (const candidate of candidates) {
            const text = toSafeString(candidate);
            if (text) return text;
        }

        return '';
    };

    const getQuestionTimeComparisonMaps = (analysisPayload) => {
        const byQuestionId = new Map();
        const byQuestionNumber = new Map();
        const rows = Array.isArray(analysisPayload?.questionTimeComparison)
            ? analysisPayload.questionTimeComparison
            : [];

        rows.forEach((row) => {
            const questionId = toSafeString(row?.questionId);
            const questionNumber = Math.max(1, Math.floor(toSafeNumber(row?.questionNumber, 0)));
            if (questionId && !byQuestionId.has(questionId)) {
                byQuestionId.set(questionId, row);
            }
            if (questionNumber && !byQuestionNumber.has(questionNumber)) {
                byQuestionNumber.set(questionNumber, row);
            }
        });

        return { byQuestionId, byQuestionNumber };
    };

    const buildQuestionReviewItems = (analysisPayload, questionsPayload, chapterwisePayload) => {
        const questionList = Array.isArray(questionsPayload?.questions) ? questionsPayload.questions : [];
        if (!questionList.length) return [];

        const comparisonMaps = getQuestionTimeComparisonMaps(analysisPayload);

        const questionStats = getQuestionStatsFromLatestAttempt(analysisPayload);
        const statsByQuestionId = new Map();
        const statsByQuestionNumber = new Map();

        questionStats.forEach((item) => {
            const questionId = toSafeString(item?.questionId);
            if (questionId && !statsByQuestionId.has(questionId)) {
                statsByQuestionId.set(questionId, item);
            }
            const questionNumber = Math.max(1, Math.floor(toSafeNumber(item?.questionNumber, 0)));
            if (questionNumber && !statsByQuestionNumber.has(questionNumber)) {
                statsByQuestionNumber.set(questionNumber, item);
            }
        });

        const sectionNameById = new Map();
        const paperSections = Array.isArray(questionsPayload?.paper?.sections) ? questionsPayload.paper.sections : [];
        paperSections.forEach((section) => {
            const sectionId = toSafeString(section?.sectionId).toLowerCase();
            const sectionName = toSafeString(section?.name);
            if (sectionId) sectionNameById.set(sectionId, sectionName || formatTitleFromId(sectionId));
        });

        const attemptSections = Array.isArray(analysisPayload?.latestAttempt?.sectionStats)
            ? analysisPayload.latestAttempt.sectionStats
            : [];
        attemptSections.forEach((section) => {
            const sectionId = toSafeString(section?.sectionId).toLowerCase();
            const sectionName = toSafeString(section?.name);
            if (sectionId && sectionName && !sectionNameById.has(sectionId)) {
                sectionNameById.set(sectionId, sectionName);
            }
        });

        return questionList.map((question, index) => {
            const questionId = toSafeString(question?.questionId);
            const questionNumber = index + 1;
            const stat = statsByQuestionId.get(questionId) || statsByQuestionNumber.get(questionNumber) || null;
            const comparison = comparisonMaps.byQuestionId.get(questionId)
                || comparisonMaps.byQuestionNumber.get(questionNumber)
                || null;

            const sectionId = toSafeString(question?.sectionId || stat?.sectionId).toLowerCase();
            const sectionName = sectionNameById.get(sectionId) || formatTitleFromId(sectionId || 'general');

            const taxonomy = resolveQuestionTaxonomy({
                question,
                sectionId,
                sectionName,
                index,
                chapterwisePayload
            });

            const options = Array.isArray(question?.options)
                ? question.options.map((option) => toSafeString(option)).slice(0, 4)
                : [];

            const selectedOptionIndex = stat
                ? Math.floor(toSafeNumber(stat?.selectedOptionIndex, -1))
                : -1;

            const correctOptionIndex = Number.isInteger(Number(question?.correctOptionIndex))
                ? Number(question.correctOptionIndex)
                : Math.floor(toSafeNumber(stat?.correctOptionIndex, -1));

            const normalizedStatus = toSafeString(stat?.status || (selectedOptionIndex >= 0 ? 'answered' : 'not-visited')).toLowerCase();
            const safeStatus = normalizedStatus || 'not-visited';

            const explanation = extractQuestionExplanation(question);
            const explanationImageUrl = extractQuestionExplanationImageUrl(question);

            const averageTimeSeconds = Number.isFinite(Number(comparison?.averageTimeSeconds))
                ? Number(comparison.averageTimeSeconds)
                : null;
            const topperAverageTimeSeconds = Number.isFinite(Number(comparison?.topperAverageTimeSeconds))
                ? Number(comparison.topperAverageTimeSeconds)
                : null;
            const deltaVsAverageSeconds = Number.isFinite(Number(comparison?.deltaVsAverageSeconds))
                ? Number(comparison.deltaVsAverageSeconds)
                : null;
            const userTimeSeconds = Number.isFinite(Number(comparison?.userTimeSeconds))
                ? Number(comparison.userTimeSeconds)
                : Math.max(0, Math.floor(toSafeNumber(stat?.timeTakenSeconds, 0)));
            const deltaVsTopperSeconds = Number.isFinite(userTimeSeconds) && Number.isFinite(topperAverageTimeSeconds)
                ? userTimeSeconds - topperAverageTimeSeconds
                : null;

            return {
                questionNumber,
                questionId,
                sectionId,
                sectionName,
                status: safeStatus,
                timeTakenSeconds: Math.max(0, Math.floor(toSafeNumber(stat?.timeTakenSeconds, 0))),
                selectedOptionIndex: selectedOptionIndex >= 0 && selectedOptionIndex <= 3 ? selectedOptionIndex : -1,
                correctOptionIndex: correctOptionIndex >= 0 && correctOptionIndex <= 3 ? correctOptionIndex : -1,
                questionText: toSafeString(question?.questionText),
                options,
                explanation: explanation || 'Review this concept and the answer key once more before the next mock.',
                explanationImageUrl,
                averageTimeSeconds,
                topperAverageTimeSeconds,
                deltaVsAverageSeconds,
                deltaVsTopperSeconds,
                subjectId: taxonomy.subjectId,
                subjectName: taxonomy.subjectName,
                chapterId: taxonomy.chapterId,
                chapterName: taxonomy.chapterName,
                topicId: taxonomy.topicId,
                topicName: taxonomy.topicName
            };
        });
    };

    const getQuestionKey = (item) => toSafeString(item?.questionId) || `q-${Math.max(1, Math.floor(toSafeNumber(item?.questionNumber, 0)))}`;

    const findReviewItemByKey = (questionKey, source = reviewItems) => {
        const safeKey = toSafeString(questionKey);
        if (!safeKey) return null;
        return source.find((item) => getQuestionKey(item) === safeKey) || null;
    };

    const normalizeComparableText = (value) => toSafeString(value)
        .toLowerCase()
        .replace(/[\u0000-\u001f]/g, ' ')
        .replace(/[()\[\]{}.,:;!?/\\|"'`~@#$%^&*_+=<>-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const shouldHighlightCorrectExplanationLine = (line, item) => {
        const safeLine = toSafeString(line);
        if (!safeLine || !item || !Number.isInteger(item.correctOptionIndex) || item.correctOptionIndex < 0) {
            return false;
        }

        const lineTrimmed = safeLine.trim();
        const lineLower = lineTrimmed.toLowerCase();
        const correctIndex = item.correctOptionIndex;
        const optionLabel = getOptionLabel(correctIndex);
        const optionText = toSafeString(Array.isArray(item.options) ? item.options[correctIndex] : '');
        const normalizedLine = normalizeComparableText(lineTrimmed);
        const normalizedOptionText = normalizeComparableText(optionText);

        const labelPattern = new RegExp(`^${optionLabel}\\s*[\\)\\.:-]`, 'i');
        const optionPattern = new RegExp(`^option\\s*${correctIndex + 1}\\b`, 'i');
        const vikalpPattern = new RegExp(`^विकल्प\\s*${correctIndex + 1}\\b`, 'i');

        if (labelPattern.test(lineTrimmed) || optionPattern.test(lineTrimmed) || vikalpPattern.test(lineTrimmed)) {
            return true;
        }

        if (normalizedOptionText && normalizedLine.startsWith(normalizedOptionText)) {
            return true;
        }

        const hasPositiveMarker = /\bcorrect\b|\bright\b|\btrue\b|सही/i.test(lineLower);
        const hasNegativeMarker = /\bincorrect\b|\bwrong\b|गलत/i.test(lineLower);
        if (hasPositiveMarker && !hasNegativeMarker) {
            return true;
        }

        if (hasPositiveMarker && normalizedOptionText && normalizedLine.includes(normalizedOptionText)) {
            return true;
        }

        return false;
    };

    const getExplanationHtml = (value, item) => {
        const lines = toSafeString(value).split(/\r?\n/);
        return lines
            .map((line) => {
                const escaped = escapeHtml(line);
                if (shouldHighlightCorrectExplanationLine(line, item)) {
                    return `<strong class="analysis-correct-explanation-line">${escaped}</strong>`;
                }
                return escaped;
            })
            .join('<br>');
    };

    const renderQuestionDetail = (item) => {
        if (!item) {
            if (questionDetailTitleNode) questionDetailTitleNode.textContent = 'Select a question';
            if (questionDetailMetaNode) questionDetailMetaNode.textContent = 'Click any question button to view complete answer and explanation.';
            if (questionDetailTextNode) questionDetailTextNode.textContent = 'Question details will appear here.';
            if (questionDetailOptionsNode) questionDetailOptionsNode.innerHTML = '';
            if (questionDetailAnswersNode) questionDetailAnswersNode.innerHTML = '';
            if (questionDetailTimeNode) questionDetailTimeNode.innerHTML = '';
            if (questionDetailExplanationNode) {
                questionDetailExplanationNode.innerHTML = '<strong>Explanation:</strong> Complete explanation will appear here.';
            }
            if (questionDetailImageNode) {
                questionDetailImageNode.removeAttribute('src');
            }
            if (questionDetailImageWrapNode) {
                questionDetailImageWrapNode.hidden = true;
            }
            if (questionDetailImageCaptionNode) {
                questionDetailImageCaptionNode.textContent = 'Explanation image';
            }
            return;
        }

        const selectedText = item.selectedOptionIndex >= 0
            ? `${getOptionLabel(item.selectedOptionIndex)}. ${toSafeString(item.options[item.selectedOptionIndex] || '')}`
            : 'Not Attempted';
        const correctText = item.correctOptionIndex >= 0
            ? `${getOptionLabel(item.correctOptionIndex)}. ${toSafeString(item.options[item.correctOptionIndex] || '')}`
            : 'N/A';

        if (questionDetailTitleNode) {
            questionDetailTitleNode.textContent = `Q${item.questionNumber} • ${toSafeString(item.sectionName || 'Section')}`;
        }

        if (questionDetailMetaNode) {
            questionDetailMetaNode.textContent = `${toSafeString(item.chapterName || 'Chapter')} • ${toSafeString(item.topicName || 'Topic')} • ${normalizeStatusLabel(item.status)}`;
        }

        if (questionDetailTextNode) {
            questionDetailTextNode.textContent = toSafeString(item.questionText || 'Question text unavailable.');
        }

        if (questionDetailOptionsNode) {
            questionDetailOptionsNode.innerHTML = (Array.isArray(item.options) ? item.options : []).map((option, optionIndex) => {
                const isSelected = optionIndex === item.selectedOptionIndex;
                const isCorrect = optionIndex === item.correctOptionIndex;
                let optionClass = 'analysis-review-option';
                if (isCorrect) optionClass += ' correct';
                if (isSelected && !isCorrect) optionClass += ' selected-wrong';
                if (isSelected && isCorrect) optionClass += ' selected-correct';

                return `<li class="${optionClass}"><span>${getOptionLabel(optionIndex)}.</span> ${escapeHtml(toSafeString(option))}</li>`;
            }).join('');
        }

        if (questionDetailAnswersNode) {
            questionDetailAnswersNode.innerHTML = `
                <span><strong>Your Answer:</strong> ${escapeHtml(selectedText)}</span>
                <span><strong>Correct:</strong> ${escapeHtml(correctText)}</span>
            `;
        }

        if (questionDetailTimeNode) {
            const hasAverage = Number.isFinite(Number(item.averageTimeSeconds));
            const hasTopper = Number.isFinite(Number(item.topperAverageTimeSeconds));
            const hasAvgDelta = Number.isFinite(Number(item.deltaVsAverageSeconds));
            const hasTopperDelta = Number.isFinite(Number(item.deltaVsTopperSeconds));

            questionDetailTimeNode.innerHTML = `
                <span><strong>Your Time:</strong> ${escapeHtml(formatDurationShort(item.timeTakenSeconds))}</span>
                <span><strong>Avg Time:</strong> ${escapeHtml(hasAverage ? formatDurationShort(item.averageTimeSeconds) : '--')}</span>
                <span><strong>Topper Avg:</strong> ${escapeHtml(hasTopper ? formatDurationShort(item.topperAverageTimeSeconds) : '--')}</span>
                <span><strong>Vs Avg:</strong> ${escapeHtml(hasAvgDelta ? formatSignedSeconds(item.deltaVsAverageSeconds) : '--')}</span>
                <span><strong>Vs Topper:</strong> ${escapeHtml(hasTopperDelta ? formatSignedSeconds(item.deltaVsTopperSeconds) : '--')}</span>
            `;
        }

        if (questionDetailExplanationNode) {
            questionDetailExplanationNode.innerHTML = `<strong>Explanation:</strong> ${getExplanationHtml(item.explanation || '', item)}`;
        }

        if (questionDetailImageNode && questionDetailImageWrapNode) {
            const imageUrl = toSafeString(item.explanationImageUrl);
            if (imageUrl) {
                questionDetailImageNode.src = imageUrl;
                if (questionDetailImageCaptionNode) {
                    questionDetailImageCaptionNode.textContent = `Explanation image for Q${item.questionNumber}`;
                }
                questionDetailImageWrapNode.hidden = false;
            } else {
                questionDetailImageNode.removeAttribute('src');
                questionDetailImageWrapNode.hidden = true;
                if (questionDetailImageCaptionNode) {
                    questionDetailImageCaptionNode.textContent = 'Explanation image';
                }
            }
        }
    };

    const renderSectionButtons = (sectionOptions) => {
        if (!sectionButtonsNode) return;

        sectionButtonsNode.innerHTML = sectionOptions.map((section) => {
            const isActive = toSafeString(section.value) === toSafeString(reviewState.sectionId);
            return `<button type="button" class="analysis-section-btn${isActive ? ' active' : ''}" data-section-id="${escapeHtml(section.value)}">${escapeHtml(section.label)}</button>`;
        }).join('');
    };

    const ensureFilterBinding = () => {
        if (languageToggleNode && languageToggleNode.dataset.bound !== '1') {
            languageToggleNode.dataset.bound = '1';
            languageToggleNode.addEventListener('change', async () => {
                await applyQuestionLanguage(languageToggleNode.value);
            });
        }

        if (filterLanguageNode && filterLanguageNode.dataset.bound !== '1') {
            filterLanguageNode.dataset.bound = '1';
            filterLanguageNode.addEventListener('change', async () => {
                await applyQuestionLanguage(filterLanguageNode.value);
            });
        }

        if (filterChapterNode && filterChapterNode.dataset.bound !== '1') {
            filterChapterNode.dataset.bound = '1';
            filterChapterNode.addEventListener('change', () => {
                reviewState.chapterId = toSafeString(filterChapterNode.value);
                reviewState.topicId = '';
                reviewState.questionKey = '';
                renderQuestionReview();
            });
        }

        if (filterTopicNode && filterTopicNode.dataset.bound !== '1') {
            filterTopicNode.dataset.bound = '1';
            filterTopicNode.addEventListener('change', () => {
                reviewState.topicId = toSafeString(filterTopicNode.value);
                reviewState.questionKey = '';
                renderQuestionReview();
            });
        }

        if (sectionButtonsNode && sectionButtonsNode.dataset.bound !== '1') {
            sectionButtonsNode.dataset.bound = '1';
            sectionButtonsNode.addEventListener('click', (event) => {
                const button = event.target instanceof Element
                    ? event.target.closest('button[data-section-id]')
                    : null;
                if (!button) return;

                const nextSectionId = toSafeString(button.getAttribute('data-section-id'));
                if (!nextSectionId || nextSectionId === toSafeString(reviewState.sectionId)) return;

                reviewState.sectionId = nextSectionId;
                reviewState.chapterId = '';
                reviewState.topicId = '';
                reviewState.questionKey = '';
                renderQuestionReview();
            });
        }

        if (reviewGroupsNode && reviewGroupsNode.dataset.bound !== '1') {
            reviewGroupsNode.dataset.bound = '1';
            reviewGroupsNode.addEventListener('click', (event) => {
                const button = event.target instanceof Element
                    ? event.target.closest('button[data-question-key]')
                    : null;
                if (!button) return;

                reviewState.questionKey = toSafeString(button.getAttribute('data-question-key'));
                renderQuestionReview();
            });
        }
    };

    const renderSelectOptions = (node, values, selectedValue, defaultLabel) => {
        if (!node) return '';
        const normalizedSelected = toSafeString(selectedValue);

        const optionsHtml = values
            .map((item) => {
                const value = toSafeString(item?.value);
                const label = toSafeString(item?.label) || value;
                const selected = value && value === normalizedSelected ? ' selected' : '';
                return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
            })
            .join('');

        node.innerHTML = `<option value="">${escapeHtml(defaultLabel)}</option>${optionsHtml}`;
        const hasSelectedOption = normalizedSelected
            ? Array.from(node.options || []).some((option) => String(option.value) === normalizedSelected)
            : false;

        if (hasSelectedOption) {
            node.value = normalizedSelected;
        } else {
            node.value = '';
        }

        return node.value;
    };

    const buildFilterOptions = () => {
        const chapterOptions = [];
        const topicOptions = [];

        const selectedSection = toSafeString(reviewState.sectionId);
        const selectedChapter = toSafeString(reviewState.chapterId);
        const selectedTopic = toSafeString(reviewState.topicId);

        const sectionMap = new Map();
        reviewItems.forEach((item) => {
            const key = toSafeString(item.sectionId);
            if (!key || sectionMap.has(key)) return;
            sectionMap.set(key, toSafeString(item.sectionName) || formatTitleFromId(key));
        });
        const sectionOptions = [];
        sectionMap.forEach((label, value) => sectionOptions.push({ value, label }));

        sectionOptions.sort((left, right) => String(left.label).localeCompare(String(right.label)));
        if (!sectionOptions.some((item) => item.value === selectedSection)) {
            reviewState.sectionId = sectionOptions[0]?.value || '';
            reviewState.chapterId = '';
            reviewState.topicId = '';
            reviewState.questionKey = '';
        }

        renderSectionButtons(sectionOptions);

        const activeSection = toSafeString(reviewState.sectionId);

        const chapterSource = reviewItems.filter((item) => !activeSection || item.sectionId === activeSection);
        const chapterMap = new Map();
        chapterSource.forEach((item) => {
            const key = toSafeString(item.chapterId);
            if (!key || chapterMap.has(key)) return;
            chapterMap.set(key, toSafeString(item.chapterName) || formatTitleFromId(key));
        });
        chapterMap.forEach((label, value) => chapterOptions.push({ value, label }));
        chapterOptions.sort((left, right) => String(left.label).localeCompare(String(right.label)));

        const topicSource = chapterSource.filter((item) => !selectedChapter || item.chapterId === selectedChapter);
        const topicMap = new Map();
        topicSource.forEach((item) => {
            const key = toSafeString(item.topicId);
            if (!key || topicMap.has(key)) return;
            topicMap.set(key, toSafeString(item.topicName) || formatTitleFromId(key));
        });
        topicMap.forEach((label, value) => topicOptions.push({ value, label }));
        topicOptions.sort((left, right) => String(left.label).localeCompare(String(right.label)));

        const finalChapter = renderSelectOptions(filterChapterNode, chapterOptions, selectedChapter, 'All Chapters');
        const finalTopic = renderSelectOptions(filterTopicNode, topicOptions, selectedTopic, 'All Topics');

        reviewState.chapterId = finalChapter;
        reviewState.topicId = finalTopic;

        const filteredItems = reviewItems.filter((item) => {
            if (reviewState.sectionId && item.sectionId !== reviewState.sectionId) return false;
            if (reviewState.chapterId && item.chapterId !== reviewState.chapterId) return false;
            if (reviewState.topicId && item.topicId !== reviewState.topicId) return false;
            return true;
        });

        return {
            filteredItems
        };
    };

    const getStatusClassName = (status) => {
        const normalized = toSafeString(status).toLowerCase();
        return `analysis-status-${normalized || 'not-visited'}`;
    };

    const getOptionLabel = (index) => ['A', 'B', 'C', 'D'][index] || '?';

    const applyQuestionLanguage = async (nextLanguageRaw) => {
        const nextLanguage = normalizeLanguage(nextLanguageRaw);
        if (nextLanguage === currentLanguage) return;

        const requestId = ++languageRequestId;
        const previousLanguage = currentLanguage;
        currentLanguage = nextLanguage;
        syncLanguageFilterControl();
        updateLanguageInUrl(currentLanguage);

        if (!currentQuery?.examId || !currentQuery?.paperId || !latestAnalysisPayload) {
            return;
        }

        setStatus('Switching question language...', {
            tone: 'info',
            showActions: false
        });

        try {
            const questionPayload = await loadQuestions({
                examId: currentQuery.examId,
                paperId: currentQuery.paperId,
                language: currentLanguage
            });

            if (requestId !== languageRequestId) return;

            const questionReviewItems = buildQuestionReviewItems(
                latestAnalysisPayload,
                questionPayload,
                latestChapterwisePayload
            );
            renderQuestionReview(questionReviewItems);

            setStatus('Language updated for question review.', {
                tone: 'success',
                showActions: false
            });
        } catch (error) {
            if (requestId !== languageRequestId) return;

            currentLanguage = previousLanguage;
            syncLanguageFilterControl();
            updateLanguageInUrl(currentLanguage);
            setStatus('Unable to switch language right now. Keeping previous language.', {
                tone: 'warning',
                showActions: false
            });
        }
    };

    const renderQuestionReview = (incomingItems) => {
        if (Array.isArray(incomingItems)) {
            reviewItems = incomingItems.slice();
        }

        if (!reviewSection || !reviewGroupsNode) return;

        ensureFilterBinding();

        if (!reviewItems.length) {
            reviewGroupsNode.innerHTML = '<p class="analysis-empty-text">Question-wise explanation review will appear after your first completed attempt.</p>';
            renderQuestionDetail(null);
            reviewSection.hidden = false;
            return;
        }

        const filterData = buildFilterOptions();
        const filtered = Array.isArray(filterData?.filteredItems) ? filterData.filteredItems : [];

        if (!filtered.length) {
            reviewGroupsNode.innerHTML = '<p class="analysis-empty-text">No questions match the selected filters.</p>';
            renderQuestionDetail(null);
            reviewSection.hidden = false;
            return;
        }

        if (!findReviewItemByKey(reviewState.questionKey, filtered)) {
            reviewState.questionKey = getQuestionKey(filtered[0]);
        }

        const groupMap = new Map();
        filtered.forEach((item) => {
            const key = `${toSafeString(item.topicId)}::${toSafeString(item.topicName)}`;
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    topicId: item.topicId,
                    topicName: item.topicName,
                    chapterName: item.chapterName,
                    items: []
                });
            }
            groupMap.get(key).items.push(item);
        });

        reviewGroupsNode.innerHTML = Array.from(groupMap.values()).map((group) => {
            const total = group.items.length;
            const correctCount = group.items.filter((item) => item.selectedOptionIndex >= 0 && item.selectedOptionIndex === item.correctOptionIndex).length;

            const questionButtons = group.items.map((item) => {
                const questionKey = getQuestionKey(item);
                const isActive = questionKey === reviewState.questionKey;
                return `
                    <button
                        type="button"
                        class="analysis-question-pick-btn${isActive ? ' active' : ''}"
                        data-question-key="${escapeHtml(questionKey)}"
                        title="Open Q${item.questionNumber} explanation"
                    >
                        Q${item.questionNumber}
                        <span class="analysis-status-pill ${getStatusClassName(item.status)}">${escapeHtml(normalizeStatusLabel(item.status))}</span>
                    </button>
                `;
            }).join('');

            return `
                <section class="analysis-review-group">
                    <header>
                        <h3>${escapeHtml(toSafeString(group.topicName) || 'Topic')}</h3>
                        <p>${correctCount}/${total} correct • ${escapeHtml(toSafeString(group.chapterName) || 'Chapter')}</p>
                    </header>
                    <div class="analysis-review-question-grid">${questionButtons}</div>
                </section>
            `;
        }).join('');

        const selectedItem = findReviewItemByKey(reviewState.questionKey, filtered) || filtered[0] || null;
        reviewState.questionKey = selectedItem ? getQuestionKey(selectedItem) : '';
        renderQuestionDetail(selectedItem);

        reviewSection.hidden = false;
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
        if (!copyLinkButton || copyLinkButton.dataset.bound === '1') return;

        copyLinkButton.dataset.bound = '1';
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
        currentQuery = query;
        currentLanguage = normalizeLanguage(query.lang || 'en');
        updateHeader(query);
        initCopyLink();
        resetSections();
        syncLanguageFilterControl();

        if (!query.examId || !query.paperId) {
            setStatus('Missing examId or paperId in URL. Open analysis from a mock result to load your full report.', {
                tone: 'warning',
                showActions: true
            });
            return;
        }

        const isAuthenticated = await loadAuthState();
        if (!isAuthenticated) {
            setStatus('Please log in to view complete analysis for this test.', {
                tone: 'warning',
                showActions: true
            });
            return;
        }

        setStatus('Loading complete analysis...', {
            tone: 'info',
            showActions: false
        });

        try {
            const payload = await loadAnalysis(currentQuery);
            const [questionResult, chapterwiseResult] = await Promise.allSettled([
                loadQuestions({
                    examId: currentQuery.examId,
                    paperId: currentQuery.paperId,
                    language: currentLanguage
                }),
                loadChapterwise(currentQuery.examId)
            ]);

            const questionPayload = questionResult.status === 'fulfilled' ? questionResult.value : null;
            const chapterwisePayload = chapterwiseResult.status === 'fulfilled' ? chapterwiseResult.value : null;
            latestAnalysisPayload = payload;
            latestChapterwisePayload = chapterwisePayload;

            renderSummary(payload);
            renderComparisonBars(payload);
            renderSectionDiagnostics(payload);
            renderInsights(payload);
            renderActionPlan(payload);

            if (questionPayload) {
                const questionReviewItems = buildQuestionReviewItems(payload, questionPayload, chapterwisePayload);
                renderQuestionReview(questionReviewItems);
            } else {
                renderQuestionReview([]);
            }

            setStatus('Analysis ready. Use this report to plan your next mock with clearer targets.', {
                tone: 'success',
                showActions: false
            });
        } catch (error) {
            if (error.status === 401) {
                setStatus('Session expired. Log in again to view this analysis.', {
                    tone: 'warning',
                    showActions: true
                });
                return;
            }

            setStatus('Unable to load analysis right now. Please retry in a moment.', {
                tone: 'error',
                showActions: true
            });
        }
    };

    void init();
})();
