"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { supabase } from "@/lib/supabase"; 
import { onAuthStateChanged } from "firebase/auth";
import BottomNav from "@/components/BottomNav"; 

// ... [Keep INTEREST_OPTIONS, LOOKING_FOR_OPTIONS, RELATIONSHIP_TYPE_OPTIONS, Icons] ...
// (I am omitting the long arrays/icons constants here to save space, keep them exactly as they were)

const INTEREST_OPTIONS = [
  "Music", "Gaming", "Coding", "Art", 
  "Foodie", "Travel", "Photography", "Sports", 
  "Reading", "Movies", "Anime", "Gym", 
  "Fashion", "Nature", "F1 Racing", "Singing"
];

const LOOKING_FOR_OPTIONS = [
    "Long-term partner", "Short-term fun", "New friends", "Still figuring it out", "Casual dating"
];

const RELATIONSHIP_TYPE_OPTIONS = [
    "Monogamy", "Ethical non-monogamy", "Open relationship", "Polyamory", "Not sure yet"
];

const Icons = {
    Shield: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    Settings: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
    Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
    Verified: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
    Unverified: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="#333" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
    Pending: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
    Rejected: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF4458" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>,
    Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    Heart: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
    Pin: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
    ArrowLeft: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
    Close: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    Star: ({filled}) => <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
    Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
    Plus: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    Upload: () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>,
    Sun: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
    Moon: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>,
};

export default function ProfilePage() {
  const router = useRouter();
  // ... [USER, FORM, UI STATE setup remains the same] ...
  const [currentUser, setCurrentUser] = useState(null);
  const [buzzId, setBuzzId] = useState(""); 
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [studentType, setStudentType] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState([]);
  const [lookingFor, setLookingFor] = useState("");
  const [relationshipType, setRelationshipType] = useState("");
  const [photos, setPhotos] = useState([]); 
  const [pfpIndex, setPfpIndex] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState("dark"); 

  // --- VERIFICATION STATE ---
  const [verified, setVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("unverified");
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [proofImage, setProofImage] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme");
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("app-theme", newTheme);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setName(data.name || "");
          setBio(data.bio || "");
          setAge(data.age || "");
          setGender(data.gender || "");
          setStudentType(data.studentType || "");
          setInstituteName(data.instituteName || "");
          setCity(data.city || "");
          setInterests(data.interests || []);
          setLookingFor(data.lookingFor || "");
          setRelationshipType(data.relationshipType || "");
          setIsProfileComplete(data.completed || false);
          
          // Verification
          setVerified(data.verified || false);
          setVerificationStatus(data.verificationStatus || "unverified");

          if (data.photos && Array.isArray(data.photos)) {
             const loadedPhotos = data.photos.map((url, i) => ({ id: i, url }));
             setPhotos(loadedPhotos);
             const index = data.photos.findIndex(p => p === data.photoURL);
             setPfpIndex(index >= 0 ? index : 0);
          } else if (data.photoURL) {
             setPhotos([{ id: 0, url: data.photoURL }]);
             setPfpIndex(0);
          }

          if (data.buzzId) {
            setBuzzId(data.buzzId);
          } else {
            const newId = Math.floor(100000 + Math.random() * 900000).toString();
            await updateDoc(userDocRef, { buzzId: newId });
            setBuzzId(newId);
          }
        } else {
            const newId = Math.floor(100000 + Math.random() * 900000).toString();
            setBuzzId(newId);
        }
        setFetching(false);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // ... [Keep handlePhotoUpload, removePhoto, toggleInterest, saveProfile exactly as they were] ...
  const handlePhotoUpload = (e) => {
    if (photos.length >= 4) return alert("Max 4 photos allowed.");
    const file = e.target.files[0];
    if (file) {
      const newPhoto = { id: Date.now(), url: URL.createObjectURL(file), file: file };
      setPhotos([...photos, newPhoto]);
    }
  };
  const removePhoto = (index) => {
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
    if (index === pfpIndex) setPfpIndex(0);
    else if (index < pfpIndex) setPfpIndex(pfpIndex - 1);
  };
  const toggleInterest = (tag) => {
    if (interests.includes(tag)) {
      setInterests(interests.filter(i => i !== tag));
    } else {
      if (interests.length >= 10) return; 
      setInterests([...interests, tag]);
    }
  };
  const saveProfile = async () => {
    if (!currentUser) return;
    if (photos.length === 0) return alert("Please upload at least 1 photo.");
    if (interests.length < 3) return alert("Please select at least 3 interests.");
    setLoading(true);
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const finalPhotoUrls = [];
      for (const p of photos) {
          if (p.file) {
              const fileExt = p.file.name.split('.').pop();
              const fileName = `${currentUser.uid}-${Date.now()}-${Math.random()}.${fileExt}`;
              const { error: uploadError } = await supabase.storage.from("avatars").upload(`profiles/${fileName}`, p.file);
              if (uploadError) throw uploadError;
              const { data } = supabase.storage.from("avatars").getPublicUrl(`profiles/${fileName}`);
              finalPhotoUrls.push(data.publicUrl);
          } else {
              finalPhotoUrls.push(p.url);
          }
      }
      const mainPfp = finalPhotoUrls[pfpIndex] || finalPhotoUrls[0];
      await setDoc(userDocRef, {
        buzzId, name, bio, age: Number(age), gender, studentType, instituteName, city, interests, lookingFor, relationshipType, photos: finalPhotoUrls, photoURL: mainPfp, completed: true, updatedAt: new Date(),
      }, { merge: true });
      setIsProfileComplete(true);
      setStep(1); 
    } catch (error) {
      console.error(error);
      alert("Error saving profile.");
    } finally {
      setLoading(false);
    }
  };

  // --- UPDATED VERIFICATION HANDLER (Using "verification" bucket) ---
  const handleVerifySubmit = async () => {
      if (!proofImage || !currentUser) return;
      setUploadingProof(true);

      try {
          // 1. Upload to "verification" bucket
          const fileExt = proofImage.name.split('.').pop();
          const fileName = `${currentUser.uid}_proof.${fileExt}`;
          
          // Use 'verification' here. Ensure this exists in Supabase.
          const { error: uploadError } = await supabase.storage
            .from("verification") 
            .upload(fileName, proofImage, { upsert: true });

          if (uploadError) throw uploadError;

          // 2. Get Public URL
          const { data } = supabase.storage
            .from("verification")
            .getPublicUrl(fileName);

          // 3. Update Firestore
          await updateDoc(doc(db, "users", currentUser.uid), {
              verificationStatus: "pending",
              verificationProofUrl: data.publicUrl,
              verified: false
          });

          setVerificationStatus("pending");
          setShowVerifyModal(false);
          setProofImage(null);
          alert("Verification submitted! Admin will review shortly.");
      } catch (error) {
          console.error("Verification error:", error);
          alert("Failed to upload proof: " + error.message);
      } finally {
          setUploadingProof(false);
      }
  };

  const s = getStyles(theme);

  // Helper to render correct verification icon
  const renderVerificationBadge = () => {
    if (verified) return <span style={{marginLeft: '6px', display: 'flex'}} title="Verified"><Icons.Verified /></span>;
    if (verificationStatus === 'pending') return <span style={{marginLeft: '6px', display: 'flex'}} title="Verification Pending"><Icons.Pending /></span>;
    if (verificationStatus === 'rejected') return (
        <button onClick={() => setShowVerifyModal(true)} style={{marginLeft: '6px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex'}} title="Verification Rejected (Try Again)">
            <Icons.Rejected />
        </button>
    );
    // Unverified
    return (
        <button onClick={() => setShowVerifyModal(true)} style={{marginLeft: '6px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex'}} title="Click to Verify">
            <Icons.Unverified />
        </button>
    );
  };

  if (fetching) return <div style={s.loader}>Loading...</div>;

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logoText}>BuzzMe</div> 
        <div style={s.headerIcons}>
             <button style={s.headerIconBtn}><Icons.Shield /></button>
             <button onClick={() => setShowSettings(true)} style={s.headerIconBtn}><Icons.Settings /></button>
        </div>
      </div>

      <div style={s.scrollArea}>
        {/* --- VIEW MODE --- */}
        {isProfileComplete && step === 1 && !loading ? (
          <div style={s.profileCard}>
            
            <div style={s.avatarWrapper}>
                <div style={s.progressRing}>
                    <div style={s.percentageBadge}>100%</div>
                </div>
                <img src={photos[pfpIndex]?.url || photos[0]?.url || "https://via.placeholder.com/150"} style={s.largeAvatar} alt="Profile" />
                <button style={s.editPill} onClick={() => setIsProfileComplete(false)}>
                    <Icons.Edit />
                </button>
            </div>
            
            <h2 style={s.profileName}>
                {name}, {age} 
                {renderVerificationBadge()}
            </h2>
            <div onClick={() => setIsProfileComplete(false)} style={s.tapToEdit}>Tap to edit profile</div>

            {/* --- ACTION ROW --- */}
            <div style={s.actionRow}>
                {/* ... (Actions) ... */}
                <div style={s.actionBtnContainer}>
                    <div style={s.actionBtnCircle}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#00E5FF"/></svg></div>
                    <span style={s.actionCount}>0</span>
                </div>
                <div style={s.actionBtnContainer}>
                    <div style={s.actionBtnCircle}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#FF9100"/></svg></div>
                    <span style={s.actionCount}>0</span>
                </div>
                <div style={s.actionBtnContainer}>
                    <div style={s.actionBtnCircle}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.13 22.19L11.5 18.36C8.87 17.25 6.75 15.13 5.64 12.5L1.81 10.87C1.5 10.74 1.5 10.26 1.81 10.13L5.64 8.5C6.75 5.87 8.87 3.75 11.5 2.64L13.13 0.81C13.26 0.5 13.74 0.5 13.87 0.81L15.5 2.64C18.13 3.75 20.25 5.87 21.36 8.5L25.19 10.13C25.5 10.26 25.5 10.74 25.19 10.87L21.36 12.5C20.25 15.13 18.13 17.25 15.5 18.36L13.87 22.19C13.74 22.5 13.26 22.5 13.13 22.19Z" fill="#D500F9"/></svg></div>
                    <span style={s.actionCount}>0</span>
                </div>
                <div style={s.actionBtnContainer}>
                    <div style={s.actionBtnCircle}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="#2979FF"/></svg></div>
                    <span style={s.actionCount}>0</span>
                </div>
            </div>

            {/* --- BUZZME+ BANNER --- */}
            <div style={s.goldBanner}>
                <div style={s.goldTitle}>BuzzMe<span style={{color: '#FFD700'}}>+</span></div>
                <div style={s.goldDesc}>Unlimited Likes, Power packages & more!</div>
                <button style={s.goldBtn}>Get BuzzMe+</button>
            </div>

            {/* --- DETAILS SECTION --- */}
            <div style={s.detailsSection}>
                {lookingFor && (
                    <div style={s.detailRow}>
                        <span style={s.detailIcon}><Icons.Search /></span>
                        <div style={s.detailContent}>
                            <div style={s.detailLabel}>Looking for</div>
                            <div style={s.detailValue}>{lookingFor}</div>
                        </div>
                    </div>
                )}
                {relationshipType && (
                    <div style={s.detailRow}>
                        <span style={s.detailIcon}><Icons.Heart /></span>
                        <div style={s.detailContent}>
                            <div style={s.detailLabel}>Relationship Type</div>
                            <div style={s.detailValue}>{relationshipType}</div>
                        </div>
                    </div>
                )}
                <div style={s.detailRow}>
                    <span style={s.detailIcon}><Icons.Pin /></span>
                    <div style={s.detailContent}>
                        <div style={s.detailLabel}>Location</div>
                        <div style={s.detailValue}>{city || "Unknown"}</div>
                    </div>
                </div>
            </div>

            <div style={s.tagsCloud}>
                {interests.map((tag, i) => (
                    <span key={i} style={s.displayTag}>{tag}</span>
                ))}
            </div>

            <p style={s.bioText}>"{bio}"</p>
            
            <div style={{height: '100px'}}></div>
          </div>
        ) : (
          /* --- EDIT MODE --- */
          <div style={s.formContainer}>
             {/* ... [Keep all Edit Mode Forms unchanged] ... */}
            <div style={s.editHeaderRow}>
                <button onClick={() => step > 1 ? setStep(step - 1) : setIsProfileComplete(true)} style={s.backBtn}>
                    <Icons.ArrowLeft />
                </button>
                <h3 style={s.stepTitle}>Edit Profile ({step}/4)</h3>
            </div>
            
            {step === 1 && (
              <section style={s.section}>
                <label style={s.label}>PHOTOS (Max 4)</label>
                <div style={s.photoGrid}>
                    {photos.map((p, index) => (
                        <div key={p.id || index} style={s.photoSlot}>
                            <img src={p.url} style={s.photoImg} />
                            <button onClick={() => setPfpIndex(index)} style={pfpIndex === index ? s.starBtnActive : s.starBtn}>
                                <Icons.Star filled={pfpIndex === index} />
                            </button>
                            <button onClick={() => removePhoto(index)} style={s.removeBtn}>
                                <Icons.Trash />
                            </button>
                        </div>
                    ))}
                    {photos.length < 4 && (
                        <label style={s.addPhotoSlot}>
                            <span style={{color: '#0070f3'}}><Icons.Plus /></span>
                            <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
                        </label>
                    )}
                </div>
                <input style={s.input} placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
                <div style={s.row}>
                    <input style={{...s.input, flex: 1}} type="number" placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} />
                    <select style={{...s.input, flex: 2}} value={gender} onChange={(e) => setGender(e.target.value)}>
                        <option value="">Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                </div>
                <button style={s.primaryButton} onClick={() => {
                    if(!name || !age || !gender || photos.length === 0) return alert("Please fill all fields and add a photo");
                    setStep(2);
                }}>Next</button>
              </section>
            )}

            {step === 2 && (
              <section style={s.section}>
                <label style={s.label}>RELATIONSHIP GOALS</label>
                <div style={{marginBottom: '20px'}}>
                    <div style={s.subLabel}>Looking for...</div>
                    <div style={s.listSelect}>
                        {LOOKING_FOR_OPTIONS.map(opt => (
                            <div key={opt} onClick={() => setLookingFor(opt)} style={lookingFor === opt ? s.listItemActive : s.listItem}>
                                {opt}
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <div style={s.subLabel}>Relationship Type</div>
                    <div style={s.listSelect}>
                        {RELATIONSHIP_TYPE_OPTIONS.map(opt => (
                            <div key={opt} onClick={() => setRelationshipType(opt)} style={relationshipType === opt ? s.listItemActive : s.listItem}>
                                {opt}
                            </div>
                        ))}
                    </div>
                </div>
                <button style={s.primaryButton} onClick={() => setStep(3)}>Next</button>
              </section>
            )}

            {step === 3 && (
                <section style={s.section}>
                    <label style={s.label}>INTERESTS</label>
                    <div style={s.interestsGrid}>
                        {INTEREST_OPTIONS.map((tag) => (
                            <button key={tag} onClick={() => toggleInterest(tag)} style={interests.includes(tag) ? s.interestChipActive : s.interestChip}>
                                {tag}
                            </button>
                        ))}
                    </div>
                    <button style={s.primaryButton} onClick={() => setStep(4)}>Next</button>
                </section>
            )}

            {step === 4 && (
              <section style={s.section}>
                <label style={s.label}>BIO & DETAILS</label>
                <textarea style={s.textarea} placeholder="Write a short bio..." value={bio} maxLength={150} onChange={(e) => setBio(e.target.value)} />
                <input style={s.input} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                <input style={s.input} placeholder="Institute Name" value={instituteName} onChange={(e) => setInstituteName(e.target.value)} />
                <button style={s.primaryButton} disabled={loading} onClick={saveProfile}>
                    {loading ? "Saving..." : "Finish & Save"}
                </button>
              </section>
            )}
          </div>
        )}
      </div>

      {isProfileComplete && <BottomNav />}

      {/* --- VERIFICATION MODAL --- */}
      {showVerifyModal && (
        <div style={s.modalOverlay}>
            <div style={s.modalContent}>
                <div style={s.modalHeader}>
                    <h3>Get Verified 🛡️</h3>
                    <button onClick={() => setShowVerifyModal(false)} style={s.closeBtn}>
                        <Icons.Close />
                    </button>
                </div>
                
                <div style={{textAlign: 'center', color: '#888', marginBottom: '25px', fontSize: '14px', lineHeight: '1.5'}}>
                    <p>To get the blue checkmark, please upload a clear photo of your <strong>School ID</strong> or a <strong>Selfie</strong>.</p>
                    <p style={{fontSize: '12px', color: '#666', marginTop: '10px'}}>
                        Note: This photo is sent to Admin for approval and will be <strong>permanently deleted</strong> immediately after verification.
                    </p>
                </div>

                <label style={s.uploadBox}>
                    {proofImage ? (
                        <div style={{color: '#00E5FF'}}>{proofImage.name}</div>
                    ) : (
                        <>
                            <Icons.Upload />
                            <span style={{marginTop: '10px'}}>Click to Upload Photo</span>
                        </>
                    )}
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => setProofImage(e.target.files[0])} 
                        style={{display: 'none'}} 
                    />
                </label>

                <button 
                    style={proofImage ? s.primaryButton : {...s.primaryButton, opacity: 0.5, cursor: 'not-allowed'}} 
                    disabled={!proofImage || uploadingProof}
                    onClick={handleVerifySubmit}
                >
                    {uploadingProof ? "Sending..." : "Submit for Verification"}
                </button>
            </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div style={s.modalOverlay}>
            <div style={s.modalContent}>
                <div style={s.modalHeader}>
                    <h3>Settings</h3>
                    <button onClick={() => setShowSettings(false)} style={s.closeBtn}>
                        <Icons.Close />
                    </button>
                </div>
                <div style={s.settingRow}>
                    <span>App Theme</span>
                    <div style={s.themeToggle}>
                        <button style={theme === 'light' ? s.themeBtnActive : s.themeBtn} onClick={() => toggleTheme('light')}>
                            <Icons.Sun />
                        </button>
                        <button style={theme === 'dark' ? s.themeBtnActive : s.themeBtn} onClick={() => toggleTheme('dark')}>
                            <Icons.Moon />
                        </button>
                    </div>
                </div>
                 <button style={s.logoutBtn} onClick={() => auth.signOut()}>Log Out</button>
            </div>
        </div>
      )}
    </div>
  );
}

// --- STYLES ---
const getStyles = (theme) => {
    const isDark = theme === 'dark';
    const bg = isDark ? "#000000" : "#ffffff";
    const text = isDark ? "#ffffff" : "#000000";
    const cardBg = isDark ? "#121212" : "#f8f9fa";
    const border = isDark ? "#222" : "#eee";
    const inputBg = isDark ? "#1a1a1a" : "#fff";
    
    return {
        container: { backgroundColor: bg, color: text, height: "100vh", display: "flex", flexDirection: "column", fontFamily: "sans-serif" },
        
        // Header
        header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: `1px solid ${border}`, background: bg },
        logoText: { fontSize: "22px", fontWeight: "bold", color: "#ff4458", letterSpacing: "-0.5px" },
        headerIcons: { display: "flex", gap: "15px" },
        headerIconBtn: { background: "none", border: "none", cursor: "pointer", color: "#888", display: 'flex', alignItems: 'center' },
        
        scrollArea: { flex: 1, overflowY: "auto", padding: "0 0 20px 0" },
        loader: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: bg, color: text },

        // --- PROFILE CARD ---
        profileCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' },
        
        avatarWrapper: { position: 'relative', marginTop: '30px', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        progressRing: { position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '4px solid #FFD700', borderBottomColor: 'transparent', transform: 'rotate(-45deg)' },
        percentageBadge: { position: 'absolute', bottom: '-10px', background: '#FFD700', color: '#000', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', zIndex: 10 },
        largeAvatar: { width: "110px", height: "110px", borderRadius: "50%", objectFit: "cover" },
        editPill: { position: 'absolute', bottom: '0', right: '0', background: '#fff', border: '1px solid #ccc', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', zIndex: 5 },
        
        profileName: { fontSize: "24px", fontWeight: "bold", marginTop: "15px", marginBottom: "2px", display: 'flex', alignItems: 'center' },
        tapToEdit: { color: "#666", fontSize: "12px", marginBottom: "20px", cursor: 'pointer' },

        actionRow: { display: 'flex', gap: '20px', marginBottom: '30px' },
        actionBtnContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' },
        actionBtnCircle: { width: '50px', height: '50px', borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' },
        actionCount: { fontSize: '12px', color: '#666', fontWeight: 'bold' },

        goldBanner: { width: '90%', background: '#111', borderRadius: '16px', padding: '20px', marginBottom: '25px', textAlign: 'center', border: '1px solid #333' },
        goldTitle: { color: '#fff', fontSize: '20px', fontWeight: '800', fontStyle: 'italic', marginBottom: '5px' },
        goldDesc: { color: '#888', fontSize: '13px', marginBottom: '15px' },
        goldBtn: { background: '#FFD700', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '24px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', width: '80%' },

        detailsSection: { width: '90%', marginBottom: '20px' },
        detailRow: { display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${border}` },
        detailIcon: { marginRight: '15px', color: '#666', display: 'flex', alignItems: 'center' },
        detailContent: { display: 'flex', flexDirection: 'column' },
        detailLabel: { fontSize: '12px', color: '#888' },
        detailValue: { fontSize: '14px', fontWeight: '600' },

        tagsCloud: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', maxWidth: '90%', marginBottom: '20px' },
        displayTag: { fontSize: "11px", background: "#222", color: "#ccc", padding: "6px 12px", borderRadius: "16px", border: '1px solid #333' },
        bioText: { textAlign: "center", color: "#888", fontStyle: "italic", maxWidth: "80%" },

        // --- EDIT FORM ---
        formContainer: { maxWidth: "100%", padding: "20px", paddingBottom: "100px" },
        editHeaderRow: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' },
        backBtn: { background: 'none', border: 'none', color: text, cursor: 'pointer', display: 'flex', alignItems: 'center' },
        stepTitle: { fontSize: '20px', fontWeight: 'bold', margin: 0 },
        section: { display: 'flex', flexDirection: 'column', gap: '15px' },
        label: { fontSize: "12px", fontWeight: "bold", color: "#666", marginBottom: "5px" },
        subLabel: { fontSize: "14px", fontWeight: "bold", marginBottom: "10px", color: text },

        listSelect: { display: 'flex', flexDirection: 'column', gap: '8px' },
        listItem: { padding: '15px', borderRadius: '12px', background: inputBg, border: `1px solid ${border}`, color: text, cursor: 'pointer' },
        listItemActive: { padding: '15px', borderRadius: '12px', background: '#222', border: '1px solid #FF4458', color: '#FF4458', fontWeight: 'bold', cursor: 'pointer' },

        input: { padding: "16px", borderRadius: "12px", border: `1px solid ${border}`, backgroundColor: inputBg, color: text, fontSize: "16px", width: "100%", outline: 'none' },
        textarea: { padding: "16px", borderRadius: "12px", border: `1px solid ${border}`, backgroundColor: inputBg, color: text, fontSize: "16px", width: "100%", height: "100px", resize: 'none' },
        row: { display: "flex", gap: "10px" },
        primaryButton: { width: "100%", backgroundColor: "#ff4458", color: "#fff", padding: "16px", borderRadius: "30px", border: "none", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" },

        photoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' },
        photoSlot: { position: 'relative', width: '100%', paddingTop: '100%', borderRadius: '10px', overflow: 'hidden', backgroundColor: inputBg, border: `1px solid ${border}` },
        photoImg: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' },
        addPhotoSlot: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', paddingTop: '100%', borderRadius: '10px', backgroundColor: inputBg, border: `2px dashed ${border}`, cursor: 'pointer', position: 'relative' },
        
        starBtn: { position: 'absolute', bottom: '5px', left: '5px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        starBtnActive: { position: 'absolute', bottom: '5px', left: '5px', background: '#FFD700', color: '#000', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        removeBtn: { position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' },

        interestsGrid: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
        interestChip: { padding: '8px 16px', borderRadius: '20px', border: `1px solid ${border}`, background: inputBg, color: text, fontSize: '13px' },
        interestChipActive: { padding: '8px 16px', borderRadius: '20px', border: '1px solid #ff4458', background: 'rgba(255, 68, 88, 0.1)', color: '#ff4458', fontSize: '13px', fontWeight: 'bold' },

        modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' },
        modalContent: { width: '90%', maxWidth: '400px', backgroundColor: '#1a1a1a', borderRadius: '20px', padding: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
        modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
        closeBtn: { background: 'none', border: 'none', color: text, cursor: 'pointer', display: 'flex', alignItems: 'center' },
        
        uploadBox: {
            border: `2px dashed ${border}`,
            borderRadius: '12px',
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#666',
            marginBottom: '20px',
            background: inputBg,
            transition: 'border-color 0.2s'
        },

        settingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: `1px solid ${border}` },
        themeToggle: { display: 'flex', gap: '10px' },
        themeBtn: { padding: '8px 16px', borderRadius: '20px', border: `1px solid ${border}`, background: 'transparent', color: text, cursor: 'pointer', display: 'flex', alignItems: 'center' },
        themeBtnActive: { padding: '8px 16px', borderRadius: '20px', border: 'none', background: '#ff4458', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' },
        logoutBtn: { width: "100%", backgroundColor: "#333", color: "#fff", padding: "15px", borderRadius: "12px", border: "none", fontSize: "16px", fontWeight: "bold", marginTop: "10px" },
    };
};