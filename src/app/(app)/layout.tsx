"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  
  const lastCheckedUid = useRef<string | null>(null);

  useEffect(() => {
    // Lock body scrolling for native app feel
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        lastCheckedUid.current = null;
        setIsProfileComplete(false);
        
        const publicPaths = ["/login", "/signup"];
        if (!publicPaths.includes(pathname)) {
          router.replace("/login");
        }
        setLoading(false);
        return;
      }

      if (lastCheckedUid.current === user.uid && isProfileComplete) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const completed = snap.exists() && snap.data()?.completed === true;
        
        setIsProfileComplete(completed);
        lastCheckedUid.current = user.uid;

        if (!completed && pathname !== "/profile") {
          router.replace("/profile");
        } else if (completed && (pathname === "/login" || pathname === "/signup")) {
          router.replace("/");
        }
      } catch (error) {
        console.error("Error checking profile:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsub();
      document.body.style.overflow = "auto";
      document.body.style.position = "static";
    };
  }, [pathname, router, isProfileComplete]);

  const hideNavPaths = ["/login", "/signup", "/profile"];
  const showNav = !hideNavPaths.includes(pathname) && isProfileComplete;

  return (
    <main style={styles.main}>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.loaderContainer}
          >
            <motion.div 
              animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              style={styles.spinner}
            />
            <p style={styles.loadingText}>Vibing with the servers...</p>
          </motion.div>
        ) : (
          <motion.div 
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={styles.content(showNav)}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
      {showNav && <BottomNav />}
    </main>
  );
}

const styles: Record<string, any> = {
  main: {
    height: "100dvh", // Fixed the duplicate key right here 🎯
    width: "100vw",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#0a0a0a", // Sleek dark mode base
    color: "#fff",
    overflow: "hidden",
  },
  loaderContainer: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a0a",
    zIndex: 9999,
  },
  spinner: {
    width: "48px",
    height: "48px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #ff0080, #ff8c00)",
    marginBottom: "20px",
    boxShadow: "0 0 20px rgba(255, 0, 128, 0.5)",
  },
  loadingText: {
    fontSize: "15px",
    color: "#888",
    fontWeight: "600",
    letterSpacing: "0.5px",
  },
  content: (hasNav: boolean) => ({
    flex: 1,
    position: "relative",
    height: "100%",
    width: "100%",
    overflowY: "auto",
    overflowX: "hidden",
    paddingBottom: hasNav ? "100px" : "0", 
  }),
};