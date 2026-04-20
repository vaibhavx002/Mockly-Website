const path = require('path');
const { backupDatabaseWithRotation, DB_BACKUP_DIR, DEFAULT_BACKUP_KEEP } = require('./db');

const run = async () => {
    try {
        const destinationArg = String(process.argv[2] || '').trim();
        const destinationPath = destinationArg
            ? path.resolve(destinationArg)
            : '';
        const keep = Math.max(1, Number.parseInt(String(process.env.MOCKLY_DB_BACKUP_KEEP || DEFAULT_BACKUP_KEEP), 10) || DEFAULT_BACKUP_KEEP);

        const result = await backupDatabaseWithRotation({
            destinationPath: destinationPath || undefined,
            keep
        });

        // eslint-disable-next-line no-console
        console.log(JSON.stringify({
            ok: true,
            backupDirectory: DB_BACKUP_DIR,
            sourcePath: result.backup.sourcePath,
            destinationPath: result.backup.destinationPath,
            fileSizeBytes: result.backup.snapshot.fileSizeBytes,
            modifiedAt: result.backup.snapshot.modifiedAt,
            keep,
            deletedCount: result.rotation.deletedCount,
            totalBackupsAfter: result.rotation.totalAfter
        }, null, 2));

        process.exitCode = 0;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(JSON.stringify({
            ok: false,
            message: error.message || 'Backup failed'
        }, null, 2));
        process.exitCode = 1;
    }
};

void run();
