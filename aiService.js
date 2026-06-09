const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

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
4. Una vez que tengas esos 3 datos (nombre, tipo de crédito, teléfono), agradécele amablemente y dile que un asesor certificado se pondrá en contacto pronto. Además, invítalo con entusiasmo a agendar directamente su videollamada de asesoría gratuita de 30 minutos en el día y horario que prefiera ingresando a nuestra agenda oficial de Google Calendar en este enlace: https://calendar.app.google/ebWvUTZsjkoLFeDEA
   Al final de tu respuesta, debes emitir EXACTAMENTE el siguiente texto oculto para que el sistema envíe el correo: [LEAD_COMPLETO_LISTO].
5. Mantén tus respuestas muy breves y directas, adaptadas para un widget de chat. Usa emojis ocasionalmente (🏠, ✨, 📱).
`;

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
async function processChatMessage(sessionId, message) {
    let session = chatSessions.get(sessionId);

    // Si la sesión no existe o es del formato viejo, la inicializamos correctamente
    if (!session || !session.modelName) {
        session = {
            modelName: "gemini-2.5-flash",
            chat: null
        };
        chatSessions.set(sessionId, session);
    }

    if (!session.chat) {
        const modelInstance = genAI.getGenerativeModel({ 
            model: session.modelName,
            systemInstruction: SYSTEM_PROMPT
        });
        session.chat = modelInstance.startChat({
            generationConfig: {
                maxOutputTokens: 250,
                temperature: 0.3,
            },
        });
    }

    try {
        const result = await session.chat.sendMessage(message);
        const responseText = result.response.text();
        return responseText;
    } catch (error) {
        console.error(`Error en Gemini API con modelo ${session.modelName}:`, error);

        // Si falla (por 503 Service Unavailable, 429, etc.), intentamos con el modelo alternativo
        const fallbackModel = session.modelName === "gemini-2.5-flash" ? "gemini-3.5-flash" : "gemini-2.5-flash";
        console.log(`Intentando cambiar al modelo de respaldo: ${fallbackModel}`);

        try {
            // Obtenemos el historial acumulado para no perder el contexto del usuario
            const history = await session.chat.getHistory();
            
            const fallbackModelInstance = genAI.getGenerativeModel({ 
                model: fallbackModel,
                systemInstruction: SYSTEM_PROMPT
            });
            
            const newChat = fallbackModelInstance.startChat({
                history: history, // Importamos el historial previo
                generationConfig: {
                    maxOutputTokens: 250,
                    temperature: 0.3,
                },
            });

            // Guardamos el nuevo estado de la sesión
            session.modelName = fallbackModel;
            session.chat = newChat;

            // Reintentamos enviar el mensaje del usuario
            const result = await newChat.sendMessage(message);
            const responseText = result.response.text();
            return responseText;
        } catch (fallbackError) {
            console.error("Error también en el modelo alternativo:", fallbackError);
            return `[ERROR DEBUG]: ${error.message} | Respaldo: ${fallbackError.message}`;
        }
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
        Basado en el siguiente historial de conversación, extrae el nombre del cliente, tipo de crédito y número de teléfono. 
        Devuelve ÚNICAMENTE un objeto JSON con las claves: "nombre", "tipoCredito", "telefono". Si falta algo, pon "No provisto".
        
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
