"use client";

import { usePathname, useRouter } from "next/navigation";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  // --- HIDE LOGIC ---
  // If we are in /chat/SOME_ID, hide the nav. 
  // If we are just at /chat, show the nav.
  if (pathname.startsWith("/chat/") && pathname !== "/chat") {
    return null;
  }

  const navItems = [
    { name: "Home", path: "/swipe", icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "#000" : "none"} stroke={active ? "#000" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
    )},
    { name: "Explore", path: "/explore", icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
    )},
    { name: "Activity", path: "/activity", icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "#ff4b4b" : "none"} stroke={active ? "#ff4b4b" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
    )},
    { name: "Chat", path: "/chat", icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
    )},
    { name: "Profile", path: "/profile", icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "#fff" : "none"} stroke={active ? "#fff" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
    )},
  ];

  return (
    <div style={styles.navContainer}>
      <div style={styles.navBar}>
        {navItems.map((item) => {
          // Check if path starts with item.path (handles sub-routes if needed later)
          // But strictly check for exact match or chat base path for active state highlighting
          const isActive = pathname === item.path; 
          
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.path)}
              style={styles.navItem}
            >
              <div 
                style={{ 
                  ...styles.iconWrapper, 
                  backgroundColor: (item.name === "Home" && isActive) ? "#fff" : "transparent" 
                }}
              >
                 {item.icon(isActive)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
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
    pointerEvents: "auto",
    backgroundColor: "#1c1c1e", 
    borderRadius: "30px",
    padding: "10px 20px", 
    display: "flex",
    gap: "15px", 
    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
    alignItems: "center",
  },
  navItem: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px",
  },
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    transition: "0.2s ease",
  }
};