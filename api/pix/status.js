const { ensureAllowedRequest } = require('../../lib/request-guard');
const { getTransactionStatusByIdTransaction } = require('../../lib/ativus');
const {
    getAtivusStatus,
    isAtivusPaidStatus,
    isAtivusRefundedStatus,
    isAtivusRefusedStatus,
    mapAtivusStatusToUtmify
} = require('../../lib/ativus-status');
const { getLeadByPixTxid, getLeadBySessionId, updateLeadByPixTxid, updateLeadBySessionId } = require('../../lib/lead-store');

function asObject(input) {
    return input && typeof input === 'object' && !Array.isArray(input) ? input : {};
}

function toIsoDate(value) {
    if (!value && value !== 0) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
    if (typeof value === 'number') {
        const ms = value > 1e12 ? value : value * 1000;
        const d = new Date(ms);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    const str = String(value || '').trim();
    if (!str) return null;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
        const d = new Date(str.replace(' ', 'T'));
        if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeStatus(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/-+/g, '_');
}

function mapUtmifyStatusToFrontend(status) {
    const normalized = normalizeStatus(status);
    if (normalized === 'paid') return 'paid';
    if (normalized === 'refunded') return 'refunded';
    if (normalized === 'refused') return 'refused';
    return 'waiting_payment';
}

function deriveLeadStatus(leadData) {
    if (!leadData) return { status: 'waiting_payment', statusRaw: '' };
    const payload = asObject(leadData.payload);
    const lastEvent = String(leadData.last_event || '').trim().toLowerCase();

    if (lastEvent === 'pix_confirmed' || payload.pixPaidAt) {
        return { status: 'paid', statusRaw: String(payload.pixStatus || 'paid') };
    }
    if (lastEvent === 'pix_refunded' || payload.pixRefundedAt) {
        return { status: 'refunded', statusRaw: String(payload.pixStatus || 'refunded') };
    }
    if (lastEvent === 'pix_refused' || payload.pixRefusedAt) {
        return { status: 'refused', statusRaw: String(payload.pixStatus || 'refused') };
    }
    const mapped = mapUtmifyStatusToFrontend(mapAtivusStatusToUtmify(payload.pixStatus || payload.status || ''));
    return { status: mapped, statusRaw: String(payload.pixStatus || payload.status || '') };
}

function buildPatchFromGatewayStatus(leadData, txid, statusRaw, nextStatus, changedAtIso) {
    const payload = asObject(leadData?.payload);
    return {
        last_event:
            nextStatus === 'paid'
                ? 'pix_confirmed'
                : nextStatus === 'refunded'
                    ? 'pix_refunded'
                    : nextStatus === 'refused'
                        ? 'pix_refused'
                        : payload?.last_event || 'pix_pending',
        stage: 'pix',
        payload: {
            ...payload,
            pixTxid: txid || payload.pixTxid || undefined,
            pixStatus: statusRaw || payload.pixStatus || null,
            pixStatusChangedAt: changedAtIso,
            pixPaidAt: nextStatus === 'paid' ? (payload.pixPaidAt || changedAtIso) : payload.pixPaidAt || undefined,
            pixRefundedAt: nextStatus === 'refunded' ? (payload.pixRefundedAt || changedAtIso) : payload.pixRefundedAt || undefined,
            pixRefusedAt: nextStatus === 'refused' ? (payload.pixRefusedAt || changedAtIso) : payload.pixRefusedAt || undefined
        }
    };
}

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
        res.status(400).json({ error: 'Invalid JSON body.' });
        return;
    }

    const txid = String(
        body?.txid ||
        body?.idTransaction ||
        body?.idtransaction ||
        body?.id_transaction ||
        ''
    ).trim();
    const sessionId = String(body?.sessionId || '').trim();
    if (!txid && !sessionId) {
        res.status(400).json({ error: 'txid ou sessionId obrigatorio.' });
        return;
    }

    let leadData = null;
    if (txid) {
        const byTxid = await getLeadByPixTxid(txid).catch(() => ({ ok: false, data: null }));
        leadData = byTxid?.ok ? byTxid.data : null;
    }
    if (!leadData && sessionId) {
        const bySession = await getLeadBySessionId(sessionId).catch(() => ({ ok: false, data: null }));
        leadData = bySession?.ok ? bySession.data : null;
    }

    const leadStatus = deriveLeadStatus(leadData);
    if (leadStatus.status === 'paid') {
        res.status(200).json({
            ok: true,
            status: 'paid',
            statusRaw: leadStatus.statusRaw || 'paid',
            source: 'database',
            txid: txid || String(leadData?.pix_txid || '').trim()
        });
        return;
    }

    if (!txid) {
        res.status(200).json({
            ok: true,
            status: leadStatus.status,
            statusRaw: leadStatus.statusRaw || '',
            source: 'database',
            txid: ''
        });
        return;
    }

    const { response, data } = await getTransactionStatusByIdTransaction(txid);
    if (!response?.ok) {
        const blockedByAtivus = Number(response?.status || 0) === 403;
        res.status(blockedByAtivus ? 200 : 502).json({
            ok: blockedByAtivus,
            status: leadStatus.status || 'waiting_payment',
            statusRaw: leadStatus.statusRaw || '',
            txid,
            source: 'database_fallback',
            blockedByAtivus,
            detail: data?.error || data?.message || ''
        });
        return;
    }

    const statusRaw = getAtivusStatus(data);
    const mapped = mapAtivusStatusToUtmify(statusRaw);
    const nextStatus = isAtivusPaidStatus(statusRaw)
        ? 'paid'
        : isAtivusRefundedStatus(statusRaw)
            ? 'refunded'
            : isAtivusRefusedStatus(statusRaw)
                ? 'refused'
                : mapUtmifyStatusToFrontend(mapped);
    const changedAtIso =
        toIsoDate(data?.data_transacao) ||
        toIsoDate(data?.data_registro) ||
        toIsoDate(data?.dt_atualizacao) ||
        new Date().toISOString();

    if (leadData || sessionId) {
        const patch = buildPatchFromGatewayStatus(leadData, txid, statusRaw, nextStatus, changedAtIso);
        let updated = await updateLeadByPixTxid(txid, patch).catch(() => ({ ok: false, count: 0 }));
        if ((!updated?.ok || Number(updated?.count || 0) === 0) && sessionId) {
            updated = await updateLeadBySessionId(sessionId, patch).catch(() => ({ ok: false, count: 0 }));
        }
    }

    res.status(200).json({
        ok: true,
        status: nextStatus,
        statusRaw,
        txid,
        changedAt: changedAtIso,
        source: 'ativushub'
    });
};

