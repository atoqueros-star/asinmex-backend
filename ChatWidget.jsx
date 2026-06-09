import React, { useState, useEffect, useRef } from 'react';

// Generador de ID de sesión simple
const generateSessionId = () => Math.random().toString(36).substring(2, 15);

/**
 * Componente ChatWidget para integrar en Lovable o cualquier proyecto React
 * Asegúrate de cambiar la constante BACKEND_URL cuando despliegues el servidor.
 */
const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef(null);

  // URL del Backend - Cámbiala cuando subas a Render o tu hosting
  // Ejemplo: 'https://asinmex-chatbot-backend.onrender.com'
  const BACKEND_URL = 'http://localhost:3000';

  useEffect(() => {
    // Inicializar sesión al cargar
    setSessionId(generateSessionId());
    setMessages([
      { sender: 'bot', text: '¡Hola! Soy el asistente virtual oficial de ASINMEX. 🏠 Te ayudaremos con tu crédito de forma segura. ¿Te interesa usar crédito INFONAVIT, FOVISSSTE o bancario?' }
    ]);
  }, []);

  useEffect(() => {
    // Auto-scroll al último mensaje
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleChat = () => setIsOpen(!isOpen);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch(\`\${BACKEND_URL}/api/chat\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMsg }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, { sender: 'bot', text: data.reply }]);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Hubo un error de conexión. Por favor, intenta de nuevo.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.widgetContainer}>
      {/* Botón flotante para abrir/cerrar */}
      {!isOpen && (
        <button onClick={toggleChat} style={styles.floatingButton}>
          💬 Chat
        </button>
      )}

      {/* Ventana de Chat */}
      {isOpen && (
        <div style={styles.chatWindow}>
          <div style={styles.header}>
            <span style={{ fontWeight: 'bold' }}>ASINMEX Asistente</span>
            <button onClick={toggleChat} style={styles.closeBtn}>✖</button>
          </div>

          <div style={styles.messagesContainer}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={msg.sender === 'user' ? styles.userBubble : styles.botBubble}
              >
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div style={styles.botBubble}>
                <span style={styles.typing}>Escribiendo...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} style={styles.inputForm}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe un mensaje..."
              style={styles.inputField}
            />
            <button type="submit" style={styles.sendBtn}>Enviar</button>
          </form>
        </div>
      )}
    </div>
  );
};

// Estilos en línea básicos (Premium Corporate-Empathetic)
const styles = {
  widgetContainer: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 9999,
    fontFamily: '"Inter", sans-serif'
  },
  floatingButton: {
    backgroundColor: '#0D9488', // Esmeralda Patrimonial
    color: '#fff',
    border: 'none',
    borderRadius: '50px',
    padding: '15px 25px',
    fontSize: '16px',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s',
  },
  chatWindow: {
    width: '350px',
    height: '500px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 5px 20px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#0B132B', // Azul Prestigio
    color: '#fff',
    padding: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '16px',
  },
  messagesContainer: {
    flex: 1,
    padding: '15px',
    overflowY: 'auto',
    backgroundColor: '#F8FAFC',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#0D9488',
    color: '#fff',
    padding: '10px 15px',
    borderRadius: '15px 15px 0 15px',
    maxWidth: '80%',
    fontSize: '14px',
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    color: '#333',
    border: '1px solid #e2e8f0',
    padding: '10px 15px',
    borderRadius: '15px 15px 15px 0',
    maxWidth: '80%',
    fontSize: '14px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  typing: {
    color: '#888',
    fontStyle: 'italic',
  },
  inputForm: {
    display: 'flex',
    padding: '10px',
    borderTop: '1px solid #eee',
    backgroundColor: '#fff',
  },
  inputField: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '20px',
    outline: 'none',
    paddingLeft: '15px',
  },
  sendBtn: {
    backgroundColor: '#0D9488',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    padding: '0 15px',
    marginLeft: '10px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default ChatWidget;
