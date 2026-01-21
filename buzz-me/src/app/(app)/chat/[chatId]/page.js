"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { 
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc 
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatRoomPage() {
  const { chatId } = useParams();
  const router = useRouter();
  const dummyDiv = useRef(null);
  const inputRef = useRef(null);
  
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatPartner, setChatPartner] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  // 1. Auth & Partner Info
  useEffect(() => {
    if (auth.currentUser) setUser(auth.currentUser);
    else router.push("/login");
  }, []);

  useEffect(() => {
    if (!user || !chatId) return;
    getDoc(doc(db, "matches", chatId)).then(async (snap) => {
      if (snap.exists()) {
        const partnerId = snap.data().users.find(u => u !== user.uid);
        if (partnerId) {
          const pSnap = await getDoc(doc(db, "users", partnerId));
          if (pSnap.exists()) setChatPartner(pSnap.data());
        }
      }
    });
  }, [user, chatId]);

  // 2. Messages Listener
  useEffect(() => {
    const q = query(collection(db, "matches", chatId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => dummyDiv.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
  }, [chatId]);

  // Actions
  const handleReply = (msg) => { setReplyingTo(msg); inputRef.current?.focus(); };
  
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const payload = {
      text: newMessage,
      senderId: user.uid,
      createdAt: serverTimestamp(),
      replyTo: replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        name: replyingTo.senderId === user.uid ? "You" : chatPartner?.name
      } : null
    };

    setNewMessage("");
    setReplyingTo(null);

    await addDoc(collection(db, "matches", chatId, "messages"), payload);
    await updateDoc(doc(db, "matches", chatId), {
      lastMessage: { text: payload.text, createdAt: serverTimestamp(), isReply: !!replyingTo },
      createdAt: serverTimestamp() // Updates sort order for list
    });
  };

  const getDateHeader = (timestamp) => {
    if (!timestamp) return null;
    const d = new Date(timestamp.seconds * 1000);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <button onClick={() => router.back()} style={s.backBtn}>‹</button>
        {chatPartner && (
          <div style={s.headerInfo}>
            <img src={chatPartner.photoURL} style={s.headerAvatar} />
            <span style={s.headerName}>{chatPartner.name}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={s.chatArea}>
        {messages.map((msg, i) => {
          const isMe = msg.senderId === user?.uid;
          const showDate = i === 0 || getDateHeader(msg.createdAt) !== getDateHeader(messages[i-1].createdAt);

          return (
            <div key={msg.id} style={{width: '100%'}}>
              {showDate && <div style={s.dateBadge}>{getDateHeader(msg.createdAt)}</div>}
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                style={{ ...s.msgRow, justifyContent: isMe ? "flex-end" : "flex-start" }}
              >
                {/* Reply Button (Left for me) */}
                {isMe && <button onClick={() => handleReply(msg)} style={s.replyBtn}>↩</button>}

                <div style={{ 
                  ...s.bubble, 
                  background: isMe ? "#e91e63" : "#333",
                  borderRadius: isMe ? "20px 20px 4px 20px" : "20px 20px 20px 4px"
                }}>
                  {/* Quoted Message */}
                  {msg.replyTo && (
                    <div style={{ ...s.quote, borderLeftColor: isMe ? "#fff" : "#e91e63" }}>
                      <span style={{fontWeight: 'bold', fontSize: 11}}>{msg.replyTo.name}</span>
                      <span style={{fontSize: 11, opacity: 0.8}}>{msg.replyTo.text}</span>
                    </div>
                  )}
                  {msg.text}
                  <div style={s.timestamp}>
                    {msg.createdAt && new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </div>
                </div>

                {/* Reply Button (Right for them) */}
                {!isMe && <button onClick={() => handleReply(msg)} style={s.replyBtn}>↩</button>}
              </motion.div>
            </div>
          );
        })}
        <div ref={dummyDiv} />
      </div>

      {/* Input */}
      <div style={s.inputWrapper}>
        <AnimatePresence>
          {replyingTo && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={s.replyBanner}>
              <div style={s.replyContent}>
                <span style={{color: '#e91e63', fontSize: 12, fontWeight: 'bold'}}>Replying to {replyingTo.senderId === user.uid ? "Yourself" : chatPartner?.name}</span>
                <span style={{color: '#888', fontSize: 12}}>{replyingTo.text}</span>
              </div>
              <button onClick={() => setReplyingTo(null)} style={s.closeReply}>✕</button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <form onSubmit={sendMessage} style={s.inputBar}>
          <input 
            ref={inputRef}
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            placeholder="Message..." 
            style={s.input} 
          />
          <button type="submit" disabled={!newMessage.trim()} style={s.sendBtn}>➤</button>
        </form>
      </div>
    </div>
  );
}

const s = {
  container: { display: "flex", flexDirection: "column", height: "100vh", background: "#000", color: "#fff", fontFamily: "system-ui, sans-serif" },
  header: { display: "flex", alignItems: "center", padding: "10px 15px", background: "rgba(20,20,20,0.9)", backdropFilter: "blur(10px)", borderBottom: "1px solid #333", position: "sticky", top: 0, zIndex: 10 },
  backBtn: { background: "none", border: "none", color: "#fff", fontSize: "28px", cursor: "pointer", marginRight: "10px", lineHeight: "20px" },
  headerInfo: { display: "flex", alignItems: "center", gap: "10px" },
  headerAvatar: { width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" },
  headerName: { fontWeight: "bold", fontSize: "16px" },
  
  chatArea: { flex: 1, overflowY: "auto", padding: "20px", paddingBottom: "100px", display: "flex", flexDirection: "column", gap: "4px" },
  dateBadge: { alignSelf: "center", fontSize: "11px", color: "#666", background: "#1a1a1a", padding: "4px 10px", borderRadius: "10px", margin: "15px 0 5px 0", fontWeight: "600" },
  
  msgRow: { display: "flex", alignItems: "center", gap: "8px", maxWidth: "100%" },
  bubble: { padding: "10px 16px", fontSize: "15px", maxWidth: "75%", wordBreak: "break-word", position: "relative", color: "#fff" },
  timestamp: { fontSize: "10px", opacity: 0.6, textAlign: "right", marginTop: "4px" },
  replyBtn: { background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "16px", padding: "0 5px" },
  
  quote: { display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.2)", padding: "6px 10px", borderRadius: "6px", marginBottom: "6px", borderLeft: "3px solid" },
  
  inputWrapper: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#121212", borderTop: "1px solid #333" },
  replyBanner: { background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 15px", borderBottom: "1px solid #333" },
  replyContent: { display: "flex", flexDirection: "column" },
  closeReply: { background: "none", border: "none", color: "#888", fontSize: "16px", cursor: "pointer" },
  
  inputBar: { display: "flex", padding: "10px 15px 20px 15px", gap: "10px" },
  input: { flex: 1, background: "#222", border: "none", borderRadius: "25px", padding: "12px 20px", color: "#fff", outline: "none", fontSize: "16px" },
  sendBtn: { background: "#e91e63", color: "#fff", border: "none", width: "45px", height: "45px", borderRadius: "50%", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }
};