const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true para port 465, false para otros puertos
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * Envía un correo con los datos del lead recopilado por el chatbot
 * @param {Object} leadData - Objeto con los datos del cliente (nombre, tipoCredito, telefono, etc)
 */
async function sendLeadEmail(leadData) {
    try {
        const mailOptions = {
            from: `"ASINMEX Bot" <${process.env.SMTP_USER}>`,
            to: process.env.DESTINATION_EMAIL || 'creditoinfonavit@asinmex.mx',
            subject: `🏠 Nuevo Lead Precalificado por Bot: ${leadData.nombre || 'Cliente Potencial'}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #0B132B;">
                    <h2 style="color: #0D9488;">Nuevo Lead Recopilado por Chatbot</h2>
                    <p>Un usuario ha sido precalificado por el asistente virtual y ha solicitado contacto con un asesor humano. Aquí están sus datos:</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        ${Object.entries(leadData).map(([key, value]) => `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; text-transform: capitalize;">${key}</td>
                                <td style="padding: 10px; border: 1px solid #ddd;">${value}</td>
                            </tr>
                        `).join('')}
                    </table>
                    <br>
                    <p>Por favor, asignen a un asesor certificado para que se ponga en contacto a la brevedad posible.</p>
                    <hr>
                    <small style="color: #666;">Este correo fue generado automáticamente por el Chatbot de ASINMEX.</small>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Correo de lead enviado: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error enviando el correo de lead:', error);
        return false;
    }
}

/**
 * Envía la conversación al usuario final por correo electrónico
 * @param {string} toEmail - Correo del usuario
 * @param {Array} history - Historial de mensajes [{ sender: 'bot'|'user', text: string }]
 */
async function sendConversationEmail(toEmail, history) {
    try {
        const mailOptions = {
            from: `"ASINMEX Soporte" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: `📄 Tu historial de asesoría hipotecaria - ASINMEX`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #0B132B; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #0D9488; text-align: center; margin-top: 0;">Historial de Asesoría ASINMEX</h2>
                    <p>Hola,</p>
                    <p>A solicitud tuya, aquí te enviamos el historial completo de la conversación que tuviste con nuestro asistente virtual:</p>
                    
                    <div style="background-color: #F8FAFC; padding: 15px; border-radius: 8px; margin: 20px 0; max-height: 400px; overflow-y: auto; border: 1px solid #edf2f7;">
                        ${history.map(msg => `
                            <div style="margin-bottom: 15px; text-align: ${msg.sender === 'user' ? 'right' : 'left'};">
                                <span style="font-size: 11px; color: #718096; display: block; font-weight: bold; text-transform: uppercase;">
                                    ${msg.sender === 'user' ? 'Tú' : 'Asistente ASINMEX'}
                                </span>
                                <div style="display: inline-block; background-color: ${msg.sender === 'user' ? '#0D9488' : '#FFFFFF'}; color: ${msg.sender === 'user' ? '#FFFFFF' : '#2D3748'}; padding: 10px 15px; border-radius: 12px; margin-top: 5px; border: ${msg.sender === 'user' ? 'none' : '1px solid #E2E8F0'}; max-width: 85%; font-size: 14px; text-align: left;">
                                    ${msg.text}
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; font-size: 13px; color: #78350F; font-weight: bold;">
                            ⚠️ Nota importante:
                        </p>
                        <p style="margin: 5px 0 0 0; font-size: 13px; color: #78350F; line-height: 1.5;">
                            La asesoría es sin costo y el servicio podría ser ajustado en cuanto el expediente se ingrese al INFONAVIT o exista una actualización a las políticas del organismo.
                        </p>
                    </div>

                    <p>Si tienes más dudas o deseas iniciar con tu trámite formalmente, recuerda que puedes escribirnos por WhatsApp al <strong>55 7506 7356</strong>.</p>
                    
                    <hr style="border: none; border-top: 1px solid #edf2f7; margin: 20px 0;">
                    <p style="font-size: 12px; color: #A0AEC0; text-align: center; margin: 0;">
                        Este correo fue generado de forma automática a solicitud del usuario.<br>
                        © 2026 ASINMEX. Todos los derechos reservados.
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Correo de historial enviado a %s: %s', toEmail, info.messageId);
        return true;
    } catch (error) {
        console.error('Error enviando el historial de correo:', error);
        return false;
    }
}

module.exports = {
    sendLeadEmail,
    sendConversationEmail
};
