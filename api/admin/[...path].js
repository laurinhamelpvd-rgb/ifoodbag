const { ensureAllowedRequest } = require('../../lib/request-guard');
const { verifyAdminPassword, issueAdminCookie, verifyAdminCookie, requireAdmin } = require('../../lib/admin-auth');
const { getSettings, saveSettings, defaultSettings } = require('../../lib/settings-store');
const { sendUtmfy } = require('../../lib/utmfy');
const { updateLeadByPixTxid } = require('../../lib/lead-store');
const { BASE_URL, fetchJson, authHeaders } = require('../../lib/ativus');

const fetchFn = global.fetch
    ? global.fetch.bind(global)
    : (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';

const pick = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const isPaidStatus = (statusRaw) => {
    const status = String(statusRaw || '').trim().toLowerCase();
    if (!status) return false;
    const paidTokens = [
        'paid',
        'approved',
        'aprovado',
        'confirm',
        'confirmed',
        'completed',
        'success',
        'sucesso',
        'conclu'
    ];
    return paidTokens.some((token) => status.includes(token));
};
const clamp = (value, min, max) => Math.min(Math.max(Number(value) || 0, min), max);

function pickTxid(node) {
    return pick(
        node?.idTransaction,
        node?.idtransaction,
        node?.id_transaction,
        node?.transaction_id,
        node?.txid
    );
}

function pickStatus(node) {
    return pick(
        node?.status,
        node?.status_transaction,
        node?.statusTransaction,
        node?.situacao,
        node?.transaction_status
    );
}

function collectAtivusTransactions(payload, txidMap = new Map()) {
    if (Array.isArray(payload)) {
        payload.forEach((item) => collectAtivusTransactions(item, txidMap));
        return txidMap;
    }
    if (!payload || typeof payload !== 'object') {
        return txidMap;
    }

    const txid = String(pickTxid(payload) || '').trim();
    if (txid) {
        if (!txidMap.has(txid)) {
            txidMap.set(txid, { txid, status: String(pickStatus(payload) || '').trim() });
        } else if (!txidMap.get(txid).status) {
            txidMap.get(txid).status = String(pickStatus(payload) || '').trim();
        }
    }

    Object.keys(payload).forEach((key) => {
        collectAtivusTransactions(payload[key], txidMap);
    });

    return txidMap;
}

async function getLeads(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    if (!requireAdmin(req, res)) return;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        res.status(500).json({ error: 'Supabase nao configurado.' });
        return;
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/leads_readable`);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const query = String(req.query.q || '').trim();

    url.searchParams.set('select', '*');
    url.searchParams.set('order', 'updated_at.desc');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    if (query) {
        const ilike = `%${query.replace(/%/g, '')}%`;
        url.searchParams.set('or', `nome.ilike.${ilike},email.ilike.${ilike},telefone.ilike.${ilike},cpf.ilike.${ilike}`);
    }

    const response = await fetchFn(url.toString(), {
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        res.status(502).json({ error: 'Falha ao buscar leads.', detail });
        return;
    }

    const data = await response.json().catch(() => []);
    res.status(200).json({ data });
}

async function getPages(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    if (!requireAdmin(req, res)) return;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        res.status(500).json({ error: 'Supabase nao configurado.' });
        return;
    }

    const response = await fetchFn(`${SUPABASE_URL}/rest/v1/pageview_counts?select=*`, {
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        res.status(502).json({ error: 'Falha ao buscar paginas.', detail });
        return;
    }

    const data = await response.json().catch(() => []);
    res.json({ data });
}

async function login(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    let body = {};
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    } catch (_error) {
        res.status(400).json({ error: 'JSON invalido.' });
        return;
    }

    if (!verifyAdminPassword(body.password || '')) {
        res.status(401).json({ error: 'Senha invalida.' });
        return;
    }

    issueAdminCookie(res);
    res.status(200).json({ ok: true });
}

async function me(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    if (!verifyAdminCookie(req)) {
        res.status(401).json({ ok: false });
        return;
    }
    res.status(200).json({ ok: true });
}

async function settings(req, res) {
    if (req.method === 'GET') {
        if (!requireAdmin(req, res)) return;
        const settingsData = await getSettings();
        res.status(200).json(settingsData);
        return;
    }

    if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;

        let body = {};
        try {
            body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
        } catch (_error) {
            res.status(400).json({ error: 'JSON invalido.' });
            return;
        }

        const payload = {
            ...defaultSettings,
            ...body,
            pixel: {
                ...defaultSettings.pixel,
                ...(body.pixel || {})
            },
            utmfy: {
                ...defaultSettings.utmfy,
                ...(body.utmfy || {})
            },
            features: {
                ...defaultSettings.features,
                ...(body.features || {})
            }
        };

        const result = await saveSettings(payload);
        if (!result.ok) {
            res.status(502).json({ error: 'Falha ao salvar configuracao.' });
            return;
        }

        res.status(200).json({ ok: true });
        return;
    }

    res.status(405).json({ error: 'Method not allowed' });
}

async function utmfyTest(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    if (!requireAdmin(req, res)) return;

    const result = await sendUtmfy('admin_test', {
        source: 'admin',
        timestamp: new Date().toISOString()
    });

    if (!result.ok) {
        res.status(400).json({ error: 'Falha ao enviar evento.', detail: result });
        return;
    }

    res.status(200).json({ ok: true });
}

async function utmfySale(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    if (!requireAdmin(req, res)) return;

    const amount = 56.1;
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
}

async function pixReconcile(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    if (!requireAdmin(req, res)) return;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        res.status(500).json({ error: 'Supabase nao configurado.' });
        return;
    }

    const maxTx = clamp(req.query?.maxTx || 2000, 1, 20000);
    const concurrency = clamp(req.query?.concurrency || 6, 1, 12);

    const { response: saldoResponse, data: saldoData } = await fetchJson(`${BASE_URL}/s1/getsaldo/api/`, {
        method: 'GET',
        headers: authHeaders
    });
    if (!saldoResponse.ok) {
        res.status(502).json({
            error: 'Falha ao buscar transacoes na AtivusHUB.',
            detail: saldoData
        });
        return;
    }

    const txidMap = collectAtivusTransactions(saldoData);
    const uniqueTxids = Array.from(txidMap.keys()).slice(0, maxTx);

    let checked = 0;
    let confirmed = 0;
    let pending = 0;
    let failed = 0;
    let updated = 0;

    const runOne = async (txid) => {
        checked += 1;
        try {
            const { response, data } = await fetchJson(
                `${BASE_URL}/s1/getTransaction/api/getTransactionStatus.php?id_transaction=${encodeURIComponent(txid)}`,
                { method: 'GET', headers: authHeaders }
            );
            if (!response.ok) {
                failed += 1;
                return;
            }
            const status = pick(
                data?.status,
                data?.status_transaction,
                data?.situacao,
                data?.transaction_status,
                data?.data?.status
            );
            if (isPaidStatus(status)) {
                confirmed += 1;
                const up = await updateLeadByPixTxid(txid, { last_event: 'pix_confirmed', stage: 'pix' }).catch(() => ({ ok: false }));
                if (up?.ok && Number(up?.count || 0) > 0) updated += Number(up.count || 0);
                sendUtmfy('pix_confirmed', {
                    event: 'pix_confirmed',
                    txid,
                    status: String(status || '').toLowerCase(),
                    payload: data
                }).catch(() => null);
            } else {
                pending += 1;
            }
        } catch (_error) {
            failed += 1;
        }
    };

    for (let i = 0; i < uniqueTxids.length; i += concurrency) {
        const chunk = uniqueTxids.slice(i, i + concurrency);
        // Processa em paralelo controlado para reduzir tempo total sem sobrecarregar a API.
        await Promise.all(chunk.map((txid) => runOne(txid)));
    }

    res.status(200).json({
        ok: true,
        source: 'ativushub',
        candidates: uniqueTxids.length,
        checked,
        confirmed,
        pending,
        failed,
        updated
    });
}

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    if (!ensureAllowedRequest(req, res, { requireSession: false })) {
        return;
    }

    let route = '';
    if (req.query && (typeof req.query.path !== 'undefined' || typeof req.query.route !== 'undefined')) {
        const rawPath = typeof req.query.path !== 'undefined' ? req.query.path : req.query.route;
        const pathParts = Array.isArray(rawPath) ? rawPath : [rawPath].filter(Boolean);
        route = pathParts.join('/');
    }
    if (!route && req.url) {
        try {
            const url = new URL(req.url, 'http://localhost');
            const prefix = '/api/admin/';
            const idx = url.pathname.indexOf(prefix);
            if (idx >= 0) {
                route = url.pathname.slice(idx + prefix.length);
            }
        } catch (_error) {
            route = '';
        }
    }
    route = String(route || '').replace(/^\/+|\/+$/g, '');
    if (!route && req.method === 'POST' && req.body && typeof req.body === 'object' && 'password' in req.body) {
        route = 'login';
    }

    switch (route) {
        case 'login':
            return login(req, res);
        case 'me':
            return me(req, res);
        case 'settings':
            return settings(req, res);
        case 'leads':
            return getLeads(req, res);
        case 'pages':
            return getPages(req, res);
        case 'utmfy-test':
            return utmfyTest(req, res);
        case 'utmfy-sale':
            return utmfySale(req, res);
        case 'pix-reconcile':
            return pixReconcile(req, res);
        default:
            res.status(404).json({ error: 'Not found' });
            return;
    }
};
