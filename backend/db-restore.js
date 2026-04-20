const path = require('path');
const { restoreDatabase } = require('./db');

const run = () => {
    try {
        const sourceArg = String(process.argv[2] || '').trim();
        const destinationArg = String(process.argv[3] || '').trim();
        if (!sourceArg) {
            throw new Error('Usage: npm run db:restore -- <backup-file-path> [destination-db-path]');
        }

        const sourcePath = path.resolve(sourceArg);
        const destinationPath = destinationArg ? path.resolve(destinationArg) : undefined;
        const result = restoreDatabase({ sourcePath, destinationPath });

        // eslint-disable-next-line no-console
        console.log(JSON.stringify({
            ok: true,
            sourcePath: result.sourcePath,
            destinationPath: result.destinationPath,
            safetyBackupPath: result.safetyBackupPath,
            fileSizeBytes: result.snapshot.fileSizeBytes,
            modifiedAt: result.snapshot.modifiedAt
        }, null, 2));

        process.exitCode = 0;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(JSON.stringify({
            ok: false,
            message: error.message || 'Restore failed'
        }, null, 2));
        process.exitCode = 1;
    }
};

run();
