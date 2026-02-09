const { WEBHOOK_TOKEN } = require('../../lib/ativus');
const { updateLeadByPixTxid } = require('../../lib/lead-store');
const { sendUtmfy } = require('../../lib/utmfy');

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

    const pick = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
    const txid = pick(
        body.idTransaction,
        body.idtransaction,
        body.transaction_id,
        body.transactionId,
        body.txid,
        body?.data?.idTransaction,
        body?.data?.idtransaction,
        body?.data?.transaction_id,
        body?.data?.transactionId,
        body?.data?.txid,
        body?.payment?.idTransaction,
        body?.payment?.idtransaction,
        body?.pix?.idTransaction,
        body?.pix?.txid
    );

    const statusRaw = String(
        pick(
            body.status_transaction,
            body.status,
            body.statusTransaction,
            body.transaction_status,
            body?.data?.status,
            body?.data?.status_transaction,
            body?.payment?.status
        ) || ''
    ).toLowerCase();

    const isPaid =
        /paid|approved|confirm|completed|success|conclu|aprov/.test(statusRaw) ||
        body.paid === true ||
        body.isPaid === true;

    if (txid && isPaid) {
        updateLeadByPixTxid(txid, { last_event: 'pix_confirmed', stage: 'pix' }).catch(() => null);
        sendUtmfy('pix_confirmed', {
            event: 'pix_confirmed',
            txid,
            status: statusRaw || 'confirmed',
            payload: body
        }).catch(() => null);
    }

    res.status(200).json({ status: 'success' });
};
