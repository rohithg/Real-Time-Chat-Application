const socket = io();
let currentRoom = 'general';
let username = '';

function joinChat() {
    username = document.getElementById('usernameInput').value.trim();
    if (username) {
        socket.emit('join', username);
        document.getElementById('usernameModal').style.display = 'none';
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
    }
}

// Room switching
document.querySelectorAll('.room').forEach(room => {
    room.addEventListener('click', () => {
        document.querySelectorAll('.room').forEach(r => r.classList.remove('active'));
        room.classList.add('active');
        currentRoom = room.dataset.room;
        document.getElementById('currentRoom').textContent = currentRoom;
        socket.emit('join-room', currentRoom);
    });
});

// Send message
document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (text) {
        socket.emit('send-message', { text });
        input.value = '';
    }
}

// Typing indicator
let typingTimeout;
document.getElementById('messageInput').addEventListener('input', () => {
    socket.emit('typing');
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stop-typing');
    }, 1000);
});

// Socket events
socket.on('new-message', (message) => {
    addMessage(message);
});

socket.on('system-message', (message) => {
    const messagesDiv = document.getElementById('messages');
    const messageEl = document.createElement('div');
    messageEl.className = 'system-message';
    messageEl.textContent = message.text;
    messagesDiv.appendChild(messageEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on('user-list', (users) => {
    const userList = document.getElementById('userList');
    const userCount = document.getElementById('userCount');
    userCount.textContent = users.length;
    userList.innerHTML = users.map(user => 
        \`<div class="user-item">\${user.username}</div>\`
    ).join('');
});

socket.on('user-typing', (username) => {
    const indicator = document.getElementById('typingIndicator');
    indicator.textContent = \`\${username} is typing...\`;
    setTimeout(() => {
        indicator.textContent = '';
    }, 1000);
});

socket.on('message-history', (messages) => {
    messages.forEach(message => addMessage(message));
});

function addMessage(message) {
    const messagesDiv = document.getElementById('messages');
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    messageEl.innerHTML = \`
        <div class="message-header">
            <span class="message-author">\${message.username}</span>
            <span class="message-time">\${new Date(message.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="message-text">\${message.text}</div>
    \`;
    messagesDiv.appendChild(messageEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
