const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const TEST_COMMANDS = [
    {
        label: 'smoke-test',
        args: ['backend/smoke-test.js']
    },
    {
        label: 'auth-integration-test',
        args: ['backend/auth-integration-test.js']
    },
    {
        label: 'validate-questions',
        args: ['backend/validate-questions.js']
    }
];

for (const command of TEST_COMMANDS) {
    process.stdout.write(`\n[tests] Running ${command.label}...\n`);
    const result = spawnSync(process.execPath, command.args, {
        cwd: ROOT_DIR,
        stdio: 'inherit',
        env: process.env
    });

    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
}

process.stdout.write('\n[tests] All checks passed.\n');
