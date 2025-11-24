const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const passport = require('passport');
const cookieSession = require('cookie-session');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();
require('./config/passport');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000", // Next.js default port
        methods: ["GET", "POST"],
        credentials: true
    }
});

const prisma = new PrismaClient();

// Middleware
app.use(cors({
    origin: "http://localhost:3000",
    methods: "GET,POST,PUT,DELETE",
    credentials: true
}));
app.use(express.json());
app.use(cookieSession({
    name: 'session',
    keys: [process.env.COOKIE_KEY || 'secret_key'],
    maxAge: 24 * 60 * 60 * 1000
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/', (req, res) => {
    res.send('Collaborative Chat Backend Running');
});

// Auth Routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('http://localhost:5173/chat');
    }
);

app.get('/api/current_user', (req, res) => {
    res.send(req.user);
});

app.get('/api/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    socket.on('join_chat', async (user) => {
        // Logic to handle user joining, maybe broadcast to others
        io.emit('user_joined', user);
    });

    socket.on('send_message', async (data) => {
        // Save to DB
        try {
            if (data.senderId) {
                const message = await prisma.message.create({
                    data: {
                        content: data.content,
                        senderId: data.senderId
                    },
                    include: { sender: true }
                });
                io.emit('receive_message', message);
            } else {
                // Handle anonymous or temporary users if needed, for now assume auth
                io.emit('receive_message', { ...data, createdAt: new Date() });
            }
        } catch (e) {
            console.error("Error saving message", e);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
        io.emit('user_left', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
