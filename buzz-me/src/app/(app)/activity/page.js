"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import BottomNav from "@/components/BottomNav";

export default function ActivityPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
        if (user) listenForRequests(user.uid);
    });
    return () => unsubAuth();
  }, []);

  const listenForRequests = (uid) => {
    const q = query(collection(db, "friend_requests"), where("toUid", "==", uid));
    
    return onSnapshot(q, async (snapshot) => {
      const list = [];
      for (const reqDoc of snapshot.docs) {
        const reqData = reqDoc.data();
        const userSnap = await getDoc(doc(db, "users", reqData.fromUid));
        if (userSnap.exists()) {
            list.push({ id: reqDoc.id, sender: userSnap.data(), ...reqData });
        }
      }
      setRequests(list);
      setLoading(false);
    });
  };

  const handleAccept = async (req) => {
    const currentUser = auth.currentUser;
    const matchId = [req.fromUid, currentUser.uid].sort().join("_");
    await setDoc(doc(db, "matches", matchId), {
        users: [req.fromUid, currentUser.uid],
        createdAt: serverTimestamp()
    });
    await deleteDoc(doc(db, "friend_requests", req.id));
  };

  const handleReject = async (id) => {
    await deleteDoc(doc(db, "friend_requests", id));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -50 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div style={s.page}>
      {/* Header with Gradient */}
      <motion.div 
        style={s.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={s.headerContent}>
          <h1 style={s.title}>Activity</h1>
          <div style={s.badge}>
            <motion.span 
              style={s.badgeText}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {requests.length}
            </motion.span>
          </div>
        </div>
        <p style={s.subtitle}>See who likes you</p>
      </motion.div>

      {/* Content */}
      <div style={s.content}>
        {loading ? (
          <motion.div 
            style={s.loadingContainer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <span style={{ fontSize: 40 }}>❤️</span>
            </motion.div>
          </motion.div>
        ) : requests.length === 0 ? (
          <motion.div 
            style={s.emptyState}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span style={{ fontSize: 80 }}>💔</span>
            </motion.div>
            <h3 style={s.emptyTitle}>No new requests</h3>
            <p style={s.emptyText}>Keep swiping to get more matches!</p>
          </motion.div>
        ) : (
          <motion.div 
            style={s.list}
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence>
              {requests.map((req, index) => (
                <motion.div 
                  key={req.id}
                  variants={itemVariants}
                  exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                  whileHover={{ scale: 1.02 }}
                  style={s.item}
                >
                  {/* Gradient Border Effect */}
                  <div style={s.itemGradientBorder} />
                  
                  <div style={s.userRow}>
                    <div style={s.avatarContainer}>
                      <img 
                        src={req.sender.photoURL || "https://api.dicebear.com/9.x/avataaars/svg?seed=" + req.sender.name} 
                        style={s.avatar} 
                      />
                      <motion.div 
                        style={s.avatarRing}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                    <div style={s.userInfo}>
                      <div style={s.name}>
                        {req.sender.name}
                        {req.sender.verified && <span style={{ marginLeft: 6 }}>🔹</span>}
                      </div>
                      <div style={s.text}>
                        <span style={s.heartIcon}>❤️</span> Sent you a like
                      </div>
                      {req.sender.age && (
                        <div style={s.metaInfo}>
                          {req.sender.age} • {req.sender.city || "Nearby"}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={s.actions}>
                    <motion.button 
                      onClick={() => handleAccept(req)} 
                      style={s.acceptBtn}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </motion.button>
                    <motion.button 
                      onClick={() => handleReject(req.id)} 
                      style={s.rejectBtn}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
}

const s = {
  page: { 
    minHeight: "100vh", 
    background: "linear-gradient(180deg, #0a0a0a 0%, #1a0a1a 100%)", 
    color: "white", 
    paddingBottom: "100px",
    position: "relative",
    overflow: "hidden"
  },
  header: {
    padding: "30px 20px 20px 20px",
    background: "linear-gradient(180deg, rgba(255, 0, 128, 0.1) 0%, transparent 100%)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "8px"
  },
  title: { 
    fontSize: "32px", 
    fontWeight: "900", 
    margin: 0,
    background: "linear-gradient(135deg, #fff 0%, #ff0080 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-1px"
  },
  subtitle: {
    fontSize: "14px",
    color: "#888",
    margin: 0
  },
  badge: {
    background: "linear-gradient(135deg, #ff0080, #ff8c00)",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 15px rgba(255, 0, 128, 0.4)"
  },
  badgeText: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "white"
  },
  content: {
    padding: "20px",
    maxWidth: "600px",
    margin: "0 auto"
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "50vh"
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "15px"
  },
  emptyTitle: {
    fontSize: "24px",
    fontWeight: "700",
    margin: 0,
    color: "#fff"
  },
  emptyText: {
    fontSize: "15px",
    color: "#888",
    margin: 0
  },
  list: { 
    display: "flex", 
    flexDirection: "column", 
    gap: "16px" 
  },
  item: { 
    position: "relative",
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)",
    backdropFilter: "blur(10px)",
    padding: "20px", 
    borderRadius: "20px", 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    transition: "all 0.3s ease"
  },
  itemGradientBorder: {
    position: "absolute",
    inset: 0,
    borderRadius: "20px",
    padding: "1px",
    background: "linear-gradient(135deg, rgba(255, 0, 128, 0.3), transparent, rgba(138, 43, 226, 0.3))",
    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude",
    pointerEvents: "none"
  },
  userRow: { 
    display: "flex", 
    gap: "15px", 
    alignItems: "center",
    flex: 1 
  },
  avatarContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  avatar: { 
    width: 64, 
    height: 64, 
    borderRadius: "50%", 
    objectFit: "cover",
    border: "3px solid transparent",
    position: "relative",
    zIndex: 1
  },
  avatarRing: {
    position: "absolute",
    width: 72,
    height: 72,
    border: "2px solid transparent",
    borderTopColor: "#ff0080",
    borderRightColor: "#ff8c00",
    borderRadius: "50%",
    zIndex: 0
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  name: { 
    fontWeight: "700", 
    fontSize: "18px",
    display: "flex",
    alignItems: "center",
    color: "#fff"
  },
  text: { 
    fontSize: "14px", 
    color: "#aaa",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  heartIcon: {
    fontSize: "12px"
  },
  metaInfo: {
    fontSize: "13px",
    color: "#666",
    marginTop: "2px"
  },
  actions: { 
    display: "flex", 
    gap: "12px" 
  },
  acceptBtn: { 
    background: "linear-gradient(135deg, #4CAF50, #45a049)",
    border: "none", 
    color: "white", 
    width: "48px",
    height: "48px",
    borderRadius: "50%", 
    cursor: "pointer", 
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 15px rgba(76, 175, 80, 0.3)",
    transition: "all 0.3s ease"
  },
  rejectBtn: { 
    background: "linear-gradient(135deg, #f44336, #d32f2f)",
    border: "none", 
    color: "white", 
    width: "48px",
    height: "48px",
    borderRadius: "50%", 
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 15px rgba(244, 67, 54, 0.3)",
    transition: "all 0.3s ease"
  }
};