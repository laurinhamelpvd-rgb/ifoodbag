const { upsertLead } = require('../../lib/lead-store');
const { ensureAllowedRequest } = require('../../lib/request-guard');
const { sendUtmfy } = require('../../lib/utmfy');

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
    } catch (error) {
        res.status(400).json({ ok: false, error: 'Invalid JSON body' });
        return;
    }

    try {
        const safePayload = {
            sessionId: body.sessionId || body.session_id || '',
            event: body.event || '',
            stage: body.stage || '',
            page: body.page || '',
            sourceUrl: body.sourceUrl || '',
            utm: body.utm || {},
            shipping: body.shipping
                ? {
                    id: body.shipping.id,
                    name: body.shipping.name,
                    price: body.shipping.price
                }
                : undefined,
            amount: body.amount || undefined,
            bump: body.bump
                ? { selected: body.bump.selected, price: body.bump.price }
                : undefined,
            pix: body.pix
                ? { idTransaction: body.pix.idTransaction, amount: body.pix.amount }
                : undefined,
            address: body.address ? { cep: body.address.cep } : undefined
        };

        sendUtmfy(body.event || 'lead_event', safePayload).catch(() => null);

        const result = await upsertLead(body, req);

        if (!result.ok && (result.reason === 'missing_supabase_config' || result.reason === 'skipped_no_data')) {
            res.status(202).json({ ok: false, reason: result.reason });
            return;
        }

        if (!result.ok) {
            res.status(502).json({ ok: false, reason: result.reason, detail: result.detail || '' });
            return;
        }

        res.status(200).json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || String(error) });
    }
};
