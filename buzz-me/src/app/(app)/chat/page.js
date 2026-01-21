"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  collection, query, where, onSnapshot, doc, getDoc, orderBy 
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatListPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Auth Check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else router.push("/login");
    });
    return () => unsub();
  }, [router]);

  // 2. Fetch Matches
  useEffect(() => {
    if (!user) return;

    // NOTE: This query requires the Firebase Index you see in the console error!
    const q = query(
      collection(db, "matches"),
      where("users", "array-contains", user.uid),
      orderBy("createdAt", "desc") 
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const list = await Promise.all(snapshot.docs.map(async (d) => {
        const data = d.data();
        const otherUid = data.users.find((uid) => uid !== user.uid);
        let profile = { name: "User", photoURL: "" };
        
        if (otherUid) {
          const userSnap = await getDoc(doc(db, "users", otherUid));
          if (userSnap.exists()) profile = userSnap.data();
        }

        return { id: d.id, ...data, otherUser: profile };
      }));
      
      setMatches(list);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  if (loading) return (
    <div style={styles.center}>
       <div className="loading-spinner" style={{borderColor: '#e91e63', borderTopColor: 'transparent'}}></div>
    </div>
  );

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Messages</h1>
      
      <div style={styles.list}>
        <AnimatePresence>
          {matches.length === 0 ? (
            <div style={styles.empty}>No matches yet. Go swipe!</div>
          ) : (
            matches.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/chat/${m.id}`)}
                style={styles.item}
                whileTap={{ scale: 0.98 }}
              >
                <img src={m.otherUser.photoURL || "/placeholder.png"} style={styles.avatar} />
                <div style={styles.info}>
                  <h3 style={styles.name}>{m.otherUser.name}</h3>
                  <p style={styles.preview}>
                    {m.lastMessage?.isReply && "↩ "}
                    {m.lastMessage?.text || "Say hi! 👋"}
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
      {/* Spacer for BottomNav */}
      <div style={{height: 100}} /> 
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#000", color: "#fff", padding: "20px" },
  center: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" },
  title: { fontSize: "28px", fontWeight: "800", marginBottom: "20px", background: "linear-gradient(to right, #ff0080, #ff8c00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  item: { display: "flex", alignItems: "center", padding: "15px", background: "#1a1a1a", borderRadius: "15px", cursor: "pointer", border: "1px solid #333" },
  avatar: { width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover", marginRight: "15px" },
  info: { flex: 1, overflow: "hidden" },
  name: { margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600" },
  preview: { margin: 0, fontSize: "14px", color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  time: { fontSize: "12px", color: "#555" },
  empty: { textAlign: "center", color: "#666", marginTop: "50px" }
};