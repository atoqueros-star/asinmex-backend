const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { processChatMessage, extractLeadDataFromHistory } = require('./aiService');
const { sendLeadEmail, sendConversationEmail } = require('./emailService');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Middlewares
app.use(cors()); // Permite peticiones desde el frontend (Lovable)
app.use(express.json());

// Ruta de salud del servidor (útil para plataformas gratuitas como Render)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'ASINMEX Chatbot Backend is running' });
});

// Ruta principal del Chat
app.post('/api/chat', async (req, res) => {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos: sessionId y message' });
    }

    // Prevención de abuso de carga (Payload Abuse)
    if (typeof message !== 'string' || message.length > 1000) {
        return res.status(400).json({ error: 'El mensaje excede el tamaño máximo permitido de 1000 caracteres.' });
    }

    try {
        // Procesamos el mensaje con la IA
        let reply = await processChatMessage(sessionId, message);

        // Verificamos si el bot ha completado la recolección de datos
        if (reply.includes('[LEAD_COMPLETO_LISTO]')) {
            // Limpiamos el mensaje para que el usuario no vea el código interno
            reply = reply.replace('[LEAD_COMPLETO_LISTO]', '').trim();

            // Extraer datos usando la misma IA
            const leadData = await extractLeadDataFromHistory(sessionId);
            
            // Enviamos el correo de forma asíncrona
            sendLeadEmail(leadData)
                .then(success => {
                    if(success) console.log('✅ Lead enviado a ASINMEX');
                    else console.error('❌ Falló el envío del lead');
                });
        }

        res.json({ reply });
    } catch (error) {
        console.error('Error en /api/chat:', error);
        res.status(500).json({ error: 'Hubo un error procesando el mensaje.' });
    }
});

// Ruta para exportar la conversación por correo electrónico
app.post('/api/export', async (req, res) => {
    const { email, history } = req.body;

    if (!email || !history || !Array.isArray(history)) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos: email y history (debe ser un arreglo)' });
    }

    // Prevención de abuso de carga (Payload Abuse)
    if (typeof email !== 'string' || email.length > 254) {
        return res.status(400).json({ error: 'El correo electrónico excede el tamaño máximo permitido.' });
    }

    if (history.length > 50) {
        return res.status(400).json({ error: 'El historial excede la cantidad máxima permitida de 50 mensajes.' });
    }

    for (const msg of history) {
        if (!msg || typeof msg.text !== 'string' || msg.text.length > 1000) {
            return res.status(400).json({ error: 'Uno o más mensajes del historial exceden el tamaño máximo permitido de 1000 caracteres.' });
        }
    }

    try {
        const success = await sendConversationEmail(email, history);
        if (success) {
            res.json({ success: true, message: 'Historial enviado correctamente.' });
        } else {
            res.status(500).json({ error: 'No se pudo enviar el correo de historial.' });
        }
    } catch (error) {
        console.error('Error en /api/export:', error);
        res.status(500).json({ error: 'Hubo un error interno procesando la exportación.' });
    }
});

// Ruta de diagnóstico para verificar el estado de la API Key de Google
app.get('/api/diagnose', async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ 
                error: 'GEMINI_API_KEY no está configurada en las variables de entorno de Render.' 
            });
        }
        
        // Ocultamos la mayor parte del key por seguridad (mostramos los últimos 4 caracteres)
        const maskedKey = apiKey.length > 8 ? `...${apiKey.slice(-4)}` : 'Muy corta o inválida';

        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(apiKey);
        
        const modelsToTest = [
            "gemini-1.5-flash",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-2.5-flash",
            "gemini-3.5-flash"
        ];
        
        const testResults = {};
        for (const modelName of modelsToTest) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hola");
                testResults[modelName] = {
                    success: true,
                    reply: result.response.text().trim()
                };
            } catch (err) {
                testResults[modelName] = {
                    success: false,
                    error: err.message
                };
            }
        }

        res.json({
            maskedKey,
            testResults
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor de ASINMEX Chatbot corriendo en el puerto ${PORT}`);
});
