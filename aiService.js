const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const SYSTEM_PROMPT = require('./systemPrompt');
const { getCompleteReply, generationConfig } = require('./replyPolicy');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// The old sessionId is ignored: knowing an identifier cannot retrieve anyone's conversation.
async function processChatMessage(_sessionId, message, history = []) {
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT });
    const chat = model.startChat({
        history: history.map(item => ({ role: item.sender === 'user' ? 'user' : 'model', parts: [{ text: item.text }] })),
        generationConfig: generationConfig(modelName),
    });
    // The SDK aborts the actual HTTP request, not just a wrapper promise.
    const result = await chat.sendMessage(message, { timeout: 20000 });
    return getCompleteReply(result.response);
}

module.exports = { processChatMessage };
