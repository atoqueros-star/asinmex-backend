const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Prompt del Sistema que define la personalidad y conocimiento del Chatbot
const SYSTEM_PROMPT = require('./systemPrompt');

// Inicializamos la API con la llave provista
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Mantenemos un registro básico de sesiones en memoria (En producción usarías Redis o una Base de Datos)
const chatSessions = new Map();

/**
 * Procesa el mensaje del usuario y devuelve la respuesta del Chatbot
 * @param {string} sessionId - ID único para mantener la memoria de la conversación
 * @param {string} message - MEnsaje del usuario
 * @returns {string} - Respuesta de la IA
 */
const { getCompleteReply, generationConfig } = require('./replyPolicy');
const UNAVAILABLE_REPLY = 'No pude completar la respuesta. Puedes consultar la asesoría Infonavit o Fovissste en asinmex.mx o preparar tu consulta en https://wa.me/525575067356. El equipo confirmará la atención; todavía no se ha enviado una solicitud.';

async function processChatMessage(sessionId, message) {
    let session = chatSessions.get(sessionId);
    if (!session) {
        session = { modelName: process.env.GEMINI_MODEL || 'gemini-2.5-flash', chat: null };
        chatSessions.set(sessionId, session);
    }
    const model = genAI.getGenerativeModel({ model: session.modelName, systemInstruction: SYSTEM_PROMPT });
    const history = session.chat ? await session.chat.getHistory() : [];
    // Work on a fresh chat: a truncated or blocked reply never enters saved history.
    const chat = model.startChat({ history, generationConfig: generationConfig(session.modelName) });
    try {
        const result = await chat.sendMessage(message);
        const reply = getCompleteReply(result.response);
        session.chat = chat;
        return reply;
    } catch (error) {
        // No raw provider errors: they can contain request URLs or credentials.
        console.warn('ASINMEX chat: response unavailable', error.code || error.status || 'PROVIDER_ERROR');
        return UNAVAILABLE_REPLY;
    }
}

/**
 * Función auxiliar para extraer datos del historial de chat cuando el lead se completa.
 */
async function extractLeadDataFromHistory(sessionId) {
    const session = chatSessions.get(sessionId);
    if (!session || !session.modelName || !session.chat) return {};

    try {
        // Obtener historial de la conversación actual
        const history = await session.chat.getHistory();
        const conversationText = history.map(msg => msg.parts.map(p => p.text).join(" ")).join("\n");

        const extractPrompt = `
        Analiza el siguiente historial de conversación y determina si el usuario es un cliente de crédito (B2C) o un profesional buscando una alianza inmobiliaria (B2B).
        
        Extrae la información según corresponda y devuelve ÚNICAMENTE un objeto JSON plano sin formato markdown ni bloques de código.

        Si es un cliente de crédito (B2C):
        {
          "tipoUsuario": "B2C - Busca Crédito",
          "nombre": "Nombre completo",
          "tipoCredito": "INFONAVIT, FOVISSSTE o Bancario",
          "telefono": "Teléfono o WhatsApp"
        }

        Si es una inmobiliaria o aliado profesional (B2B):
        {
          "tipoUsuario": "B2B - Inmobiliaria / Alianza",
          "nombre": "Nombre completo",
          "inmobiliaria": "Nombre de la Inmobiliaria o Independiente",
          "enfoque": "Venta/Renta, Bróker, o ambos",
          "telefono": "Teléfono o WhatsApp",
          "correo": "Correo electrónico"
        }

        Si algún dato no fue provisto en la conversación, coloca "No provisto" como su valor.
        No incluyas explicaciones ni marcas de código como \`\`\`json. Devuelve solo el string de JSON válido.

        HISTORIAL:
        ${conversationText}
        `;

        // Usamos el modelo que haya resultado exitoso para esta sesión
        const modelInstance = genAI.getGenerativeModel({ model: session.modelName });
        const result = await modelInstance.generateContent(extractPrompt);
        const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const leadData = JSON.parse(responseText);
        return leadData;
    } catch (e) {
        console.error("Error extrayendo JSON de lead:", e);
        return { error: "No se pudieron parsear los datos correctamente." };
    }
}

module.exports = {
    processChatMessage,
    extractLeadDataFromHistory
};
