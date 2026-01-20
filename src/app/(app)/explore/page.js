"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null); 
  const [interactionStatus, setInteractionStatus] = useState(""); 

  // --- 1. FIX WHITE SCROLL BACKGROUND ---
  useEffect(() => {
    document.body.style.backgroundColor = "#0a0a0a";
    document.documentElement.style.backgroundColor = "#0a0a0a";
    return () => {
      document.body.style.backgroundColor = "";
      document.documentElement.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "users"), 
        where("completed", "==", true),
        limit(20) 
      );
      
      const snap = await getDocs(q);
      const currentUser = auth.currentUser?.uid;

      const list = snap.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter((u) => u.uid !== currentUser); 

      setUsers(list);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadAllUsers();
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, "users"),
        where("buzzId", "==", searchTerm.trim())
      );
      const snap = await getDocs(q);
      setUsers(snap.docs.map((doc) => ({ uid: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error searching:", error);
    }
    setLoading(false);
  };

  // --- INTERACTION LOGIC ---

  const sendNotification = async (toUid, type, message, isAnonymous = false) => {
    try {
        await addDoc(collection(db, "notifications"), {
            toUid: toUid, 
            fromUid: isAnonymous ? "Anonymous" : auth.currentUser.uid, 
            fromName: isAnonymous ? "Someone" : auth.currentUser.displayName || "A user",
            type: type, 
            message: message,
            read: false,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Error sending notification", e);
    }
  };

  const handleCrush = async (targetUser) => {
    if (!auth.currentUser) return;
    const myUid = auth.currentUser.uid;

    try {
      const q = query(
        collection(db, "crushes"), 
        where("fromUid", "==", targetUser.uid), 
        where("toUid", "==", myUid) 
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        setInteractionStatus("🎉 Yay! It's a Crush! (Matched) 🎉");
        
        await addDoc(collection(db, "crushes"), { 
            fromUid: myUid, 
            toUid: targetUser.uid, 
            match: true 
        });
        
        await sendNotification(targetUser.uid, "match", `Yay! It's a Crush with ${auth.currentUser.displayName || "someone"}!`, false);
        await sendNotification(myUid, "match", `Yay! You matched with ${targetUser.name}!`, false);

      } else {
        const checkMyCrush = query(
            collection(db, "crushes"),
            where("fromUid", "==", myUid), 
            where("toUid", "==", targetUser.uid) 
        );
        const mySnap = await getDocs(checkMyCrush);

        if(mySnap.empty) {
            await addDoc(collection(db, "crushes"), { 
                fromUid: myUid, 
                toUid: targetUser.uid, 
                match: false 
            });
            setInteractionStatus("Secretly sent! 🤫");
            await sendNotification(targetUser.uid, "crush_anon", "Somebody has a crush on you! 🫣", true);
        } else {
            setInteractionStatus("You already crushed them!");
        }
      }
    } catch (error) {
      console.error("Crush error:", error);
      setInteractionStatus("Error sending crush.");
    }
  };

  const handleLike = async (targetUser) => {
     setInteractionStatus(`Liked ${targetUser.name}! 👍`);
     await sendNotification(targetUser.uid, "like", `${auth.currentUser.displayName} liked your profile.`, false);
  };

  // --- ANIMATION VARIANTS ---
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 50 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
    exit: { opacity: 0, scale: 0.9, y: 50 }
  };

  return (
    <div style={s.page}>
      <style jsx global>{`
        body, html { background-color: #0a0a0a !important; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `}</style>
      
      {/* Header */}
      <div style={s.headerContainer}>
        <div style={s.headerContent}>
          <h1 style={s.title}>Explore <span style={{fontSize: '20px'}}>🌍</span></h1>
          <div style={s.searchWrapper}>
            <input
              style={s.input}
              placeholder="Search Buzz ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button style={s.searchBtn} onClick={handleSearch}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div style={s.contentArea}>
        {loading ? (
          <div style={s.grid}>
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} style={{ ...s.card, ...s.skeletonCard }} />)}
          </div>
        ) : (
          <motion.div layout style={s.grid}>
            <AnimatePresence>
              {users.map((user) => (
                <motion.div
                  key={user.uid}
                  layoutId={`card-${user.uid}`}
                  whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.4)" }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => {
                      setSelectedUser(user);
                      setInteractionStatus("");
                  }}
                  style={s.card}
                >
                  <div style={s.imgContainer}>
                    <img src={user.photoURL || "https://api.dicebear.com/9.x/avataaars/svg?seed=" + user.uid} style={s.img} alt={user.name} />
                    <div style={s.gradientOverlay} />
                    <div style={s.badge}>
                        <span style={s.badgeText}>{user.age}</span>
                    </div>
                  </div>
                  <div style={s.info}>
                    <div style={s.name}>
                        {user.name}
                        {user.verified && <span style={{marginLeft: 4, color: '#3b82f6'}}>🔹</span>}
                    </div>
                    <div style={s.buzzId}>@{user.buzzId}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
        
        {!loading && users.length === 0 && (
            <div style={s.emptyState}>
                <p>No users found. Try searching again!</p>
            </div>
        )}
      </div>

      {/* --- USER PROFILE MODAL --- */}
      <AnimatePresence>
        {selectedUser && (
          <div style={s.modalOverlay} onClick={() => setSelectedUser(null)}>
            <motion.div 
              style={s.modalContent} 
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()} 
            >
              <button style={s.closeBtn} onClick={() => setSelectedUser(null)}>✕</button>
              
              <div style={s.modalImgWrapper}>
                <img 
                    src={selectedUser.photoURL || "https://api.dicebear.com/9.x/avataaars/svg?seed=" + selectedUser.uid} 
                    style={s.modalImg} 
                />
              </div>
              
              <h2 style={s.modalName}>
                  {selectedUser.name} <span style={s.modalAge}>{selectedUser.age}</span>
                  {selectedUser.verified && <span style={{marginLeft: '6px', fontSize: '18px'}}>🔹</span>}
              </h2>
              <div style={s.modalBuzzId}>@{selectedUser.buzzId}</div>
              
              <div style={s.divider} />

              {/* RICH DATA SECTION */}
              <div style={s.infoSection}>
                  {(selectedUser.studentType || selectedUser.instituteName) && (
                     <div style={s.infoRow}>
                        <span>🎓 {selectedUser.studentType || "Student"} {selectedUser.instituteName ? `@ ${selectedUser.instituteName}` : ""}</span>
                     </div>
                  )}

                  <div style={s.infoRow}>
                    <span>📍 {selectedUser.city || "Nearby"}</span>
                  </div>

                  {selectedUser.lookingFor && (
                     <div style={s.infoRow}>
                        <span>👀 {selectedUser.lookingFor}</span>
                     </div>
                  )}
              </div>

              {/* INTERESTS TAGS */}
              {selectedUser.interests && selectedUser.interests.length > 0 && (
                <div style={s.tagsContainer}>
                    {selectedUser.interests.map((tag, i) => (
                        <span key={i} style={s.tagChip}>{tag}</span>
                    ))}
                </div>
              )}

              <p style={s.modalBio}>{selectedUser.bio || "This user is mysterious and has no bio yet."}</p>

              {/* Interaction Status Message */}
              <div style={s.statusContainer}>
                  <AnimatePresence mode="wait">
                    {interactionStatus && (
                        <motion.div 
                            key={interactionStatus}
                            initial={{opacity: 0, y: 5}} 
                            animate={{opacity: 1, y: 0}}
                            exit={{opacity: 0, y: -5}}
                            style={s.statusMsg}
                        >
                            {interactionStatus}
                        </motion.div>
                    )}
                  </AnimatePresence>
              </div>

              {/* ACTION BUTTONS */}
              <div style={s.actionRow}>
                <motion.button 
                    whileTap={{ scale: 0.95 }}
                    style={s.likeBtn}
                    onClick={() => handleLike(selectedUser)}
                >
                    👍 Like
                </motion.button>
                
                <motion.button 
                    whileTap={{ scale: 0.95 }}
                    style={s.crushBtn}
                    onClick={() => handleCrush(selectedUser)}
                >
                    💘 Crush
                </motion.button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

// Polished Styles
const s = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#ffffff",
    paddingBottom: "110px", 
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  headerContainer: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "rgba(10, 10, 10, 0.8)", 
    backdropFilter: "blur(12px)", 
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    padding: "15px 20px",
  },
  headerContent: {
    maxWidth: "600px",
    margin: "0 auto",
  },
  title: {
    fontSize: "26px",
    fontWeight: "800",
    margin: "0 0 15px 0",
    color: "#fff",
    letterSpacing: "-0.5px",
  },
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    background: "#1A1A1A",
    borderRadius: "16px",
    border: "1px solid #2a2a2a",
    padding: "4px 6px",
    transition: "border-color 0.2s",
  },
  input: {
    flex: 1,
    padding: "12px 10px",
    border: "none",
    background: "transparent",
    color: "white",
    outline: "none",
    fontSize: "15px",
    fontWeight: "500",
  },
  searchBtn: {
    padding: "10px",
    borderRadius: "12px",
    border: "none",
    background: "#333",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s",
  },
  contentArea: { 
    padding: "20px",
    maxWidth: "600px",
    margin: "0 auto",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "15px",
  },
  card: {
    background: "#141414",
    borderRadius: "20px",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.05)",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  skeletonCard: { 
    height: "220px", 
    background: "linear-gradient(110deg, #141414 8%, #222 18%, #141414 33%)",
    backgroundSize: "200% 100%",
  },
  imgContainer: { 
    position: "relative", 
    width: "100%", 
    paddingTop: "110%" 
  },
  img: { 
    position: "absolute", 
    top: 0, 
    left: 0, 
    width: "100%", 
    height: "100%", 
    objectFit: "cover" 
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: "50%",
    background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
  },
  badge: {
    position: "absolute", 
    bottom: "10px", 
    right: "10px",
    background: "rgba(255, 255, 255, 0.15)", 
    padding: "4px 8px", 
    borderRadius: "20px",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  badgeText: {
    fontSize: "10px", 
    fontWeight: "700", 
    color: "#fff",
  },
  info: { 
    padding: "12px 14px",
  },
  name: { 
    fontWeight: "700", 
    fontSize: "15px", 
    color: "#fff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: 'flex',
    alignItems: 'center'
  },
  buzzId: { 
    color: "#666", 
    fontSize: "12px", 
    fontWeight: "500", 
    marginTop: "2px"
  },
  emptyState: {
      textAlign: "center",
      color: "#444",
      marginTop: "50px",
      fontSize: "14px"
  },

  // MODAL STYLES
  modalOverlay: {
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    background: "rgba(0,0,0,0.7)", 
    backdropFilter: "blur(8px)", 
    zIndex: 100, 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    padding: "20px"
  },
  modalContent: {
    background: "#161616",
    width: "100%", 
    maxWidth: "340px",
    borderRadius: "32px",
    padding: "30px",
    textAlign: "center",
    position: "relative",
    border: "1px solid #2a2a2a",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)"
  },
  closeBtn: {
    position: "absolute", top: "20px", right: "20px",
    background: "#222", border: "none", color: "#888",
    width: "30px", height: "30px", borderRadius: "50%",
    fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
  },
  modalImgWrapper: {
      padding: "4px",
      border: "2px dashed #333",
      borderRadius: "50%",
      display: "inline-block",
      marginBottom: "15px"
  },
  modalImg: {
    width: "110px", height: "110px", borderRadius: "50%",
    objectFit: "cover", display: "block", background: "#000"
  },
  modalName: { 
      margin: "0", 
      fontSize: "24px", 
      fontWeight: "800",
      color: "white",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
  },
  modalAge: {
      fontSize: "20px",
      fontWeight: "400",
      color: "#666"
  },
  modalBuzzId: { 
      color: "#ff0080", 
      fontSize: "14px", 
      fontWeight: "600",
      marginBottom: "15px"
  },
  divider: {
      height: "1px",
      background: "#222",
      margin: "15px 0",
      width: "100%"
  },
  
  // NEW STYLES FOR RICH DATA
  infoSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginBottom: '15px',
      alignItems: 'center'
  },
  infoRow: {
      fontSize: '14px',
      color: '#ddd',
      fontWeight: '500',
      background: '#222',
      padding: '6px 12px',
      borderRadius: '12px',
      display: 'inline-flex',
      alignItems: 'center'
  },
  tagsContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '6px',
      marginBottom: '15px'
  },
  tagChip: {
      fontSize: "11px", 
      background: "rgba(255, 255, 255, 0.1)", 
      border: "1px solid #333",
      padding: "4px 10px", 
      borderRadius: "12px", 
      color: "#ccc", 
      fontWeight: "600"
  },

  modalBio: { 
      color: "#999", 
      fontSize: "14px", 
      lineHeight: "1.5",
      margin: "10px 0",
      fontStyle: "italic"
  },
  statusContainer: {
      minHeight: "30px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginTop: "15px"
  },
  statusMsg: {
      color: "#fff", 
      background: "linear-gradient(90deg, #ff0080, #7928CA)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      fontWeight: "bold", 
      fontSize: "14px",
  },
  actionRow: {
    display: "flex", gap: "12px", justifyContent: "center", marginTop: "10px"
  },
  likeBtn: {
    flex: 1, padding: "14px", borderRadius: "18px", border: "none",
    background: "#222", color: "white", fontWeight: "600", cursor: "pointer",
    fontSize: "16px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
  },
  crushBtn: {
    flex: 1, padding: "14px", borderRadius: "18px", border: "none",
    background: "linear-gradient(135deg, #ff0080, #ff4d4d)", 
    color: "white", fontWeight: "700", cursor: "pointer",
    fontSize: "16px", 
    boxShadow: "0 8px 20px rgba(255, 0, 128, 0.25)"
  },
};