const fetchFn = global.fetch
    ? global.fetch.bind(global)
    : (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const { getSettings } = require('./settings-store');

function resolvePushcutUrl(kind, cfg = {}) {
    if (kind === 'pix_created') return String(cfg.pixCreatedUrl || '').trim();
    if (kind === 'pix_confirmed') return String(cfg.pixConfirmedUrl || '').trim();
    return '';
}

async function sendPushcut(kind, payload = {}) {
    const settings = await getSettings();
    const cfg = settings.pushcut || {};
    const enabled = cfg.enabled !== false;

    if (!enabled) {
        return { ok: false, reason: 'disabled' };
    }

    const url = resolvePushcutUrl(kind, cfg);
    if (!url) {
        return { ok: false, reason: 'missing_url' };
    }

    const body = {
        event: kind,
        title: kind === 'pix_confirmed' ? 'Venda confirmada' : 'PIX gerado',
        message: kind === 'pix_confirmed' ? 'Pagamento confirmado via PIX.' : 'Novo PIX gerado no checkout.',
        payload
    };

    const response = await fetchFn(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        return { ok: false, reason: 'pushcut_error', detail };
    }

    return { ok: true };
}

module.exports = {
    sendPushcut
};
