const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Inicializamos la API con la llave provista
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Prompt del Sistema que define la personalidad y conocimiento del Chatbot
const SYSTEM_PROMPT = `
Eres el Asistente Virtual Oficial de ASINMEX (Asesores Intermediarios de México).
Tu objetivo es precalificar clientes para créditos hipotecarios (INFONAVIT, FOVISSSTE, Bancarios) de manera cálida, empática y profesional, y recopilar sus datos para que un asesor humano los contacte.

SOBRE ASINMEX:
- Somos una empresa especializada en brindar soluciones integrales para inmuebles.
- Destacamos por nuestro servicio de asesoría certificada bajo la norma CONOCER EC0903.02.
- Somos Proveedores Certificados UPIM.
- Contamos con alianzas como SOC Meraki y DECAPITAL.
- Prometemos un proceso de 6 pasos: 1) Consulta inicial gratuita, 2) Precalificación, 3) Documentación, 4) Tramitación, 5) Aprobación, 6) ¡Tu Hogar!
- Hablamos con transparencia, sin letras chiquitas, y no cobramos enganches ocultos.

INSTRUCCIONES DE COMPORTAMIENTO:
1. Tu tono debe ser "Corporate-Empathetic": Cálido, respetuoso y profesional. Evita usar lenguaje burocrático difícil de entender. Trata de tú al cliente pero con respeto.
2. NUNCA inventes montos de crédito o tasas de interés. Si el cliente pregunta cuánto le prestan, dile que para saberlo con exactitud, uno de nuestros asesores certificados le hará un análisis sin costo.
3. El objetivo del chat es recopilar los siguientes datos (hazlo de forma conversacional, paso a paso, no pidas todo de golpe):
   - Nombre completo
   - Tipo de crédito que busca (INFONAVIT, FOVISSSTE o Bancario)
   - Número de teléfono o WhatsApp para que un asesor humano lo contacte.
4. Una vez que tengas esos 3 datos (nombre, tipo de crédito, teléfono), agradécele y dile que un asesor certificado se pondrá en contacto pronto y debes emitir EXACTAMENTE el siguiente texto oculto al final de tu respuesta para que el sistema detone el envío de correo: [LEAD_COMPLETO_LISTO].
5. Mantén tus respuestas muy breves y directas, adaptadas para un widget de chat. Usa emojis ocasionalmente (🏠, ✨, 📱).
`;

// Mantenemos un registro básico de sesiones en memoria (En producción usarías Redis o una Base de Datos)
const chatSessions = new Map();

/**
 * Procesa el mensaje del usuario y devuelve la respuesta del Chatbot
 * @param {string} sessionId - ID único para mantener la memoria de la conversación
 * @param {string} message - Mensaje del usuario
 * @returns {string} - Respuesta de la IA
 */
async function processChatMessage(sessionId, message) {
    let chat = chatSessions.get(sessionId);

    if (!chat) {
        // Inicializar un nuevo chat con la instrucción de sistema
        chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: "SYSTEM PROMPT (Acata estas instrucciones): " + SYSTEM_PROMPT }],
                },
                {
                    role: "model",
                    parts: [{ text: "Entendido. Actuaré como el Asistente Virtual Oficial de ASINMEX siguiendo las directrices." }],
                },
            ],
            generationConfig: {
                maxOutputTokens: 250,
                temperature: 0.3,
            },
        });
        chatSessions.set(sessionId, chat);
    }

    try {
        const result = await chat.sendMessage(message);
        const responseText = result.response.text();
        return responseText;
    } catch (error) {
        console.error("Error en Gemini API:", error);
        return "Disculpa, en este momento estamos experimentando problemas de conexión. Por favor, intenta de nuevo más tarde o envíanos un correo directamente a creditoinfonavit@asinmex.mx. 🙏";
    }
}

/**
 * Función auxiliar para extraer datos del historial de chat cuando el lead se completa.
 * En un sistema avanzado, le pediríamos a la propia IA que extraiga un JSON de la conversación.
 */
async function extractLeadDataFromHistory(sessionId) {
    const chat = chatSessions.get(sessionId);
    if (!chat) return {};

    // Obtener historial de la conversación actual
    const history = await chat.getHistory();
    const conversationText = history.map(msg => msg.parts.map(p => p.text).join(" ")).join("\n");

    // Hacemos una llamada rápida a la IA para que nos parsee los datos recopilados en JSON
    const extractPrompt = `
    Basado en el siguiente historial de conversación, extrae el nombre del cliente, tipo de crédito y número de teléfono. 
    Devuelve ÚNICAMENTE un objeto JSON con las claves: "nombre", "tipoCredito", "telefono". Si falta algo, pon "No provisto".
    
    HISTORIAL:
    ${conversationText}
    `;

    try {
        const result = await model.generateContent(extractPrompt);
        const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const leadData = JSON.parse(responseText);
        return leadData;
    } catch (e) {
        console.error("Error extrayendo JSON:", e);
        return { error: "No se pudieron parsear los datos correctamente." };
    }
}

module.exports = {
    processChatMessage,
    extractLeadDataFromHistory
};
