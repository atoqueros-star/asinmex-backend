# Corrección del asistente — 2026-10-15

Actualiza el contenido al sitio vigente: primera asesoría gratuita, servicios posteriores cotizados, Infonavit/Fovissste en CDMX y Estado de México, cuatro etapas sin garantía de autorización. Responde antes de pedir datos y remite a contacto público sin prometer envío, cita o seguimiento confirmado.

El límite anterior era 250 tokens y cualquier texto devuelto se mostraba como respuesta. Ahora se aceptan únicamente candidatos con `finishReason: STOP` y texto no vacío. Los resultados truncados, bloqueados o fallidos devuelven una alternativa de contacto y no contaminan el historial válido. Para el modelo existente Gemini 2.5 Flash se configura presupuesto de pensamiento 0 y salida máxima de 1536 tokens. Se retira el salto automático a un modelo no validado en el despliegue. `GEMINI_MODEL` es opcional; por defecto conserva `gemini-2.5-flash`.

Referencias técnicas: [GenerateContent y FinishReason](https://ai.google.dev/api/generate-content), [ThinkingConfig](https://ai.google.dev/api/generate-content#ThinkingConfig). La validez del modelo y las credenciales en producción todavía debe comprobarse; las pruebas usan un proveedor simulado, sin llaves ni envíos.

Validación: `npm test`, cuatro pruebas con casos de respuesta completa, vacía, MAX_TOKENS, SAFETY, CONTINUATION y fallo de proveedor; comprueba que el historial previo se conserva. `node --check aiService.js` aprobado.

## Publicación pendiente

El frontend público sigue conectado a `https://asinmex-backend.onrender.com`. El usuario reporta GCP, pero no se identificó su servicio de chatbot. No se despliega esta rama automáticamente ni se crean servicios, cuentas o credenciales. Confirmar proyecto, región, servicio y revisión antes de publicar. Después configurar la URL pública real en `VITE_CHAT_BACKEND_URL` del frontend y recompilar.

Este parche no certifica el backend completo para producción: las sesiones siguen en memoria, el endpoint heredado de diagnóstico es público y el envío heredado de correo depende de un marcador generado por el modelo. El nuevo prompt no solicita ese marcador, pero un prompt no es un control de autorización. Antes de abrir campañas, revisar y verificar esos caminos del servidor y la recepción de consultas. No se modificaron aquí IAM, secretos ni los endpoints de correo.

Costo: el límite mayor puede aumentar tokens por respuesta libre; no hay nuevos reintentos automáticos ni infraestructura contratada. El costo real del proveedor y el servicio GCP siguen sin medirse.
