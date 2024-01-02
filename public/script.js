// public/script.js
const socket = io();

// Handle form submission
document.getElementById('send-button').addEventListener('click', () => {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();

    if (message !== '') {
        socket.emit('chat message', message);
        messageInput.value = '';
    }
});

// Handle incoming chat messages
socket.on('chat message', (msg) => {
    const chatMessages = document.getElementById('chat-messages');
    const newMessage = document.createElement('div');
    newMessage.textContent = msg;
    chatMessages.appendChild(newMessage);
});
