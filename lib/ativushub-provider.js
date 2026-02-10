const { removeBasicPrefix, toText } = require('./payment-gateway-config');

const fetchFn = global.fetch
    ? global.fetch.bind(global)
    : (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const SELLER_CACHE_TTL_MS = Number(process.env.ATIVUSHUB_SELLER_CACHE_TTL_MS || 6 * 60 * 60 * 1000);
const STATUS_USER_AGENT =
    process.env.ATIVUSHUB_STATUS_USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

const sellerCache = new Map();

function pickSellerId(payload) {
    if (!payload || typeof payload !== 'object') return '';
    return (
        payload?.dados_seller?.id_seller ||
        payload?.dados_seller?.idSeller ||
        payload?.dados_seller?.seller_id ||
        payload?.dados_seller?.empresa?.id ||
        payload?.id_seller ||
        payload?.idSeller ||
        ''
    );
}

function normalizeAuthCandidates(config = {}) {
    const token = removeBasicPrefix(config.apiKeyBase64 || '');
    const raw = removeBasicPrefix(config.apiKey || '');
    const candidates = [
        token ? `Basic ${token}` : '',
        token,
        raw ? `Basic ${raw}` : '',
        raw
    ].filter(Boolean);
    return Array.from(new Set(candidates));
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchFn(url, {
            ...options,
            signal: controller.signal
        });
        const data = await response.json().catch(() => ({}));
        return { response, data };
    } finally {
        clearTimeout(timeout);
    }
}

function buildHeaders(authorization) {
    return {
        Authorization: authorization,
        'Content-Type': 'application/json',
        Accept: '*/*',
        'User-Agent': STATUS_USER_AGENT
    };
}

function resolveHostAndProtocol(req) {
    const host = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || 'localhost:3000').trim();
    const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').trim().toLowerCase();
    const protocol = forwardedProto === 'http' || forwardedProto === 'https' ? forwardedProto : 'https';
    return { host, protocol };
}

function resolvePostbackUrl(req, config = {}) {
    if (toText(config.postbackUrl)) return toText(config.postbackUrl);
    const { host, protocol } = resolveHostAndProtocol(req);
    const token = toText(config.webhookToken);
    const params = new URLSearchParams();
    params.set('gateway', 'ativushub');
    if (token) params.set('token', token);
    return `${protocol}://${host}/api/pix/webhook?${params.toString()}`;
}

async function requestCreateTransaction(config = {}, payload = {}) {
    const baseUrl = String(config.baseUrl || '').replace(/\/+$/, '');
    const timeoutMs = Number(config.timeoutMs || 12000);
    const endpoint = `${baseUrl}/v1/gateway/api/`;
    const authVariants = normalizeAuthCandidates(config);
    let last = null;

    for (const authorization of authVariants) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const result = await fetchJsonWithTimeout(endpoint, {
                method: 'POST',
                headers: buildHeaders(authorization),
                body: JSON.stringify(payload || {})
            }, timeoutMs);
            last = result;

            if (result.response?.ok) return result;

            const status = Number(result.response?.status || 0);
            const retryable = status === 408 || status === 429 || status >= 500;
            if (retryable && attempt === 0) {
                await new Promise((resolve) => setTimeout(resolve, 500));
                continue;
            }
            // Try next auth variant when auth fails.
            if (status === 401 || status === 403) break;
            return result;
        }
    }

    return last || { response: { ok: false, status: 500 }, data: { error: 'request_failed' } };
}

async function requestTransactionStatus(config = {}, txid = '') {
    const cleanTxid = String(txid || '').trim();
    if (!cleanTxid) {
        return { response: { ok: false, status: 400 }, data: { error: 'missing_txid' } };
    }
    const baseUrl = String(config.baseUrl || '').replace(/\/+$/, '');
    const timeoutMs = Number(config.timeoutMs || 12000);
    const endpoint =
        `${baseUrl}/s1/getTransaction/api/getTransactionStatus.php` +
        `?id_transaction=${encodeURIComponent(cleanTxid)}`;
    const authVariants = normalizeAuthCandidates(config);
    let last = null;

    for (const authorization of authVariants) {
        const result = await fetchJsonWithTimeout(endpoint, {
            method: 'GET',
            headers: buildHeaders(authorization)
        }, timeoutMs);
        last = result;
        const status = Number(result.response?.status || 0);
        if (result.response?.ok || status === 404) return result;
        if (status !== 401 && status !== 403) return result;
    }

    return last || { response: { ok: false, status: 500 }, data: { error: 'status_failed' } };
}

async function getSellerId(config = {}) {
    const configured = toText(config.sellerId);
    if (configured) return configured;

    const key = `${toText(config.baseUrl)}|${removeBasicPrefix(config.apiKeyBase64 || '')}|${removeBasicPrefix(config.apiKey || '')}`;
    const now = Date.now();
    const cached = sellerCache.get(key);
    if (cached?.value && cached.expiresAt > now) {
        return cached.value;
    }
    if (cached?.inflight) {
        return cached.inflight;
    }

    const inflight = (async () => {
        const baseUrl = String(config.baseUrl || '').replace(/\/+$/, '');
        const timeoutMs = Number(config.timeoutMs || 12000);
        const authVariants = normalizeAuthCandidates(config);
        let last = null;

        for (const authorization of authVariants) {
            const result = await fetchJsonWithTimeout(`${baseUrl}/s1/getCompany/`, {
                method: 'GET',
                headers: buildHeaders(authorization)
            }, timeoutMs);
            last = result;

            if (result.response?.ok) {
                const sellerId = pickSellerId(result.data);
                if (!sellerId) {
                    throw new Error('Seller ID not found at AtivusHUB.');
                }
                sellerCache.set(key, {
                    value: sellerId,
                    expiresAt: Date.now() + SELLER_CACHE_TTL_MS,
                    inflight: null
                });
                return sellerId;
            }

            const status = Number(result.response?.status || 0);
            if (status !== 401 && status !== 403) {
                break;
            }
        }

        const status = Number(last?.response?.status || 0);
        throw new Error(`Failed to fetch seller at AtivusHUB (${status || 'unknown'}).`);
    })();

    sellerCache.set(key, { ...(cached || {}), inflight });

    try {
        return await inflight;
    } finally {
        const latest = sellerCache.get(key) || {};
        sellerCache.set(key, { ...latest, inflight: null });
    }
}

module.exports = {
    requestCreateTransaction,
    requestTransactionStatus,
    getSellerId,
    resolvePostbackUrl,
    fetchJsonWithTimeout,
    normalizeAuthCandidates
};
