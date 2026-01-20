"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import BottomNav from "@/components/BottomNav";

export default function ActivityPage() {
  const [requests, setRequests] = useState([]);
  
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
    });
  };

  const handleAccept = async (req) => {
    const currentUser = auth.currentUser;
    // Create Match
    const matchId = [req.fromUid, currentUser.uid].sort().join("_");
    await setDoc(doc(db, "matches", matchId), {
        users: [req.fromUid, currentUser.uid],
        createdAt: serverTimestamp()
    });
    // Delete Request
    await deleteDoc(doc(db, "friend_requests", req.id));
  };

  const handleReject = async (id) => {
    await deleteDoc(doc(db, "friend_requests", id));
  };

  return (
    <div style={s.page}>
      <h1 style={s.title}>Activity</h1>
      <h2 style={s.subtitle}>Friend Requests</h2>
      
      {requests.length === 0 && <p style={{color:"#666"}}>No new requests.</p>}

      <div style={s.list}>
        {requests.map(req => (
            <div key={req.id} style={s.item}>
                <div style={s.userRow}>
                    <img src={req.sender.photoURL || "placeholder.jpg"} style={s.avatar} />
                    <div>
                        <div style={s.name}>{req.sender.name}</div>
                        <div style={s.text}>Sent you a like</div>
                    </div>
                </div>
                <div style={s.actions}>
                    <button onClick={() => handleAccept(req)} style={s.acceptBtn}>Accept</button>
                    <button onClick={() => handleReject(req.id)} style={s.rejectBtn}>✕</button>
                </div>
            </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#121212", color: "white", padding: "20px" },
  title: { fontSize: "28px", fontWeight: "bold" },
  subtitle: { fontSize: "18px", marginTop: "20px", marginBottom: "15px", color: "#888" },
  list: { display: "flex", flexDirection: "column", gap: "15px" },
  item: { background: "#1e1e1e", padding: "15px", borderRadius: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  userRow: { display: "flex", gap: "15px", alignItems: "center" },
  avatar: { width: 50, height: 50, borderRadius: "50%", objectFit: "cover" },
  name: { fontWeight: "bold", fontSize: "16px" },
  text: { fontSize: "13px", color: "#888" },
  actions: { display: "flex", gap: "10px" },
  acceptBtn: { background: "#ff4b4b", border: "none", color: "white", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontWeight: "bold" },
  rejectBtn: { background: "#333", border: "none", color: "white", width: "35px", height: "35px", borderRadius: "50%", cursor: "pointer" }
};
