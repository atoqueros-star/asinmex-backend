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

module.exports = {
    sendLeadEmail
};
