const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

// Store active users and rooms
const users = new Map();
const rooms = new Map();
const messages = [];

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    // User joins
    socket.on('join', (username) => {
        users.set(socket.id, {
            id: socket.id,
            username: username,
            room: 'general'
        });
        
        socket.join('general');
        io.emit('user-list', Array.from(users.values()));
        
        socket.emit('message-history', messages);
        
        io.emit('system-message', {
            text: \`\${username} joined the chat\`,
            timestamp: new Date().toISOString()
        });
    });

    // Send message
    socket.on('send-message', (data) => {
        const user = users.get(socket.id);
        if (!user) return;

        const message = {
            id: Date.now(),
            username: user.username,
            text: data.text,
            room: user.room,
            timestamp: new Date().toISOString()
        };

        messages.push(message);
        if (messages.length > 100) messages.shift();

        io.to(user.room).emit('new-message', message);
    });

    // Private message
    socket.on('private-message', ({ to, text }) => {
        const sender = users.get(socket.id);
        const receiver = Array.from(users.values()).find(u => u.username === to);
        
        if (sender && receiver) {
            const message = {
                from: sender.username,
                text: text,
                timestamp: new Date().toISOString(),
                private: true
            };
            
            socket.emit('private-message', message);
            io.to(receiver.id).emit('private-message', message);
        }
    });

    // Join room
    socket.on('join-room', (roomName) => {
        const user = users.get(socket.id);
        if (!user) return;

        socket.leave(user.room);
        socket.join(roomName);
        user.room = roomName;

        io.emit('system-message', {
            text: \`\${user.username} joined #\${roomName}\`,
            timestamp: new Date().toISOString()
        });
    });

    // Typing indicator
    socket.on('typing', () => {
        const user = users.get(socket.id);
        if (user) {
            socket.to(user.room).emit('user-typing', user.username);
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            io.emit('system-message', {
                text: \`\${user.username} left the chat\`,
                timestamp: new Date().toISOString()
            });
            users.delete(socket.id);
            io.emit('user-list', Array.from(users.values()));
        }
    });
});

const PORT = 3003;
server.listen(PORT, () => {
    console.log(\`💬 Chat server running on http://localhost:\${PORT}\`);
});
