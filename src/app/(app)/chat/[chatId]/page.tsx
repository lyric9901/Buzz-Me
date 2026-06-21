'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

// --- TypeScript Interfaces ---
interface Message {
  text: string;
  sender: 'me' | 'them';
  time: string;
}

interface HandshakePacket {
  type: 'HANDSHAKE_PUBLIC_KEY';
  keyData: string;
}

interface EncryptedPacket {
  type: 'ENCRYPTED_MSG';
  ciphertext: string;
  iv: string;
}

type P2PPacket = HandshakePacket | EncryptedPacket;

export default function ChatPage() {
  const params = useParams();
  // Ensure chatId is treated as a string, handling Next.js dynamic route quirks
  const chatId = Array.isArray(params?.chatId) ? params.chatId[0] : (params?.chatId as string | undefined);

  // --- State ---
  const [peerId, setPeerId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);
  
  // --- Refs ---
  // Using 'any' for PeerJS types to avoid needing massive @types/peerjs installs for a simple implementation
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  
  const localKeyPairRef = useRef<CryptoKeyPair | null>(null);
  const sharedSecretKeyRef = useRef<CryptoKey | null>(null);

  // --- Crypto Helpers ---
  const bufferToBase64 = (buf: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const base64ToBuffer = (base64: string): ArrayBuffer => Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;

  useEffect(() => {
    // 1. Generate local ECDH Key Pair
    const initCrypto = async () => {
      localKeyPairRef.current = await window.crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        ['deriveKey']
      );
    };
    initCrypto();

    // 2. Load PeerJS dynamically (Browser-only)
    import('peerjs').then((module) => {
      const Peer = module.default || module.Peer;
      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', (id: string) => {
        setPeerId(id);
        if (chatId && chatId !== 'list' && chatId.length > 5) {
          const conn = peer.connect(chatId);
          connRef.current = conn;
          setupConnectionListeners(conn);
        }
      });

      peer.on('connection', (incomingConn: any) => {
        connRef.current = incomingConn;
        setupConnectionListeners(incomingConn);
      });
    });

    return () => {
      if (peerRef.current) peerRef.current.destroy();
    };
  }, [chatId]);

  // 3. Setup Listeners & Handshake
  const setupConnectionListeners = (conn: any) => {
    conn.on('open', async () => {
      setConnected(true);
      
      // Load offline cache
      if (chatId) {
        const savedLogs = localStorage.getItem(`chat_${chatId}`);
        if (savedLogs) setMessages(JSON.parse(savedLogs));
      }

      // Export & Send Public Key
      if (localKeyPairRef.current) {
        const exportedPublicKey = await window.crypto.subtle.exportKey(
          'raw',
          localKeyPairRef.current.publicKey
        );

        const packet: HandshakePacket = {
          type: 'HANDSHAKE_PUBLIC_KEY',
          keyData: bufferToBase64(exportedPublicKey)
        };
        conn.send(packet);
      }
    });

    conn.on('data', async (data: any) => {
      const packet = data as P2PPacket;

      // Handle Key Exchange
      if (packet && packet.type === 'HANDSHAKE_PUBLIC_KEY') {
        if (!localKeyPairRef.current) return;
        
        try {
          const importedPeerPublicKey = await window.crypto.subtle.importKey(
            'raw',
            base64ToBuffer(packet.keyData),
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            []
          );

          sharedSecretKeyRef.current = await window.crypto.subtle.deriveKey(
            { name: 'ECDH', public: importedPeerPublicKey },
            localKeyPairRef.current.privateKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
          );

          setIsEncrypted(true);
        } catch (err) {
          console.error("Key derivation failed:", err);
        }
        return;
      }

      // Handle Encrypted Message
      if (packet && packet.type === 'ENCRYPTED_MSG') {
        if (!sharedSecretKeyRef.current) return;

        try {
          const iv = base64ToBuffer(packet.iv);
          const encryptedBytes = base64ToBuffer(packet.ciphertext);

          const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            sharedSecretKeyRef.current,
            encryptedBytes
          );

          const clearText = new TextDecoder().decode(decryptedBuffer);

          setMessages((prev) => {
            const updated: Message[] = [...prev, { text: clearText, sender: 'them', time: new Date().toLocaleTimeString() }];
            if (chatId) localStorage.setItem(`chat_${chatId}`, JSON.stringify(updated));
            return updated;
          });
        } catch (err) {
          console.error("Decryption failed:", err);
        }
      }
    });

    conn.on('close', () => {
      setConnected(false);
      setIsEncrypted(false);
    });
  };

  // 4. Encrypt & Send
  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputMessage.trim() || !connRef.current || !isEncrypted || !sharedSecretKeyRef.current) return;

    const messageString = inputMessage;
    setInputMessage('');

    try {
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encodedMessage = new TextEncoder().encode(messageString);

      const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        sharedSecretKeyRef.current,
        encodedMessage
      );

      const packet: EncryptedPacket = {
        type: 'ENCRYPTED_MSG',
        ciphertext: bufferToBase64(ciphertextBuffer),
        iv: bufferToBase64(iv)
      };

      connRef.current.send(packet);

      const newMsg: Message = { text: messageString, sender: 'me', time: new Date().toLocaleTimeString() };
      setMessages((prev) => {
        const updated = [...prev, newMsg];
        if (chatId) localStorage.setItem(`chat_${chatId}`, JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error("Encryption failed:", err);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-950 text-white p-4 font-sans">
      <header className="border-b border-slate-800 pb-3 mb-4">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 flex items-center gap-1.5">
          🔒 Encrypted TS Chat
        </h1>
        <p className="text-[11px] text-slate-500 truncate mt-0.5">My Peer Hash ID: {peerId || 'Spinning up keys...'}</p>
        
        <div className="flex items-center justify-between mt-3 bg-slate-900/50 p-2 rounded-lg border border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="text-xs text-slate-300">{connected ? 'P2P Open' : 'Offline'}</span>
          </div>
          <div className="text-xs font-mono">
            {isEncrypted ? (
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">✓ E2EE Active</span>
            ) : (
              <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Securing Line...</span>
            )}
          </div>
        </div>
      </header>

      {/* Messages Output */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg, index) => (
          <div key={index} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
              msg.sender === 'me' 
                ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-br-none shadow-md shadow-blue-950' 
                : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/50'
            }`}>
              {msg.text}
            </div>
            <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.time}</span>
          </div>
        ))}
      </div>

      {/* Input panel */}
      <form onSubmit={sendMessage} className="mt-4 flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={isEncrypted ? "Send an encrypted P2P text..." : "Establishing encryption..."}
          disabled={!isEncrypted}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!isEncrypted}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold px-6 rounded-xl text-sm hover:opacity-90 active:scale-95 transition disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}