const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { GoogleGenerativeAI } = require('@google/generative-ai');

test('stateless conversations ignore duplicate IDs; truncated, blocked and failed responses never succeed', async () => {
    const starts = [];
    const results = ['STOP', 'MAX_TOKENS', 'SAFETY', 'THROW', 'STOP'];
    const stub = mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', options => {
        assert.ok(options.systemInstruction.includes('cuatro etapas'));
        return { startChat(config) {
            starts.push(config);
            return { async sendMessage(message, requestOptions) {
                assert.equal(requestOptions.timeout, 20000);
                const reason = results.shift();
                if (reason === 'THROW') throw new Error('provider failure');
                return { response: { candidates: [{ finishReason: reason }], text: () => reason === 'STOP' ? 'Respuesta completa.' : '¡Claro que sí! Atend' } };
            } };
        } };
    });
    try {
        const { processChatMessage } = require('./aiService');
        const history = [{ sender: 'user', text: 'Fovissste' }, { sender: 'bot', text: 'Primera asesoría gratuita.' }];
        assert.equal(await processChatMessage('same-id', 'costos', history), 'Respuesta completa.');
        for (const message of ['cobertura', 'horario', 'reintento']) await assert.rejects(processChatMessage('same-id', message));
        assert.equal(await processChatMessage('same-id', 'otra persona'), 'Respuesta completa.');
        assert.deepEqual(starts.map(s => s.history.length), [2, 0, 0, 0, 0]);
        assert.equal(starts[0].history[0].parts[0].text, 'Fovissste');
        assert.equal(history.length, 2);
    } finally { stub.mock.restore(); }
});
