const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { processChatMessage, extractLeadDataFromHistory } = require('./services/aiService');
const { sendLeadEmail } = require('./services/emailService');

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

app.listen(PORT, () => {
    console.log(\`🚀 Servidor de ASINMEX Chatbot corriendo en el puerto \${PORT}\`);
});
