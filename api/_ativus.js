const BASE_URL = process.env.ATIVUSHUB_BASE_URL || 'https://api.ativushub.com.br';
const WEBHOOK_TOKEN = process.env.ATIVUSHUB_WEBHOOK_TOKEN || 'dev';

const API_KEY_B64 =
    process.env.ATIVUSHUB_API_KEY_BASE64 ||
    (process.env.ATIVUSHUB_API_KEY
        ? Buffer.from(process.env.ATIVUSHUB_API_KEY, 'utf8').toString('base64')
        : '');

const fetchFn = global.fetch
    ? global.fetch.bind(global)
    : (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const authHeaders = {
    Authorization: `Basic ${API_KEY_B64}`,
    'Content-Type': 'application/json'
};

let cachedSellerId = null;

function sanitizeDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function extractIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || '';
}

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

async function getSellerId() {
    if (process.env.ATIVUSHUB_SELLER_ID) return process.env.ATIVUSHUB_SELLER_ID;
    if (cachedSellerId) return cachedSellerId;

    const response = await fetchFn(`${BASE_URL}/s1/getCompany/`, {
        method: 'GET',
        headers: authHeaders
    });
    const data = await response.json().catch(() => ({}));
    const sellerId = pickSellerId(data);
    if (!sellerId) {
        throw new Error('ID do seller não encontrado na AtivusHUB.');
    }
    cachedSellerId = sellerId;
    return sellerId;
}

function resolvePostbackUrl(req) {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const token = WEBHOOK_TOKEN;
    if (process.env.ATIVUSHUB_POSTBACK_URL) return process.env.ATIVUSHUB_POSTBACK_URL;
    return `https://${host}/api/pix/webhook?token=${token}`;
}

module.exports = {
    BASE_URL,
    WEBHOOK_TOKEN,
    API_KEY_B64,
    fetchFn,
    authHeaders,
    sanitizeDigits,
    extractIp,
    getSellerId,
    resolvePostbackUrl
};
