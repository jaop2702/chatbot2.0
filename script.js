

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
       const chatbotAlert = document.getElementById('chatbot-alert');
    const chatbotAlertMessage = document.getElementById('chatbot-alert-message');
    const stagedMediaPreview = document.getElementById('staged-media-preview'); // NUEVO
    const stagedMediaName = document.getElementById('staged-media-name'); // NUEVO
    const removeStagedMediaButton = document.getElementById('remove-staged-media'); // NUEVO
    const stagedAudioPlayer = document.getElementById('staged-audio-player'); // Tu reproductor de previsualización
    const audioTimer = document.getElementById('audio-timer'); // NUEVO: Referencia al contador de tiempo

    //PRODUCCION
 //const N8N_WEBHOOK_URL = 'https://n8n.dployxperts.com/webhook/360e834f-3af9-4d76-8bf5-11684c2e6f1c';
//QA
 //const N8N_WEBHOOK_URL = 'https://n8n.dployxperts.com/webhook-test/360e834f-3af9-4d76-8bf5-11684c2e6f1c';
//odoo 2.0 QA
//const N8N_WEBHOOK_URL = 'https://n8n.dployxperts.com/webhook-test/fff5809a-2905-43d3-a7ca-1b931a40a23f';
//odoo 2.0 Prod
const N8N_WEBHOOK_URL = 'https://n8n.dployxperts.com/webhook/fff5809a-2905-43d3-a7ca-1b931a40a23f';


    let sessionId = null;// ... (sessionId generation) ...
    try {
        sessionId = localStorage.getItem('chatbotSessionId');
        if (!sessionId) {
            sessionId = 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now();
            localStorage.setItem('chatbotSessionId', sessionId);
        }
        console.log("ID de Sesión de la conversación:", sessionId); // Para depuración
    } catch (e) {
        console.error("Error al gestionar el ID de sesión en localStorage. Se usará un ID temporal.", e);
        sessionId = 'fallback_session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now();
    }

    // --- NUEVAS CONSTANTES PARA LÍMITES ---
    const MAX_AUDIO_DURATION_SECONDS = 180; // 3 minutos
    const MAX_FILE_SIZE_MB = 3; // 3 MB
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;


    let typingIndicatorElement = null;
    let mediaRecorder; 
    let audioChunks = []; 
 let recordingTimerInterval; // Para el contador de grabación
    let stagedFile = null; // Variable para archivo en preparación
    let stagedAudio = null; // Variable para audio en preparación
        // --- NUEVO: Función para mostrar alertas personalizadas en el chatbot ---
    

    // --- NUEVO: Función para alternar visibilidad de enviar/micro ---
function toggleSendMicButtons() {
    const hasInputText = userInput.value.trim().length > 0;
    const hasStagedMedia = stagedFile || stagedAudio ;
    console.log("--- toggleSendMicButtons ---"); // LOG
    console.log("userInput.value.trim():", userInput.value.trim()); // LOG
    console.log("hasInputText:", hasInputText); // LOG
    console.log("hasStagedMedia:", hasStagedMedia); // LOG
    console.log("stagedFile:", stagedFile); // LOG
    console.log("stagedAudio:", stagedAudio); // LOG

    if (hasInputText) {
        sendButton.classList.remove('hidden-by-send'); 
        micButton.classList.add('hidden-by-send');
        console.log("Mostrando Enviar, ocultando Mic."); // LOG
    } else {
        sendButton.classList.add('hidden-by-send'); 
        micButton.classList.remove('hidden-by-send');
        console.log("Ocultando Enviar, mostrando Mic."); // LOG
    }
}    function showStagedMediaPreview(type, data, audioBlob = null ) {
        stagedMediaPreview.classList.add('active');
        stagedAudioPlayer.style.display = 'none';
        stagedAudioPlayer.removeAttribute('src');
        audioTimer.style.display = 'none'; // Ocultar timer por defecto al mostrar preview

        if (type === 'file') {
            stagedMediaName.textContent = `📄 ${data.fileName}`;
        } else if (type === 'audio') {
            stagedMediaName.textContent = `🎵 Mensaje de voz `;
            if (audioBlob) {
                const blobUrl = URL.createObjectURL(audioBlob);
                stagedAudioPlayer.src = blobUrl;
                stagedAudioPlayer.style.display = 'block';
                stagedAudioPlayer.play();
                audioTimer.style.display = 'inline'; // Mostrar el timer al previsualizar audio
                audioTimer.textContent = '00:00'; // Asegurar que el timer esté en 00:00 al inicio de la previsualización
            }
        }
        sendButton.innerHTML = '➤';
        userInput.focus();
        removeStagedMediaButton.classList.add('active');
        //toggleSendMicButtons(); // NUEVO: Llamar para ajustar visibilidad de enviar/micro
    }

    // --- NUEVO: Función para ocultar la previsualización del medio ---
    function hideStagedMediaPreview() {
        stagedMediaPreview.classList.remove('active');
        stagedMediaName.textContent = '';
        stagedFile = null;
        stagedAudio = null;
        sendButton.innerHTML = '➤'; // Asegurar que el botón de enviar sea el icono
        removeStagedMediaButton.classList.remove('active'); // Oculta el botón 'X'
        stagedAudioPlayer.style.display = 'none';
        stagedAudioPlayer.removeAttribute('src');
        if (stagedAudioPlayer.srcObject) {
            URL.revokeObjectURL(stagedAudioPlayer.src);
                  }
        audioTimer.style.display = 'none'; // Ocultar timer
        audioTimer.textContent = '00:00'; // Resetear timer
         toggleSendMicButtons(); // NUEVO: Llamar para ajustar visibilidad de enviar/micro
    }
    
 
       
    // --- Funciones showTypingIndicator, hideTypingIndicator (sin cambios significativos) ---
      function showTypingIndicator() {
        if (!typingIndicatorElement) {
            typingIndicatorElement = document.createElement('div');
            typingIndicatorElement.classList.add('message', 'bot-message', 'typing-indicator');
            typingIndicatorElement.innerHTML = '<p><span>.</span><span>.</span><span>.</span></p>';
        }
        chatMessages.appendChild(typingIndicatorElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;

       
    }
    
     function hideTypingIndicator() {
        if (typingIndicatorElement && typingIndicatorElement.parentNode) {
            typingIndicatorElement.parentNode.removeChild(typingIndicatorElement);
        }
    }

    function showChatbotAlert(message) {
    // Asegúrate de que estas constantes estén definidas al inicio de tu script
    // const chatbotAlert = document.getElementById('chatbot-alert');
    // const chatbotAlertMessage = document.getElementById('chatbot-alert-message');

    if (chatbotAlert && chatbotAlertMessage) {
        chatbotAlertMessage.textContent = message;
        chatbotAlert.classList.add('active');
        // Oculta el popup automáticamente después de 3 segundos
        setTimeout(() => {
            chatbotAlert.classList.remove('active');
        }, 3000); 
    } else {
        // Fallback si los elementos del popup no se encuentran (por si acaso)
        alert(message);
    }
}
    // --- Funciones abrir/cerrar/reset chat ---
    function openChat() {
        chatContainer.classList.add('active');
        openChatButton.style.display = 'none'; // Oculta el botón principal
        userInput.focus();
    }

    function closeChat() {
        chatContainer.classList.remove('active');
        openChatButton.style.display = 'flex';// Muestra el botón principal
    }

    function resetChat() {
        chatMessages.innerHTML = `
            <div class="message bot-message">
                <p>¡Hola! Soy tu asistente virtual DployXperts. ¿En qué puedo ayudarte hoy?</p>
            </div>
        `;
        userInput.value = '';
        hideStagedMediaPreview(); // NUEVO: Limpiar previsualización al resetear
        console.log("Chat reseteado. Nuevo ID de Sesión:", sessionId);
        userInput.focus();
        toggleSendMicButtons(); // NUEVO: Ajustar visibilidad de enviar/micro al resetear
    }

    // --- Lógica del chatbot ---
    function appendMessage(sender, messageData, type = 'text') { // messageData puede ser string (texto) o File/Blob object
         const messageWrapper = document.createElement('div'); // NUEVO: Wrapper para la burbuja y el timestamp
        messageWrapper.classList.add('message-wrapper');
        // Añadir clase de alineación al wrapper (para usuario a la derecha, bot a la izquierda)
        if (sender === 'user') {
            messageWrapper.classList.add('user-message-wrapper');
        } else {
            messageWrapper.classList.add('bot-message-wrapper');
        }
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        const messageParagraph = document.createElement('p');

        if (type === 'text') {
            messageParagraph.innerHTML = messageData;
 		messageDiv.appendChild(messageParagraph);

        } else if (type === 'audio') {
const audioTag = document.createElement('audio');
            audioTag.controls = true; // Mostrar los controles de reproducción (play/pause, volumen)
            audioTag.src = messageData.data; // messageData.data ya es la cadena Base64 'data:audio/webm;base64,...'
            audioTag.type = messageData.mimeType; // Asignar el tipo MIME para compatibilidad
            messageDiv.appendChild(audioTag); 
            messageParagraph.innerHTML = `🎵 Mensaje de voz `; // Usar 'size' del Blob
		messageDiv.appendChild(messageParagraph);
            // Aquí podrías añadir un <audio> tag para reproducir el audio si lo guardaste en URL.createObjectURL
        } else if (type === 'file') {
            messageParagraph.innerHTML = `📄 Archivo adjunto: ${messageData.fileName} (${(messageData.fileSize / 1024).toFixed(2)} KB)`; // Placeholder para archivo
            // Aquí podrías añadir un enlace para descargar o previsualizar el archivo
  		messageDiv.appendChild(messageParagraph);

        }

      
        // --- NUEVO: Añadir botón de copiar solo para mensajes del bot de tipo texto ---
        if (sender === 'bot' && type === 'text') {
            const copyButton = document.createElement('button');
            copyButton.classList.add('copy-button');
            copyButton.innerHTML = '<img src="https://cdn-icons-png.flaticon.com/512/3388/3388588.png" alt="Copiar">'; 
            copyButton.title = 'Copiar mensaje';

            copyButton.addEventListener('click', () => {
                const textToCopy = messageParagraph.innerText; 
                
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        const originalIconHTML = copyButton.innerHTML;
                        copyButton.innerHTML = '✅'; 
                        copyButton.classList.add('copied-feedback'); 

                        setTimeout(() => {
                            copyButton.innerHTML = originalIconHTML; 
                        }, 1500);
                    })
                    .catch(err => {
                        console.error('Error al copiar el mensaje:', err);
                        alert('No se pudo copiar el mensaje. Por favor, inténtalo manualmente.'); 
                    });
            });
            messageDiv.appendChild(copyButton);
        }

        // --- NUEVO: Crear y añadir el timestamp ---
        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('message-timestamp');
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true });
        const dateString = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const statusText = sender === 'user' ? 'Enviado el' : 'Recibido el'; // "Enviado" o "Recibido"
        timestampSpan.textContent = `${statusText} ${dateString} - ${timeString} `;
        
        // Adjuntar la burbuja del mensaje y el timestamp al wrapper
        messageWrapper.appendChild(messageDiv);
        messageWrapper.appendChild(timestampSpan);

        chatMessages.appendChild(messageWrapper); // Añadir el wrapper completo al contenedor de mensajes
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage() {
        let textMessageContent = userInput.value.trim(); // Texto actual en el input
        // Validar si hay algo que enviar (texto, audio o archivo)
        if (!textMessageContent && !stagedAudio && !stagedFile) {
            return; 
        }
        
        if (textMessageContent) {
            appendMessage('user', textMessageContent, 'text');
        }
        if (stagedAudio) {
            appendMessage('user', stagedAudio, 'audio');
        }  
        if (stagedFile) {
            appendMessage('user', stagedFile, 'file');
        }        
        userInput.value = ''; // Limpiar el input después de mostrarlo en el historial

        // Deshabilitar UI
        userInput.disabled = true;
        sendButton.disabled = true;
        sendButton.innerHTML = 'Enviando...'; // Cambiar innerHTML a texto durante el envío
        micButton.disabled = true;
        attachFileButton.disabled = true;

        showTypingIndicator(); 

        try {
            const requestBody = {
                sessionId: sessionId
            };

            if (textMessageContent) {
                requestBody.message = textMessageContent;
            }
            // Incluir datos de audio o archivo si están en preparación
            if (stagedAudio) { 
                requestBody.audio = stagedAudio;
            } 
            if (stagedFile) {
                requestBody.file = stagedFile;
            }


            // Ocultar la previsualización de medios
            hideStagedMediaPreview(); // NUEVO: Ocultar previsualización después de preparar el body

            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const botResponse = data.response || "Lo siento, no pude obtener una respuesta.";
            appendMessage('bot', botResponse);

        } catch (error) {
            console.error('Error al conectar con el chatbot de n8n:', error);
            if (error.message === "No hay contenido real para enviar.") {
                appendMessage('bot', 'No se detectó contenido para enviar. Escribe un mensaje o adjunta algo.');
            } else if (error.name === 'AbortError') {
                appendMessage('bot', 'El asistente está tardando demasiado en responder. Por favor, intenta de nuevo más tarde.');
            } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                 appendMessage('bot', 'Hubo un problema de conexión con el asistente. Asegúrate de tener Internet.');
            } else if (error instanceof SyntaxError && error.message.includes('Unexpected end of JSON input')) {
                 appendMessage('bot', 'La respuesta del asistente no fue completa. Por favor, intenta de nuevo.');
            }
            else {
                 appendMessage('bot', 'Lo siento, hubo un problema inesperado. Por favor, inténtalo de nuevo más tarde.');
            }
        } finally {
            hideTypingIndicator(); 

            userInput.disabled = false;
            sendButton.disabled = false;
            sendButton.innerHTML = '➤'; // Vuelve al icono de enviar
            micButton.disabled = false;
            attachFileButton.disabled = false;

            userInput.focus();
           // toggleSendMicButtons(); // NUEVO: Asegurar visibilidad correcta después de enviar
        }
    }

    // --- Lógica de Grabación de Voz ---
    micButton.addEventListener('click', async () => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                let secondsRecorded = 0; // NUEVO: Contador de segundos

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstart = () => { // NUEVO: Al iniciar la grabación
                    secondsRecorded = 0;
                    audioTimer.textContent = '00:00';
                    audioTimer.style.display = 'inline'; // Mostrar el timer
                    recordingTimerInterval = setInterval(() => {
                        secondsRecorded++;
                        const mins = Math.floor(secondsRecorded / 60);
                        const secs = secondsRecorded % 60;
                        const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                        audioTimer.textContent = formattedTime;
                        // *** NUEVO: Detener grabación si excede el tiempo máximo ***
                        if (secondsRecorded >= MAX_AUDIO_DURATION_SECONDS) {
                            mediaRecorder.stop();
                            console.log(`Grabación automática detenida: ${MAX_AUDIO_DURATION_SECONDS} segundos alcanzados.`);
                            alert(`Grabación detenida automáticamente: límite de ${MAX_AUDIO_DURATION_SECONDS} segundos.`);
                        }
                    }, 1000);
                    console.log("Grabación iniciada. Timer activado.");
                };

                mediaRecorder.onstop = async () => {
                    clearInterval(recordingTimerInterval); // NUEVO: Detener el timer
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    console.log("AudioBlob creado. Tipo:", audioBlob.type, "Tamaño:", audioBlob.size, "bytes");
                    if (audioBlob.size > 0) {
                        const reader = new FileReader();
                        reader.readAsDataURL(audioBlob);

                        reader.onloadend = () => {
                            stagedAudio = { data: reader.result, mimeType: audioBlob.type, fileSize: audioBlob.size };
                       sendMessage(userInput.value.trim(), 'file', stagedAudio);  };
                    } else {
                        console.warn("Grabación de audio vacía.");
                        alert("Grabación vacía. Intenta hablar más claro.");
                        hideStagedMediaPreview(); // Ocultar previsualización si el audio está vacío
                    }
                    audioChunks = [];
                    micButton.classList.remove('recording');
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                micButton.classList.add('recording');
                 console.log("Grabación iniciada."); // Se movió al onstart
            } catch (err) {
                console.error("Error al acceder al micrófono:", err);
                alert("No se pudo acceder al micrófono. Asegúrate de dar permiso.");
                // Asegurar que el timer se oculte si falla el acceso al micrófono
                audioTimer.style.display = 'none'; 
                audioTimer.textContent = '00:00';
                // Si falla el acceso al micrófono, asegurar que los botones se ajusten
                toggleSendMicButtons(); 
            }
        } else if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            console.log("Grabación detenida.");
        }
    });

    // --- Lógica de Adjuntar Archivo ---
    attachFileButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            // *** NUEVO: Validar tipo de archivo (no video) ***
            if (file.type.startsWith('video/')) {
                showChatbotAlert('No se permiten archivos de video.');
                event.target.value = ''; // Limpiar el input para permitir adjuntar de nuevo
                toggleSendMicButtons(); // Asegurar estado correcto de botones
                return; // Detener el proceso
            }
            // *** NUEVO: Validar tamaño del archivo ***
            if (file.size > MAX_FILE_SIZE_BYTES) {
                showChatbotAlert(`El archivo excede el tamaño máximo de ${MAX_FILE_SIZE_MB} MB.`);
                event.target.value = ''; // Limpiar el input
                toggleSendMicButtons(); // Asegurar estado correcto de botones
                return; // Detener el proceso
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onloadend = () => {
                stagedFile = { data: reader.result, fileName: file.name, mimeType: file.type, fileSize: file.size }; // Almacenar, no enviar
                showStagedMediaPreview('file', stagedFile); // NUEVO: Mostrar previsualización
            };
        }
        event.target.value = '';
        toggleSendMicButtons(); // NUEVO: Ajustar visibilidad de enviar/micro al seleccionar archivo
    });

    // --- NUEVO: Event Listener para el botón de remover medio preparado ---
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
    hideStagedMediaPreview(); // Ocultar previsualización al cargar la página
    toggleSendMicButtons(); // NUEVO: Establecer estado inicial de los botones de enviar/micro
// Y añadir el listener para el input de texto que dispara el toggle
    userInput.addEventListener('input', toggleSendMicButtons); // <<< ESTO FALTABA EN EL CÓDIGO QUE ME DISTE ANTES
});

