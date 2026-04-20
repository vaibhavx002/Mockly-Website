const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createPersistentStores } = require('./db');

const BASELINE_DIR = path.join(__dirname, 'baseline');
const LATEST_BASELINE_PATH = path.join(BASELINE_DIR, 'phase0-baseline-latest.json');

const hashPasswordSync = (value) => {
    const plain = String(value || '');
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(plain, salt, 64, {
        N: 16384,
        r: 8,
        p: 1
    });

    return `scrypt$${salt}$${Buffer.from(derivedKey).toString('hex')}`;
};

const defaultPersonalizationProfile = () => ({
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

const readJsonSafe = (filePath) => {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
};

const listBaselineSnapshotFiles = () => {
    if (!fs.existsSync(BASELINE_DIR)) return [];

    return fs.readdirSync(BASELINE_DIR)
        .filter((name) => /^phase0-baseline-.*\.json$/i.test(name))
        .map((name) => path.join(BASELINE_DIR, name))
        .sort((left, right) => left.localeCompare(right));
};

const run = () => {
    const {
        db,
        authUserStore,
        personalizationStore,
        baselineRecordStore,
        getHealthSnapshot
    } = createPersistentStores();

    const summary = {
        ok: true,
        demoUserCreated: false,
        demoProfileCreated: false,
        baselineLatestImported: false,
        baselineSnapshotsIndexed: 0,
        healthBefore: null,
        healthAfter: null
    };

    try {
        summary.healthBefore = getHealthSnapshot();

        if (!authUserStore.has('demo@mockly.in')) {
            authUserStore.set('demo@mockly.in', {
                email: 'demo@mockly.in',
                name: 'Demo User',
                phone: '9999999999',
                passwordHash: hashPasswordSync('demo1234'),
                createdAt: new Date().toISOString(),
                lastLoginAt: ''
            });
            summary.demoUserCreated = true;
        }

        if (!personalizationStore.has('demo@mockly.in')) {
            personalizationStore.set('demo@mockly.in', defaultPersonalizationProfile());
            summary.demoProfileCreated = true;
        }

        const latestBaseline = readJsonSafe(LATEST_BASELINE_PATH);
        if (latestBaseline && typeof latestBaseline === 'object') {
            baselineRecordStore.set('phase0-baseline-latest', {
                importedAt: new Date().toISOString(),
                sourcePath: LATEST_BASELINE_PATH,
                baseline: latestBaseline
            });
            summary.baselineLatestImported = true;
        }

        const snapshotFiles = listBaselineSnapshotFiles();
        const snapshotIndex = snapshotFiles.map((filePath) => ({
            filePath,
            fileName: path.basename(filePath),
            exists: fs.existsSync(filePath)
        }));
        baselineRecordStore.set('phase0-baseline-snapshot-index', {
            importedAt: new Date().toISOString(),
            snapshots: snapshotIndex
        });
        summary.baselineSnapshotsIndexed = snapshotIndex.length;

        summary.healthAfter = getHealthSnapshot();

        // eslint-disable-next-line no-console
        console.log(JSON.stringify(summary, null, 2));

        process.exitCode = 0;
    } catch (error) {
        summary.ok = false;
        summary.message = error.message || 'Migration failed';
        // eslint-disable-next-line no-console
        console.error(JSON.stringify(summary, null, 2));
        process.exitCode = 1;
    } finally {
        db.close();
    }
};

run();
