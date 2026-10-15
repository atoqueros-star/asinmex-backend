const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { GoogleGenerativeAI } = require('@google/generative-ai');

test('keeps the last complete conversation when the provider truncates, blocks or fails', async () => {
    const starts = [];
    const models = [];
    const results = ['STOP', 'MAX_TOKENS', 'SAFETY', 'THROW', 'STOP'];
    const stub = mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', (options) => {
        models.push(options);
        return { startChat(config) {
            starts.push(config);
            let history = [...config.history];
            return {
                async getHistory() { return history; },
                async sendMessage(message) {
                    const reason = results.shift();
                    if (reason === 'THROW') throw Object.assign(new Error('provider failure'), { status: 503 });
                    history.push({ role: 'user', parts: [{ text: message }] }, { role: 'model', parts: [{ text: 'reply' }] });
                    return { response: { candidates: [{ finishReason: reason }], text: () => reason === 'STOP' ? 'Respuesta completa.' : '¡Claro que sí! Atend' } };
                },
            };
        } };
    });
    const log = mock.method(console, 'warn', () => {});
    try {
        const { processChatMessage } = require('./aiService');
        assert.equal(await processChatMessage('qa-only-session', 'Fovissste'), 'Respuesta completa.');
        for (const message of ['costo', 'cobertura', 'horario']) {
            const reply = await processChatMessage('qa-only-session', message);
            assert.match(reply, /No pude completar/);
            assert.doesNotMatch(reply, /Atend|LEAD_COMPLETO_LISTO/);
        }
        assert.equal(await processChatMessage('qa-only-session', 'Gracias'), 'Respuesta completa.');
        assert.deepEqual(starts.map(s => s.history.length), [0, 2, 2, 2, 2]);
        assert.equal(models.length, 5); // No unverified fallback or billing retry loop.
        assert.ok(models.every(m => m.systemInstruction.includes('cuatro etapas')));
    } finally { stub.mock.restore(); log.mock.restore(); }
});
