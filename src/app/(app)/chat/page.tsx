"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  collection, query, where, onSnapshot, doc, getDoc, orderBy 
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "firebase/auth";
import type { Match, UserProfile } from "@/types";

export default function ChatListPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else router.push("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    // NOTE: Ensure you built this Index in Firebase Console!
    const q = query(
      collection(db, "matches"),
      where("users", "array-contains", user.uid),
      orderBy("createdAt", "desc") 
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const list = await Promise.all(snapshot.docs.map(async (d) => {
        const data = d.data();
        const otherUid = data.users.find((uid) => uid !== user.uid);
        let profile: UserProfile = { uid: otherUid || "", name: "Mystery User", photoURL: "" };
        
        if (otherUid) {
          const userSnap = await getDoc(doc(db, "users", otherUid));
          if (userSnap.exists()) profile = { uid: otherUid, ...userSnap.data() };
        }

        return { id: d.id, ...data, otherUser: profile } as Match;
      }));
      
      setMatches(list);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  if (loading) return (
    <div style={styles.center}>
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        style={styles.spinner}
      />
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Messages</h1>
        <div style={styles.badge}>{matches.length}</div>
      </div>
      
      <div style={styles.list}>
        <AnimatePresence>
          {matches.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.empty}>
              <div style={styles.ghostIcon}>👻</div>
              <p>It's a ghost town in here.</p>
              <span style={{fontSize: "14px"}}>Get back to swiping!</span>
            </motion.div>
          ) : (
            matches.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 24 }}
                onClick={() => router.push(`/chat/${m.id}`)}
                style={styles.item}
                whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
                whileTap={{ scale: 0.98 }}
              >
                <img src={m.otherUser.photoURL || "https://via.placeholder.com/150"} style={styles.avatar} alt="avatar" />
                <div style={styles.info}>
                  <h3 style={styles.name}>{m.otherUser.name}</h3>
                  <p style={styles.preview}>
                    {m.lastMessage?.isReply && "↩ "}
                    {m.lastMessage?.text || "Tap to secure the comms 🔒"}
                  </p>
                </div>
                {m.lastMessage?.createdAt && (
                  <span style={styles.time}>
                    {new Date(m.lastMessage.createdAt.seconds * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </span>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  container: { height: "100%", padding: "20px", display: "flex", flexDirection: "column" },
  center: { height: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  spinner: { width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #ff0080, #ff8c00)" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", paddingTop: "10px" },
  title: { margin: 0, fontSize: "32px", fontWeight: "900", background: "linear-gradient(to right, #ff0080, #ff8c00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  badge: { background: "rgba(255,0,128,0.2)", color: "#ff0080", padding: "4px 12px", borderRadius: "20px", fontWeight: "bold", fontSize: "14px" },
  list: { display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "120px" }, // Extra padding for Nav
  item: { display: "flex", alignItems: "center", padding: "16px", background: "rgba(30, 30, 30, 0.6)", backdropFilter: "blur(10px)", borderRadius: "20px", cursor: "pointer", border: "1px solid rgba(255,255,255,0.05)" },
  avatar: { width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover", marginRight: "16px", boxShadow: "0 4px 10px rgba(0,0,0,0.3)" },
  info: { flex: 1, overflow: "hidden" },
  name: { margin: "0 0 6px 0", fontSize: "17px", fontWeight: "700", color: "#fff" },
  preview: { margin: 0, fontSize: "14px", color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  time: { fontSize: "12px", color: "#666", fontWeight: "500", paddingLeft: "10px" },
  empty: { textAlign: "center", color: "#888", marginTop: "60px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
  ghostIcon: { fontSize: "48px", marginBottom: "10px" }
};