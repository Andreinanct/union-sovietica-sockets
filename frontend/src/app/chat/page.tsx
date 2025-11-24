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
    isOnline?: boolean;
}

interface Message {
    id?: number;
    content: string;
    senderId?: number;
    sender?: User;
    receiverId?: number | null;
    createdAt?: string;
    tempId?: string; // For optimistic updates
}

export default function ChatPage() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]); // All registered users
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [toast, setToast] = useState<{ message: string, visible: boolean }>({ message: '', visible: false });

    const selectedUserRef = useRef<User | null>(null); // Ref to track selected user in socket listeners
    const socketRef = useRef<Socket | null>(null); // Ref for cleanup
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Keep ref synced with state
    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    useEffect(() => {
        // Check auth
        const checkAuth = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/current_user', { withCredentials: true });
                if (res.data) {
                    setCurrentUser(res.data);
                    localStorage.setItem('user', JSON.stringify(res.data));
                    connectSocket(res.data);
                    fetchAllUsers();
                } else {
                    router.push('/');
                }
            } catch (err) {
                console.error("Auth check failed", err);
                router.push('/');
            }
        };

        checkAuth();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const fetchAllUsers = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/users');
            setAllUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false }));
        }, 3000);
    };

    const connectSocket = (user: User) => {
        // Prevent multiple connections
        if (socketRef.current) return;

        const newSocket = io('http://localhost:5000', {
            withCredentials: true,
        });

        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            console.log('Connected to socket server');
            newSocket.emit('join_chat', user);
        });

        newSocket.on('receive_message', (message: Message) => {
            const currentSelected = selectedUserRef.current;

            setMessages((prev) => {
                // If this message has a tempId AND we have it in our list, it's a confirmation
                if (message.tempId && prev.some(m => m.tempId === message.tempId)) {
                    return prev.map(m => m.tempId === message.tempId ? message : m);
                }

                // Logic for displaying new messages:
                // 1. If I am in Global Chat (id 0) and message is global (receiverId is null)
                if (currentSelected?.id === 0 && !message.receiverId) {
                    if (prev.some(m => m.id === message.id)) return prev;
                    return [...prev, message];
                }

                // 2. If I am in Private Chat and message matches that chat
                if (currentSelected?.id !== 0 && message.receiverId) {
                    if (message.senderId === user.id || (currentSelected && message.senderId === currentSelected.id)) {
                        if (prev.some(m => m.id === message.id)) return prev;
                        return [...prev, message];
                    }
                }

                return prev;
            });
        });

        newSocket.on('chat_history', (history: Message[]) => {
            setMessages(history);
        });

        newSocket.on('update_online_users', (users: User[]) => {
            const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());
            setOnlineUsers(uniqueUsers);
        });

        newSocket.on('user_connected', (connectedUser: User) => {
            showToast(`${connectedUser.name} connected`);
            // Refresh user list in case it's a new user
            fetchAllUsers();
        });

        newSocket.on('user_disconnected', (disconnectedUser: User) => {
            showToast(`${disconnectedUser.name} disconnected`);
        });

        setSocket(newSocket);
    };

    useEffect(() => {
        if (selectedUser && currentUser && socket) {
            socket.emit('get_chat_history', { otherUserId: selectedUser.id, currentUserId: currentUser.id });
        }
    }, [selectedUser, currentUser, socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket || !selectedUser) return;

        const messageContent = newMessage;
        const tempId = Date.now().toString(); // Generate temp ID
        setNewMessage('');

        const optimisticMessage: Message = {
            content: messageContent,
            senderId: currentUser?.id,
            sender: currentUser!,
            createdAt: new Date().toISOString(),
            tempId: tempId
        };

        // 1. Optimistic Update: Add to UI immediately
        setMessages((prev) => [...prev, optimisticMessage]);

        const messageData = {
            content: messageContent,
            senderId: currentUser?.id,
            receiverId: selectedUser.id,
            sender: currentUser,
            tempId: tempId // Send tempId to server
        };

        // 2. Send asynchronously
        try {
            socket.emit('send_message', messageData);
        } catch (error) {
            console.error("Failed to send", error);
            // Ideally remove the optimistic message here if it fails
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        window.location.href = "http://localhost:5000/api/logout";
    };

    if (!currentUser) return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>;

    // Merge lists: Show all users, check online status
    const displayUsers = allUsers.filter(u => u.id !== currentUser.id).map(user => {
        const isOnline = onlineUsers.some(online => online.id === user.id);
        return { ...user, isOnline };
    });

    return (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden relative">
            {/* Toast Notification */}
            {toast.visible && (
                <div className="absolute top-5 right-5 bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in-down flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            )}

            {/* Sidebar */}
            <div className="w-80 bg-gray-800 border-r border-gray-700 hidden md:flex flex-col">
                <div className="p-4 border-b border-gray-700 bg-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <img src={currentUser.avatar || "https://via.placeholder.com/40"} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-blue-500" />
                        <div>
                            <h2 className="font-bold text-lg">{currentUser.name}</h2>
                            <p className="text-xs text-green-400 flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span> Online
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <h3 className="px-4 py-3 text-gray-400 text-xs uppercase font-bold tracking-wider">Rooms</h3>
                    {/* Global Chat Room */}
                    <div
                        onClick={() => setSelectedUser({ id: 0, googleId: "global", name: "CollabSketch", email: "", avatar: "https://ui-avatars.com/api/?name=CS&background=6366f1&color=fff", isOnline: true })}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition duration-200 ${selectedUser?.id === 0 ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                    >
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">CS</div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">CollabSketch</p>
                            <p className="text-xs text-gray-400 truncate">Global Chat</p>
                        </div>
                    </div>

                    <h3 className="px-4 py-3 text-gray-400 text-xs uppercase font-bold tracking-wider mt-4">All Users</h3>
                    {displayUsers.map((user) => (
                        <div
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition duration-200 ${selectedUser?.id === user.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                        >
                            <div className="relative">
                                <img src={user.avatar || "https://via.placeholder.com/40"} alt={user.name} className="w-10 h-10 rounded-full" />
                                {user.isOnline && (
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-800"></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <p className="text-xs text-gray-400 truncate">{user.isOnline ? 'Online' : 'Offline'}</p>
                            </div>
                        </div>
                    ))}
                    {displayUsers.length === 0 && (
                        <div className="px-4 py-8 text-center text-gray-500 text-sm">
                            No other users found
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-700 bg-gray-800">
                    <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Chat */}
            <div className="flex-1 flex flex-col bg-gray-900">
                {selectedUser ? (
                    <>
                        {/* Header */}
                        <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-6 justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                {selectedUser.id === 0 ? (
                                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">CS</div>
                                ) : (
                                    <img src={selectedUser.avatar || "https://via.placeholder.com/40"} alt={selectedUser.name} className="w-10 h-10 rounded-full" />
                                )}
                                <div>
                                    <h3 className="font-bold">{selectedUser.name}</h3>
                                    <span className={`text-xs ${selectedUser.id === 0 ? 'text-indigo-400' : (selectedUser.isOnline ? 'text-green-400' : 'text-gray-500')}`}>
                                        {selectedUser.id === 0 ? 'Everyone' : (selectedUser.isOnline ? 'Online' : 'Offline')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-900 scrollbar-thin scrollbar-thumb-gray-700">
                            {messages.map((msg, idx) => {
                                const isMe = msg.senderId === currentUser.id;
                                // Show name if it's Global Chat (selectedUser.id === 0) and not me
                                const showName = selectedUser.id === 0 && !isMe;

                                return (
                                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        {showName && (
                                            <span className="text-xs text-gray-400 mb-1 ml-2">{msg.sender?.name || 'Unknown'}</span>
                                        )}
                                        <div className={`max-w-[75%] md:max-w-[60%] px-5 py-3 rounded-2xl shadow-md ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-100 rounded-bl-none'}`}>
                                            <p className="text-sm leading-relaxed">{msg.content}</p>
                                            <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
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
                            <form onSubmit={sendMessage} className="flex gap-3 max-w-4xl mx-auto">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-gray-700 text-white rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full p-3 transition duration-200 shadow-lg"
                                >
                                    <svg className="w-6 h-6 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Welcome to Collaborative Chat</h2>
                        <p>Select a user from the sidebar to start messaging.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
