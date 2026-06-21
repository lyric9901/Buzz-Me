'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy, getDocs, doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase'; 
import { Image as ImageIcon, Reply, Trash2, XCircle, MoreVertical, Clock } from 'lucide-react';

// --- TypeScript Interfaces ---
interface Message {
  id: string;
  text: string;
  sender: 'me' | 'them';
  time: string;
  replyTo?: string | null;
  image?: string | null;
  isQueued?: boolean;
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
  const router = useRouter();
  const params = useParams();
  const chatId = params?.chatId as string | undefined;

  const [otherUser, setOtherUser] = useState<any>(null);
  const [isOnlineGlobally, setIsOnlineGlobally] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);
  
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localKeyPairRef = useRef<CryptoKeyPair | null>(null);
  const sharedSecretKeyRef = useRef<CryptoKey | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const bufferToBase64 = (buf: ArrayBuffer | Uint8Array): string => {
    const bytes = new Uint8Array(buf instanceof Uint8Array ? buf.buffer : buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary);
  };

  const base64ToBuffer = (base64: string): ArrayBuffer => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
    return bytes.buffer;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!chatId || !auth.currentUser) return;
    
    const myUid = auth.currentUser.uid;
    const uids = chatId.split('_');
    const theirUid = uids.find(u => u !== myUid);

    let unsubUserMetadata: any = null;

    if (theirUid) {
      unsubUserMetadata = onSnapshot(doc(db, "users", theirUid), (snap) => {
        if (snap.exists()) {
          const userData = snap.data();
          setOtherUser(userData);
          if (userData.lastSeen) {
            const lastSeenTime = userData.lastSeen?.seconds ? userData.lastSeen.seconds * 1000 : new Date(userData.lastSeen).getTime();
            setIsOnlineGlobally((Date.now() - lastSeenTime) / 1000 < 300);
          }
        }
      });
    }

    const fetchLegacyMessages = async () => {
      try {
        const q = query(collection(db, "matches", chatId, "messages"), orderBy("createdAt", "asc"));
        const snap = await getDocs(q);
        
        let legacyLogs: Message[] = [];
        if (!snap.empty) {
          legacyLogs = snap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id, text: data.text || "", sender: data.senderId === myUid ? 'me' : 'them',
              time: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''
            };
          });
        }

        const localLogsRaw = localStorage.getItem(`chat_${chatId}`);
        const localLogs: Message[] = localLogsRaw ? JSON.parse(localLogsRaw) : [];
        
        const merged = [...legacyLogs];
        localLogs.forEach(ll => { if (!merged.find(m => m.id === ll.id)) merged.push(ll); });
        setMessages(merged);
      } catch (error) {
        const localLogsRaw = localStorage.getItem(`chat_${chatId}`);
        if (localLogsRaw) setMessages(JSON.parse(localLogsRaw));
      }
    };

    fetchLegacyMessages();
    return () => { if (unsubUserMetadata) unsubUserMetadata(); };
  }, [chatId]);

  useEffect(() => {
    if (isEncrypted && connected) {
      const flushQueue = async () => {
        const queueRaw = localStorage.getItem(`chat_${chatId}_queue`);
        if (queueRaw) {
          const queue = JSON.parse(queueRaw);
          for (const payload of queue) { await sendPacket(payload); }
          localStorage.removeItem(`chat_${chatId}_queue`);
          
          setMessages(prev => {
            const updated = prev.map(m => ({ ...m, isQueued: false }));
            localStorage.setItem(`chat_${chatId}`, JSON.stringify(updated));
            return updated;
          });
        }
      };
      flushQueue();
    }
  }, [isEncrypted, connected]);

  useEffect(() => {
    if (!chatId || !auth.currentUser) return;
    const myUid = auth.currentUser.uid;
    const theirUid = chatId.split('_').find(u => u !== myUid);
    if (!theirUid) return;

    let unsubSignal: any = null;

    const initCrypto = async () => {
      localKeyPairRef.current = await window.crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
    };
    initCrypto();

    import('peerjs').then((module) => {
      const Peer = module.default || module.Peer;
      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', async (id: string) => {
        try { await updateDoc(doc(db, "matches", chatId), { [`${myUid}_peerId`]: id }); } 
        catch (e) { console.error("Signaling write failed"); }

        unsubSignal = onSnapshot(doc(db, "matches", chatId), (snap) => {
          if (snap.exists()) {
            const remotePeerId = snap.data()[`${theirUid}_peerId`];
            if (remotePeerId && (!connRef.current || !connected)) {
              const conn = peer.connect(remotePeerId);
              connRef.current = conn;
              setupConnectionListeners(conn);
            }
          }
        });
      });

      peer.on('connection', (incomingConn: any) => {
        connRef.current = incomingConn;
        setupConnectionListeners(incomingConn);
      });
    });

    return () => {
      if (peerRef.current) peerRef.current.destroy();
      if (unsubSignal) unsubSignal();
    };
  }, [chatId]); 

  const setupConnectionListeners = (conn: any) => {
    conn.on('open', async () => {
      setConnected(true); 
      if (localKeyPairRef.current) {
        const exportedPublicKey = await window.crypto.subtle.exportKey('raw', localKeyPairRef.current.publicKey);
        conn.send({ type: 'HANDSHAKE_PUBLIC_KEY', keyData: bufferToBase64(exportedPublicKey) });
      }
    });

    conn.on('data', async (data: any) => {
      const packet = data as P2PPacket;

      if (packet.type === 'HANDSHAKE_PUBLIC_KEY' && localKeyPairRef.current) {
        try {
          const importedKey = await window.crypto.subtle.importKey('raw', base64ToBuffer(packet.keyData), { name: 'ECDH', namedCurve: 'P-256' }, true, []);
          sharedSecretKeyRef.current = await window.crypto.subtle.deriveKey(
            { name: 'ECDH', public: importedKey }, localKeyPairRef.current.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
          );
          setIsEncrypted(true);
        } catch (err) { console.error("Key derivation failed"); }
        return;
      }

      if (packet.type === 'ENCRYPTED_MSG' && sharedSecretKeyRef.current) {
        try {
          const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: base64ToBuffer(packet.iv) }, sharedSecretKeyRef.current, base64ToBuffer(packet.ciphertext)
          );
          const clearText = new TextDecoder().decode(decryptedBuffer);
          
          let parsedPayload: any = { text: clearText };
          try { parsedPayload = JSON.parse(clearText); } catch (e) {}

          if (parsedPayload.action === 'UNSEND') {
            setMessages(prev => {
              const updated = prev.filter(m => m.id !== parsedPayload.targetId);
              if (chatId) localStorage.setItem(`chat_${chatId}`, JSON.stringify(updated));
              return updated;
            });
            return;
          }

          setMessages(prev => {
            const newMsg: Message = { 
              id: parsedPayload.id || Date.now().toString(), text: parsedPayload.text, sender: 'them', 
              time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              replyTo: parsedPayload.replyTo, image: parsedPayload.image
            };
            const updated = [...prev, newMsg];
            if (chatId) localStorage.setItem(`chat_${chatId}`, JSON.stringify(updated));
            return updated;
          });
        } catch (err) {}
      }
    });

    conn.on('close', () => { setConnected(false); setIsEncrypted(false); });
  };

  const sendPacket = async (payloadObj: any) => {
    if (!connRef.current || !isEncrypted || !sharedSecretKeyRef.current) return false;
    try {
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(JSON.stringify(payloadObj));
      const ciphertextBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedSecretKeyRef.current, encoded);
      connRef.current.send({ type: 'ENCRYPTED_MSG', ciphertext: bufferToBase64(ciphertextBuffer), iv: bufferToBase64(iv) });
      return true;
    } catch (e) { return false; }
  };

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputMessage.trim() && !selectedImage) return;

    const msgId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    const payload = {
      id: msgId, text: inputMessage,
      replyTo: replyingTo?.text || replyingTo?.image ? (replyingTo.text || 'Image') : null,
      image: selectedImage
    };

    const currentMsg = inputMessage;
    const currentImg = selectedImage;
    const currentReply = payload.replyTo;

    setInputMessage('');
    setSelectedImage(null);
    setReplyingTo(null);

    let isQueued = false;
    if (isEncrypted && connected) {
      await sendPacket(payload);
    } else {
      try {
        const queueRaw = localStorage.getItem(`chat_${chatId}_queue`);
        const queue = queueRaw ? JSON.parse(queueRaw) : [];
        queue.push(payload);
        localStorage.setItem(`chat_${chatId}_queue`, JSON.stringify(queue));
        isQueued = true;
      } catch (err) {
        alert("Image is too big to queue offline!");
        return; 
      }
    }

    setMessages(prev => {
      const newMsg: Message = { 
        id: msgId, text: currentMsg, sender: 'me', 
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        replyTo: currentReply, image: currentImg, isQueued
      };
      const updated = [...prev, newMsg];
      if (chatId) localStorage.setItem(`chat_${chatId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteForMe = (id: string) => {
    setMessages(prev => {
      const updated = prev.filter(m => m.id !== id);
      if (chatId) localStorage.setItem(`chat_${chatId}`, JSON.stringify(updated));
      return updated;
    });
    setActiveMenuId(null);
  };

  const unsendForEveryone = async (id: string) => {
    deleteForMe(id);
    await sendPacket({ action: 'UNSEND', targetId: id });
  };

  return (
    <div style={styles.wrapper}>
      {/* HEADER (Sticky and Fixed Size) */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => router.back()} style={styles.backBtn}>
            <XCircle size={28} color="#fff" />
          </button>
          <div style={styles.profileBox}>
            <div style={styles.avatarWrapper}>
              <img src={otherUser?.photoURL || "https://via.placeholder.com/150"} style={styles.avatar} alt="pfp" />
              {isOnlineGlobally && <div style={styles.onlineDot} />}
            </div>
            <div style={styles.userInfo}>
              <h1 style={styles.name}>{otherUser?.name || 'Loading...'}</h1>
              <p style={{...styles.status, color: isOnlineGlobally ? '#4ee085' : '#888'}}>
                {isOnlineGlobally ? 'Active Now' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* CHAT VIEWPORT */}
      <div style={styles.chatArea}>
        {messages.map((msg) => {
          const isMe = msg.sender === 'me';
          const isMenuOpen = activeMenuId === msg.id;

          return (
            <div key={msg.id} style={{...styles.messageRow, alignItems: isMe ? 'flex-end' : 'flex-start'}}>
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    style={{...styles.contextMenu, [isMe ? 'right' : 'left']: '40px'}}
                  >
                    <button onClick={() => { setReplyingTo(msg); setActiveMenuId(null); }} style={styles.menuBtn}><Reply size={16}/> Reply</button>
                    <button onClick={() => deleteForMe(msg.id)} style={styles.menuBtn}><Trash2 size={16} color="#ff4b4b"/> Delete for Me</button>
                    {isMe && <button onClick={() => unsendForEveryone(msg.id)} style={{...styles.menuBtn, color: '#ff4b4b'}}><XCircle size={16}/> Unsend</button>}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row'}}>
                <button onClick={() => setActiveMenuId(isMenuOpen ? null : msg.id)} style={styles.moreBtn}>
                  <MoreVertical size={18} color="#666" />
                </button>

                <motion.div 
                  drag="x" dragConstraints={{ left: 0, right: 0 }} dragSnapToOrigin={true}
                  onDragEnd={(e, info) => { if (info.offset.x > 60 || info.offset.x < -60) setReplyingTo(msg); }}
                  style={{
                    ...styles.bubble,
                    ...(isMe ? styles.bubbleMe : styles.bubbleThem),
                    borderBottomRightRadius: isMe ? 0 : "20px",
                    borderBottomLeftRadius: isMe ? "20px" : 0,
                    padding: msg.image && !msg.text ? "0px" : "14px 20px"
                  }}
                >
                  {msg.replyTo && (
                    <div style={{...styles.replyPreviewInBubble, margin: msg.image && !msg.text ? "10px 10px 0 10px" : "0 0 10px 0"}}>
                      <span style={{fontSize: '11px', color: isMe ? '#ffd' : '#aaa'}}>Replying to:</span><br/>
                      <span style={{fontStyle: 'italic'}}>{msg.replyTo}</span>
                    </div>
                  )}
                  {msg.image && <img src={msg.image} style={styles.chatImage} alt="attachment" />}
                  {msg.text && <div style={msg.image ? {padding: "0 20px 14px 20px"} : {}}>{msg.text}</div>}
                </motion.div>
              </div>

              <div style={{...styles.msgTime, textAlign: isMe ? 'right' : 'left', display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '4px', alignItems: 'center'}}>
                {msg.isQueued && <Clock size={10} color="#888" />}
                {msg.isQueued ? <span style={{color: '#888'}}>Sending...</span> : msg.time}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* PERSISTENT FOOTER */}
      <div style={styles.inputContainer}>
        {(replyingTo || selectedImage) && (
          <div style={styles.attachmentPreviewArea}>
            {replyingTo && (
              <div style={styles.previewBanner}>
                <span>↩ Replying to: {replyingTo.text || 'Image'}</span>
                <button onClick={() => setReplyingTo(null)} style={styles.cancelBtn}><XCircle size={20}/></button>
              </div>
            )}
            {selectedImage && (
              <div style={styles.previewBanner}>
                <img src={selectedImage} style={styles.tinyPreview} alt="preview" />
                <button onClick={() => setSelectedImage(null)} style={styles.cancelBtn}><XCircle size={20}/></button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={sendMessage} style={styles.inputForm}>
          <input type="file" accept="image/*" ref={fileInputRef} hidden onChange={handleImageSelect} />
          <button type="button" onClick={() => fileInputRef.current?.click()} style={styles.galleryBtn}>
            <ImageIcon size={28} color="#fff" />
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Message..."
            style={styles.input}
          />
          
          <motion.button
            type="submit"
            disabled={!inputMessage.trim() && !selectedImage}
            whileTap={{ scale: 0.9 }}
            style={{...styles.sendBtn, opacity: (!inputMessage.trim() && !selectedImage) ? 0.5 : 1}}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </motion.button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  wrapper: { position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#0a0a0a", overflow: "hidden" },
  header: { flexShrink: 0, padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(10,10,10,0.9)", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { display: "flex", alignItems: "center", gap: "20px" },
  backBtn: { background: "none", border: "none", padding: "0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  profileBox: { display: "flex", alignItems: "center", gap: "12px" },
  avatarWrapper: { position: "relative" },
  avatar: { width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover" },
  onlineDot: { position: "absolute", bottom: "0", right: "0", width: "14px", height: "14px", background: "#4ee085", borderRadius: "50%", border: "2px solid #0a0a0a" },
  userInfo: { display: "flex", flexDirection: "column" },
  name: { margin: "0", fontSize: "18px", fontWeight: "700", color: "#fff" },
  status: { margin: "2px 0 0 0", fontSize: "13px", fontWeight: "500" },
  
  chatArea: { flex: 1, overflowY: "auto", overflowX: "hidden", padding: "24px", display: "flex", flexDirection: "column", gap: "20px", scrollBehavior: "smooth" },
  messageRow: { display: "flex", flexDirection: "column", width: "100%", position: "relative" },
  bubble: { maxWidth: "60%", position: "relative", overflow: "hidden", cursor: "pointer", fontSize: "16px", lineHeight: "1.5", borderRadius: "20px", wordBreak: "break-word" },
  bubbleMe: { background: "linear-gradient(135deg, #ff0080, #ff8c00)", color: "#fff", boxShadow: "0 4px 15px rgba(255,0,128,0.2)" },
  bubbleThem: { background: "#1a1a1a", color: "#eee", border: "1px solid rgba(255,255,255,0.08)" },
  msgTime: { fontSize: "12px", color: "#666", marginTop: "8px", padding: "0 8px" },
  
  chatImage: { width: "100%", maxWidth: "300px", maxHeight: "300px", objectFit: "cover", display: "block" },
  replyPreviewInBubble: { background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "8px", fontSize: "13px", borderLeft: "3px solid rgba(255,255,255,0.6)" },
  
  contextMenu: { position: "absolute", bottom: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "8px", display: "flex", gap: "12px", zIndex: 50, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" },
  menuBtn: { background: "none", border: "none", color: "#fff", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "600" },
  moreBtn: { background: "none", border: "none", cursor: "pointer", padding: "4px" },

  inputContainer: { flexShrink: 0, background: "rgba(10,10,10,0.95)", borderTop: "1px solid rgba(255,255,255,0.05)" },
  attachmentPreviewArea: { padding: "16px 24px 0 24px", display: "flex", flexDirection: "column", gap: "10px" },
  previewBanner: { background: "rgba(30,30,30,0.8)", padding: "12px 16px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "#ddd" },
  tinyPreview: { height: "60px", borderRadius: "8px" },
  cancelBtn: { background: "none", border: "none", color: "#ff4b4b", cursor: "pointer", display: "flex", alignItems: "center" },
  
  inputForm: { display: "flex", gap: "16px", padding: "16px 24px 24px 24px", alignItems: "center" },
  galleryBtn: { background: "none", border: "none", cursor: "pointer", padding: "0 8px 0 0", display: "flex", alignItems: "center" },
  input: { flex: 1, background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "100px", padding: "16px 24px", fontSize: "16px", color: "#fff", outline: "none" },
  sendBtn: { background: "linear-gradient(135deg, #ff0080, #ff8c00)", border: "none", width: "56px", height: "56px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 15px rgba(255,0,128,0.3)" }
};