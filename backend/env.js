const toSafeString = (value) => String(value || '').trim();

const parseBooleanEnv = (value, defaultValue = false) => {
    const normalized = toSafeString(value).toLowerCase();
    if (!normalized) return defaultValue;
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return defaultValue;
};

const parseListEnv = (value) => toSafeString(value)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const STARTUP_CONFIG = {
    accessTokenSecret: toSafeString(process.env.MOCKLY_ACCESS_TOKEN_SECRET),
    persistenceDriver: toSafeString(process.env.MOCKLY_PERSISTENCE_DRIVER).toLowerCase() || 'json-kv',
    databaseUrl: toSafeString(process.env.DATABASE_URL),
    adminEmails: parseListEnv(process.env.MOCKLY_ADMIN_EMAILS),
    demoBootstrapEnabled: parseBooleanEnv(process.env.MOCKLY_ENABLE_DEMO_BOOTSTRAP, false)
};

const validateStartupEnvironment = () => {
    const errors = [];

    if (!STARTUP_CONFIG.accessTokenSecret) {
        errors.push('MOCKLY_ACCESS_TOKEN_SECRET is required. Set a stable secret in .env before starting the server.');
    }

    if (STARTUP_CONFIG.persistenceDriver === 'prisma' && !STARTUP_CONFIG.databaseUrl) {
        errors.push('DATABASE_URL is required when MOCKLY_PERSISTENCE_DRIVER=prisma.');
    }

    if (errors.length > 0) {
        throw new Error(`Startup configuration invalid:\n- ${errors.join('\n- ')}`);
    }
};

module.exports = {
    STARTUP_CONFIG,
    validateStartupEnvironment
};
