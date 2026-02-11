const fetchFn = global.fetch
    ? global.fetch.bind(global)
    : (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';
const SUPABASE_LEADS_TABLE = process.env.SUPABASE_LEADS_TABLE || 'leads';

const TERMINAL_EVENTS = new Set(['pix_confirmed', 'pix_refunded', 'pix_refused']);
const STAGE_SCORE = {
    home: 1,
    quiz: 2,
    personal: 3,
    cep: 4,
    processing: 5,
    success: 6,
    checkout: 7,
    orderbump: 8,
    pix: 9
};

function toText(value, maxLen = 255) {
    const txt = String(value || '').trim();
    if (!txt) return null;
    return txt.length > maxLen ? txt.slice(0, maxLen) : txt;
}

function toDigits(value, maxLen = 32) {
    const txt = String(value || '').replace(/\D/g, '');
    if (!txt) return null;
    return txt.length > maxLen ? txt.slice(0, maxLen) : txt;
}

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function toBoolean(value) {
    return value === true || value === 'true' || value === 1 || value === '1';
}

function ensureSessionId(input) {
    const provided =
        input?.sessionId ||
        input?.session_id ||
        input?.leadSession ||
        input?.lead_session ||
        null;

    return toText(provided, 80);
}

function asObject(input) {
    return input && typeof input === 'object' && !Array.isArray(input) ? input : {};
}

function hasMeaningfulLeadData(record) {
    const payload = asObject(record?.payload);
    const quizAnswers = Array.isArray(payload?.quizAnswers) ? payload.quizAnswers : [];
    const quizProgress = asObject(payload?.quizProgress);
    const lastEvent = String(record?.last_event || payload?.event || '').toLowerCase();
    const hasQuizSignal = quizAnswers.length > 0 || Number(quizProgress?.answeredCount || 0) > 0 || lastEvent.includes('quiz');

    if (hasQuizSignal) return true;

    return Boolean(
        record.name ||
        record.cpf ||
        record.email ||
        record.phone ||
        record.cep ||
        record.address_line ||
        record.shipping_id ||
        record.pix_txid ||
        record.pix_amount
    );
}

function scoreEvent(eventName) {
    const ev = String(eventName || '').trim().toLowerCase();
    if (!ev) return 0;
    if (TERMINAL_EVENTS.has(ev)) return 100;
    if (ev.startsWith('pix_')) return 80;
    if (ev.includes('frete')) return 60;
    if (ev.includes('cep')) return 50;
    if (ev.includes('personal') || ev.includes('dados')) return 40;
    if (ev.includes('quiz')) return 20;
    if (ev.includes('view')) return 10;
    return 15;
}

function scoreStage(stageName) {
    const st = String(stageName || '').trim().toLowerCase();
    return STAGE_SCORE[st] || 0;
}

function pruneNullish(input) {
    const out = {};
    Object.entries(input || {}).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        out[key] = value;
    });
    return out;
}

function normalizeQuizAnswerEntry(entry = {}) {
    const source = asObject(entry);
    const questionId = toText(source.questionId || source.question_id, 100);
    const questionText = toText(source.questionText || source.question_text, 300);
    const answerId = toText(source.answerId || source.answer_id, 100);
    const answerText = toText(source.answerText || source.answer_text || source.text, 300);
    const answerIcon = toText(source.answerIcon || source.answer_icon, 20);
    const nextQuestionId = toText(source.nextQuestionId || source.next_question_id, 100);
    const answeredAt = toText(source.answeredAt || source.answered_at, 80) || new Date().toISOString();
    const stepIndexRaw = Number(source.stepIndex ?? source.step ?? source.index);
    const totalStepsRaw = Number(source.totalSteps ?? source.total);
    const stepIndex = Number.isFinite(stepIndexRaw) && stepIndexRaw > 0 ? Math.floor(stepIndexRaw) : null;
    const totalSteps = Number.isFinite(totalStepsRaw) && totalStepsRaw > 0 ? Math.floor(totalStepsRaw) : null;

    if (!questionId && !questionText && !answerText) return null;

    return pruneNullish({
        questionId,
        questionText,
        answerId,
        answerText,
        answerIcon,
        nextQuestionId,
        stepIndex,
        totalSteps,
        answeredAt
    });
}

function extractQuizAnswersFromPayload(payload = {}) {
    const source = asObject(payload);
    const quiz = asObject(source.quiz);
    const answers = [];

    if (Array.isArray(source.quizAnswers)) {
        answers.push(...source.quizAnswers);
    }
    if (Array.isArray(quiz.answers)) {
        answers.push(...quiz.answers);
    }
    if (source.quizAnswer && typeof source.quizAnswer === 'object') {
        answers.push(source.quizAnswer);
    }
    if (
        source.event === 'quiz_answer' &&
        source.quiz &&
        typeof source.quiz === 'object' &&
        !Array.isArray(source.quiz)
    ) {
        answers.push(source.quiz);
    }

    return answers
        .map((entry) => normalizeQuizAnswerEntry(entry))
        .filter(Boolean);
}

function mergeQuizAnswers(existingAnswers = [], incomingAnswers = []) {
    const byKey = new Map();
    const keyFor = (entry = {}) => {
        const id = String(entry?.questionId || '').trim().toLowerCase();
        if (id) return `id:${id}`;
        const text = String(entry?.questionText || '').trim().toLowerCase();
        if (text) return `text:${text}`;
        return `fallback:${String(entry?.answeredAt || '').trim()}:${String(entry?.answerText || '').trim().toLowerCase()}`;
    };
    const upsert = (entry = {}) => {
        const normalized = normalizeQuizAnswerEntry(entry);
        if (!normalized) return;
        byKey.set(keyFor(normalized), normalized);
    };

    existingAnswers.forEach(upsert);
    incomingAnswers.forEach(upsert);

    return Array.from(byKey.values()).sort((a, b) => {
        const stepA = Number(a?.stepIndex || 0);
        const stepB = Number(b?.stepIndex || 0);
        if (stepA !== stepB) return stepA - stepB;
        const dateA = new Date(String(a?.answeredAt || 0)).getTime();
        const dateB = new Date(String(b?.answeredAt || 0)).getTime();
        const safeA = Number.isFinite(dateA) ? dateA : 0;
        const safeB = Number.isFinite(dateB) ? dateB : 0;
        return safeA - safeB;
    });
}

function mergeTrackingPayload(input = {}, existingPayload = {}) {
    const incoming = asObject(input);
    const existing = asObject(existingPayload);
    const merged = {
        ...existing,
        ...incoming
    };

    ['utm', 'personal', 'address', 'extra', 'shipping', 'bump', 'pix', 'metadata'].forEach((key) => {
        const next = {
            ...asObject(existing[key]),
            ...asObject(incoming[key])
        };
        if (Object.keys(next).length > 0) {
            merged[key] = next;
        } else {
            delete merged[key];
        }
    });

    const eventName = String(incoming.event || incoming.lastEvent || '').trim().toLowerCase();
    const existingAnswers = extractQuizAnswersFromPayload(existing);
    const incomingAnswers = extractQuizAnswersFromPayload(incoming);
    const answers = mergeQuizAnswers(existingAnswers, incomingAnswers);
    if (answers.length > 0) {
        merged.quizAnswers = answers;
    } else {
        delete merged.quizAnswers;
    }

    const incomingQuiz = asObject(incoming.quiz);
    const existingProgress = asObject(existing.quizProgress);
    const completedNow = eventName === 'quiz_complete' || incomingQuiz.completed === true || incoming.quizComplete === true;
    const lastAnswer = answers.length > 0 ? answers[answers.length - 1] : null;
    const nowIso = new Date().toISOString();
    const progress = pruneNullish({
        startedAt: toText(existingProgress.startedAt || (eventName.includes('quiz') ? nowIso : ''), 80),
        answeredCount: answers.length > 0 ? answers.length : null,
        lastQuestionId: toText(incomingQuiz.questionId || lastAnswer?.questionId || existingProgress.lastQuestionId, 100),
        lastAnsweredAt: toText(lastAnswer?.answeredAt || existingProgress.lastAnsweredAt, 80),
        completed: completedNow || existingProgress.completed === true ? true : undefined,
        completedAt: toText(
            completedNow
                ? (incomingQuiz.completedAt || nowIso)
                : existingProgress.completedAt,
            80
        )
    });
    if (Object.keys(progress).length > 0) {
        merged.quizProgress = progress;
    } else {
        delete merged.quizProgress;
    }

    const mergedQuiz = pruneNullish({
        ...asObject(existing.quiz),
        ...incomingQuiz
    });
    if (Object.keys(mergedQuiz).length > 0) {
        merged.quiz = mergedQuiz;
    } else {
        delete merged.quiz;
    }

    return merged;
}

function buildLeadRecord(input = {}, req = null) {
    const nowIso = new Date().toISOString();
    const personal = input.personal && typeof input.personal === 'object' ? input.personal : {};
    const address = input.address && typeof input.address === 'object' ? input.address : {};
    const extra = input.extra && typeof input.extra === 'object' ? input.extra : {};
    const shipping = input.shipping && typeof input.shipping === 'object' ? input.shipping : {};
    const bump = input.bump && typeof input.bump === 'object' ? input.bump : {};
    const pix = input.pix && typeof input.pix === 'object' ? input.pix : {};
    const utm = input.utm && typeof input.utm === 'object' ? input.utm : {};

    const street = toText(address.street || address.streetLine || '', 240);
    const cityLine = toText(address.cityLine || '', 140);
    const city = toText(address.city || cityLine.split('-')[0] || '', 100);
    const state = toText(address.state || cityLine.split('-')[1] || '', 20);

    const forwardedFor = req?.headers?.['x-forwarded-for'];
    const clientIp = typeof forwardedFor === 'string' && forwardedFor
        ? forwardedFor.split(',')[0].trim()
        : req?.socket?.remoteAddress || '';

    return {
        session_id: ensureSessionId(input),
        stage: toText(input.stage, 60),
        last_event: toText(input.event || input.lastEvent, 80),
        name: toText(personal.name, 160),
        cpf: toDigits(personal.cpf, 14),
        email: toText(personal.email, 180),
        phone: toDigits(personal.phoneDigits || personal.phone, 20),
        cep: toDigits(address.cep, 10),
        address_line: toText(street, 240),
        number: toText(extra.number, 40),
        complement: toText(extra.complement, 120),
        neighborhood: toText(address.neighborhood, 120),
        city,
        state,
        reference: toText(extra.reference, 140),
        shipping_id: toText(shipping.id, 40),
        shipping_name: toText(shipping.name, 120),
        shipping_price: toNumber(shipping.price),
        bump_selected: toBoolean(input.bumpSelected ?? bump.selected ?? bump.price),
        bump_price: toNumber(input.bumpPrice ?? bump.price),
        pix_txid: toText(input.pixTxid || pix.idTransaction, 120),
        pix_amount: toNumber(input.pixAmount || pix.amount || input.amount),
        utm_source: toText(utm.utm_source || input.utm_source, 120),
        utm_medium: toText(utm.utm_medium || input.utm_medium, 120),
        utm_campaign: toText(utm.utm_campaign || input.utm_campaign, 120),
        utm_term: toText(utm.utm_term || input.utm_term, 120),
        utm_content: toText(utm.utm_content || input.utm_content, 120),
        gclid: toText(utm.gclid || input.gclid, 120),
        fbclid: toText(utm.fbclid || input.fbclid, 120),
        ttclid: toText(utm.ttclid || input.ttclid, 120),
        referrer: toText(utm.referrer || input.referrer, 240),
        landing_page: toText(utm.landing_page || input.landing_page, 240),
        source_url: toText(input.sourceUrl, 300),
        user_agent: toText(req?.headers?.['user-agent'] || input.userAgent, 300),
        client_ip: toText(clientIp || input.clientIp, 80),
        updated_at: nowIso,
        payload: input
    };
}

async function upsertLead(input = {}, req = null) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return { ok: false, reason: 'missing_supabase_config' };
    }

    const initialRecord = buildLeadRecord(input, req);
    if (!initialRecord.session_id) {
        return { ok: false, reason: 'missing_session_id' };
    }
    const existingRes = await getLeadBySessionId(initialRecord.session_id).catch(() => ({ ok: false, data: null }));
    const existing = existingRes?.ok ? existingRes.data : null;
    const mergedInput = mergeTrackingPayload(input, existing?.payload);
    const record = buildLeadRecord(mergedInput, req);
    if (!hasMeaningfulLeadData(record)) {
        return { ok: false, reason: 'skipped_no_data' };
    }
    if (existing) {
        const incomingEvent = record.last_event;
        const currentEvent = existing.last_event;
        if (scoreEvent(currentEvent) > scoreEvent(incomingEvent)) {
            record.last_event = currentEvent;
        }
        if (scoreStage(existing.stage) > scoreStage(record.stage)) {
            record.stage = existing.stage;
        }
    }

    const endpoint = `${SUPABASE_URL}/rest/v1/${SUPABASE_LEADS_TABLE}?on_conflict=session_id`;
    const payload = pruneNullish(record);

    const response = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify([payload])
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        return {
            ok: false,
            reason: 'supabase_error',
            status: response.status,
            detail
        };
    }

    return { ok: true };
}

module.exports = {
    upsertLead,
    updateLeadByPixTxid,
    getLeadByPixTxid,
    updateLeadBySessionId,
    getLeadBySessionId,
    findLeadByIdentity
};

async function updateLeadByPixTxid(txid, fields = {}) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return { ok: false, reason: 'missing_supabase_config' };
    }

    const cleanTxid = String(txid || '').trim();
    if (!cleanTxid) {
        return { ok: false, reason: 'missing_txid' };
    }

    const payload = {
        ...fields,
        updated_at: new Date().toISOString()
    };

    const endpoint = `${SUPABASE_URL}/rest/v1/${SUPABASE_LEADS_TABLE}?pix_txid=eq.${encodeURIComponent(cleanTxid)}`;

    const response = await fetchFn(endpoint, {
        method: 'PATCH',
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        return {
            ok: false,
            reason: 'supabase_error',
            status: response.status,
            detail
        };
    }

    const data = await response.json().catch(() => []);
    return { ok: true, count: Array.isArray(data) ? data.length : 0 };
}

async function getLeadByPixTxid(txid) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return { ok: false, reason: 'missing_supabase_config' };
    }

    const cleanTxid = String(txid || '').trim();
    if (!cleanTxid) {
        return { ok: false, reason: 'missing_txid' };
    }

    const endpoint = `${SUPABASE_URL}/rest/v1/${SUPABASE_LEADS_TABLE}?pix_txid=eq.${encodeURIComponent(cleanTxid)}&select=*`;
    const response = await fetchFn(endpoint, {
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        return { ok: false, reason: 'supabase_error', status: response.status, detail };
    }

    const data = await response.json().catch(() => []);
    return { ok: true, data: Array.isArray(data) ? data[0] : null };
}

async function updateLeadBySessionId(sessionId, fields = {}) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return { ok: false, reason: 'missing_supabase_config' };
    }

    const cleanSession = String(sessionId || '').trim();
    if (!cleanSession) {
        return { ok: false, reason: 'missing_session_id' };
    }

    const payload = {
        ...fields,
        updated_at: new Date().toISOString()
    };

    const endpoint = `${SUPABASE_URL}/rest/v1/${SUPABASE_LEADS_TABLE}?session_id=eq.${encodeURIComponent(cleanSession)}`;
    const response = await fetchFn(endpoint, {
        method: 'PATCH',
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        return {
            ok: false,
            reason: 'supabase_error',
            status: response.status,
            detail
        };
    }

    const data = await response.json().catch(() => []);
    return { ok: true, count: Array.isArray(data) ? data.length : 0 };
}

async function getLeadBySessionId(sessionId) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return { ok: false, reason: 'missing_supabase_config' };
    }

    const cleanSession = String(sessionId || '').trim();
    if (!cleanSession) {
        return { ok: false, reason: 'missing_session_id' };
    }

    const endpoint = `${SUPABASE_URL}/rest/v1/${SUPABASE_LEADS_TABLE}?session_id=eq.${encodeURIComponent(cleanSession)}&select=*`;
    const response = await fetchFn(endpoint, {
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        return { ok: false, reason: 'supabase_error', status: response.status, detail };
    }

    const data = await response.json().catch(() => []);
    return { ok: true, data: Array.isArray(data) ? data[0] : null };
}

async function findLeadByIdentity(identity = {}) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return { ok: false, reason: 'missing_supabase_config' };
    }

    const cpf = toDigits(identity.cpf || '', 14);
    const email = toText(identity.email || '', 180);
    const phone = toDigits(identity.phone || '', 20);

    const url = new URL(`${SUPABASE_URL}/rest/v1/${SUPABASE_LEADS_TABLE}`);
    url.searchParams.set('select', '*');
    url.searchParams.set('order', 'updated_at.desc');
    url.searchParams.set('limit', '1');
    if (cpf) {
        url.searchParams.set('cpf', `eq.${cpf}`);
    } else if (email) {
        url.searchParams.set('email', `eq.${email}`);
    } else if (phone) {
        url.searchParams.set('phone', `eq.${phone}`);
    } else {
        return { ok: false, reason: 'missing_identity' };
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
        return { ok: false, reason: 'supabase_error', status: response.status, detail };
    }
    const data = await response.json().catch(() => []);
    return { ok: true, data: Array.isArray(data) ? data[0] : null };
}
