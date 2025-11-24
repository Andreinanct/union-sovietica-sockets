"use client";

import { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    googleId: string;
    name: string;
    email: string;
    avatar: string;
}

interface Message {
    id?: number;
    content: string;
    senderId?: number;
    sender?: User;
    createdAt?: string;
}

export default function ChatPage() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]); // Simplified for now
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        // Check auth
        const checkAuth = async () => {
            try {
                // In a real app, we'd use a cookie or token. 
                // For this demo, we assume the backend session cookie is set.
                // We can fetch current user from backend.
                const res = await axios.get('http://localhost:5000/api/current_user', { withCredentials: true });
                if (res.data) {
                    setCurrentUser(res.data);
                    connectSocket(res.data);
                } else {
                    // Redirect to login if not auth (optional, or allow anon)
                    router.push('/');
                }
            } catch (err) {
                console.error("Auth check failed", err);
                router.push('/');
            }
        };

        checkAuth();

        return () => {
            if (socket) socket.disconnect();
        };
    }, []);

    const connectSocket = (user: User) => {
        const newSocket = io('http://localhost:5000', {
            withCredentials: true,
        });

        newSocket.on('connect', () => {
            console.log('Connected to socket server');
            newSocket.emit('join_chat', user);
        });

        newSocket.on('receive_message', (message: Message) => {
            setMessages((prev) => [...prev, message]);
        });

        // Load initial messages if implemented in backend
        // newSocket.on('initial_messages', (msgs) => setMessages(msgs));

        setSocket(newSocket);
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        const messageData = {
            content: newMessage,
            senderId: currentUser?.id,
            sender: currentUser // Optimistic update helper
        };

        socket.emit('send_message', messageData);
        setNewMessage('');
    };

    if (!currentUser) return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>;

    return (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-gray-800 border-r border-gray-700 hidden md:flex flex-col">
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-blue-400">Collaborative Chat</h2>
                    <div className="mt-4 flex items-center gap-3">
                        <img src={currentUser.avatar || "https://via.placeholder.com/40"} alt="Avatar" className="w-10 h-10 rounded-full" />
                        <div>
                            <p className="font-semibold text-sm">{currentUser.name}</p>
                            <p className="text-xs text-green-400">Online</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                    <h3 className="text-gray-400 text-xs uppercase font-bold mb-4">Online Users</h3>
                    {/* List would go here */}
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>{currentUser.name} (You)</span>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-700">
                    <a href="http://localhost:5000/api/logout" className="text-red-400 text-sm hover:underline">Logout</a>
                </div>
            </div>

            {/* Main Chat */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-6 justify-between md:justify-end">
                    <span className="md:hidden font-bold">Chat</span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-900">
                    {messages.map((msg, idx) => {
                        const isMe = msg.senderId === currentUser.id;
                        return (
                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                                    {!isMe && <p className="text-xs text-gray-400 mb-1">{msg.sender?.name || 'Unknown'}</p>}
                                    <p>{msg.content}</p>
                                    <p className="text-[10px] opacity-70 text-right mt-1">
                                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-gray-800 border-t border-gray-700">
                    <form onSubmit={sendMessage} className="flex gap-4 max-w-4xl mx-auto">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-700 text-white rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 transition duration-200"
                        >
                            <svg className="w-6 h-6 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
