"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  
  // Use ref to track the current user ID to detect login/logout shifts
  const lastCheckedUid = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      // 1. Handle Unauthenticated State
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

      // 2. Avoid redundant Firestore checks if user hasn't changed
      if (lastCheckedUid.current === user.uid && isProfileComplete) {
        setLoading(false);
        return;
      }

      // 3. Check Profile Completeness
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const completed = snap.exists() && snap.data()?.completed === true;
        
        setIsProfileComplete(completed);
        lastCheckedUid.current = user.uid;

        // 4. Redirect if profile is incomplete (and they aren't already there)
        if (!completed && pathname !== "/profile") {
          router.replace("/profile");
        } 
        // Redirect away from auth pages if they ARE logged in
        else if (completed && (pathname === "/login" || pathname === "/signup")) {
          router.replace("/");
        }

      } catch (error) {
        console.error("Error checking profile:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [pathname, router, isProfileComplete]);

  // UI logic for Navigation visibility
  const hideNavPaths = ["/login", "/signup", "/profile"];
  const showNav = !hideNavPaths.includes(pathname) && isProfileComplete;

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        {/* Note: Ensure the animation is defined in your globals.css */}
        <div className="loading-spinner" style={styles.spinner}></div>
        <p style={styles.loadingText}>Setting things up...</p>
      </div>
    );
  }

  return (
    <main style={styles.main}>
      <div style={styles.content}>
        {children}
      </div>
      {showNav && <BottomNav />}
    </main>
  );
}

const styles = {
  loaderContainer: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #f3f3f3",
    borderTop: "3px solid #0070f3",
    borderRadius: "50%",
    marginBottom: "16px",
  },
  loadingText: {
    fontSize: "14px",
    color: "#666",
    fontWeight: "500",
    fontFamily: "sans-serif",
  },
  main: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  content: {
    flex: 1,
    // If Nav is shown, add padding; otherwise, let it be full screen
    paddingBottom: "80px", 
  },
};