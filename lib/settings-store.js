const fetchFn = global.fetch
    ? global.fetch.bind(global)
    : (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';
const SETTINGS_KEY = 'admin_config';

function envBoolean(name, fallback = false) {
    const raw = String(process.env[name] ?? '').trim().toLowerCase();
    if (!raw) return fallback;
    return ['1', 'true', 'yes', 'on'].includes(raw);
}

const defaultSettings = {
    pixel: {
        enabled: false,
        id: '',
        capi: {
            enabled: false,
            accessToken: '',
            testEventCode: ''
        },
        events: {
            page_view: true,
            quiz_view: true,
            lead: true,
            purchase: true,
            checkout: true
        }
    },
    utmfy: {
        enabled: envBoolean('UTMFY_ENABLED', false),
        endpoint: String(process.env.UTMFY_ENDPOINT || 'https://api.utmify.com.br/api-credentials/orders').trim(),
        apiKey: String(process.env.UTMFY_API_KEY || '').trim(),
        platform: String(process.env.UTMFY_PLATFORM || 'IfoodBag').trim() || 'IfoodBag'
    },
    pushcut: {
        enabled: false,
        pixCreatedUrl: '',
        pixCreatedUrl2: '',
        pixCreatedUrls: [],
        pixConfirmedUrl: '',
        pixConfirmedUrl2: '',
        pixConfirmedUrls: [],
        templates: {
            pixCreatedTitle: 'PIX gerado - {amount}',
            pixCreatedMessage: 'Novo PIX gerado para {name}. Pedido {orderId}.',
            pixConfirmedTitle: 'PIX pago - {amount}',
            pixConfirmedMessage: 'Pagamento confirmado para {name}. Pedido {orderId}.'
        }
    },
    features: {
        orderbump: true
    }
};

async function getSettings() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return defaultSettings;

    const endpoint = `${SUPABASE_URL}/rest/v1/app_settings?key=eq.${encodeURIComponent(SETTINGS_KEY)}&select=key,value`;

    const response = await fetchFn(endpoint, {
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) return defaultSettings;

    const rows = await response.json().catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) return defaultSettings;

    const value = rows[0]?.value || {};
    return {
        ...defaultSettings,
        ...value,
        pixel: {
            ...defaultSettings.pixel,
            ...(value.pixel || {}),
            capi: {
                ...defaultSettings.pixel.capi,
                ...(value.pixel?.capi || {})
            },
            events: {
                ...defaultSettings.pixel.events,
                ...(value.pixel?.events || {})
            }
        },
        utmfy: {
            ...defaultSettings.utmfy,
            ...(value.utmfy || {})
        },
        pushcut: {
            ...defaultSettings.pushcut,
            ...(value.pushcut || {}),
            pixCreatedUrls: Array.isArray(value.pushcut?.pixCreatedUrls)
                ? value.pushcut.pixCreatedUrls.slice(0, 2)
                : defaultSettings.pushcut.pixCreatedUrls,
            pixConfirmedUrls: Array.isArray(value.pushcut?.pixConfirmedUrls)
                ? value.pushcut.pixConfirmedUrls.slice(0, 2)
                : defaultSettings.pushcut.pixConfirmedUrls,
            templates: {
                ...defaultSettings.pushcut.templates,
                ...(value.pushcut?.templates || {})
            }
        },
        features: {
            ...defaultSettings.features,
            ...(value.features || {})
        }
    };
}

async function saveSettings(input) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return { ok: false, reason: 'missing_supabase_config' };

    const payload = {
        key: SETTINGS_KEY,
        value: input || {},
        updated_at: new Date().toISOString()
    };

    const endpoint = `${SUPABASE_URL}/rest/v1/app_settings`;

    const response = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify([payload])
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        return { ok: false, reason: 'supabase_error', detail };
    }

    return { ok: true };
}

module.exports = {
    getSettings,
    saveSettings,
    defaultSettings
};
