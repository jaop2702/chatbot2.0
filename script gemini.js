<script type="text/javascript">
<![CDATA[
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

    const stagedMediaPreview = document.getElementById('staged-media-preview'); 
    const stagedMediaName = document.getElementById('staged-media-name'); 
    const removeStagedMediaButton = document.getElementById('remove-staged-media'); 
    const stagedAudioPlayer = document.getElementById('staged-audio-player'); 
    const audioTimer = document.getElementById('audio-timer');

    const N8N_WEBHOOK_URL = 'https://n8n.dployxperts.com/webhook/360e34f-3af9-4d76-8bf5-11684c2e6f1c'; // ¡¡¡Revisa esta URL!!!

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

    // --- NUEVAS CONSTANTES PARA LÍMITES ---
    const MAX_AUDIO_DURATION_SECONDS = 180; // 3 minutos
    const MAX_FILE_SIZE_MB = 3; // 3 MB
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;


    let typingIndicatorElement = null;
    let mediaRecorder; 
    let audioChunks = []; 
    let recordingTimerInterval; // Para el contador de grabación

    let stagedFile = null; 
    let stagedAudio = null; 
    const originalSendButtonText = "Enviar"; 

    function toggleSendMicButtons() { /* ... sin cambios ... */ }
    function showStagedMediaPreview(type, data, audioBlob = null) { /* ... */ }
    function hideStagedMediaPreview() { /* ... */ }
    function showTypingIndicator() { /* ... */ }
    function hideTypingIndicator() { /* ... */ }
    function openChat() { /* ... */ }
    function closeChat() { /* ... */ }
    function resetChat() { /* ... */ }
    function appendMessage(sender, messageData, type = 'text') { /* ... */ }

    async function sendMessage() { /* ... */ }

    // --- Lógica de Grabación de Voz (¡CAMBIOS AQUÍ para el límite de tiempo!) ---
    micButton.addEventListener('click', async () => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' }); 
                audioChunks = [];
                let secondsRecorded = 0; 

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstart = () => { 
                    secondsRecorded = 0;
                    audioTimer.textContent = '00:00';
                    audioTimer.style.display = 'inline';
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
                    clearInterval(recordingTimerInterval); 
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    console.log("AudioBlob creado. Tipo:", audioBlob.type, "Tamaño:", audioBlob.size, "bytes");
                    if (audioBlob.size > 0) {
                        const reader = new FileReader();
                        reader.readAsDataURL(audioBlob);

                        reader.onloadend = () => {
                            stagedAudio = { data: reader.result, mimeType: audioBlob.type, fileSize: audioBlob.size };
                            showStagedMediaPreview('audio', stagedAudio, audioBlob); 
                        };
                    } else {
                        console.warn("Grabación de audio vacía.");
                        alert("Grabación vacía. Intenta hablar más claro.");
                        hideStagedMediaPreview(); 
                    }
                    audioChunks = [];
                    micButton.classList.remove('recording');
                    stream.getTracks().forEach(track => track.stop()); 
                };

                mediaRecorder.start();
                micButton.classList.add('recording');
            } catch (err) {
                console.error("Error al acceder al micrófono:", err);
                alert("No se pudo acceder al micrófono. Asegúrate de dar permiso.");
                audioTimer.style.display = 'none'; 
                audioTimer.textContent = '00:00';
                toggleSendMicButtons(); 
            }
        } else if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            console.log("Grabación detenida.");
        }
    });

    // --- Lógica de Adjuntar Archivo (¡CAMBIOS AQUÍ para los límites de tipo y tamaño!) ---
    attachFileButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            // *** NUEVO: Validar tipo de archivo (no video) ***
            if (file.type.startsWith('video/')) {
                alert('No se permiten archivos de video.');
                event.target.value = ''; // Limpiar el input para permitir adjuntar de nuevo
                toggleSendMicButtons(); // Asegurar estado correcto de botones
                return; // Detener el proceso
            }
            // *** NUEVO: Validar tamaño del archivo ***
            if (file.size > MAX_FILE_SIZE_BYTES) {
                alert(`El archivo excede el tamaño máximo de ${MAX_FILE_SIZE_MB} MB.`);
                event.target.value = ''; // Limpiar el input
                toggleSendMicButtons(); // Asegurar estado correcto de botones
                return; // Detener el proceso
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onloadend = () => {
                stagedFile = { data: reader.result, fileName: file.name, mimeType: file.type, fileSize: file.size };
                showStagedMediaPreview('file', stagedFile);
            };
        }
        event.target.value = '';
        toggleSendMicButtons(); 
    });

    // ... (el resto de tus event listeners) ...
});
]]>
</script>