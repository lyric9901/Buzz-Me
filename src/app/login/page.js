"use client";

import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc 
} from "firebase/firestore";
// MAKE SURE db IS EXPORTED FROM YOUR LIB/FIREBASE FILE
import { auth, db } from "@/lib/firebase"; 
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ---------------- INIT INVISIBLE reCAPTCHA ---------------- */
  useEffect(() => {
    if (!mounted) return;

    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
          callback: () => {
            console.log("Recaptcha resolved");
          },
        }
      );
    }
  }, [mounted]);

  /* ---------------- BUZZ ID & USER LOGIC ---------------- */
  
  // 1. Generate a random 6-digit string
  const generateRandomId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // 2. Ensure uniqueness by checking DB
  const getUniqueBuzzId = async () => {
    let uniqueId = generateRandomId();
    let isUnique = false;

    // Keep generating until we find one that doesn't exist
    while (!isUnique) {
      const q = query(collection(db, "users"), where("buzzId", "==", uniqueId));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        isUnique = true;
      } else {
        uniqueId = generateRandomId(); // Collision found, retry
      }
    }
    return uniqueId;
  };

  // 3. Main Handler: Create or Update User in Firestore
  const handleUserFinalization = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // EXISTING USER: Check if they have a buzzId
      const data = userSnap.data();
      if (!data.buzzId) {
        // Migration: Assign ID to existing user who lacks one
        const newBuzzId = await getUniqueBuzzId();
        await updateDoc(userRef, { buzzId: newBuzzId });
        console.log("Assigned ID to existing user:", newBuzzId);
      }
    } else {
      // NEW USER: Create full profile
      const newBuzzId = await getUniqueBuzzId();
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || null,
        phone: user.phoneNumber || null,
        buzzId: newBuzzId,
        createdAt: new Date(),
        // Add default profile fields here
        displayName: user.displayName || "New Buzzer",
      });
      console.log("Created new user with ID:", newBuzzId);
    }
  };

  if (!mounted) return null;

  /* ---------------- AUTH HANDLERS ---------------- */

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      // Try Login
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      await handleUserFinalization(userCred.user);
      router.replace("/");
    } catch (err) {
      // If user not found, Try Sign Up
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        try {
          const newUserCred = await createUserWithEmailAndPassword(auth, email, password);
          await handleUserFinalization(newUserCred.user);
          router.replace("/");
        } catch (createErr) {
          alert(createErr.message);
        }
      } else {
        alert(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handleUserFinalization(result.user);
      router.replace("/");
    } catch (err) {
      console.error(err);
      alert("Popup closed or error occurred. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!phone.startsWith("+")) {
      alert("Please include country code (e.g., +91)");
      return;
    }
    setLoading(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmation(result);
    } catch (err) {
      alert(err.message);
      window.recaptchaVerifier.render().then(widgetId => {
        window.grecaptcha.reset(widgetId);
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    try {
      const result = await confirmation.confirm(otp);
      await handleUserFinalization(result.user);
      router.replace("/");
    } catch (err) {
      alert("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Buzz Me</h1>
          <p style={styles.subtitle}>Connect with your community</p>
        </div>

        {/* Email Section */}
        <div style={styles.section}>
          <input
            style={styles.input}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            style={styles.input}
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            style={loading ? styles.btnDisabled : styles.btnPrimary} 
            onClick={handleEmailAuth}
            disabled={loading}
          >
            {loading ? "Processing..." : "Continue with Email"}
          </button>
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerText}>OR</span>
        </div>

        {/* Google Section */}
        <button style={styles.btnOutline} onClick={handleGoogleLogin} disabled={loading}>
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="G" 
            style={{ width: 18, marginRight: 10 }} 
          />
          Google
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerText}>PHONE LOGIN</span>
        </div>

        {/* Phone Section */}
        {!confirmation ? (
          <div style={styles.section}>
            <input
              style={styles.input}
              placeholder="+91 XXXXX XXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button style={styles.btnSecondary} onClick={handleSendOTP} disabled={loading}>
              Send OTP
            </button>
          </div>
        ) : (
          <div style={styles.section}>
            <input
              style={styles.input}
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button style={styles.btnPrimary} onClick={handleVerifyOTP}>
              Verify & Login
            </button>
            <button style={styles.btnText} onClick={() => setConfirmation(null)}>
              Change Phone Number
            </button>
          </div>
        )}

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    backgroundColor: "#f0f2f5",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "-apple-system, system-ui, sans-serif",
  },
  card: {
    backgroundColor: "#fff",
    padding: "32px",
    borderRadius: "16px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
    maxWidth: "400px",
    width: "100%",
  },
  header: { textAlign: "center", marginBottom: "30px" },
  title: { fontSize: "28px", fontWeight: "800", margin: "0 0 8px 0", color: "#007bff" },
  subtitle: { color: "#65676b", fontSize: "14px", margin: 0 },
  section: { display: "flex", flexDirection: "column", gap: "12px" },
  input: {
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #dddfe2",
    fontSize: "16px",
    outline: "none",
  },
  btnPrimary: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#007bff",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#28a745",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
  btnOutline: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #dddfe2",
    backgroundColor: "#fff",
    color: "#1c1e21",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#ccc",
    color: "#fff",
    cursor: "not-allowed",
  },
  btnText: {
    background: "none",
    border: "none",
    color: "#007bff",
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "5px",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    textAlign: "center",
    margin: "24px 0",
    color: "#8a8d91",
    fontSize: "12px",
    fontWeight: "600",
  },
  dividerText: {
    padding: "0 10px",
    flex: 1,
    height: "1px",
    backgroundColor: "#dddfe2",
    margin: "0 10px",
  }
};