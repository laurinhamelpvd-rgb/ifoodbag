const { ensureAllowedRequest } = require('../../lib/request-guard');
const { requireAdmin } = require('../../lib/admin-auth');
const { sendUtmfy } = require('../../lib/utmfy');

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    if (!ensureAllowedRequest(req, res, { requireSession: false })) {
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    if (!requireAdmin(req, res)) return;

    const amount = 56.10;
    const payload = {
        event: 'purchase',
        amount,
        currency: 'BRL',
        order_id: `manual-${Date.now()}`,
        source: 'admin_manual',
        created_at: new Date().toISOString()
    };

    const result = await sendUtmfy('purchase', payload);

    if (!result.ok) {
        res.status(400).json({ error: 'Falha ao enviar venda.', detail: result });
        return;
    }

    res.status(200).json({ ok: true, amount });
};
