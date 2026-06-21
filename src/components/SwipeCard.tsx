"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, getDoc, setDoc, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";

/* -------------------- SWIPE CARD -------------------- */

function SwipeCard({ profile, onLike, onDislike, leaveX, setLeaveX }) {
  if (!profile || typeof profile !== "object") return null;

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  
  // Like/Nope Overlay indicators based on drag
  const nopeOpacity = useTransform(x, [-100, -50, 0], [1, 0, 0]);
  const likeOpacity = useTransform(x, [0, 50, 100], [0, 0, 1]);

  const photoURL = profile.photoURL || "https://via.placeholder.com/400x600?text=No+Photo";
  const name = profile.name || "Mystery User";
  const age = profile.age || "";
  const city = profile.city || "Unknown Location";

  return (
    <motion.div
      style={{
        ...styles.card,
        x,
        rotate,
        // @ts-ignore
        opacity
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(e, info) => {
        if (info.offset.x > 100) {
          setLeaveX(300);
          onLike();
        } else if (info.offset.x < -100) {
          setLeaveX(-300);
          onDislike();
        }
      }}
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ x: leaveX, opacity: 0, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <img src={photoURL} style={styles.cardImage} alt="Profile" draggable={false} />
      <div style={styles.cardGradient} />
      
      {/* Visual Swipe Indicators */}
      <motion.div style={{ ...styles.stamp, ...styles.nopeStamp, opacity: nopeOpacity }}>
        NOPE
      </motion.div>
      <motion.div style={{ ...styles.stamp, ...styles.likeStamp, opacity: likeOpacity }}>
        LIKE
      </motion.div>

      <div style={styles.cardInfo}>
        <h2 style={styles.cardName}>{name} {age && <span>{age}</span>}</h2>
        <p style={styles.cardCity}>📍 {city}</p>
      </div>
    </motion.div>
  );
}

/* -------------------- MAIN PAGE -------------------- */

export default function SwipePage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [leaveX, setLeaveX] = useState(0); // Direction for programmatic exit

  const [minAge, setMinAge] = useState(13);
  const [maxAge, setMaxAge] = useState(17);
  const [preferredGender, setPreferredGender] = useState("All");
  const [preferredCity, setPreferredCity] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) { setLoading(false); return; }
      const data = snap.data();
      setMyProfile(data);
      if (data.preferences) {
        setMinAge(data.preferences.minAge || 13);
        setMaxAge(data.preferences.maxAge || 17);
        setPreferredGender(data.preferences.preferredGender || "All");
        setPreferredCity(data.preferences.preferredCity || "");
      }
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!user || !myProfile) return;
    (async () => {
      const q = query(
        collection(db, "users"),
        where("completed", "==", true),
        where("age", ">=", minAge),
        where("age", "<=", maxAge)
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(d => {
        if (d.id === user.uid) return;
        const u = d.data();
        if (preferredGender !== "All" && u.gender !== preferredGender) return;
        if (preferredCity && u.city?.toLowerCase() !== preferredCity.toLowerCase()) return;
        list.push({ uid: d.id, ...u });
      });
      // Shuffle logic can go here
      setProfiles(list);
      setIndex(0);
    })();
  }, [user, myProfile, minAge, maxAge, preferredGender, preferredCity]);

  const currentProfile = profiles[index] || null;

  const handleLike = async () => {
    if (!currentProfile || !user) return;
    setLeaveX(300);
    setTimeout(async () => {
      setIndex(i => i + 1);
      await setDoc(doc(db, "likes", user.uid, "liked", currentProfile.uid), { createdAt: new Date() });
      const otherLike = await getDoc(doc(db, "likes", currentProfile.uid, "liked", user.uid));
      if (otherLike.exists()) createMatch(user.uid, currentProfile.uid);
    }, 200);
  };

  const handleDislike = async () => {
    if (!currentProfile || !user) return;
    setLeaveX(-300);
    setTimeout(async () => {
      setIndex(i => i + 1);
      await setDoc(doc(db, "likes", user.uid, "disliked", currentProfile.uid), { createdAt: new Date() });
    }, 200);
  };

  const createMatch = async (uid1: string, uid2: string) => {
    const matchId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    await setDoc(doc(db, "matches", matchId), { users: [uid1, uid2], createdAt: new Date() });
    await setDoc(doc(db, "chats", matchId), { users: [uid1, uid2], createdAt: new Date() });
    // Replace standard alert with custom UI later
    alert("IT'S A MATCH! 🎉 Drip check passed.");
  };

  if (loading) return null; // Let layout handle loader
  if (!user) return <div style={styles.errorText}>Bruh, log in first.</div>;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div onClick={() => router.push("/profile")} style={styles.profileBadge}>
          {myProfile?.photoURL ? (
             <img src={myProfile.photoURL} style={styles.avatar} alt="Me" />
          ) : (
            <div style={styles.avatarPlaceholder} />
          )}
          <span style={styles.logoText}>BuzzMe</span>
        </div>
        <motion.button 
          whileTap={{ scale: 0.8 }} 
          onClick={() => setShowSettings(true)} 
          style={styles.iconButton}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6"/></svg>
        </motion.button>
      </div>

      {/* Swipe Deck */}
      <div style={styles.deckContainer}>
        <AnimatePresence>
          {currentProfile ? (
            <SwipeCard
              key={currentProfile.uid}
              profile={currentProfile}
              onLike={handleLike}
              onDislike={handleDislike}
              leaveX={leaveX}
              setLeaveX={setLeaveX}
            />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.emptyState}>
              <div style={styles.radarPulse}></div>
              <h3>Out of profiles in your area!</h3>
              <p>Widen your filters to find more peeps.</p>
              <button style={styles.primaryBtn} onClick={() => setShowSettings(true)}>Tweak Filters</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons (Visible only when card exists) */}
      {currentProfile && (
        <div style={styles.actionRow}>
          <motion.button whileTap={{ scale: 0.8 }} onClick={handleDislike} style={{...styles.actionBtn, border: "2px solid #ff4b4b"}}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff4b4b" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </motion.button>
          <motion.button whileTap={{ scale: 0.8 }} onClick={handleLike} style={{...styles.actionBtn, border: "2px solid #4ee085"}}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ee085" strokeWidth="3"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </motion.button>
        </div>
      )}

      {/* Filters Modal Overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ y: "100%" }} 
            animate={{ y: 0 }} 
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={styles.modal}
          >
            <div style={styles.modalHeader}>
              <h2>Filters</h2>
              <button onClick={() => setShowSettings(false)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.modalContent}>
              <p style={{color:"#888"}}>More filter UI logic here bro, go crazy.</p>
              <button onClick={() => setShowSettings(false)} style={styles.primaryBtnFull}>Apply & Save</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles: Record<string, any> = {
  container: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "16px",
    maxWidth: "500px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    paddingTop: "10px",
  },
  profileBadge: {
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "rgba(255,255,255,0.05)",
    padding: "6px 16px 6px 6px",
    borderRadius: "100px",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  avatarPlaceholder: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#333",
  },
  logoText: {
    fontWeight: "800",
    fontSize: "18px",
    background: "linear-gradient(to right, #ff0080, #ff8c00)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  iconButton: {
    background: "rgba(255,255,255,0.08)",
    border: "none",
    borderRadius: "50%",
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  deckContainer: {
    flex: 1,
    position: "relative",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    perspective: "1000px",
  },
  card: {
    position: "absolute",
    width: "100%",
    height: "100%",
    maxHeight: "600px",
    background: "#111",
    borderRadius: "24px",
    overflow: "hidden",
    boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
    touchAction: "none",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    pointerEvents: "none",
  },
  cardGradient: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "50%",
    background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)",
    pointerEvents: "none",
  },
  cardInfo: {
    position: "absolute",
    bottom: "24px",
    left: "20px",
    right: "20px",
    pointerEvents: "none",
  },
  cardName: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "800",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textShadow: "0 2px 10px rgba(0,0,0,0.5)",
  },
  cardCity: {
    margin: "8px 0 0 0",
    fontSize: "16px",
    color: "#ddd",
    fontWeight: "500",
  },
  stamp: {
    position: "absolute",
    top: "40px",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "4px solid",
    fontSize: "32px",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "2px",
    pointerEvents: "none",
  },
  nopeStamp: {
    right: "40px",
    color: "#ff4b4b",
    borderColor: "#ff4b4b",
    transform: "rotate(15deg)",
  },
  likeStamp: {
    left: "40px",
    color: "#4ee085",
    borderColor: "#4ee085",
    transform: "rotate(-15deg)",
  },
  actionRow: {
    display: "flex",
    justifyContent: "center",
    gap: "24px",
    marginTop: "20px",
    marginBottom: "10px",
    zIndex: 10,
  },
  actionBtn: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    background: "#111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 20px rgba(0,0,0,0.3)",
    cursor: "pointer",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    textAlign: "center",
    color: "#888",
  },
  radarPulse: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "rgba(255,0,128,0.2)",
    marginBottom: "20px",
    animation: "pulse 2s infinite",
  },
  primaryBtn: {
    marginTop: "20px",
    padding: "12px 24px",
    borderRadius: "100px",
    background: "linear-gradient(135deg, #ff0080, #ff8c00)",
    color: "#fff",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
  },
  modal: {
    position: "fixed",
    inset: 0,
    background: "#111",
    zIndex: 99999,
    padding: "24px",
    display: "flex",
    flexDirection: "column",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "24px",
  },
  modalContent: {
    flex: 1,
  },
  primaryBtnFull: {
    width: "100%",
    padding: "16px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #ff0080, #ff8c00)",
    color: "#fff",
    border: "none",
    fontWeight: "bold",
    fontSize: "16px",
    marginTop: "auto",
  },
  errorText: {
    color: "#ff4b4b",
    padding: "40px",
    textAlign: "center",
    fontWeight: "bold",
  }
};