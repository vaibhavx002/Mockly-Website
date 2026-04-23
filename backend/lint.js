const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.join(__dirname, '..');
const DIRECTORIES_TO_SCAN = [
    path.join(ROOT_DIR, 'backend'),
    path.join(ROOT_DIR, 'frontend')
];
const IGNORED_FILE_NAMES = new Set(['server_temp.js', 'server_test.js']);

const collectJavaScriptFiles = (directoryPath) => {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    const files = [];

    entries.forEach((entry) => {
        const resolvedPath = path.join(directoryPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectJavaScriptFiles(resolvedPath));
            return;
        }

        if (!entry.isFile()) return;
        if (path.extname(entry.name).toLowerCase() !== '.js') return;
        if (IGNORED_FILE_NAMES.has(entry.name)) return;
        files.push(resolvedPath);
    });

    return files;
};

const filesToCheck = DIRECTORIES_TO_SCAN
    .flatMap((directoryPath) => collectJavaScriptFiles(directoryPath))
    .sort((left, right) => left.localeCompare(right));

let hasFailure = false;

filesToCheck.forEach((filePath) => {
    try {
        const source = fs.readFileSync(filePath, 'utf8');
        new vm.Script(source, { filename: filePath });
    } catch (error) {
        hasFailure = true;
        process.stderr.write(`${filePath}\n${error.message}\n`);
    }
});

if (!hasFailure) {
    process.stdout.write(`Syntax checks passed for ${filesToCheck.length} files.\n`);
}

process.exit(hasFailure ? 1 : 0);
