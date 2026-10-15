const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getCompleteReply, generationConfig } = require('./replyPolicy');

test('never forwards a truncated, blocked or unspecified provider response', () => {
  for (const reason of ['MAX_TOKENS', 'SAFETY', 'OTHER', 'CONTINUATION', undefined]) {
    assert.throws(() => getCompleteReply({ candidates: [{ finishReason: reason }], text: () => '¡Claro que sí! Atend' }), { code: 'INCOMPLETE_REPLY' });
  }
});
test('accepts complete output, rejects empty success', () => {
  assert.equal(getCompleteReply({ candidates: [{ finishReason: 'STOP' }], text: () => 'Respuesta completa.' }), 'Respuesta completa.');
  assert.throws(() => getCompleteReply({ candidates: [{ finishReason: 'STOP' }], text: () => ' ' }), { code: 'EMPTY_REPLY' });
});
test('leaves output room separate from Flash 2.5 thinking and does not send its option to other models', () => {
  assert.equal(generationConfig('gemini-2.5-flash').thinkingConfig.thinkingBudget, 0);
  assert.ok(generationConfig('gemini-2.5-flash').maxOutputTokens >= 1024);
  assert.equal(generationConfig('deployment-specific-model').thinkingConfig, undefined);
});
