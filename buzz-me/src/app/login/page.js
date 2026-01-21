"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  
  const generateRandomId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const getUniqueBuzzId = async () => {
    let uniqueId = generateRandomId();
    let isUnique = false;

    while (!isUnique) {
      const q = query(collection(db, "users"), where("buzzId", "==", uniqueId));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        isUnique = true;
      } else {
        uniqueId = generateRandomId();
      }
    }
    return uniqueId;
  };

  const handleUserFinalization = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      if (!data.buzzId) {
        const newBuzzId = await getUniqueBuzzId();
        await updateDoc(userRef, { buzzId: newBuzzId });
      }
    } else {
      const newBuzzId = await getUniqueBuzzId();
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || null,
        phone: user.phoneNumber || null,
        buzzId: newBuzzId,
        createdAt: new Date(),
        displayName: user.displayName || "New Buzzer",
      });
    }
  };

  if (!mounted) return null;

  /* ---------------- AUTH HANDLERS ---------------- */

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      await handleUserFinalization(userCred.user);
      router.replace("/");
    } catch (err) {
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
      {/* Animated Background */}
      <div style={styles.bgGradient} />
      <div style={styles.bgOrbs}>
        <motion.div 
          style={styles.orb1} 
          animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          style={styles.orb2} 
          animate={{ x: [0, -100, 0], y: [0, 50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div 
        style={styles.card}
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Header */}
        <motion.div 
          style={styles.header}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 style={styles.title}>BuzzMe 🐝</h1>
          <p style={styles.subtitle}>Find your perfect match</p>
        </motion.div>

        {/* Email Section */}
        <AnimatePresence mode="wait">
          <motion.div 
            style={styles.section}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
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
            <motion.button 
              style={loading ? styles.btnDisabled : styles.btnPrimary} 
              onClick={handleEmailAuth}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <div style={styles.spinner} />
              ) : (
                "Continue with Email"
              )}
            </motion.button>
          </motion.div>
        </AnimatePresence>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>OR</span>
          <span style={styles.dividerLine} />
        </div>

        {/* Google Section */}
        <motion.button 
          style={styles.btnOutline} 
          onClick={handleGoogleLogin} 
          disabled={loading}
          whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
          whileTap={{ scale: 0.98 }}
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="G" 
            style={{ width: 20, marginRight: 10 }} 
          />
          Continue with Google
        </motion.button>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>PHONE</span>
          <span style={styles.dividerLine} />
        </div>

        {/* Phone Section */}
        {!confirmation ? (
          <motion.div 
            style={styles.section}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <input
              style={styles.input}
              placeholder="+91 XXXXX XXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <motion.button 
              style={styles.btnSecondary} 
              onClick={handleSendOTP} 
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Send OTP
            </motion.button>
          </motion.div>
        ) : (
          <motion.div 
            style={styles.section}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <input
              style={styles.input}
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <motion.button 
              style={styles.btnPrimary} 
              onClick={handleVerifyOTP}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Verify & Login
            </motion.button>
            <button style={styles.btnText} onClick={() => setConfirmation(null)}>
              Change Phone Number
            </button>
          </motion.div>
        )}

        <div id="recaptcha-container"></div>
      </motion.div>
    </div>
  );
}

const styles = {
  page: {
    position: "relative",
    backgroundColor: "#000",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "-apple-system, system-ui, sans-serif",
    overflow: "hidden"
  },
  bgGradient: {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(circle at 30% 50%, rgba(255, 0, 128, 0.15), transparent 50%), radial-gradient(circle at 70% 50%, rgba(138, 43, 226, 0.15), transparent 50%)",
    animation: "gradient-shift 10s ease infinite",
    zIndex: 0
  },
  bgOrbs: {
    position: "absolute",
    inset: 0,
    zIndex: 0
  },
  orb1: {
    position: "absolute",
    top: "10%",
    left: "10%",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255, 0, 128, 0.3), transparent)",
    filter: "blur(80px)",
  },
  orb2: {
    position: "absolute",
    bottom: "10%",
    right: "10%",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(138, 43, 226, 0.3), transparent)",
    filter: "blur(80px)",
  },
  card: {
    position: "relative",
    zIndex: 1,
    backgroundColor: "rgba(20, 20, 20, 0.8)",
    backdropFilter: "blur(20px) saturate(180%)",
    padding: "40px",
    borderRadius: "24px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
    maxWidth: "420px",
    width: "100%",
  },
  header: { textAlign: "center", marginBottom: "32px" },
  title: { 
    fontSize: "36px", 
    fontWeight: "900", 
    margin: "0 0 8px 0", 
    background: "linear-gradient(135deg, #ff0080, #ff8c00, #ff0080)",
    backgroundSize: "200% auto",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    animation: "gradient-shift 3s linear infinite"
  },
  subtitle: { color: "#aaa", fontSize: "15px", margin: 0 },
  section: { display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" },
  input: {
    padding: "16px 20px",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "white",
    fontSize: "16px",
    outline: "none",
    transition: "all 0.3s ease",
  },
  btnPrimary: {
    padding: "16px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #ff0080, #ff8c00)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  btnSecondary: {
    padding: "16px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  btnOutline: {
    width: "100%",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s ease",
  },
  btnDisabled: {
    padding: "16px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#333",
    color: "#666",
    cursor: "not-allowed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  btnText: {
    background: "none",
    border: "none",
    color: "#ff0080",
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "8px",
    fontWeight: "500"
  },
  divider: {
    display: "flex",
    alignItems: "center",
    margin: "24px 0",
    gap: "12px"
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "rgba(255, 255, 255, 0.1)"
  },
  dividerText: {
    color: "#666",
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "1px"
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "3px solid rgba(255, 255, 255, 0.3)",
    borderTop: "3px solid white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite"
  }
};