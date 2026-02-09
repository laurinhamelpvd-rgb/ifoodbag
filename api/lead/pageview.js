const { ensureAllowedRequest } = require('../../lib/request-guard');
const { upsertPageview } = require('../../lib/pageviews-store');
const { enqueueDispatch, processDispatchQueue } = require('../../lib/dispatch-queue');

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    if (!ensureAllowedRequest(req, res, { requireSession: true })) {
        return;
    }

    let body = {};
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    } catch (_error) {
        res.status(400).json({ ok: false, error: 'JSON invalido.' });
        return;
    }

    const result = await upsertPageview(body.sessionId, body.page);
    if (!result.ok && result.reason === 'missing_supabase_config') {
        res.status(202).json({ ok: false, reason: result.reason });
        return;
    }
    if (!result.ok) {
        res.status(502).json({ ok: false, reason: result.reason, detail: result.detail || '' });
        return;
    }

    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = typeof forwarded === 'string' && forwarded
        ? forwarded.split(',')[0].trim()
        : req.socket?.remoteAddress || '';

    enqueueDispatch({
        channel: 'utmfy',
        eventName: 'page_view',
        dedupeKey: `pageview:${body.sessionId || ''}:${body.page || ''}`,
        payload: {
        event: 'page_view',
        page: body.page || '',
        sessionId: body.sessionId || '',
        sourceUrl: body.sourceUrl || '',
        utm: body.utm || {},
        metadata: {
            received_at: new Date().toISOString(),
            user_agent: req.headers['user-agent'] || '',
            referrer: req.headers['referer'] || '',
            client_ip: clientIp
        }
        }
    }).then(() => processDispatchQueue(8)).catch(() => null);

    res.status(200).json({ ok: true });
};
