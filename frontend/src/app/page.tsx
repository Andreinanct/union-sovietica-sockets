"use client";

import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleGuestLogin = async () => {
    try {
      const res = await axios.post('http://localhost:5000/auth/guest', {}, { withCredentials: true });
      if (res.data) {
        router.push('/chat');
      }
    } catch (error) {
      console.error("Guest login failed", error);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center w-96">
        <h1 className="text-3xl font-bold mb-6 text-blue-400">Welcome</h1>
        <p className="mb-8 text-gray-300">Sign in to join the collaborative chat</p>

        <div className="space-y-4">
          <a
            href="http://localhost:5000/auth/google"
            className="block w-full bg-white text-gray-900 font-bold py-3 px-4 rounded hover:bg-gray-200 transition duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </a>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-sm">Or</span>
            <div className="flex-grow border-t border-gray-600"></div>
          </div>

          <button
            onClick={handleGuestLogin}
            className="block w-full bg-gray-700 text-white font-bold py-3 px-4 rounded hover:bg-gray-600 transition duration-200 border border-gray-600"
          >
            Temporary Session
          </button>
        </div>
      </div>
    </div>
  );
}
