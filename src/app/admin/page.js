"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { supabase } from "@/lib/supabase"; 

export default function AdminPage() {
    // --- AUTH STATE ---
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [authError, setAuthError] = useState("");

    // --- DATA STATE ---
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false); // Start false, set true when loading data

    // --- 1. Fetch Pending Requests (Only if Authenticated) ---
    useEffect(() => {
        if (isAuthenticated) {
            loadRequests();
        }
    }, [isAuthenticated]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            // Query users where verificationStatus is 'pending'
            const q = query(
                collection(db, "users"), 
                where("verificationStatus", "==", "pending")
            );
            const snap = await getDocs(q);
            const list = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
            setRequests(list);
        } catch (error) {
            console.error("Error loading requests:", error);
            alert("Error loading data. Check console.");
        }
        setLoading(false);
    };

    // --- 2. Helper: Delete Image from Supabase ---
    const deleteProofImage = async (url) => {
        if (!url) return;
        try {
            const pathParts = url.split("verification/"); // Bucket name 'verification'
            if (pathParts.length > 1) {
                const fileName = pathParts[1];
                const { error } = await supabase.storage
                    .from("verification")
                    .remove([fileName]);
                
                if (error) console.error("Supabase Delete Error:", error);
                else console.log("Proof image deleted securely.");
            }
        } catch (error) {
            console.error("Error deleting image:", error);
        }
    };

    // --- 3. APPROVE Handler ---
    const handleApprove = async (user) => {
        if (!confirm(`Are you sure you want to APPROVE ${user.name}?`)) return;

        try {
            await updateDoc(doc(db, "users", user.uid), {
                verified: true,
                verificationStatus: "verified",
                verificationProofUrl: null
            });
            await deleteProofImage(user.verificationProofUrl);
            setRequests(requests.filter(r => r.uid !== user.uid));
            alert(`Verified ${user.name}!`);
        } catch (error) {
            console.error("Approval failed:", error);
            alert("Error approving user.");
        }
    };

    // --- 4. REJECT Handler ---
    const handleReject = async (user) => {
        if (!confirm(`Reject verification for ${user.name}?`)) return;

        try {
            await updateDoc(doc(db, "users", user.uid), {
                verified: false,
                verificationStatus: "rejected",
                verificationProofUrl: null
            });
            await deleteProofImage(user.verificationProofUrl);
            setRequests(requests.filter(r => r.uid !== user.uid));
            alert("User request rejected.");
        } catch (error) {
            console.error("Rejection failed:", error);
            alert("Error rejecting user.");
        }
    };

    // --- 5. LOGIN Handler ---
    const handleLogin = (e) => {
        e.preventDefault();
        if (passwordInput === "998357") {
            setIsAuthenticated(true);
            setAuthError("");
        } else {
            setAuthError("Incorrect Password");
        }
    };

    // --- RENDER LOGIN SCREEN ---
    if (!isAuthenticated) {
        return (
            <div style={s.loginPage}>
                <div style={s.loginBox}>
                    <h1 style={s.loginTitle}>Admin Access 🔒</h1>
                    <form onSubmit={handleLogin}>
                        <input 
                            type="password" 
                            placeholder="Enter Password" 
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            style={s.loginInput}
                            autoFocus
                        />
                        {authError && <p style={s.errorMsg}>{authError}</p>}
                        <button type="submit" style={s.loginBtn}>Unlock Dashboard</button>
                    </form>
                </div>
            </div>
        );
    }

    // --- RENDER DASHBOARD ---
    if (loading) return <div style={s.loader}>Loading requests...</div>;

    return (
        <div style={s.page}>
            <div style={s.header}>
                <h1 style={s.title}>BuzzMe Admin 🛡️</h1>
                <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                    <div style={s.badge}>{requests.length} Pending</div>
                    <button onClick={() => setIsAuthenticated(false)} style={s.logoutBtn}>Logout</button>
                </div>
            </div>
            
            {requests.length === 0 ? (
                <div style={s.emptyState}>
                    <p>No pending verification requests.</p>
                    <button onClick={loadRequests} style={s.refreshBtn}>Refresh</button>
                </div>
            ) : (
                <div style={s.grid}>
                    {requests.map((user) => (
                        <div key={user.uid} style={s.card}>
                            {/* User Info Header */}
                            <div style={s.cardHeader}>
                                <h3 style={s.name}>{user.name}</h3>
                                <span style={s.buzzId}>@{user.buzzId}</span>
                            </div>

                            {/* Details */}
                            <div style={s.details}>
                                <p><strong>Age:</strong> {user.age} | <strong>Gender:</strong> {user.gender}</p>
                                <p><strong>Institute:</strong> {user.instituteName || "N/A"}</p>
                            </div>
                            
                            {/* Proof Image Area */}
                            <div style={s.imageContainer}>
                                <p style={s.label}>Verification Proof:</p>
                                {user.verificationProofUrl ? (
                                    <a href={user.verificationProofUrl} target="_blank" rel="noreferrer" title="Click to view full size">
                                        <img 
                                            src={user.verificationProofUrl} 
                                            alt="Proof" 
                                            style={s.proofImg} 
                                        />
                                    </a>
                                ) : (
                                    <p style={{color: 'red'}}>Error: No image URL found</p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div style={s.actions}>
                                <button onClick={() => handleReject(user)} style={s.rejectBtn}>✕ Reject</button>
                                <button onClick={() => handleApprove(user)} style={s.approveBtn}>✓ Approve</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- Styles (Dark Mode Admin) ---
const s = {
    // ... (Previous styles same as before) ...
    page: {
        background: '#0a0a0a',
        color: '#ffffff',
        minHeight: '100vh',
        padding: '40px',
        fontFamily: 'system-ui, sans-serif'
    },
    loader: {
        display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a', color: '#fff'
    },
    
    // Login Styles
    loginPage: {
        background: '#0a0a0a',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, sans-serif'
    },
    loginBox: {
        background: '#141414',
        padding: '40px',
        borderRadius: '20px',
        border: '1px solid #333',
        textAlign: 'center',
        width: '100%',
        maxWidth: '350px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    },
    loginTitle: {
        color: '#fff',
        marginBottom: '20px',
        fontSize: '24px'
    },
    loginInput: {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #333',
        background: '#000',
        color: '#fff',
        fontSize: '16px',
        marginBottom: '15px',
        outline: 'none',
        textAlign: 'center',
        letterSpacing: '2px'
    },
    loginBtn: {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: 'none',
        background: '#ff4458',
        color: '#fff',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '16px'
    },
    errorMsg: {
        color: '#ff4444',
        fontSize: '14px',
        marginBottom: '15px'
    },
    logoutBtn: {
        background: 'transparent',
        border: '1px solid #444',
        color: '#aaa',
        padding: '5px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '12px'
    },

    // ... (Rest of Dashboard Styles) ...
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #333',
        paddingBottom: '20px',
        marginBottom: '30px'
    },
    title: {
        margin: 0,
        fontSize: '28px',
        fontWeight: '800',
        background: 'linear-gradient(to right, #ff4458, #ff0080)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
    },
    badge: {
        background: '#333',
        padding: '5px 15px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: 'bold'
    },
    emptyState: {
        textAlign: 'center',
        color: '#666',
        marginTop: '100px',
        fontSize: '18px'
    },
    refreshBtn: {
        marginTop: '20px',
        background: 'transparent',
        border: '1px solid #444',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '8px',
        cursor: 'pointer'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '25px'
    },
    card: {
        background: '#141414',
        border: '1px solid #2a2a2a',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        borderBottom: '1px solid #222',
        paddingBottom: '10px'
    },
    name: { margin: 0, fontSize: '18px' },
    buzzId: { color: '#ff4458', fontSize: '14px', fontWeight: 'bold' },
    details: {
        fontSize: '14px',
        color: '#aaa',
        marginBottom: '15px',
        lineHeight: '1.6'
    },
    label: {
        fontSize: '12px',
        color: '#666',
        marginBottom: '8px',
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    imageContainer: {
        background: '#000',
        padding: '10px',
        borderRadius: '8px',
        textAlign: 'center',
        marginBottom: '20px',
        border: '1px dashed #333'
    },
    proofImg: {
        maxWidth: '100%',
        maxHeight: '250px',
        objectFit: 'contain',
        borderRadius: '4px',
        cursor: 'zoom-in'
    },
    actions: {
        display: 'flex',
        gap: '15px',
        marginTop: 'auto'
    },
    approveBtn: {
        flex: 1,
        padding: '12px',
        background: '#10B981', // Green
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
        transition: 'opacity 0.2s'
    },
    rejectBtn: {
        flex: 1,
        padding: '12px',
        background: '#EF4444', // Red
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
        transition: 'opacity 0.2s'
    }
};