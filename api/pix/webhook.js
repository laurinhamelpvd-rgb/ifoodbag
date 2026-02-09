const { WEBHOOK_TOKEN } = require('../../lib/ativus');
const { updateLeadByPixTxid } = require('../../lib/lead-store');
const { enqueueDispatch, processDispatchQueue } = require('../../lib/dispatch-queue');
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
            const clientIp = req?.headers?.['x-forwarded-for']
                ? String(req.headers['x-forwarded-for']).split(',')[0].trim()
                : req?.socket?.remoteAddress || '';
            const userAgent = req?.headers?.['user-agent'] || '';

            enqueueDispatch({
                channel: 'utmfy',
                eventName: 'pix_confirmed',
                dedupeKey: `utmfy:pix_confirmed:${txid}`,
                payload: {
                event: 'pix_confirmed',
                txid,
                status: statusRaw || 'confirmed',
                amount,
                payload: body
                }
            }).then(() => processDispatchQueue(10)).catch(() => null);

            enqueueDispatch({
                channel: 'utmfy',
                eventName: 'purchase',
                dedupeKey: `utmfy:purchase:${txid}`,
                payload: {
                event: 'purchase',
                txid,
                status: statusRaw || 'confirmed',
                amount,
                currency: 'BRL',
                payload: body
                }
            }).then(() => processDispatchQueue(10)).catch(() => null);

            enqueueDispatch({
                channel: 'pushcut',
                kind: 'pix_confirmed',
                dedupeKey: `pushcut:pix_confirmed:${txid}`,
                payload: { txid, status: statusRaw || 'confirmed', amount }
            }).then(() => processDispatchQueue(10)).catch(() => null);

            enqueueDispatch({
                channel: 'pixel',
                eventName: 'Purchase',
                dedupeKey: `pixel:purchase:${txid}`,
                payload: {
                    amount,
                    client_email: body?.client_email,
                    client_document: body?.client_document,
                    client_ip: clientIp,
                    user_agent: userAgent
                }
            }).then(() => processDispatchQueue(10)).catch(() => null);
        }
    }

    res.status(200).json({ status: 'success' });
};
