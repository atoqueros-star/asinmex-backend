function generationConfig(model) {
    return {
        maxOutputTokens: 1536,
        temperature: 0.3,
        // The existing Flash 2.5 model supports a separate thinking budget.
        ...(model === 'gemini-2.5-flash' ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    };
}

function getCompleteReply(response) {
    if (response?.candidates?.[0]?.finishReason !== 'STOP') {
        const error = new Error('Incomplete provider response');
        error.code = 'INCOMPLETE_REPLY';
        throw error;
    }
    const reply = response.text().trim();
    if (!reply) {
        const error = new Error('Empty provider response');
        error.code = 'EMPTY_REPLY';
        throw error;
    }
    return reply;
}

module.exports = { getCompleteReply, generationConfig };
