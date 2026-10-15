const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { processChatMessage } = require('./aiService');

const VERSION = 'chat-2026-10-15.2';
const ORIGINS = new Set(['https://asinmex.mx', 'https://www.asinmex.mx', 'https://id-preview--78a6bffd-41aa-458e-9da6-95f155762b01.lovable.app']);

function validHistory(history) {
    if (!Array.isArray(history) || history.length > 12) return false;
    let total = 0;
    for (let i = 0; i < history.length; i++) {
        const item = history[i];
        if (!item || item.sender !== (i % 2 === 0 ? 'user' : 'bot') || typeof item.text !== 'string' || !item.text.trim() || item.text.length > 2000) return false;
        total += item.text.length;
    }
    return history.length % 2 === 0 && total <= 12000;
}

function createApp({ processMessage = processChatMessage, configured = () => Boolean(process.env.GEMINI_API_KEY?.trim()), now = Date.now, maxRequests = 30, maxConcurrent = 3 } = {}) {
    const app = express();
    app.disable('x-powered-by');
    app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    app.get('/health', (req, res) => res.status(configured() ? 200 : 503).json({ status: configured() ? 'OK' : 'UNAVAILABLE', version: VERSION, runtime: process.versions.node }));
    // Origin restrictions reduce browser abuse, but are not authentication.
    app.use('/api/chat', (req, res, next) => ORIGINS.has(req.get('Origin')) ? next() : res.status(403).json({ error: 'Origen no permitido.' }));
    app.use(cors({ origin: [...ORIGINS], methods: ['POST'], allowedHeaders: ['Content-Type'], maxAge: 600 }));
    app.use(express.json({ limit: '64kb' }));
    let windowStart = now();
    let requests = 0;
    let active = 0;
    app.post('/api/chat', async (req, res) => {
        if (!req.is('application/json')) return res.status(415).json({ error: 'Se requiere JSON.' });
        const { message, history = [] } = req.body || {};
        if (typeof message !== 'string' || !message.trim() || message.length > 1000 || !validHistory(history)) return res.status(400).json({ error: 'Mensaje o historial inválido.' });
        if (!configured()) return res.status(503).json({ error: 'El asistente no está disponible. Puedes contactar al equipo por WhatsApp.' });
        const time = now();
        if (time - windowStart >= 60000) { requests = 0; windowStart = time; }
        if (requests >= maxRequests || active >= maxConcurrent) return res.set('Retry-After', '60').status(429).json({ error: 'Hay varias consultas en curso. Intenta de nuevo en un minuto o usa WhatsApp.' });
        requests++;
        active++;
        try {
            // No server conversation store and no model-triggered side effects.
            const reply = await processMessage(null, message.trim(), history);
            res.json({ reply });
        } catch (error) {
            const code = ['RESPONSE_LIMIT', 'RESPONSE_UNAVAILABLE'].includes(error?.publicCode) ? error.publicCode : error?.status === 429 ? 'PROVIDER_BUSY' : 'PROVIDER_UNAVAILABLE';
            console.warn('ASINMEX chat unavailable:', code);
            res.status(503).json({ error: 'No se pudo completar la respuesta. Puedes contactar al equipo por WhatsApp.', code });
        } finally { active--; }
    });
    app.use((error, req, res, next) => {
        if (error.type === 'entity.too.large') return res.status(413).json({ error: 'La consulta es demasiado extensa.' });
        if (error instanceof SyntaxError) return res.status(400).json({ error: 'JSON inválido.' });
        res.status(500).json({ error: 'No se pudo procesar la consulta.' });
    });
    return app;
}

if (require.main === module) createApp().listen(process.env.PORT || 3000, () => console.log(`ASINMEX ${VERSION} ready`));
module.exports = { createApp, validHistory, VERSION };
