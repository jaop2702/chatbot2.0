<script type="text/javascript">

document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const openChatButton = document.getElementById('open-chat-button');
    const closeChatButton = document.getElementById('close-chat-button');
    const resetChatButton = document.getElementById('reset-chat-button');
    const attachFileButton = document.getElementById('attach-file-button');
    const fileInput = document.getElementById('file-input');
    const micButton = document.getElementById('mic-button');
    const chatContainer = document.getElementById('chat-container');

    const stagedMediaPreview = document.getElementById('staged-media-preview'); // NUEVO
    const stagedMediaName = document.getElementById('staged-media-name'); // NUEVO
    const removeStagedMediaButton = document.getElementById('remove-staged-media'); // NUEVO
    const stagedAudioPlayer = document.getElementById('staged-audio-player'); // Tu reproductor de previsualización

    const N8N_WEBHOOK_URL = 'https://n8n.dployxperts.com/webhook/360e834f-3af9-4d76-8bf5-11684c2e6f1c'; // ¡¡¡Asegúrate de que esta URL sea la correcta y final!!!

    let sessionId = null;
    try {
        sessionId = localStorage.getItem('chatbotSessionId');
        if (!sessionId) {
            sessionId = 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now();
            localStorage.setItem('chatbotSessionId', sessionId);
        }
        console.log("ID de Sesión de la conversación:", sessionId);
    } catch (e) {
        console.error("Error al gestionar el ID de sesión en localStorage. Se usará un ID temporal.", e);
        sessionId = 'fallback_session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now();
    }


    let typingIndicatorElement = null;
    let mediaRecorder; 
    let audioChunks = []; 

    let stagedFile = null; // Variable para archivo en preparación
    let stagedAudio = null; // Variable para audio en preparación
    const originalSendButtonText = "Enviar"; // El texto original del botón de enviar es 'Enviar'

    // --- NUEVO: Función para alternar visibilidad de enviar/micro ---
    function toggleSendMicButtons() {
        const hasInputText = userInput.value.trim().length > 0;
        const hasStagedMedia = stagedFile || stagedAudio;

        console.log("--- toggleSendMicButtons ---");
        console.log("userInput.value.trim():", userInput.value.trim());
        console.log("hasInputText:", hasInputText);
        console.log("hasStagedMedia:", hasStagedMedia);
        console.log("stagedFile:", stagedFile);
        console.log("stagedAudio:", stagedAudio);

        if (hasInputText || hasStagedMedia) {
            sendButton.classList.remove('hidden-by-send'); 
            micButton.classList.add('hidden-by-send');
            console.log("Mostrando Enviar, ocultando Mic.");
        } else {
            sendButton.classList.add('hidden-by-send'); 
            micButton.classList.remove('hidden-by-send');
            console.log("Ocultando Enviar, mostrando Mic.");
        }
    }

    // --- NUEVO: Función para mostrar la previsualización del medio ---
    function showStagedMediaPreview(type, data, audioBlob = null) {
        stagedMediaPreview.classList.add('active');
        stagedAudioPlayer.style.display = 'none'; 
        stagedAudioPlayer.removeAttribute('src');
        audioTimer.style.display = 'none'; 

        if (type === 'file') {
            stagedMediaName.textContent = `📄 ${data.fileName} (${(data.fileSize / 1024).toFixed(2)} KB)`;
        } else if (type === 'audio') {
            stagedMediaName.textContent = `🎵 Mensaje de voz (${(data.fileSize / 1024).toFixed(2)} KB)`;
            if (audioBlob) {
                const blobUrl = URL.createObjectURL(audioBlob);
                stagedAudioPlayer.src = blobUrl;
                stagedAudioPlayer.style.display = 'block';
                // stagedAudioPlayer.play(); // Opcional: no auto-reproducir
            }
        }
        sendButton.innerHTML = '➤';
        userInput.focus();
        removeStagedMediaButton.classList.add('active');
        toggleSendMicButtons(); // Ya se llama aquí, bien
    }

    // --- NUEVO: Función para ocultar la previsualización del medio ---
    function hideStagedMediaPreview() {
        console.log("hideStagedMediaPreview() llamado. Intentando ocultar botón 'X'.");
        stagedMediaPreview.classList.remove('active');
        stagedMediaName.textContent = '';
        stagedFile = null;
        stagedAudio = null;
        sendButton.innerHTML = '➤';
        removeStagedMediaButton.classList.remove('active');
        stagedAudioPlayer.style.display = 'none';
        stagedAudioPlayer.removeAttribute('src');
        if (stagedAudioPlayer.srcObject) {
            URL.revokeObjectURL(stagedAudioPlayer.src);
        }
        audioTimer.style.display = 'none';
        audioTimer.textContent = '00:00';
        toggleSendMicButtons(); // <<< ESTO FALTABA! Llamar para ajustar visibilidad de enviar/micro
    }

    // --- Funciones showTypingIndicator, hideTypingIndicator (sin cambios significativos) ---
    function showTypingIndicator() { /* ... */ }
    function hideTypingIndicator() { /* ... */ }

    // --- Funciones abrir/cerrar/reset chat ---
    function openChat() { /* ... */ }
    function closeChat() { /* ... */ }
    function resetChat() {
        chatMessages.innerHTML = `
            <div class="message bot-message">
                <p>¡Hola! Soy tu asistente virtual DployXperts. ¿En qué puedo ayudarte hoy?</p>
            </div>
        `;
        userInput.value = '';
        hideStagedMediaPreview(); // Limpiar previsualización y llama a toggleSendMicButtons
        console.log("Chat reseteado. Nuevo ID de Sesión:", sessionId);
        userInput.focus();
    }

    // --- Lógica del chatbot ---
    function appendMessage(sender, messageData, type = 'text') { /* ... */ }
    async function sendMessage() { /* ... */ }

    // --- Lógica de Grabación de Voz ---
    micButton.addEventListener('click', async () => { /* ... */ });

    // --- Lógica de Adjuntar Archivo ---
    attachFileButton.addEventListener('click', () => { /* ... */ });
    fileInput.addEventListener('change', (event) => { /* ... */ });

    // --- Event Listener para el botón de remover medio preparado ---
    removeStagedMediaButton.addEventListener('click', hideStagedMediaPreview);


    // --- Event Listeners para enviar (texto, archivo o audio) ---
    sendButton.addEventListener('click', () => sendMessage());
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            sendMessage();
        }
    });

    // --- Event Listeners para botones del header ---
    openChatButton.addEventListener('click', openChat);
    closeChatButton.addEventListener('click', closeChat);
    resetChatButton.addEventListener('click', resetChat);

    // --- Asegurar que el chat inicie SIEMPRE cerrado y vacío ---
    chatContainer.classList.remove('active');
    openChatButton.classList.remove('hidden');
    hideStagedMediaPreview(); // Esto también llama a toggleSendMicButtons para el estado inicial
    
    // Y añadir el listener para el input de texto que dispara el toggle
    userInput.addEventListener('input', toggleSendMicButtons); // <<< ESTO FALTABA EN EL CÓDIGO QUE ME DISTE ANTES


});