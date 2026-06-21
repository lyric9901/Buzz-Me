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
    { name: "Home", path: "/swipe", icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "#fff" : "none"} stroke={active ? "#fff" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    )},
    { name: "Explore", path: "/explore", icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    )},
    { name: "Activity", path: "/activity", icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "#ff0080" : "none"} stroke={active ? "#ff0080" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
    )},
    { name: "Chat", path: "/chat", icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
      </svg>
    )},
    { name: "Profile", path: "/profile", icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "#fff" : "none"} stroke={active ? "#fff" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    )},
  ];

  return (
    <motion.div 
      style={styles.navContainer}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div style={styles.navBar}>
        {/* Gradient Background */}
        <div style={styles.gradientBg} />
        
        {navItems.map((item, index) => {
          const isActive = pathname === item.path; 
          
          return (
            <motion.button
              key={item.name}
              onClick={() => router.push(item.path)}
              style={styles.navItem}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div 
                style={{ 
                  ...styles.iconWrapper,
                  background: isActive 
                    ? "linear-gradient(135deg, #ff0080, #ff8c00)" 
                    : "transparent"
                }}
                animate={isActive ? {
                  boxShadow: [
                    "0 0 20px rgba(255, 0, 128, 0.5)",
                    "0 0 30px rgba(255, 0, 128, 0.8)",
                    "0 0 20px rgba(255, 0, 128, 0.5)"
                  ]
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {item.icon(isActive)}
              </motion.div>
              
              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  style={styles.activeIndicator}
                  layoutId="activeIndicator"
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

const styles = {
  navContainer: {
    position: "fixed",
    bottom: "20px",
    left: "0",
    right: "0",
    display: "flex",
    justifyContent: "center",
    zIndex: 1000,
    pointerEvents: "none",
  },
  navBar: {
    position: "relative",
    pointerEvents: "auto",
    background: "rgba(20, 20, 20, 0.8)",
    backdropFilter: "blur(20px) saturate(180%)",
    borderRadius: "30px",
    padding: "12px 24px",
    display: "flex",
    gap: "20px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
    alignItems: "center",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    overflow: "hidden"
  },
  gradientBg: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(135deg, rgba(255, 0, 128, 0.1), transparent, rgba(138, 43, 226, 0.1))",
    opacity: 0.5,
    pointerEvents: "none"
  },
  navItem: {
    position: "relative",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px",
    zIndex: 1
  },
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    width: "48px",
    height: "48px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  activeIndicator: {
    position: "absolute",
    bottom: "-8px",
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #ff0080, #ff8c00)",
    boxShadow: "0 0 10px rgba(255, 0, 128, 0.8)"
  }
};