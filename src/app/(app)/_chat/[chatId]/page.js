"use client";

import { useState, useEffect, use, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc
} from "firebase/firestore";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

export default function ChatPage({ params }) {
  const { chatId } = use(params);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef(null);
  const router = useRouter();

  // --- 1. SETUP & AUTH ---
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) return router.push("/login");
      setCurrentUser(user);

      const myUserRef = doc(db, "users", user.uid);
      await updateDoc(myUserRef, { lastSeen: serverTimestamp() });
      const interval = setInterval(() => {
         updateDoc(myUserRef, { lastSeen: serverTimestamp() });
      }, 60000);

      const chatRef = doc(db, "matches", chatId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const chatData = chatSnap.data();
        if (!chatData.users.includes(user.uid)) {
           router.push("/chat"); 
           return;
        }
        const otherUid = chatData.users.find((id) => id !== user.uid);
        if (otherUid) {
          const unsubUser = onSnapshot(doc(db, "users", otherUid), (doc) => {
             setOtherUser(doc.data());
          });
          return () => { clearInterval(interval); unsubUser(); };
        }
      } else {
        router.push("/chat");
      }
    });
    return () => unsubscribeAuth();
  }, [chatId, router]);

  // --- 2. MESSAGES LISTENER ---
  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(db, "matches", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [chatId]);

  // --- 3. AUTO SCROLL ---
  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, replyingTo]);

  // --- 4. SEND MESSAGE ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    
    updateDoc(doc(db, "users", currentUser.uid), { lastSeen: serverTimestamp() });

    const payload = {
      text: newMessage,
      senderId: currentUser.uid,
      createdAt: serverTimestamp(),
      replyTo: replyingTo ? { ...replyingTo } : null
    };

    setNewMessage("");
    setReplyingTo(null);

    try {
      await addDoc(collection(db, "matches", chatId, "messages"), payload);
    } catch (error) {
      console.error("Error sending:", error);
    }
  };

  // --- HELPERS ---
  const getUserStatus = (userData) => {
    if (!userData?.lastSeen) return "Offline";
    const diff = (new Date() - (userData.lastSeen.toDate ? userData.lastSeen.toDate() : new Date(userData.lastSeen))) / 1000;
    if (diff < 120) return "Active now";
    if (diff < 3600) return `Active ${Math.floor(diff/60)}m ago`;
    return "Offline";
  };
  const isOnline = otherUser && getUserStatus(otherUser) === "Active now";

  // --- MESSAGE ITEM (SWIPE TO REPLY) ---
  const MessageItem = ({ msg, isMe, senderName }) => {
    const x = useMotionValue(0);
    // Transform opacity and scale based on drag distance
    const replyIconOpacity = useTransform(x, [0, 30], [0, 1]);
    const replyIconScale = useTransform(x, [0, 30], [0.5, 1]);

    const handleDragEnd = (event, info) => {
        // If dragged > 50px to the right, trigger reply
        if (info.offset.x > 50) {
            setReplyingTo({ id: msg.id, text: msg.text, senderName });
            if (navigator.vibrate) navigator.vibrate(10);
        }
    };

    return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
            {/* REPLY ICON (Visible on Drag) */}
            <motion.div style={{ 
                position: 'absolute', 
                left: 15, // Always on left side
                zIndex: 0,
                opacity: replyIconOpacity, 
                scale: replyIconScale,
                display: 'flex', alignItems: 'center'
            }}>
                <div style={{
                    background: '#333', 
                    borderRadius: '50%', 
                    width: 30, height: 30, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
                </div>
            </motion.div>

            {/* DRAGGABLE BUBBLE WRAPPER */}
            <motion.div
                style={{ 
                    width: '100%', 
                    display: 'flex', 
                    justifyContent: isMe ? "flex-end" : "flex-start", 
                    zIndex: 1,
                    touchAction: "pan-y" // Important for scrolling while dragging
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }} 
                dragElastic={0.15} 
                onDragEnd={handleDragEnd}
            >
                 <div style={s.bubbleGroup}>
                    <div style={isMe ? s.myBubble : s.theirBubble}>
                        {msg.replyTo && (
                            <div style={isMe ? s.replyContextMe : s.replyContextThem}>
                                <div style={s.replyBar} />
                                <div style={s.replyContent}>
                                    <span style={s.replyName}>{msg.replyTo.senderName}</span>
                                    <span style={s.replyTextTrunc}>{msg.replyTo.text}</span>
                                </div>
                            </div>
                        )}
                        <div style={s.messageText}>{msg.text}</div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
  };

  if (loading) return <div style={s.loader}></div>;

  return (
    <>
    <style jsx global>{`body, html { margin:0; padding:0; overflow:hidden; background:#000; height:100%; }`}</style>
    <div style={s.pageContainer}>
      
      {/* HEADER */}
      <div style={s.header}>
        <motion.button whileTap={{scale:0.8}} onClick={() => router.push("/chat")} style={s.backBtn}>
           <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </motion.button>
        {otherUser && (
          <div style={s.headerInfo}>
            <div style={s.avatarWrapper}>
                {otherUser.photoURL ? <img src={otherUser.photoURL} style={s.avatar} /> : <div style={s.avatarFallback}>👤</div>}
                {isOnline && <div style={s.activeDot}></div>}
            </div>
            <div style={s.headerText}>
                <span style={s.headerName}>{otherUser.name}</span>
                <span style={{...s.status, color: isOnline ? "#4CAF50" : "#888"}}>{getUserStatus(otherUser)}</span>
            </div>
          </div>
        )}
        <div style={{flex:1}} />
        <div style={s.headerIcons}>
             <button style={s.iconBtn}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></button>
             <button style={s.iconBtn}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg></button>
        </div>
      </div>

      {/* MESSAGES */}
      <div style={s.messagesArea}>
         <div style={s.spacer} /> 
         {messages.map((msg, i) => {
            const isMe = msg.senderId === currentUser?.uid;
            const prev = messages[i-1];
            const isGap = !prev || (msg.createdAt?.seconds - prev.createdAt?.seconds) > 900;
            
            return (
              <div key={msg.id} style={{width:'100%', marginBottom: 4}}>
                  {isGap && (
                      <div style={s.timeSeparator}>
                          {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds*1000).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}) : 'Just now'}
                      </div>
                  )}
                  
                  {/* Message Item handles swipe logic for BOTH self and other */}
                  <MessageItem 
                      msg={msg} 
                      isMe={isMe} 
                      senderName={isMe ? "You" : otherUser?.name} 
                  />
              </div>
            );
         })}
         <div ref={messagesEndRef} style={{height:1}} />
      </div>

      {/* INPUT */}
      <div style={s.inputWrapper}>
          <AnimatePresence>
              {replyingTo && (
                  <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:10}} style={s.replyPreviewBar}>
                      <div style={s.replyPreviewContent}>
                          <span style={s.replyPreviewLabel}>Replying to {replyingTo.senderName}</span>
                          <span style={s.replyPreviewText}>{replyingTo.text}</span>
                      </div>
                      <button onClick={()=>setReplyingTo(null)} style={s.closeReplyBtn}>✕</button>
                  </motion.div>
              )}
          </AnimatePresence>
          <form onSubmit={handleSendMessage} style={s.inputBar}>
              <button type="button" style={s.cameraBtn}>
                 <svg width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </button>
              <input value={newMessage} onChange={(e)=>setNewMessage(e.target.value)} placeholder="Message..." style={s.input} />
              {newMessage.trim() ? (
                  <motion.button whileTap={{scale:0.8}} type="submit" style={s.sendBtn}>Send</motion.button>
              ) : (
                  <div style={{display:'flex', gap:12}}>
                      <button type="button" style={s.iconActionBtn}>
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                      </button>
                      <button type="button" style={s.iconActionBtn}>
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      </button>
                  </div>
              )}
          </form>
      </div>
    </div>
    </>
  );
}

const s = {
  pageContainer: { position:"fixed", top:0, left:0, right:0, bottom:0, background:"#000", color:"white", display:"flex", flexDirection:"column", fontFamily:"-apple-system, sans-serif", zIndex:9999 },
  loader: { height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#000" },

  header: { height:60, display:"flex", alignItems:"center", padding:"0 10px", background:"rgba(0,0,0,0.85)", backdropFilter:"blur(12px)", borderBottom:"1px solid #222", zIndex:50, flexShrink:0 },
  backBtn: { background:"none", border:"none", cursor:"pointer", padding:8, display:"flex" },
  headerInfo: { display:"flex", alignItems:"center", gap:12, marginLeft:5 },
  avatarWrapper: { position:"relative" },
  avatar: { width:34, height:34, borderRadius:"50%", objectFit:"cover" },
  avatarFallback: { width:34, height:34, borderRadius:"50%", background:"#222", display:"flex", alignItems:"center", justifyContent:"center" },
  activeDot: { position:"absolute", bottom:0, right:0, width:10, height:10, background:"#4CAF50", borderRadius:"50%", border:"2px solid #000" },
  headerText: { display:"flex", flexDirection:"column" },
  headerName: { fontWeight:700, fontSize:15 },
  status: { fontSize:11 },
  headerIcons: { display:"flex", gap:15, marginRight:5 },
  iconBtn: { background:"none", border:"none", cursor:"pointer", display:"flex" },

  messagesArea: { flex:1, overflowY:"auto", padding:"0 12px", display:"flex", flexDirection:"column", scrollBehavior:"smooth", background:"#000" },
  spacer: { minHeight:20 },
  timeSeparator: { textAlign:"center", color:"#666", fontSize:11, fontWeight:600, margin:"15px 0", textTransform:"uppercase" },

  bubbleGroup: { maxWidth:"75%", display:"flex", flexDirection:"column" },
  myBubble: { background:"#3797F0", color:"white", padding:"10px 14px", borderRadius:"20px 20px 4px 20px", fontSize:15, lineHeight:1.4, wordWrap:"break-word" },
  theirBubble: { background:"#262626", color:"white", padding:"10px 14px", borderRadius:"20px 20px 20px 4px", fontSize:15, lineHeight:1.4, wordWrap:"break-word" },

  replyContextMe: { background:"rgba(0,0,0,0.2)", borderRadius:8, padding:"6px 10px", marginBottom:6, borderLeft:"2px solid rgba(255,255,255,0.7)" },
  replyContextThem: { background:"rgba(255,255,255,0.1)", borderRadius:8, padding:"6px 10px", marginBottom:6, borderLeft:"2px solid #888" },
  replyName: { fontSize:11, fontWeight:"bold", display:"block", marginBottom:2, opacity:0.9 },
  replyTextTrunc: { fontSize:12, display:"block", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", opacity:0.8 },

  inputWrapper: { background:"#000", padding:"8px 12px 12px 12px", borderTop:"1px solid #1a1a1a", flexShrink:0 },
  replyPreviewBar: { display:"flex", justifyContent:"space-between", alignItems:"center", background:"#1a1a1a", padding:"8px 12px", borderRadius:12, marginBottom:10, borderLeft:"3px solid #3797F0" },
  replyPreviewContent: { display:"flex", flexDirection:"column", overflow:"hidden" },
  replyPreviewLabel: { fontSize:11, fontWeight:"bold", color:"#3797F0", marginBottom:2 },
  replyPreviewText: { fontSize:12, color:"#aaa", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  closeReplyBtn: { background:"none", border:"none", color:"#fff", cursor:"pointer" },

  inputBar: { display:"flex", alignItems:"center", gap:10, background:"#1C1C1E", borderRadius:24, padding:"8px 12px", border:"1px solid #2a2a2a" },
  cameraBtn: { width:34, height:34, borderRadius:"50%", background:"#3797F0", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" },
  input: { flex:1, background:"transparent", border:"none", outline:"none", color:"white", fontSize:16, padding:4 },
  sendBtn: { background:"none", color:"#3797F0", border:"none", cursor:"pointer", padding:"0 5px", fontWeight:"bold", fontSize:15 },
  iconActionBtn: { background:"transparent", border:"none", width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }
};