import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;
const SERVER_URL_STORAGE_KEY = 'guess_what_server_url';

export function getServerUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(SERVER_URL_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  }
  // Vite environment variable if configured
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
}

export function setCustomServerUrl(url: string | null): void {
  if (typeof window === 'undefined') return;
  if (!url || !url.trim()) {
    localStorage.removeItem(SERVER_URL_STORAGE_KEY);
  } else {
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    clean = clean.replace(/\/+$/, '');
    localStorage.setItem(SERVER_URL_STORAGE_KEY, clean);
  }
  reconnectSocket();
}

export function isUsingCustomServerUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem(SERVER_URL_STORAGE_KEY));
}

export function reconnectSocket(): Socket {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
  return getSocket();
}

export function getSocket(): Socket {
  if (!socketInstance) {
    const targetUrl = getServerUrl();
    socketInstance = io(targetUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 8000,
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Connected to Guess What? game server at', targetUrl, 'with ID:', socketInstance?.id);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('⚠️ Socket connection error to', targetUrl, err.message);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from game server:', reason);
    });
  }
  return socketInstance;
}

