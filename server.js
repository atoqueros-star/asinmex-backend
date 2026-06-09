const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { processChatMessage, extractLeadDataFromHistory } = require('./aiService');
const { sendLeadEmail } = require('./emailService');

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
