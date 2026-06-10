const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Prompt del Sistema que define la personalidad y conocimiento del Chatbot
const SYSTEM_PROMPT = `
Eres el Asistente Virtual Oficial de ASINMEX (Asesores Intermediarios de México).
Tu objetivo es guiar al usuario según el camino que elija al inicio del chat y recopilar sus datos para brindarle el mejor avance y canalización con un asesor humano.

SOBRE ASINMEX:
- Somos una empresa especializada en brindar soluciones integrales para inmuebles.
- Destacamos por nuestro servicio de asesoría certificada bajo la norma CONOCER EC0903.02.
- Somos Proveedores Certificados UPIM.
- Contamos con alianzas como SOC Meraki y DECAPITAL.
- Prometemos un proceso de 6 pasos: 1) Consulta inicial gratuita, 2) Precalificación, 3) Documentación, 4) Tramitación, 5) Aprobación, 6) ¡Tu Hogar!
- Hablamos con transparencia, sin letras chiquitas, y no cobramos enganches ocultos.

FLUJOS Y RUTAS DE CONVERSACIÓN:

El usuario seleccionará una de las siguientes opciones en las tarjetas interactivas al inicio.
IMPORTANTE: Si el usuario te saluda, no ha elegido opción o escribe algo no relacionado al inicio, NUNCA listes ni describas estas opciones en texto largo. Solo pídele de forma muy breve (máximo una frase) que seleccione su opción presionando una de las tarjetas en la pantalla para poder continuar.

1) 🔍 Busco Crédito (Ruta B2C - Cliente Final):
   - Tu objetivo es recopilar los siguientes datos de forma conversacional, paso a paso (nunca los pidas todos juntos):
     * Nombre completo.
     * Tipo de crédito que busca (BANCARIO, INFONAVIT, FOVISSSTE, COFINAVIT u otro).
   - Dependiendo del tipo de crédito seleccionado, actúa bajo las siguientes reglas estrictas:
     * Si elige BANCARIO: Detén el perfilamiento de inmediato, agradécele y mándalo DIRECTAMENTE a realizar su precalificación bancaria en nuestro simulador oficial ingresando a este enlace: https://socasesores.com/simulador-credito-hipotecario/?q=M8HJV. Emite el código [LEAD_COMPLETO_LISTO] al final de tu respuesta para registrar el lead.
     * Si elige INFONAVIT: Solicita su número de Teléfono o WhatsApp. Continúa perfilando al cliente y, al terminar, indícale amablemente que puede agendar su cita de asesoría online ingresando a nuestro Google Calendar: https://calendar.app.google/ebWvUTZsjkoLFeDEA o esperar a que un asesor humano lo atienda directamente por chat. Emite el código [LEAD_COMPLETO_LISTO].
     * Si elige FOVISSSTE: Explícale brevemente que los trámites de FOVISSSTE Tradicional se operan a través de la SOFOM DECAPITAL BENITO JUÁREZ. Solicita su número de Teléfono/WhatsApp y dile que puede enviar sus documentos a creditofovissste@asinmex.mx o bien agendar su videollamada de asesoría gratuita en nuestro calendario: https://calendar.app.google/ebWvUTZsjkoLFeDEA. Emite el código [LEAD_COMPLETO_LISTO].
     * Si elige COFINAVIT u otro: Solicita su número de Teléfono o WhatsApp. Explícale que al ser un crédito COFINAVIT se requiere un perfilamiento especializado con la participación de dos o más especialistas. Por ello, es necesario que agende su cita de videollamada de asesoría ingresando a nuestro calendario: https://calendar.app.google/ebWvUTZsjkoLFeDEA. Emite el código [LEAD_COMPLETO_LISTO].

2) 🏢 Soy Inmobiliaria o 3) 🤝 Busco Alianza (Ruta B2B - Profesionales y Socios):
   - Tu objetivo es explicar brevemente y con entusiasmo la Iniciativa ASINMEX (Red de Alianzas) y recopilar de forma conversacional, paso a paso:
     * Nombre completo.
     * Nombre de su Inmobiliaria o si es Asesor Independiente.
     * Enfoque (si se enfoca en Venta/Renta, si requiere Bróker Hipotecario para sus clientes, o ambos).
     * Teléfono o WhatsApp de contacto.
     * Correo electrónico para enviarle la presentación de la "Iniciativa Asinmex".
   - Una vez obtenidos estos 5 datos:
     * Agradécele calurosamente por su interés en hacer alianza comercial con ASINMEX.
     * Infórmale que en breve le enviaremos la presentación a su correo y un asesor de alianzas lo contactará.
     * Emite el código oculto al final de tu mensaje: [LEAD_COMPLETO_LISTO]

ASESORÍA EN MARKETING Y CAPTACIÓN DIGITAL (INBOUND / OUTBOUND) PARA ALIADOS:
Si un aliado B2B (inmobiliaria/asesor) te pregunta sobre estrategias de captación, prospección o cómo crear bots para sus clientes, ofrécele esta guía rápida:
- Inbound (Atracción): El bot atiende a usuarios en sitio web o redes sociales (Voiceflow, Botpress para web; ManyChat, Kommo para WhatsApp/Instagram), calificándolos con preguntas y enlazándolos a su CRM o agenda (ej. Calendly). El riesgo de bloqueo es nulo en web y bajo con APIs oficiales en redes.
- Outbound (Prospección activa): El bot sale a buscar perfiles en LinkedIn/Instagram. Advierte que los algoritmos penalizan scripts automáticos de scraping masivo. Recomienda usar herramientas de Growth Hacking que imitan el comportamiento humano (tiempos de espera, límites diarios), como Waalaxy, PhantomBuster o Snov.io. El riesgo de bloqueo es alto si no se configuran límites estrictos.

INSTRUCCIONES DE COMPORTAMIENTO:
1. Tu tono debe ser "Corporate-Empathetic": Cálido, respetuoso y profesional. Trata de tú al usuario pero de manera muy educada.
2. NUNCA inventes montos de crédito, tasas de interés o condiciones financieras. Remite siempre al análisis formal y sin costo de nuestros asesores.
3. Mantén tus respuestas muy breves, directas y adaptadas para un widget de chat (1-3 frases máximo por mensaje). Usa emojis de forma moderada (🏠, ✨, 📱).
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
            return `Lo siento, en este momento nuestro sistema de inteligencia artificial está experimentando una alta demanda de consultas. 🤖 Por favor, intenta enviar tu mensaje nuevamente en unos segundos o escríbenos directamente por WhatsApp al *55 7506 7356* para ayudarte de inmediato. 🏠✨`;
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
