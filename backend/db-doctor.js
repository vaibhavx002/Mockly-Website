const fs = require('fs');
const path = require('path');
const {
    createPersistentStores,
    backupDatabaseWithRotation,
    listBackupFiles,
    DEFAULT_BACKUP_KEEP
} = require('./db');

const BASELINE_DIR = path.join(__dirname, 'baseline');
const LATEST_BASELINE_PATH = path.join(BASELINE_DIR, 'phase0-baseline-latest.json');

const readJsonSafe = (filePath) => {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
};

const run = async () => {
    const {
        db,
        authUserStore,
        personalizationStore,
        baselineRecordStore,
        getHealthSnapshot
    } = createPersistentStores();

    const keep = Math.max(1, Number.parseInt(String(process.env.MOCKLY_DB_BACKUP_KEEP || DEFAULT_BACKUP_KEEP), 10) || DEFAULT_BACKUP_KEEP);

    try {
        const beforeHealth = getHealthSnapshot();
        const backupResult = await backupDatabaseWithRotation({ keep });

        const latestBaseline = readJsonSafe(LATEST_BASELINE_PATH);
        const snapshotFiles = fs.existsSync(BASELINE_DIR)
            ? fs.readdirSync(BASELINE_DIR).filter((name) => /^phase0-baseline-.*\.json$/i.test(name)).sort()
            : [];

        const dryRunSummary = {
            timestamp: new Date().toISOString(),
            demoUserExists: authUserStore.has('demo@mockly.in'),
            demoProfileExists: personalizationStore.has('demo@mockly.in'),
            baselineLatestFileExists: fs.existsSync(LATEST_BASELINE_PATH),
            baselineLatestJsonValid: Boolean(latestBaseline && typeof latestBaseline === 'object'),
            baselineSnapshotFilesCount: snapshotFiles.length,
            baselineRecordStoreCount: baselineRecordStore.size,
            wouldCreateDemoUser: !authUserStore.has('demo@mockly.in'),
            wouldCreateDemoProfile: !personalizationStore.has('demo@mockly.in'),
            wouldImportLatestBaseline: Boolean((latestBaseline && typeof latestBaseline === 'object') && !baselineRecordStore.has('phase0-baseline-latest')),
            wouldUpdateSnapshotIndex: snapshotFiles.length > 0
        };

        const afterHealth = getHealthSnapshot();

        // eslint-disable-next-line no-console
        console.log(JSON.stringify({
            ok: true,
            backup: {
                destinationPath: backupResult.backup.destinationPath,
                fileSizeBytes: backupResult.backup.snapshot.fileSizeBytes,
                rotation: backupResult.rotation
            },
            health: {
                before: beforeHealth,
                after: afterHealth
            },
            migrationDryRun: dryRunSummary,
            backupInventory: {
                totalFiles: listBackupFiles().length,
                keep
            }
        }, null, 2));

        process.exitCode = 0;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(JSON.stringify({
            ok: false,
            message: error.message || 'db:doctor failed'
        }, null, 2));
        process.exitCode = 1;
    } finally {
        db.close();
    }
};

void run();
