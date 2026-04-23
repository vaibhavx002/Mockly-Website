const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'mockly-store.json');
const DB_BACKUP_DIR = path.join(__dirname, 'backups');
const DEFAULT_BACKUP_KEEP = 14;
const LEGACY_DB_PATH = path.join(__dirname, 'data', 'mockly.db');
const LEGACY_DB_WAL_PATH = `${LEGACY_DB_PATH}-wal`;
const LEGACY_DB_SHM_PATH = `${LEGACY_DB_PATH}-shm`;

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseStoredFile = (rawText) => {
    try {
        const parsed = JSON.parse(String(rawText || '{}'));
        if (!isPlainObject(parsed)) return { namespaces: {} };
        if (!isPlainObject(parsed.namespaces)) return { namespaces: {} };
        return parsed;
    } catch (error) {
        return { namespaces: {} };
    }
};

const ensureDbFile = (dbPath) => {
    const targetDir = path.dirname(dbPath);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    if (!fs.existsSync(dbPath) && fs.existsSync(LEGACY_DB_PATH)) {
        fs.copyFileSync(LEGACY_DB_PATH, dbPath);
    }

    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({ namespaces: {} }, null, 2), 'utf8');
    }
};

class PersistentKeyValueDatabase {
    constructor(dbPath) {
        this.dbPath = dbPath;
        ensureDbFile(dbPath);
        this.state = parseStoredFile(fs.readFileSync(dbPath, 'utf8'));
    }

    save() {
        fs.writeFileSync(this.dbPath, JSON.stringify(this.state, null, 2), 'utf8');
    }

    ensureNamespace(namespace) {
        const safeNamespace = String(namespace || '').trim();
        if (!safeNamespace) return null;

        if (!isPlainObject(this.state.namespaces[safeNamespace])) {
            this.state.namespaces[safeNamespace] = {};
        }

        return this.state.namespaces[safeNamespace];
    }

    get(namespace, key) {
        const bucket = this.ensureNamespace(namespace);
        if (!bucket) return undefined;
        const itemKey = String(key || '');
        if (!Object.prototype.hasOwnProperty.call(bucket, itemKey)) {
            return undefined;
        }
        return bucket[itemKey];
    }

    set(namespace, key, value) {
        const bucket = this.ensureNamespace(namespace);
        if (!bucket) return;
        const itemKey = String(key || '');
        bucket[itemKey] = value === undefined ? null : value;
        this.save();
    }

    delete(namespace, key) {
        const bucket = this.ensureNamespace(namespace);
        if (!bucket) return false;

        const itemKey = String(key || '');
        if (!Object.prototype.hasOwnProperty.call(bucket, itemKey)) {
            return false;
        }

        delete bucket[itemKey];
        this.save();
        return true;
    }

    clear(namespace) {
        const safeNamespace = String(namespace || '').trim();
        if (!safeNamespace) return;
        this.state.namespaces[safeNamespace] = {};
        this.save();
    }

    entries(namespace) {
        const bucket = this.ensureNamespace(namespace);
        if (!bucket) return [];
        return Object.entries(bucket)
            .sort((left, right) => String(left[0]).localeCompare(String(right[0])));
    }

    count(namespace) {
        return this.entries(namespace).length;
    }

    namespaceCounts() {
        const counts = {};
        Object.entries(this.state.namespaces || {}).forEach(([namespace, items]) => {
            counts[namespace] = isPlainObject(items) ? Object.keys(items).length : 0;
        });
        return counts;
    }

    close() {
        this.save();
    }
}

class PersistentNamespaceStore {
    constructor(db, namespace) {
        this.db = db;
        this.namespace = String(namespace || '').trim();
    }

    get size() {
        return this.db.count(this.namespace);
    }

    get(key) {
        return this.db.get(this.namespace, key);
    }

    set(key, value) {
        this.db.set(this.namespace, key, value);
        return this;
    }

    delete(key) {
        return this.db.delete(this.namespace, key);
    }

    has(key) {
        return this.get(key) !== undefined;
    }

    clear() {
        this.db.clear(this.namespace);
    }

    entries() {
        return this.db.entries(this.namespace)[Symbol.iterator]();
    }

    keys() {
        const rows = this.db.entries(this.namespace).map(([key]) => key);
        return rows[Symbol.iterator]();
    }

    values() {
        const rows = this.db.entries(this.namespace).map(([, value]) => value);
        return rows[Symbol.iterator]();
    }

    forEach(callback, thisArg) {
        if (typeof callback !== 'function') return;

        this.db.entries(this.namespace).forEach(([key, value]) => {
            callback.call(thisArg, value, key, this);
        });
    }

    [Symbol.iterator]() {
        return this.entries();
    }
}

const initializeDatabase = () => new PersistentKeyValueDatabase(DB_PATH);

const getDatabaseFileSnapshot = (dbPath = DB_PATH) => {
    const exists = fs.existsSync(dbPath);
    if (!exists) {
        return {
            dbPath,
            exists: false,
            fileSizeBytes: 0,
            modifiedAt: ''
        };
    }

    const stats = fs.statSync(dbPath);
    return {
        dbPath,
        exists: true,
        fileSizeBytes: Number(stats.size || 0),
        modifiedAt: stats.mtime.toISOString()
    };
};

const getDatabaseHealthSnapshot = (db, options = {}) => {
    const dbPath = options.dbPath || DB_PATH;
    const namespaceCounts = db.namespaceCounts();
    const totalRows = Object.values(namespaceCounts).reduce((sum, count) => sum + Number(count || 0), 0);

    return {
        ...getDatabaseFileSnapshot(dbPath),
        totalRows,
        namespaceCounts,
        quickCheck: 'ok',
        walEnabled: false,
        timestamp: new Date().toISOString()
    };
};

const formatBackupFileName = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `mockly-${y}${m}${d}-${hh}${mm}${ss}.json`;
};

const listBackupFiles = (options = {}) => {
    const backupDir = path.resolve(options.backupDir || DB_BACKUP_DIR);
    if (!fs.existsSync(backupDir)) return [];

    return fs.readdirSync(backupDir)
        .filter((name) => /^mockly-.*\.(json|db)$/i.test(name))
        .map((name) => {
            const fullPath = path.join(backupDir, name);
            const stats = fs.statSync(fullPath);
            return {
                fileName: name,
                fullPath,
                fileSizeBytes: Number(stats.size || 0),
                modifiedAt: stats.mtime.toISOString(),
                modifiedAtMs: stats.mtimeMs
            };
        })
        .sort((left, right) => right.modifiedAtMs - left.modifiedAtMs);
};

const pruneOldBackups = (options = {}) => {
    const keep = Math.max(1, Number.parseInt(String(options.keep ?? DEFAULT_BACKUP_KEEP), 10) || DEFAULT_BACKUP_KEEP);
    const backupDir = path.resolve(options.backupDir || DB_BACKUP_DIR);
    const backups = listBackupFiles({ backupDir });
    const removable = backups.slice(keep);

    const removed = [];
    removable.forEach((item) => {
        fs.rmSync(item.fullPath);
        removed.push(item.fullPath);
    });

    return {
        backupDir,
        keep,
        totalBefore: backups.length,
        deletedCount: removed.length,
        deletedPaths: removed,
        totalAfter: backups.length - removed.length
    };
};

const backupDatabase = async (options = {}) => {
    const sourcePath = path.resolve(options.sourcePath || DB_PATH);
    const destinationPath = path.resolve(options.destinationPath || path.join(DB_BACKUP_DIR, formatBackupFileName()));

    const sourceDir = path.dirname(sourcePath);
    const destinationDir = path.dirname(destinationPath);
    if (!fs.existsSync(sourceDir)) {
        fs.mkdirSync(sourceDir, { recursive: true });
    }
    if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
    }

    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source database not found: ${sourcePath}`);
    }

    fs.copyFileSync(sourcePath, destinationPath);

    return {
        sourcePath,
        destinationPath,
        snapshot: getDatabaseFileSnapshot(destinationPath)
    };
};

const backupDatabaseWithRotation = async (options = {}) => {
    const keep = Math.max(1, Number.parseInt(String(options.keep ?? DEFAULT_BACKUP_KEEP), 10) || DEFAULT_BACKUP_KEEP);
    const backupResult = await backupDatabase(options);
    const rotationResult = pruneOldBackups({
        backupDir: path.dirname(backupResult.destinationPath),
        keep
    });

    return {
        backup: backupResult,
        rotation: rotationResult
    };
};

const restoreDatabase = (options = {}) => {
    const sourcePath = path.resolve(String(options.sourcePath || ''));
    if (!sourcePath) {
        throw new Error('restoreDatabase requires sourcePath.');
    }

    const destinationPath = path.resolve(options.destinationPath || DB_PATH);
    const createSafetyBackup = options.createSafetyBackup !== false;

    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Backup source not found: ${sourcePath}`);
    }

    const destinationDir = path.dirname(destinationPath);
    if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
    }

    let safetyBackupPath = '';
    if (createSafetyBackup && fs.existsSync(destinationPath)) {
        safetyBackupPath = path.join(DB_BACKUP_DIR, `pre-restore-${formatBackupFileName()}`);
        if (!fs.existsSync(DB_BACKUP_DIR)) {
            fs.mkdirSync(DB_BACKUP_DIR, { recursive: true });
        }
        fs.copyFileSync(destinationPath, safetyBackupPath);
    }

    fs.copyFileSync(sourcePath, destinationPath);

    return {
        sourcePath,
        destinationPath,
        safetyBackupPath,
        snapshot: getDatabaseFileSnapshot(destinationPath)
    };
};

const createPersistentStores = () => {
    const db = initializeDatabase();

    return {
        db,
        personalizationStore: new PersistentNamespaceStore(db, 'personalization'),
        attemptStore: new PersistentNamespaceStore(db, 'attempts'),
        incompleteSessionStore: new PersistentNamespaceStore(db, 'incomplete_sessions'),
        authUserStore: new PersistentNamespaceStore(db, 'auth_users'),
        authMetaStore: new PersistentNamespaceStore(db, 'auth_meta'),
        pendingSignupStore: new PersistentNamespaceStore(db, 'pending_signups'),
        authChallengeStore: new PersistentNamespaceStore(db, 'auth_challenges'),
        baselineRecordStore: new PersistentNamespaceStore(db, 'baseline_records'),
        getHealthSnapshot: () => getDatabaseHealthSnapshot(db, { dbPath: DB_PATH })
    };
};

module.exports = {
    DB_BACKUP_DIR,
    DB_PATH,
    DEFAULT_BACKUP_KEEP,
    LEGACY_DB_PATH,
    LEGACY_DB_SHM_PATH,
    LEGACY_DB_WAL_PATH,
    createPersistentStores,
    getDatabaseFileSnapshot,
    getDatabaseHealthSnapshot,
    listBackupFiles,
    pruneOldBackups,
    backupDatabase,
    backupDatabaseWithRotation,
    restoreDatabase
};
