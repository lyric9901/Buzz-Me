"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname.startsWith("/chat/") && pathname !== "/chat") {
    return null;
  }

  const navItems = [
    { name: "Swipe", path: "/swipe", icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#fff" : "none"} stroke={active ? "#fff" : "#888"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      </svg>
    )},
    { name: "Explore", path: "/explore", icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#888"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    )},
    { name: "Activity", path: "/activity", icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#ff0080" : "none"} stroke={active ? "#ff0080" : "#888"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
    )},
    { name: "Chat", path: "/chat", icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#888"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
      </svg>
    )},
    { name: "Profile", path: "/profile", icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#fff" : "none"} stroke={active ? "#fff" : "#888"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    )},
  ];

  return (
    <motion.div 
      style={styles.navContainer}
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <div style={styles.navBar}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`); 
          
          return (
            <motion.button
              key={item.name}
              onClick={() => router.push(item.path)}
              style={styles.navItem}
              whileTap={{ scale: 0.85 }}
            >
              <motion.div 
                style={styles.iconWrapper}
                animate={{ 
                  y: isActive ? -4 : 0,
                  filter: isActive ? "drop-shadow(0px 4px 8px rgba(255,0,128,0.4))" : "none" 
                }}
              >
                {item.icon(isActive)}
              </motion.div>
              {isActive && (
                <motion.div
                  style={styles.activeDot}
                  layoutId="activeDot"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

const styles: Record<string, any> = {
  navContainer: {
    position: "fixed",
    bottom: "24px",
    left: "0",
    right: "0",
    display: "flex",
    justifyContent: "center",
    zIndex: 9999,
    pointerEvents: "none",
    padding: "0 20px",
  },
  navBar: {
    pointerEvents: "auto",
    background: "rgba(30, 30, 30, 0.65)",
    backdropFilter: "blur(24px) saturate(200%)",
    WebkitBackdropFilter: "blur(24px) saturate(200%)",
    borderRadius: "100px", // Pill shape
    padding: "10px 16px",
    display: "flex",
    gap: "12px",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: "400px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
  },
  navItem: {
    position: "relative",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px",
    flex: 1,
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    position: "absolute",
    bottom: "-4px",
    width: "4px",
    height: "4px",
    borderRadius: "50%",
    backgroundColor: "#ff0080",
    boxShadow: "0 0 8px #ff0080",
  }
};