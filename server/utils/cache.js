let integrityOverviewCache = {
    data: null,
    expiry: 0
};

const invalidateIntegrityCache = () => {
    integrityOverviewCache.expiry = 0;
    console.log('[CACHE] Integrity overview cache invalidated');
};

const getIntegrityCache = () => integrityOverviewCache;

const setIntegrityCache = (data, ttl = 60000) => {
    integrityOverviewCache.data = data;
    integrityOverviewCache.expiry = Date.now() + ttl;
};

module.exports = {
    invalidateIntegrityCache,
    getIntegrityCache,
    setIntegrityCache
};
