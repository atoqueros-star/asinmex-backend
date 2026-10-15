# Chat ASINMEX — corrección y publicación autorizada, 2026-10-15

El asistente responde sobre Infonavit y Fovissste en CDMX y Estado de México, primera asesoría gratuita y costos posteriores por acuerdo. No exige datos personales para orientar, no garantiza crédito ni afirma que una consulta se recibió.

## Cambios

- Acepta sólo texto no vacío con `finishReason: STOP`. Presupuesto de salida1536 y pensamiento0 para Gemini2.5 Flash. Sin reintentos facturables ni salto a modelos inventados.
- Historial enviado por el navegador, máximo6 intercambios completos/12000 caracteres. Sin almacén de conversaciones ni recuperación por sessionId; el identificador heredado se ignora.
- Solicitud al proveedor abortada por el SDK a20 segundos. Errores503 sin detalles del proveedor; frontend ofrece preguntas frecuentes y WhatsApp.
- Se retiran rutas públicas de diagnóstico y exportación por correo y toda activación de correo mediante texto del modelo. La interfaz descarga un TXT local.
- JSON hasta64KB, mensaje hasta1000 caracteres, roles alternados, orígenes exactos de producción y preview. CORS no es autenticación.
- Protección inicial por proceso:30 consultas/minuto, máximo3 simultáneas,429 con Retry-After. El límite afecta a todos los visitantes de esa instancia y puede rechazar tráfico legítimo. No es cuota persistente/global ni sustituye el presupuesto configurado en el proveedor.
- `/health` muestra estado de configuración, versión de entrega y versión Node; nunca fragmentos de credenciales.200 indica configuración presente, no una llamada exitosa a Gemini.

## Infraestructura comprobada

El frontend público apunta a https://asinmex-backend.onrender.com. En los proyectos GCP accesibles no se identificó un servicio de chatbot: ASINMEX contiene gate-servicio/portal-servicio; los otros servicios inventariados pertenecen a VAULT. `universal-thunder-9j1d7` no permitió consultar servicios con la cuenta disponible. No se habilitaron APIs, crearon servicios ni cambiaron secretos/IAM.

Se autoriza publicar por petición directa del usuario. Backend primero; comprobar versión y respuestas reales antes de publicar el frontend desde Lovable. Volver al commit anterior si la nueva versión falla; no declarar éxito sólo por fusionar una PR.

## Pruebas previas

8 pruebas aprobadas en Node26.3.0: rechazos400/403/413/415/429/503, historial ajeno por mismo ID, errores del proveedor, respuesta cortada, recuperación de concurrencia y rutas retiradas404. Proveedor simulado, sin secretos ni correos. Auditoría independiente identificó y corrigió opciones rápidas ocultas durante espera, enlaces Markdown mal interpretados y un caso de prueba que no aislaba el máximo de historial.

`node regression-mutations.cjs` retiró temporalmente tres controles: finishReason, longitud de historial y configuración obligatoria. Cada mutación dio exit1 en su prueba; restaurados los archivos, las8 pruebas dieron exit0. El script restaura los archivos incluso tras error. Verifica un fallo de prueba, no autorización de producción.

Pendiente al redactar: observar versión/runtime y consultas reales de Render, publicación Lovable y recepción de prospectos. La disponibilidad del control del navegador está bloqueada por un fallo externo de la herramienta; no se atribuye ese bloqueo a ASINMEX.

Costo: preguntas rápidas locales sin IA; consultas libres consumen el modelo existente y pueden gastar más tokens que el límite anterior. Sin nuevo plan contratado. La cuota por proceso no acredita un presupuesto monetario mensual. Antes de anuncios falta verificar recepción real y medición de conversiones con el equipo.
