"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp, onSnapshot
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";

// --- FAKE DATA (Example friends that "added" you) ---
const EXAMPLE_FRIENDS = [
    {
        id: "fake_1",
        otherUser: {
            name: "Caprinanni",
            photo: "https://api.dicebear.com/9.x/avataaars/svg?seed=Caprinanni",
            lastMessage: "No",
            time: "1mo"
        }
    },
    {
        id: "fake_2",
        otherUser: {
            name: "Meera",
            photo: "https://api.dicebear.com/9.x/avataaars/svg?seed=Meera",
            lastMessage: "peace out 🫡",
            time: "1mo"
        }
    },
    {
        id: "fake_3",
        otherUser: {
            name: "Aarav",
            photo: "https://api.dicebear.com/9.x/avataaars/svg?seed=Aarav",
            lastMessage: "You seeing this?",
            time: "2h"
        }
    }
];

export default function ChatListPage() {
  const router = useRouter();
  const [matches, setMatches] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [showRequests, setShowRequests] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // --- INITIAL LOAD ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        loadMatches(user.uid);
        listenForRequests(user.uid);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, []);

  // --- 1. REAL-TIME REQUESTS LISTENER ---
  const listenForRequests = (uid) => {
    const q = query(
      collection(db, "friend_requests"),
      where("toUid", "==", uid),
      where("status", "==", "pending")
    );

    return onSnapshot(q, async (snapshot) => {
      const reqs = [];
      for (const reqDoc of snapshot.docs) {
        const reqData = reqDoc.data();
        const userSnap = await getDoc(doc(db, "users", reqData.fromUid));
        if (userSnap.exists()) {
           reqs.push({
             id: reqDoc.id,
             sender: userSnap.data(),
             ...reqData
           });
        }
      }
      setRequests(reqs);
    });
  };

  // --- 2. LOAD MATCHES (CHATS) ---
  const loadMatches = async (currentUid) => {
    try {
      const q = query(
        collection(db, "matches"),
        where("users", "array-contains", currentUid)
      );
      const snap = await getDocs(q);
      
      const realMatches = await Promise.all(snap.docs.map(async (matchDoc) => {
        const data = matchDoc.data();
        const otherUserId = data.users.find((id) => id !== currentUid);
        const userSnap = await getDoc(doc(db, "users", otherUserId));
        const userData = userSnap.exists() ? userSnap.data() : {};

        return {
          id: matchDoc.id,
          otherUser: {
            name: userData.name || "Unknown User",
            photo: userData.photoURL || null,
            buzzId: userData.buzzId,
            lastMessage: "Start chatting!", // Placeholder for real msg
            time: "Now"
          },
        };
      }));

      // Combine Real Matches + Fake Example Friends
      setMatches([...realMatches, ...EXAMPLE_FRIENDS]);
    } catch (error) {
      console.error("Error loading matches:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. ACTIONS ---
  const handleAccept = async (request) => {
    try {
       const matchId = [request.fromUid, currentUser.uid].sort().join("_");
       await setDoc(doc(db, "matches", matchId), {
         users: [request.fromUid, currentUser.uid],
         createdAt: serverTimestamp(),
       });
       await deleteDoc(doc(db, "friend_requests", request.id));
       loadMatches(currentUser.uid); // Refresh list
    } catch (error) {
       console.error(error);
    }
  };

  const handleReject = async (requestId) => {
      await deleteDoc(doc(db, "friend_requests", requestId));
  };

  // --- ANIMATION VARIANTS ---
  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) return (
    <div style={s.loadingContainer}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
            <span style={{ fontSize: 40 }}>💬</span>
        </motion.div>
    </div>
  );

  return (
    <div style={s.page}>
      
      {/* --- HEADER --- */}
      <div style={s.header}>
        <h1 style={s.title}>Messages</h1>
        
        <div style={s.headerRight}>
            <motion.div 
                whileTap={{ scale: 0.9 }} 
                onClick={() => setShowRequests(!showRequests)} 
                style={s.requestIconBtn}
            >
                <span style={{fontSize: '14px', fontWeight: 'bold'}}>Requests</span>
                {requests.length > 0 && (
                    <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        style={s.badge}
                    >
                        {requests.length}
                    </motion.div>
                )}
            </motion.div>
            
            <div style={s.profileIcon}>
                <span style={{fontSize: '14px', fontWeight: 'bold'}}>👥 {matches.length}</span>
            </div>
        </div>
      </div>

      <div style={s.content}>
        
        {/* --- STORIES / TOP ROW (Like Screenshot) --- */}
        <div style={s.storiesContainer}>
            {matches.slice(0, 5).map((match) => (
                <div key={match.id} style={s.storyItem}>
                    <div style={s.storyRing}>
                        <img 
                            src={match.otherUser.photo || "https://via.placeholder.com/150"} 
                            style={s.storyAvatar} 
                        />
                    </div>
                    <span style={s.storyName}>{match.otherUser.name.split(' ')[0]}</span>
                </div>
            ))}
        </div>

        <div style={s.sectionTitle}>Dialogs</div>

        {/* --- NOTIFICATIONS PANEL (Animated) --- */}
        <AnimatePresence>
            {showRequests && requests.length > 0 && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={s.requestsPanel}
                >
                    {requests.map(req => (
                        <div key={req.id} style={s.requestRow}>
                            <div style={s.reqUser}>
                                {req.sender.photoURL ? (
                                    <img src={req.sender.photoURL} style={s.smallAvatar} />
                                ) : (
                                    <div style={s.smallAvatarFallback}>👤</div>
                                )}
                                <span style={{fontWeight:600}}>{req.sender.name}</span>
                            </div>
                            <div style={s.reqActions}>
                                <motion.button whileTap={{scale:0.9}} onClick={() => handleAccept(req)} style={s.acceptBtn}>✓</motion.button>
                                <motion.button whileTap={{scale:0.9}} onClick={() => handleReject(req.id)} style={s.rejectBtn}>✕</motion.button>
                            </div>
                        </div>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>

        {/* --- CHAT LIST --- */}
        <motion.div 
            variants={containerVars}
            initial="hidden"
            animate="show"
            style={s.listContainer}
        >
            {matches.map((match) => (
                <motion.div
                    key={match.id}
                    variants={itemVars}
                    whileTap={{ scale: 0.98, backgroundColor: "#111" }}
                    onClick={() => router.push(`/chat/${match.id}`)} // Note: Fake IDs won't route correctly without real DB data
                    style={s.chatItem}
                >
                    <div style={s.avatarContainer}>
                        <img 
                            src={match.otherUser.photo || "https://via.placeholder.com/150"} 
                            style={s.avatar} 
                        />
                    </div>
                    
                    <div style={s.chatInfo}>
                        <div style={s.nameRow}>
                            <span style={s.name}>{match.otherUser.name}</span>
                            <span style={s.time}>{match.otherUser.time}</span>
                        </div>
                        <div style={s.subtext}>{match.otherUser.lastMessage}</div>
                    </div>
                </motion.div>
            ))}
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}

const s = {
  page: {
    height: "100dvh",
    background: "#000",
    color: "white",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: "-apple-system, sans-serif"
  },
  loadingContainer: {
    height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "white"
  },
  
  // Header
  header: {
    padding: "20px",
    paddingTop: "50px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#000",
    zIndex: 10,
  },
  title: { margin: 0, fontSize: "32px", fontWeight: "800", fontStyle: "italic", letterSpacing: "-0.5px" },
  
  headerRight: { display: 'flex', gap: '15px', alignItems: 'center' },
  requestIconBtn: { position: "relative", cursor: "pointer", color: '#888' },
  profileIcon: { background: "#fff", color: '#000', padding: '5px 12px', borderRadius: '20px' },
  
  badge: {
    position: "absolute", top: -8, right: -10,
    background: "#ff4b4b", color: "white",
    borderRadius: "50%", width: "18px", height: "18px",
    fontSize: "11px", fontWeight: "bold",
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "2px solid #000"
  },

  content: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    paddingBottom: "100px" 
  },

  // Stories Row
  storiesContainer: {
      display: 'flex',
      gap: '15px',
      overflowX: 'auto',
      paddingBottom: '20px',
      marginBottom: '10px'
  },
  storyItem: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', minWidth: '70px'
  },
  storyRing: {
      width: '64px', height: '64px', borderRadius: '50%',
      border: '2px solid #333', padding: '2px'
  },
  storyAvatar: {
      width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'
  },
  storyName: { fontSize: '12px', color: '#888' },

  sectionTitle: {
      fontSize: '14px', fontWeight: 'bold', fontStyle: 'italic', marginBottom: '15px', color: '#fff'
  },

  // Notifications
  requestsPanel: {
    background: "#111",
    borderRadius: "16px",
    overflow: "hidden",
    marginBottom: "20px",
    border: "1px solid #333"
  },
  requestRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 15px", borderBottom: "1px solid #222"
  },
  reqUser: { display: "flex", alignItems: "center", gap: "10px" },
  smallAvatar: { width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" },
  smallAvatarFallback: { width: "32px", height: "32px", borderRadius: "50%", background: "#333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" },
  reqActions: { display: "flex", gap: "8px" },
  acceptBtn: { width: "30px", height: "30px", borderRadius: "50%", border: "none", background: "#4CAF50", color: "white", cursor: "pointer" },
  rejectBtn: { width: "30px", height: "30px", borderRadius: "50%", border: "none", background: "#333", color: "#ff4b4b", cursor: "pointer" },

  // List
  listContainer: { display: "flex", flexDirection: "column", gap: "5px" },
  chatItem: {
    display: "flex", alignItems: "center",
    padding: "15px 0",
    background: "transparent",
    cursor: "pointer",
  },
  avatarContainer: { marginRight: "15px" },
  avatar: { width: "55px", height: "55px", borderRadius: "50%", objectFit: "cover" },
  
  chatInfo: { flex: 1 },
  nameRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  name: { fontWeight: "700", fontSize: "16px", color: "#fff" },
  time: { fontSize: "12px", color: "#666" },
  subtext: { color: "#888", fontSize: "14px" },
};