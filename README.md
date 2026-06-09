# Guía de Instalación y Despliegue: ASINMEX Chatbot

Hemos creado la estructura completa de tu backend y el componente frontend. Aquí te explico cómo subirlo a internet de forma gratuita.

## 1. Configuración de Credenciales (SMTP e IA)

Antes de subir el código, necesitas dos cosas clave que configurarás como "Variables de Entorno" en tu servidor:

*   **Google Gemini API Key:** Es gratuita. Ve a [Google AI Studio](https://aistudio.google.com/), inicia sesión con tu cuenta de Google y genera una API Key.
*   **SMTP para enviar los correos:** Como me pediste, hemos configurado Nodemailer. Si usas un correo como `creditoinfonavit@asinmex.mx` que está alojado en Gmail o Google Workspace, necesitas generar una **Contraseña de Aplicación**:
    1. Ve a tu cuenta de Google -> Seguridad.
    2. Activa la Verificación en 2 pasos.
    3. Busca "Contraseñas de aplicaciones" y crea una nueva (ej. "Chatbot"). Te dará una clave de 16 letras. Esa es tu `SMTP_PASS`.

## 2. Despliegue del Backend (Gratis en Render.com)

1. Sube la carpeta `asinmex-chatbot` a un repositorio de **GitHub**.
2. Entra a [Render.com](https://render.com/) y crea una cuenta gratuita.
3. Haz clic en **"New +" -> "Web Service"**.
4. Conecta tu repositorio de GitHub.
5. Configura lo siguiente:
   * **Name:** asinmex-chatbot
   * **Environment:** Node
   * **Build Command:** `npm install`
   * **Start Command:** `node server.js`
6. Ve a la sección de **"Environment Variables"** en Render y añade exactamente las que creamos en tu archivo `.env.example`:
   * `GEMINI_API_KEY` = (tu llave de Google)
   * `SMTP_HOST` = smtp.gmail.com (o el de tu hosting)
   * `SMTP_PORT` = 465
   * `SMTP_SECURE` = true
   * `SMTP_USER` = (el correo desde donde se envían, ej. alertas@asinmex.mx)
   * `SMTP_PASS` = (la contraseña de aplicación)
   * `DESTINATION_EMAIL` = creditoinfonavit@asinmex.mx

¡Listo! Al hacer clic en Deploy, tu servidor estará vivo y te dará una URL (ej. `https://asinmex-chatbot.onrender.com`).

## 3. Integración en el Frontend (Lovable)

1. Abre la carpeta `frontend-snippet` y copia el código de `ChatWidget.jsx`.
2. Pega ese código en tu proyecto de Lovable o tu editor de código.
3. **Paso crucial:** En la línea 17 de `ChatWidget.jsx`, cambia `BACKEND_URL` por la URL que te dio Render (ej. `const BACKEND_URL = 'https://asinmex-chatbot.onrender.com';`).
4. Importa y coloca el `<ChatWidget />` en tu `App.js` o en el Layout principal para que aparezca en todas las páginas.
