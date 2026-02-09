const fetchFn = global.fetch
    ? global.fetch.bind(global)
    : (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const { getSettings } = require('./settings-store');

const WOO_EVENTS = new Set(['checkout', 'pix_created', 'pix_confirmed', 'purchase']);

function normalizeEventName(value) {
    return String(value || '').trim().toLowerCase();
}

function isWooEndpoint(endpoint) {
    return /webhooks\/woocommerce/i.test(endpoint || '');
}

function isUtmifyEndpoint(endpoint) {
    return /utmify\.com\.br/i.test(endpoint || '');
}

function pickText(value) {
    const text = String(value || '').trim();
    return text ? text : '';
}

function splitName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first: '', last: '' };
    if (parts.length === 1) return { first: parts[0], last: '' };
    return { first: parts[0], last: parts.slice(1).join(' ') };
}

function toPrice(value) {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Number(num.toFixed(2)));
}

function buildWooPayload(eventName, payload) {
    const personal = payload?.personal || {};
    const address = payload?.address || {};
    const shipping = payload?.shipping || {};
    const bump = payload?.bump || {};
    const utm = payload?.utm || {};

    const orderId =
        pickText(payload?.txid) ||
        pickText(payload?.pixTxid) ||
        pickText(payload?.orderId) ||
        pickText(payload?.order_id) ||
        pickText(payload?.sessionId) ||
        `lead-${Date.now()}`;

    const status = ['pix_confirmed', 'purchase'].includes(eventName) ? 'completed' : 'pending';

    const shippingPrice = toPrice(shipping.price);
    const bumpPrice = toPrice(bump.price);
    const fallbackTotal = toPrice(shippingPrice + bumpPrice);
    const totalAmount = toPrice(payload?.amount || payload?.pixAmount || fallbackTotal);

    const nameParts = splitName(personal.name || payload?.client_name || '');

    const lineItems = [];
    if (shippingPrice > 0) {
        lineItems.push({
            id: 1,
            name: shipping.name || 'Frete Bag iFood',
            quantity: 1,
            subtotal: shippingPrice.toFixed(2),
            total: shippingPrice.toFixed(2)
        });
    }
    if (bumpPrice > 0) {
        lineItems.push({
            id: 2,
            name: bump.title || 'Seguro Bag',
            quantity: 1,
            subtotal: bumpPrice.toFixed(2),
            total: bumpPrice.toFixed(2)
        });
    }

    const meta = [];
    const utmPairs = {
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_term: utm.utm_term,
        utm_content: utm.utm_content,
        gclid: utm.gclid,
        fbclid: utm.fbclid,
        ttclid: utm.ttclid
    };
    Object.entries(utmPairs).forEach(([key, value]) => {
        if (value) meta.push({ key, value: String(value) });
    });
    if (payload?.sessionId) meta.push({ key: 'session_id', value: String(payload.sessionId) });
    if (payload?.txid || payload?.pixTxid) meta.push({ key: 'pix_txid', value: String(payload.txid || payload.pixTxid) });
    meta.push({ key: 'event_name', value: eventName });

    return {
        id: orderId,
        status,
        currency: 'BRL',
        total: totalAmount.toFixed(2),
        payment_method: 'pix',
        payment_method_title: 'PIX',
        date_created: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        billing: {
            first_name: nameParts.first,
            last_name: nameParts.last,
            email: pickText(personal.email || payload?.client_email),
            phone: pickText(personal.phoneDigits || personal.phone || payload?.client_phone),
            address_1: pickText(address.street || address.streetLine || payload?.customer?.address?.street),
            address_2: pickText(address.complement || payload?.customer?.address?.complement),
            city: pickText(address.city || payload?.customer?.address?.city),
            state: pickText(address.state || payload?.customer?.address?.state),
            postcode: pickText(address.cep || payload?.customer?.address?.zipCode),
            country: 'BR'
        },
        line_items: lineItems,
        meta_data: meta
    };
}

function buildRequestBody(endpoint, eventName, payload) {
    const normalized = normalizeEventName(eventName);
    if (isWooEndpoint(endpoint)) {
        if (!WOO_EVENTS.has(normalized)) {
            return { skip: 'unsupported_event' };
        }
        return { body: buildWooPayload(normalized, payload) };
    }
    return { body: { event: normalized || 'event', payload } };
}

async function sendUtmfy(eventName, payload) {
    const settings = await getSettings();
    const cfg = settings.utmfy || {};

    if (!cfg.enabled || !cfg.endpoint) {
        return { ok: false, reason: 'disabled' };
    }

    const endpoint = String(cfg.endpoint || '').trim();
    const { body, skip } = buildRequestBody(endpoint, eventName, payload || {});
    if (skip) {
        return { ok: true, skipped: true, reason: skip };
    }

    const headers = {
        'Content-Type': 'application/json'
    };
    if (cfg.apiKey) {
        if (isUtmifyEndpoint(endpoint)) {
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
