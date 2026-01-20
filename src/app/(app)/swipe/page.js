"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  collection, getDocs, doc, getDoc, setDoc, query, where, addDoc, deleteDoc, serverTimestamp 
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

/* ---------------- CHILD COMPONENT: SWIPE CARD ---------------- */
const SwipeCard = ({ profile, onLike, onDislike, isFront }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  
  // --- STORY NAVIGATION STATE ---
  const [photoIndex, setPhotoIndex] = useState(0);
  
  const photos = Array.isArray(profile.photos) && profile.photos.length > 0 
    ? profile.photos 
    : [profile.photoURL || "https://via.placeholder.com/400"];
  
  const currentPhoto = photos[photoIndex];

  const handleNext = (e) => { e.stopPropagation(); if (photoIndex < photos.length - 1) setPhotoIndex(i => i + 1); };
  const handlePrev = (e) => { e.stopPropagation(); if (photoIndex > 0) setPhotoIndex(i => i - 1); };

  // --- ANIMATION VALUES ---
  const likeOpacity = useTransform(x, [20, 150], [0, 1]); 
  const nopeOpacity = useTransform(x, [-150, -20], [1, 0]); 
  
  const bgOverlay = useTransform(x, [-150, 0, 150], [
    "linear-gradient(to right, rgba(234, 64, 64, 0.5), transparent)", 
    "linear-gradient(to right, transparent, transparent)",             
    "linear-gradient(to right, transparent, rgba(64, 234, 100, 0.5))"
  ]);

  const isOnline = () => {
    if (!profile.lastSeen) return false;
    const lastSeen = profile.lastSeen?.seconds ? new Date(profile.lastSeen.seconds * 1000) : new Date(profile.lastSeen);
    return (new Date() - lastSeen) / 1000 < 300; 
  };

  if (!profile) return null;

  return (
    <motion.div
      style={{ ...s.cardContainer, x, rotate, opacity, zIndex: isFront ? 10 : 1 }}
      drag={isFront ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      whileDrag={{ scale: 1.02, cursor: "grabbing" }}
      dragElastic={0.6}
      onDragEnd={(_, info) => {
        if (info.offset.x > 100) onLike();
        else if (info.offset.x < -100) onDislike();
      }}
      initial={{ scale: 0.95, y: 20, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ x: x.get() < 0 ? -1000 : 1000, opacity: 0, transition: { duration: 0.3 } }}
    >
      <motion.div style={{...s.tintOverlay, background: bgOverlay}} />

      {/* PROGRESS BARS */}
      {photos.length > 1 && (
        <div style={s.storyBarContainer}>
          {photos.map((_, i) => (
            <div key={i} style={s.storyTrack}>
              <div 
                style={{ 
                  ...s.storyFill, 
                  width: i <= photoIndex ? "100%" : "0%",
                  background: i === photoIndex ? "#fff" : "rgba(255,255,255,0.8)"
                }} 
              />
            </div>
          ))}
        </div>
      )}

      {/* TAP ZONES */}
      <div style={s.tapLeft} onClick={handlePrev} />
      <div style={s.tapRight} onClick={handleNext} />

      {/* MAIN IMAGE */}
      <img src={currentPhoto} style={s.cardImage} alt={profile.name} draggable="false" />

      {/* --- BIG ICONS --- */}
      <motion.div 
        style={{ ...s.bigIcon, left: 40, top: 60, opacity: likeOpacity, borderColor: '#4CAF50', color: '#4CAF50', transform: 'rotate(-15deg)' }}
      >
        <div style={s.iconCircleGreen}>❤️</div>
      </motion.div>

      <motion.div 
        style={{ ...s.bigIcon, right: 40, top: 60, opacity: nopeOpacity, borderColor: '#F44336', color: '#F44336', transform: 'rotate(15deg)' }}
      >
        <div style={s.iconCircleRed}>❌</div>
      </motion.div>

      {/* INFO OVERLAY */}
      <div style={s.bottomGradient}>
        <div style={s.textGroup}>
          
          {/* 1. Name & Age */}
          <div style={s.nameRow}>
            <h2 style={s.name}>{profile.name}</h2>
            <span style={s.age}>{profile.age}</span>
            {isOnline() && <div style={s.onlineBadge}>ONLINE</div>}
            {profile.verified && <span style={{marginLeft: 6, fontSize: '20px'}}>🔹</span>} 
          </div>

          {/* 2. Job / Education */}
          {(profile.studentType || profile.instituteName) && (
             <div style={s.infoRow}>
                <span>🎓 {profile.studentType || "Student"} {profile.instituteName ? `@ ${profile.instituteName}` : ""}</span>
             </div>
          )}

          {/* 3. Location & Looking For */}
          <div style={s.infoRow}>
            <span>📍 {profile.city || "Nearby"}</span>
            {profile.lookingFor && (
                <>
                    <span style={{margin: '0 6px', opacity: 0.5}}>|</span>
                    <span>👀 {profile.lookingFor}</span>
                </>
            )}
          </div>

          {/* 4. Interests Tags */}
          {profile.interests && profile.interests.length > 0 && (
            <div style={s.tagsContainer}>
                {profile.interests.slice(0, 4).map((tag, i) => (
                    <span key={i} style={s.tagChip}>{tag}</span>
                ))}
            </div>
          )}

          {/* 5. Bio */}
          {profile.bio && <p style={s.bio}>{profile.bio}</p>}
        </div>
      </div>
    </motion.div>
  );
};

/* ---------------- MAIN PAGE COMPONENT ---------------- */

export default function SwipePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [index, setIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matchPopup, setMatchPopup] = useState(null);

  // Filters
  const [minAge, setMinAge] = useState(13);
  const [maxAge, setMaxAge] = useState(18);
  const [preferredGender, setPreferredGender] = useState("All");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setLoading(false);
        router.push("/login"); 
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadMyProfile = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setMyProfile(data);
        if (data.preferences) {
          setMinAge(data.preferences.minAge || 13);
          setMaxAge(data.preferences.maxAge || 18);
          setPreferredGender(data.preferences.preferredGender || "All");
        }
      }
      setLoading(false);
    };
    loadMyProfile();
  }, [user]);

  const loadProfiles = async () => {
    if (!user || !myProfile) return;
    setLoading(true);
    const q = query(
      collection(db, "users"), 
      where("completed", "==", true), 
      where("age", ">=", minAge), 
      where("age", "<=", maxAge)
    );
    
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((docSnap) => {
      if (docSnap.id === user.uid) return;
      const d = docSnap.data();
      if (preferredGender !== "All" && d.gender !== preferredGender) return;
      list.push({ uid: docSnap.id, ...d });
    });
    setProfiles(list);
    setIndex(0);
    setLoading(false);
  };

  useEffect(() => {
    if (user && myProfile) loadProfiles();
  }, [user, myProfile]);

  /* --- ACTIONS --- */
  const handleLike = async () => {
    const currentProfile = profiles[index];
    setIndex((prev) => prev + 1);

    if (!currentProfile || !user) return;

    try {
        const incomingReqQuery = query(
          collection(db, "friend_requests"),
          where("fromUid", "==", currentProfile.uid),
          where("toUid", "==", user.uid),
          where("status", "==", "pending")
        );
        const incomingSnap = await getDocs(incomingReqQuery);

        if (!incomingSnap.empty) {
            const reqDoc = incomingSnap.docs[0];
            const matchId = [currentProfile.uid, user.uid].sort().join("_");
            await setDoc(doc(db, "matches", matchId), {
                users: [currentProfile.uid, user.uid],
                createdAt: serverTimestamp(),
            });
            await deleteDoc(doc(db, "friend_requests", reqDoc.id));
            setMatchPopup(currentProfile); 
            return; 
        }

        const outgoingReqQuery = query(
          collection(db, "friend_requests"),
          where("fromUid", "==", user.uid),
          where("toUid", "==", currentProfile.uid)
        );
        const outgoingSnap = await getDocs(outgoingReqQuery);

        if (outgoingSnap.empty) {
            await addDoc(collection(db, "friend_requests"), {
                fromUid: user.uid,
                toUid: currentProfile.uid,
                status: "pending",
                createdAt: serverTimestamp(),
                source: "swipe"
            });
        }
    } catch (error) {
        console.error("Error processing like:", error);
    }
  };

  const handleDislike = () => {
    setIndex((prev) => prev + 1);
  };

  const savePreferences = async () => {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid), {
      preferences: { minAge, maxAge, preferredGender },
    }, { merge: true });
    setShowSettings(false);
    loadProfiles();
  };

  if (loading) return (
    <div style={s.loadingContainer}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
            <span style={{ fontSize: 40 }}>🐝</span>
        </motion.div>
    </div>
  );

  return (
    <>
    {/* GLOBAL STYLES TO KILL SCROLLBARS */}
    <style jsx global>{`
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden; /* This kills the scrollbar */
        background-color: #121212; /* Black background to hide white space */
        overscroll-behavior: none; /* Stops bounce effect */
      }
      
      /* Style Range Slider Thumb */
      .rangeInput::-webkit-slider-thumb { 
           pointer-events: auto; width: 20px; height: 20px; 
           border-radius: 50%; background: white; appearance: none; cursor: pointer;
           box-shadow: 0 0 5px rgba(0,0,0,0.5);
      }
    `}</style>

    <div style={s.pageContainer}>
        
        {/* HEADER */}
        <div style={s.header}>
          <h1 style={s.logo}>BuzzMe</h1>
          <motion.button 
              whileTap={{ scale: 0.9 }} 
              onClick={() => setShowSettings(true)} 
              style={s.settingsBtn}
          >
              ⚙️
          </motion.button>
        </div>

        {/* CARD STACK */}
        <div style={s.cardStackWrapper}>
          <AnimatePresence mode="popLayout">
            {index < profiles.length ? (
              <SwipeCard 
                key={profiles[index].uid}
                profile={profiles[index]}
                isFront={true}
                onLike={handleLike}
                onDislike={handleDislike}
              />
            ) : (
              <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  style={s.emptyState}
              >
                <div style={s.emptyIcon}>🌍</div>
                <h3>That's everyone!</h3>
                <p style={{color: '#888'}}>Adjust filters to find more buzzes.</p>
                <button onClick={() => setShowSettings(true)} style={s.primaryBtn}>Adjust Filters</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* MATCH POPUP */}
        <AnimatePresence>
          {matchPopup && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={s.matchOverlay}
            >
              <motion.div 
                  initial={{ scale: 0.5, y: 100 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  style={s.matchCard}
              >
                  <div style={s.matchHeader}>It's a Match!</div>
                  <div style={s.matchSubText}>You and {matchPopup.name} liked each other</div>
                  <div style={s.avatarRow}>
                      <img src={myProfile?.photoURL} style={s.matchAvatar} />
                      <img src={matchPopup.photoURL} style={s.matchAvatar} />
                  </div>
                  <button onClick={() => router.push("/chat")} style={s.chatBtn}>Send Message</button>
                  <button onClick={() => setMatchPopup(null)} style={s.keepSwipingBtn}>Keep Swiping</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SETTINGS SHEET */}
        <AnimatePresence>
          {showSettings && (
            <>
              {/* BACKDROP */}
              <motion.div onClick={() => setShowSettings(false)} style={s.backdrop} />
              
              {/* SHEET */}
              <motion.div 
                  initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
                  transition={{ type: "spring", damping: 25 }}
                  style={s.sheet}
              >
                  <div style={s.sheetHeader}>
                      <h2>Discovery</h2>
                      <button onClick={() => setShowSettings(false)} style={s.closeSheet}>✕</button>
                  </div>

                  <div style={s.settingSection}>
                      <div style={s.labelRow}><span>Age Range</span><span style={s.highlight}>{minAge} - {maxAge}</span></div>
                      <div style={s.sliderContainer}>
                          <input type="range" min="13" max="18" value={minAge} onChange={(e) => setMinAge(Math.min(Number(e.target.value), maxAge - 1))} className="rangeInput" style={{...s.rangeInput, zIndex: 4}} />
                          <input type="range" min="13" max="18" value={maxAge} onChange={(e) => setMaxAge(Math.max(Number(e.target.value), minAge + 1))} className="rangeInput" style={{...s.rangeInput, zIndex: 5}} />
                          <div style={s.trackBg}></div>
                          <div style={{...s.trackFill, left: `${((minAge - 13) / 5) * 100}%`, right: `${100 - ((maxAge - 13) / 5) * 100}%`}}></div>
                      </div>
                  </div>

                  <div style={s.settingSection}>
                      <div style={s.labelRow}><span>Show Me</span></div>
                      <div style={s.toggleRow}>
                          {["Male", "Female", "All"].map((g) => (
                              <button key={g} onClick={() => setPreferredGender(g)} style={{...s.toggleBtn, background: preferredGender === g ? "#e91e63" : "#333", color: preferredGender === g ? "white" : "#aaa"}}>
                                  {g}
                              </button>
                          ))}
                      </div>
                  </div>
                  
                  <button onClick={savePreferences} style={s.primaryBtn}>Save Settings</button>
                  
                  {/* PADDING FOR BOTTOM NAV */}
                  <div style={{height: 60}}></div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <BottomNav />
    </div>
    </>
  );
}

/* --- POLISHED STYLES --- */
const s = {
  // PAGE GENERAL
  pageContainer: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "#121212", 
    color: "white", 
    display: "flex", flexDirection: "column", 
    overflow: "hidden", 
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  loadingContainer: { 
    height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#121212", color: "white" 
  },
  
  // HEADER
  header: { 
    padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 50 
  },
  logo: { 
    fontSize: "24px", fontWeight: "900", letterSpacing: "-1px", 
    background: "linear-gradient(to right, #fff, #999)", 
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 
  },
  settingsBtn: { 
    background: "#222", border: "none", width: "40px", height: "40px", 
    borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", 
    justifyContent: "center", fontSize: "18px" 
  },

  // CARD STACK
  cardStackWrapper: { 
    flex: 1, position: "relative", display: "flex", justifyContent: "center", alignItems: "center", marginTop: "-40px" 
  },
  cardContainer: {
    position: "absolute",
    width: "95%", maxWidth: "380px", 
    height: "72vh", 
    borderRadius: "20px",
    overflow: "hidden",
    background: "#1a1a1a",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
    transformStyle: "preserve-3d",
    cursor: "grab",
    userSelect: "none"
  },
  cardImage: { width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" },
  tintOverlay: { position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" },

  // NAVIGATION
  tapLeft: { position: "absolute", top: 0, left: 0, bottom: 0, width: "50%", zIndex: 9, cursor: "pointer" },
  tapRight: { position: "absolute", top: 0, right: 0, bottom: 0, width: "50%", zIndex: 9, cursor: "pointer" },
  storyBarContainer: { position: "absolute", top: 10, left: 10, right: 10, display: "flex", gap: "4px", zIndex: 20, height: "3px" },
  storyTrack: { flex: 1, background: "rgba(255,255,255,0.3)", borderRadius: "2px", overflow: "hidden" },
  storyFill: { height: "100%", background: "#fff", transition: "width 0.2s ease" },

  // OVERLAY CONTENT (UPDATED FOR RICH DATA)
  bottomGradient: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", 
    background: "linear-gradient(to top, rgba(0,0,0,0.95) 15%, rgba(0,0,0,0.7) 60%, transparent 100%)",
    display: "flex", flexDirection: "column", justifyContent: "flex-end",
    padding: "20px", zIndex: 15, pointerEvents: "none"
  },
  textGroup: { marginBottom: "15px", textShadow: "0 2px 4px rgba(0,0,0,0.8)" },
  
  nameRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" },
  name: { fontSize: "30px", fontWeight: "800", margin: 0, color: "white" },
  age: { fontSize: "24px", fontWeight: "500", opacity: 0.9, color: "white" },
  
  onlineBadge: { background: "#4CAF50", color: "#000", fontSize: "10px", fontWeight: "bold", padding: "3px 8px", borderRadius: "10px", textTransform: "uppercase" },
  
  infoRow: { 
      display: "flex", alignItems: "center", fontSize: "14px", 
      color: "#e0e0e0", fontWeight: "500", marginBottom: "4px" 
  },

  tagsContainer: {
      display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px", marginBottom: "8px"
  },
  tagChip: {
      fontSize: "11px", background: "rgba(255, 255, 255, 0.2)", 
      backdropFilter: "blur(5px)", padding: "4px 10px", 
      borderRadius: "12px", color: "white", fontWeight: "600",
      border: "1px solid rgba(255,255,255,0.1)"
  },

  bio: { 
      fontSize: "14px", color: "#ccc", marginTop: "6px", 
      lineHeight: "1.4", display: "-webkit-box", 
      WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" 
  },

  // ICONS (FIXED BORDER)
  bigIcon: {
    position: "absolute", zIndex: 20, pointerEvents: "none",
    borderWidth: "4px", borderStyle: "solid", borderRadius: "8px", 
    padding: "5px 15px", fontSize: "32px", fontWeight: "900", letterSpacing: "2px"
  },
  iconCircleGreen: { background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", borderRadius: "50%", width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "35px", border: "2px solid #4CAF50" },
  iconCircleRed: { background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", borderRadius: "50%", width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "35px", border: "2px solid #F44336" },

  // EMPTY STATE & POPUPS
  emptyState: { textAlign: "center", color: "#888" },
  emptyIcon: { fontSize: "60px", marginBottom: "10px" },
  matchOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(5px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  matchCard: { background: "#1A1A1A", width: "100%", maxWidth: "350px", borderRadius: "30px", padding: "40px 20px", textAlign: "center", border: "1px solid #333", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" },
  matchHeader: { fontSize: "40px", fontWeight: "900", color: "#00E676", marginBottom: "10px" },
  matchSubText: { color: "#888", marginBottom: "30px" },
  avatarRow: { display: "flex", justifyContent: "center", gap: "15px", marginBottom: "40px" },
  matchAvatar: { width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "3px solid white" },
  chatBtn: { width: "100%", padding: "16px", borderRadius: "30px", background: "#00E676", color: "#000", fontWeight: "bold", border: "none", fontSize: "16px", cursor: "pointer", marginBottom: "10px" },
  keepSwipingBtn: { width: "100%", padding: "16px", borderRadius: "30px", background: "transparent", color: "#888", fontWeight: "600", border: "none", cursor: "pointer" },

  // SETTINGS SHEET (High Z-Index)
  backdrop: { 
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
    background: "rgba(0,0,0,0.6)", zIndex: 1999 
  },
  sheet: { 
    position: "absolute", bottom: 0, left: 0, right: 0, 
    background: "#1F1F1F", 
    borderTopLeftRadius: "25px", borderTopRightRadius: "25px", 
    padding: "25px", paddingBottom: "40px", 
    zIndex: 2000 
  },
  sheetHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" },
  closeSheet: { background: "none", border: "none", color: "white", fontSize: "20px", cursor: "pointer" },
  settingSection: { marginBottom: "30px" },
  labelRow: { display: "flex", justifyContent: "space-between", marginBottom: "15px", fontSize: "16px", fontWeight: "600" },
  highlight: { color: "#e91e63" },
  sliderContainer: { position: "relative", height: "30px", display: "flex", alignItems: "center" },
  trackBg: { position: "absolute", width: "100%", height: "4px", background: "#333", borderRadius: "2px" },
  trackFill: { position: "absolute", height: "4px", background: "#e91e63", borderRadius: "2px" },
  rangeInput: { 
    position: "absolute", width: "100%", background: "none", 
    pointerEvents: "none", appearance: "none", outline: "none" 
  },
  toggleRow: { display: "flex", gap: "10px" },
  toggleBtn: { flex: 1, padding: "14px", borderRadius: "12px", border: "none", fontWeight: "600", cursor: "pointer", transition: "0.2s" },
  primaryBtn: { width: "100%", padding: "16px", background: "#e91e63", color: "white", border: "none", borderRadius: "30px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" },
};