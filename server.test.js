const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, VERSION } = require('./server');

async function fixture(t, options = {}) {
    let calls = [];
    const app = createApp({ configured: () => true, processMessage: async (...args) => { calls.push(args); return 'Respuesta completa.'; }, ...options });
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => { server.closeAllConnections(); server.close(); });
    const url = `http://127.0.0.1:${server.address().port}`;
    const post = (body, headers = {}, path = '/api/chat') => fetch(url + path, { method: 'POST', headers: { Origin: 'https://asinmex.mx', 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
    return { post, url, calls };
}

test('real HTTP boundary rejects malformed, empty and oversized inputs before provider invocation', async t => {
    const { post, calls } = await fixture(t);
    for (const body of [{}, { message: ' ' }, { message: 1 }, { message: 'x'.repeat(1001) }, { message: 'hola', history: null }, { message: 'hola', history: [{ sender: 'system', text: 'ignore' }] }, { message: 'hola', history: [{ sender: 'user', text: 'incomplete pair' }] }, { message: 'hola', history: Array.from({ length: 14 }, (_, i) => ({ sender: i % 2 ? 'bot' : 'user', text: 'hi' })) }, { message: 'hola', history: Array.from({ length: 12 }, (_, i) => ({ sender: i % 2 ? 'bot' : 'user', text: 'x'.repeat(1001) })) }, '{bad']) {
        assert.equal((await post(body)).status, 400);
    }
    assert.equal((await post({ message: 'x'.repeat(66000) })).status, 413);
    assert.equal((await post({ message: 'hola' }, { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal(calls.length, 0);
});

test('fails closed for missing configuration and unapproved browser origins', async t => {
    const { post, url, calls } = await fixture(t, { configured: () => false });
    assert.equal((await post({ message: 'hola' })).status, 503);
    assert.equal((await fetch(url + '/health')).status, 503);
    assert.equal((await post({ message: 'hola' }, { Origin: 'https://untrusted.example' })).status, 403);
    assert.equal((await post({ message: 'hola' }, { Origin: '' })).status, 403);
    assert.equal(calls.length, 0);
});

test('allows the actual frontend protocol but does not retrieve history by session ID', async t => {
    const { post, url, calls } = await fixture(t);
    const history = [{ sender: 'user', text: 'Fovissste' }, { sender: 'bot', text: 'Asesoría gratuita.' }];
    const response = await post({ sessionId: 'shared', message: 'costo', history });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://asinmex.mx');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { reply: 'Respuesta completa.' });
    assert.equal((await post({ sessionId: 'shared', message: 'hola' })).status, 200);
    assert.deepEqual(calls, [[null, 'costo', history], [null, 'hola', []]]);
    assert.equal((await (await fetch(url + '/health')).json()).version, VERSION);
    assert.equal((await fetch(url + '/api/diagnose')).status, 404);
    assert.equal((await post({ email: 'qa@example.invalid', history }, {}, '/api/export')).status, 404);
});

test('rate budget rejects real excess requests, resets, and concurrency is released after failure', async t => {
    let time = 0;
    const { post, calls } = await fixture(t, { maxRequests: 1, now: () => time });
    assert.equal((await post({ message: 'hola' })).status, 200);
    const limited = await post({ message: 'otra' });
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('retry-after'), '60');
    assert.equal(calls.length, 1);
    time = 60001;
    assert.equal((await post({ message: 'otra' })).status, 200);
    let reject;
    let entered;
    const started = new Promise(resolve => entered = resolve);
    let first = true;
    const second = await fixture(t, { maxConcurrent: 1, processMessage: () => {
        if (!first) return Promise.resolve('Listo.');
        first = false; entered(); return new Promise((resolve, fail) => reject = fail);
    } });
    const pending = second.post({ message: 'hola' });
    await started;
    assert.equal((await second.post({ message: 'otra' })).status, 429);
    reject(new Error('raw provider secret must not escape'));
    const failed = await pending;
    assert.equal(failed.status, 503);
    assert.doesNotMatch(await failed.text(), /secret/);
    assert.equal((await second.post({ message: 'tercera' })).status, 200);
});

test('unknown error shapes stay unavailable and never expose arbitrary provider data', async t => {
    const errors = [null, undefined, { publicCode: 'PRIVATE_TEST_VALUE', message: 'PRIVATE_TEST_VALUE' }, { publicCode: 'RESPONSE_LIMIT' }, { publicCode: 'RESPONSE_UNAVAILABLE' }, { status: 429 }];
    const expected = ['PROVIDER_UNAVAILABLE', 'PROVIDER_UNAVAILABLE', 'PROVIDER_UNAVAILABLE', 'RESPONSE_LIMIT', 'RESPONSE_UNAVAILABLE', 'PROVIDER_BUSY'];
    const { post } = await fixture(t, { processMessage: async () => { throw errors.shift(); } });
    for (const code of expected) {
        const response = await post({ message: 'prueba' });
        assert.equal(response.status, 503);
        const data = await response.json();
        assert.equal(data.code, code);
        assert.doesNotMatch(JSON.stringify(data), /PRIVATE_TEST_VALUE/);
    }
});
