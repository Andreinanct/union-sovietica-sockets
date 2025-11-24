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

// Shim for passport 0.6+ compatibility with cookie-session
app.use((req, res, next) => {
    if (req.session && !req.session.regenerate) {
        req.session.regenerate = (cb) => {
            cb();
        };
    }
    if (req.session && !req.session.save) {
        req.session.save = (cb) => {
            cb();
        };
    }
    next();
});
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
        res.redirect('http://localhost:3000/chat');
    }
);

app.get('/api/current_user', (req, res) => {
    res.send(req.user);
});

app.get('/api/logout', async (req, res) => {
    if (req.user) {
        const user = req.user;
        // Check if it's a guest user
        if (user.googleId && user.googleId.startsWith('guest-')) {
            try {
                console.log(`Cleaning up guest user: ${user.name}`);
                // Delete all messages sent by this user
                await prisma.message.deleteMany({
                    where: { senderId: user.id }
                });
                // Delete all messages received by this user (private chats)
                await prisma.message.deleteMany({
                    where: { receiverId: user.id }
                });
                // Delete the user
                await prisma.user.delete({
                    where: { id: user.id }
                });
            } catch (e) {
                console.error("Error cleaning up guest user:", e);
            }
        }
    }
    req.logout((err) => {
        if (err) {
            console.error("Error logging out:", err);
            return next(err);
        }
        res.redirect('http://localhost:3000');
    });
});

app.post('/auth/guest', async (req, res) => {
    try {
        const randomNum = Math.floor(Math.random() * 10000);
        const guestName = `Usuario${randomNum}`;
        const guestId = `guest-${Date.now()}-${randomNum}`;

        const newUser = await prisma.user.create({
            data: {
                googleId: guestId,
                name: guestName,
                email: null,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${guestName}` // Random avatar
            }
        });

        // Manually log in the user
        req.login(newUser, (err) => {
            if (err) {
                return res.status(500).json({ error: "Login failed" });
            }
            return res.json(newUser);
        });
    } catch (e) {
        console.error("Guest login error:", e);
        res.status(500).json({ error: "Could not create guest session" });
    }
});

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                avatar: true,
                googleId: true
            }
        });
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Socket.io Logic
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    socket.on('join_chat', async (user) => {
        onlineUsers.set(socket.id, user);
        socket.join(user.id.toString()); // Join a room with their own ID for private messages

        // Broadcast to others that a user connected (for Toasts)
        socket.broadcast.emit('user_connected', user);

        io.emit('update_online_users', Array.from(onlineUsers.values()));
    });

    socket.on('get_chat_history', async ({ otherUserId, currentUserId }) => {
        try {
            let whereClause;
            if (otherUserId === 0) {
                // Global chat: fetch messages with no receiver
                whereClause = { receiverId: null };
            } else {
                // Private chat
                whereClause = {
                    OR: [
                        { senderId: currentUserId, receiverId: otherUserId },
                        { senderId: otherUserId, receiverId: currentUserId }
                    ]
                };
            }

            const messages = await prisma.message.findMany({
                where: whereClause,
                include: { sender: true },
                orderBy: { createdAt: 'asc' }
            });
            socket.emit('chat_history', messages);
        } catch (e) {
            console.error("Error fetching history", e);
        }
    });

    socket.on('send_message', async (data) => {
        try {
            // If receiverId is 0, treat as null (Global Chat)
            const receiverId = data.receiverId === 0 ? null : data.receiverId;

            const message = await prisma.message.create({
                data: {
                    content: data.content,
                    senderId: data.senderId,
                    receiverId: receiverId
                },
                include: { sender: true }
            });

            if (receiverId) {
                // Private message
                io.to(receiverId.toString()).emit('receive_message', message); // To receiver
                socket.emit('receive_message', { ...message, tempId: data.tempId }); // To sender (with tempId for optimistic update)
            } else {
                // Group message
                io.emit('receive_message', { ...message, tempId: data.tempId });
            }
        } catch (e) {
            console.error("Error saving message", e);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
        const user = onlineUsers.get(socket.id);
        if (user) {
            socket.broadcast.emit('user_disconnected', user);
        }
        onlineUsers.delete(socket.id);
        io.emit('update_online_users', Array.from(onlineUsers.values()));
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
