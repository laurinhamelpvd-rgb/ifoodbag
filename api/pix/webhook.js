const { WEBHOOK_TOKEN } = require('../../lib/ativus');
const { updateLeadByPixTxid } = require('../../lib/lead-store');
const { sendUtmfy } = require('../../lib/utmfy');
const { sendPushcut } = require('../../lib/pushcut');
const { sendPixelServerEvent } = require('../../lib/pixel-capi');
const { getAtivusTxid, getAtivusStatus, isAtivusPaidStatus } = require('../../lib/ativus-status');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ status: 'method_not_allowed' });
        return;
    }
    const token = req.query?.token;
    if (token !== WEBHOOK_TOKEN) {
        res.status(401).json({ status: 'unauthorized' });
        return;
    }

    let body = {};
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    } catch (_error) {
        body = {};
    }

    const txid = getAtivusTxid(body);
    const statusRaw = getAtivusStatus(body);
    const isPaid = isAtivusPaidStatus(statusRaw) || body.paid === true || body.isPaid === true;

    if (txid && isPaid) {
        const update = await updateLeadByPixTxid(txid, { last_event: 'pix_confirmed', stage: 'pix' }).catch(() => ({ ok: false, count: 0 }));
        if (update?.ok && Number(update.count || 0) > 0) {
            const amount = Number(body?.amount || body?.deposito_liquido || body?.cash_out_liquido || 0);

            sendUtmfy('pix_confirmed', {
                event: 'pix_confirmed',
                txid,
                status: statusRaw || 'confirmed',
                amount,
                payload: body
            }).catch(() => null);

            sendUtmfy('purchase', {
                event: 'purchase',
                txid,
                status: statusRaw || 'confirmed',
                amount,
                currency: 'BRL',
                payload: body
            }).catch(() => null);

            sendPushcut('pix_confirmed', {
                txid,
                status: statusRaw || 'confirmed',
                amount
            }).catch(() => null);

            sendPixelServerEvent('Purchase', {
                amount,
                client_email: body?.client_email,
                client_document: body?.client_document
            }, req).catch(() => null);
        }
    }

    res.status(200).json({ status: 'success' });
};
