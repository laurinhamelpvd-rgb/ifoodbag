const fetchFn = global.fetch
    ? global.fetch.bind(global)
    : (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const { getSettings } = require('./settings-store');

function normalizeEventName(value) {
    return String(value || '').trim().toLowerCase();
}

function isUtmifyOrdersEndpoint(endpoint) {
    return /api-credentials\/orders/i.test(endpoint || '');
}

function isUtmifyDomain(endpoint) {
    return /utmify\.com\.br/i.test(endpoint || '');
}

function pickText(value) {
    const text = String(value || '').trim();
    return text ? text : '';
}

function toIntCents(value) {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return 0;
    return Math.round(num * 100);
}

function toIsoUtc(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mi = String(date.getUTCMinutes()).padStart(2, '0');
    const ss = String(date.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function splitName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { name: '' };
    return { name: parts.join(' ') };
}

function resolveOrderStatus(eventName, payload) {
    if (payload?.status) return String(payload.status).toLowerCase();
    if (eventName === 'pix_confirmed' || eventName === 'purchase') return 'paid';
    if (eventName === 'pix_created' || eventName === 'checkout') return 'waiting_payment';
    if (eventName === 'pix_refunded') return 'refunded';
    if (eventName === 'pix_failed') return 'refused';
    return 'waiting_payment';
}

function buildUtmfyOrder(eventName, payload = {}, cfg = {}) {
    const personal = payload.personal || {};
    const address = payload.address || {};
    const shipping = payload.shipping || {};
    const bump = payload.bump || {};
    const utm = payload.utm || {};
    const tracking = payload.trackingParameters || {};

    const orderId =
        pickText(payload.orderId) ||
        pickText(payload.txid) ||
        pickText(payload.pixTxid) ||
        pickText(payload.sessionId) ||
        `order_${Date.now()}`;

    const status = resolveOrderStatus(eventName, payload);
    const createdAt = toIsoUtc(payload.createdAt || payload.pixCreatedAt || payload.data_registro || payload.data_transacao || Date.now());
    const approvedDate = status === 'paid' ? toIsoUtc(payload.approvedDate || payload.approvedAt || Date.now()) : null;

    const shippingPrice = Number(shipping.price || 0);
    const bumpPrice = Number(bump.price || 0);
    const totalAmount = Number(payload.amount || payload.pixAmount || (shippingPrice + bumpPrice) || 0);
    const totalPriceInCents = toIntCents(totalAmount);

    const customerName = splitName(personal.name || payload.client_name || payload.customer?.name || '').name;
    const customerEmail = pickText(personal.email || payload.client_email || payload.customer?.email);
    const customerPhone = pickText(personal.phoneDigits || personal.phone || payload.client_phone || payload.customer?.phone);
    const customerDoc = pickText(personal.cpf || payload.client_document || payload.customer?.cpf);

    const products = [];
    if (shippingPrice > 0) {
        products.push({
            id: shipping.id || 'frete',
            name: shipping.name || 'Frete Bag iFood',
            planId: null,
            planName: null,
            quantity: 1,
            priceInCents: toIntCents(shippingPrice)
        });
    }
    if (bumpPrice > 0) {
        products.push({
            id: 'seguro_bag',
            name: bump.title || 'Seguro Bag',
            planId: null,
            planName: null,
            quantity: 1,
            priceInCents: toIntCents(bumpPrice)
        });
    }
    if (products.length === 0) {
        products.push({
            id: 'frete',
            name: 'Frete Bag iFood',
            planId: null,
            planName: null,
            quantity: 1,
            priceInCents: totalPriceInCents
        });
    }

    return {
        orderId,
        platform: cfg.platform || 'IfoodBag',
        paymentMethod: 'pix',
        status,
        createdAt,
        approvedDate,
        refundedAt: null,
        customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone || null,
            document: customerDoc || null,
            country: 'BR',
            ip: pickText(payload.client_ip || payload.ip || payload.metadata?.client_ip)
        },
        products,
        trackingParameters: {
            src: pickText(tracking.src || utm.src),
            sck: pickText(tracking.sck || utm.sck),
            utm_source: pickText(tracking.utm_source || utm.utm_source),
            utm_campaign: pickText(tracking.utm_campaign || utm.utm_campaign),
            utm_medium: pickText(tracking.utm_medium || utm.utm_medium),
            utm_content: pickText(tracking.utm_content || utm.utm_content),
            utm_term: pickText(tracking.utm_term || utm.utm_term)
        },
        commission: {
            totalPriceInCents,
            gatewayFeeInCents: 0,
            userCommissionInCents: totalPriceInCents,
            currency: 'BRL'
        },
        isTest: payload.isTest === true
    };
}

function buildRequestBody(endpoint, eventName, payload, cfg) {
    if (isUtmifyOrdersEndpoint(endpoint)) {
        return { body: buildUtmfyOrder(eventName, payload, cfg) };
    }
    return { body: { event: normalizeEventName(eventName) || 'event', payload } };
}

async function sendUtmfy(eventName, payload) {
    const settings = await getSettings();
    const cfg = settings.utmfy || {};

    if (!cfg.enabled || !cfg.endpoint) {
        return { ok: false, reason: 'disabled' };
    }

    const endpoint = String(cfg.endpoint || '').trim();
    const { body } = buildRequestBody(endpoint, eventName, payload || {}, cfg);

    const headers = {
        'Content-Type': 'application/json'
    };
    if (cfg.apiKey) {
        if (isUtmifyDomain(endpoint)) {
            headers['x-api-token'] = cfg.apiKey;
        } else {
            headers.Authorization = `Bearer ${cfg.apiKey}`;
        }
    }

    const response = await fetchFn(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        return { ok: false, reason: 'utmfy_error', detail };
    }

    return { ok: true };
}

module.exports = {
    sendUtmfy
};
