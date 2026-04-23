const registerSystemRoutes = ({
    app,
    requireAuth,
    requireAdmin,
    getHealthSnapshot,
    getPrismaDiagnostics,
    usePrismaPersistence,
    baselineRecordStore,
    personalizationStore,
    authUserStore,
    attemptStore,
    incompleteSessionStore
}) => {
    app.get('/api/health', (req, res) => {
        res.json({
            ok: true,
            service: 'mockly-local-api',
            version: '1.0.0',
            timestamp: new Date().toISOString()
        });
    });

    app.get('/api/db/health', requireAuth, requireAdmin, async (req, res) => {
        try {
            const snapshot = getHealthSnapshot();
            let persistenceDiagnostics = {
                driver: usePrismaPersistence ? 'prisma' : 'json-kv'
            };

            if (usePrismaPersistence) {
                persistenceDiagnostics = {
                    ...persistenceDiagnostics,
                    ...(await getPrismaDiagnostics())
                };
            }

            return res.json({
                ok: true,
                database: snapshot,
                diagnostics: {
                    baselineRecords: baselineRecordStore.size,
                    activeProfiles: usePrismaPersistence
                        ? Number(persistenceDiagnostics.activeProfiles || 0)
                        : personalizationStore.size,
                    activeUsers: usePrismaPersistence
                        ? Number(persistenceDiagnostics.activeUsers || 0)
                        : authUserStore.size,
                    attemptBuckets: usePrismaPersistence
                        ? Number(persistenceDiagnostics.attemptBuckets || 0)
                        : attemptStore.size,
                    incompleteSessions: usePrismaPersistence
                        ? Number(persistenceDiagnostics.incompleteSessions || 0)
                        : incompleteSessionStore.size,
                    persistence: persistenceDiagnostics
                }
            });
        } catch (error) {
            return res.status(500).json({
                ok: false,
                message: error.message || 'Database diagnostics unavailable.'
            });
        }
    });
};

module.exports = {
    registerSystemRoutes
};
