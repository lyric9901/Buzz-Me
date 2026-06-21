"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { supabase } from "@/lib/supabase"; 
import { onAuthStateChanged } from "firebase/auth";
import BottomNav from "@/components/BottomNav"; 

// --- CONSTANTS ---
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

// --- ICONS ---
const Icons = {
    Shield: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    Settings: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
    Edit: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
    Verified: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
    Unverified: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="#333" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
    Pending: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
    Rejected: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF4458" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>,
    Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    Heart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
    Pin: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
    ArrowLeft: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
    Close: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    Star: ({filled}) => <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
    Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
    Plus: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    Upload: () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>,
    Sun: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
    Moon: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>,
    Briefcase: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
};

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [buzzId, setBuzzId] = useState(""); 
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [step, setStep] = useState(1);
  
  // Form State
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
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState("dark"); 

  // Verification State
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
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
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
                setVerified(data.verified || false);
                setVerificationStatus(data.verificationStatus || "unverified");
                setBuzzId(data.buzzId || Math.floor(100000 + Math.random() * 900000).toString());

                if (data.photos && Array.isArray(data.photos)) {
                    const loadedPhotos = data.photos.map((url, i) => ({ id: i, url }));
                    setPhotos(loadedPhotos);
                    const index = data.photos.findIndex(p => p === data.photoURL);
                    setPfpIndex(index >= 0 ? index : 0);
                } else if (data.photoURL) {
                    setPhotos([{ id: 0, url: data.photoURL }]);
                }
            }
        } catch (e) { console.error(e); }
        setFetching(false);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Handlers
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
    if (interests.includes(tag)) setInterests(interests.filter(i => i !== tag));
    else if (interests.length < 10) setInterests([...interests, tag]);
  };

  const saveProfile = async () => {
    if (!currentUser) return;
    if (photos.length === 0) return alert("Please upload at least 1 photo.");
    if (interests.length < 3) return alert("Please select at least 3 interests.");
    
    setLoading(true);
    try {
      const finalPhotoUrls = [];
      for (const p of photos) {
          if (p.file) {
              const fileExt = p.file.name.split('.').pop();
              const fileName = `${currentUser.uid}-${Date.now()}-${Math.random()}.${fileExt}`;
              const { error } = await supabase.storage.from("avatars").upload(`profiles/${fileName}`, p.file);
              if (error) throw error;
              const { data } = supabase.storage.from("avatars").getPublicUrl(`profiles/${fileName}`);
              finalPhotoUrls.push(data.publicUrl);
          } else {
              finalPhotoUrls.push(p.url);
          }
      }
      const mainPfp = finalPhotoUrls[pfpIndex] || finalPhotoUrls[0];
      await setDoc(doc(db, "users", currentUser.uid), {
        buzzId, name, bio, age: Number(age), gender, studentType, instituteName, city, interests, lookingFor, relationshipType, photos: finalPhotoUrls, photoURL: mainPfp, completed: true, updatedAt: new Date(),
      }, { merge: true });
      
      setIsProfileComplete(true);
      setStep(1); 
    } catch (error) {
      alert("Error saving profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async () => {
    if (!proofImage || !currentUser) return;
    setUploadingProof(true);
    try {
        const fileExt = proofImage.name.split('.').pop();
        const fileName = `${currentUser.uid}_proof.${fileExt}`;
        const { error } = await supabase.storage.from("verification").upload(fileName, proofImage, { upsert: true });
        if (error) throw error;
        
        const { data } = supabase.storage.from("verification").getPublicUrl(fileName);
        await updateDoc(doc(db, "users", currentUser.uid), {
            verificationStatus: "pending", verificationProofUrl: data.publicUrl, verified: false
        });
        setVerificationStatus("pending");
        setShowVerifyModal(false);
        setProofImage(null);
        alert("Submitted for review!");
    } catch (error) {
        alert("Upload failed: " + error.message);
    } finally {
        setUploadingProof(false);
    }
  };

  const s = getStyles(theme);

  const renderBadge = () => {
    if (verified) return <Icons.Verified />;
    if (verificationStatus === 'pending') return <Icons.Pending />;
    if (verificationStatus === 'rejected') return <Icons.Rejected />;
    return <Icons.Unverified />;
  };

  if (fetching) return <div style={s.loader}>Loading...</div>;

  return (
    <>
    {/* 1. Global Styles for hiding Scrollbar */}
    <style jsx global>{`
      ::-webkit-scrollbar { display: none; }
      * { scrollbar-width: none; -ms-overflow-style: none; }
    `}</style>

    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logoText}>BuzzMe</div> 
        <div style={s.headerIcons}>
             <button onClick={() => setShowVerifyModal(true)} style={s.iconBtn}>
                 <Icons.Shield />
             </button>
             <button onClick={() => setShowSettings(true)} style={s.iconBtn}>
                 <Icons.Settings />
             </button>
        </div>
      </div>

      <div style={s.scrollArea}>
        {/* === VIEW MODE === */}
        {isProfileComplete && step === 1 && !loading ? (
          <div style={s.contentWrapper}>
            
            {/* 1. Hero Profile */}
            <div style={s.heroSection}>
                <div style={s.avatarContainer}>
                    <div style={s.avatarRing}>
                        <img src={photos[pfpIndex]?.url || "https://via.placeholder.com/150"} style={s.avatarImg} alt="Profile" />
                    </div>
                    <button style={s.editFab} onClick={() => setIsProfileComplete(false)}>
                        <Icons.Edit />
                    </button>
                </div>
                
                <h2 style={s.nameTitle}>
                    {name}, {age}
                    <button onClick={() => setShowVerifyModal(true)} style={s.badgeBtn}>
                        {renderBadge()}
                    </button>
                </h2>
                
                {bio && <p style={s.bioText}>{bio}</p>}
                
                <div style={s.statsRow}>
                    <div style={s.statItem}>
                        <span style={s.statNum}>0</span>
                        <span style={s.statLabel}>Likes</span>
                    </div>
                    <div style={s.statDivider}></div>
                    <div style={s.statItem}>
                        <span style={s.statNum}>0</span>
                        <span style={s.statLabel}>Matches</span>
                    </div>
                    <div style={s.statDivider}></div>
                    <div style={s.statItem}>
                        <span style={s.statNum}>0</span>
                        <span style={s.statLabel}>Buzzes</span>
                    </div>
                </div>
            </div>

            {/* 2. BuzzMe+ Promo */}
            <div style={s.promoCard}>
                <div style={s.promoContent}>
                    <span style={s.promoTitle}>BuzzMe<span style={{color: '#FFD700'}}>+</span></span>
                    <span style={s.promoDesc}>Unlock unlimited swipes & visibility</span>
                </div>
                <button style={s.promoBtn}>Upgrade</button>
            </div>

            {/* 3. Details Grid */}
            <h3 style={s.sectionHeader}>About Me</h3>
            <div style={s.detailsGrid}>
                {lookingFor && (
                    <div style={s.gridItem}>
                        <div style={s.gridIcon}><Icons.Search /></div>
                        <div>
                            <div style={s.gridLabel}>Looking For</div>
                            <div style={s.gridValue}>{lookingFor}</div>
                        </div>
                    </div>
                )}
                {relationshipType && (
                    <div style={s.gridItem}>
                        <div style={s.gridIcon}><Icons.Heart /></div>
                        <div>
                            <div style={s.gridLabel}>Type</div>
                            <div style={s.gridValue}>{relationshipType}</div>
                        </div>
                    </div>
                )}
                {city && (
                    <div style={s.gridItem}>
                        <div style={s.gridIcon}><Icons.Pin /></div>
                        <div>
                            <div style={s.gridLabel}>Location</div>
                            <div style={s.gridValue}>{city}</div>
                        </div>
                    </div>
                )}
                {(studentType || instituteName) && (
                    <div style={s.gridItem}>
                        <div style={s.gridIcon}><Icons.Briefcase /></div>
                        <div>
                            <div style={s.gridLabel}>Education</div>
                            <div style={s.gridValue}>{studentType || "Student"}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* 4. Interests */}
            <h3 style={s.sectionHeader}>Interests</h3>
            <div style={s.tagsContainer}>
                {interests.map((tag, i) => (
                    <span key={i} style={s.tag}>{tag}</span>
                ))}
            </div>
            
          </div>
        ) : (
          /* === EDIT MODE === */
          <div style={s.editContainer}>
            <div style={s.editHeader}>
                <button onClick={() => step > 1 ? setStep(step - 1) : setIsProfileComplete(true)} style={s.backBtn}>
                    <Icons.ArrowLeft />
                </button>
                <h3 style={s.editTitle}>Edit Profile <span style={{opacity: 0.5}}>({step}/4)</span></h3>
            </div>
            
            {step === 1 && (
              <div style={s.formSection}>
                <div style={s.photoGrid}>
                    {photos.map((p, index) => (
                        <div key={index} style={s.photoSlot}>
                            <img src={p.url} style={s.photoPreview} />
                            <button onClick={() => setPfpIndex(index)} style={pfpIndex === index ? s.starBtnActive : s.starBtn}>
                                <Icons.Star filled={pfpIndex === index} />
                            </button>
                            <button onClick={() => removePhoto(index)} style={s.removeBtn}>
                                <Icons.Trash />
                            </button>
                        </div>
                    ))}
                    {photos.length < 4 && (
                        <label style={s.addPhotoBtn}>
                            <Icons.Plus />
                            <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
                        </label>
                    )}
                </div>
                <div style={s.fieldGroup}>
                    <label style={s.label}>Basic Info</label>
                    <input style={s.input} placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
                    <div style={{display: 'flex', gap: 10}}>
                        <input style={{...s.input, flex: 1}} type="number" placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} />
                        <select style={{...s.input, flex: 1}} value={gender} onChange={(e) => setGender(e.target.value)}>
                            <option value="">Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                </div>
                <button style={s.nextBtn} onClick={() => {
                    if(!name || !age || !gender || photos.length === 0) return alert("Please fill details & add photo");
                    setStep(2);
                }}>Next Step</button>
              </div>
            )}

            {step === 2 && (
              <div style={s.formSection}>
                <label style={s.label}>What are you looking for?</label>
                <div style={s.optionList}>
                    {LOOKING_FOR_OPTIONS.map(opt => (
                        <button key={opt} onClick={() => setLookingFor(opt)} style={lookingFor === opt ? s.optionBtnActive : s.optionBtn}>
                            {opt}
                        </button>
                    ))}
                </div>
                <label style={{...s.label, marginTop: 20}}>Relationship Type</label>
                <div style={s.optionList}>
                    {RELATIONSHIP_TYPE_OPTIONS.map(opt => (
                        <button key={opt} onClick={() => setRelationshipType(opt)} style={relationshipType === opt ? s.optionBtnActive : s.optionBtn}>
                            {opt}
                        </button>
                    ))}
                </div>
                <button style={s.nextBtn} onClick={() => setStep(3)}>Next Step</button>
              </div>
            )}

            {step === 3 && (
                <div style={s.formSection}>
                    <label style={s.label}>Pick your Interests (Min 3)</label>
                    <div style={s.chipGrid}>
                        {INTEREST_OPTIONS.map((tag) => (
                            <button key={tag} onClick={() => toggleInterest(tag)} style={interests.includes(tag) ? s.chipActive : s.chip}>
                                {tag}
                            </button>
                        ))}
                    </div>
                    <button style={s.nextBtn} onClick={() => setStep(4)}>Next Step</button>
                </div>
            )}

            {step === 4 && (
              <div style={s.formSection}>
                <label style={s.label}>Final Touches</label>
                <textarea style={s.textarea} placeholder="Write a catchy bio..." value={bio} maxLength={150} onChange={(e) => setBio(e.target.value)} />
                <input style={s.input} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                <div style={{display: 'flex', gap: 10}}>
                    <input style={{...s.input, flex: 1}} placeholder="Student / Professional" value={studentType} onChange={(e) => setStudentType(e.target.value)} />
                    <input style={{...s.input, flex: 1}} placeholder="Institute / Company" value={instituteName} onChange={(e) => setInstituteName(e.target.value)} />
                </div>
                <button style={s.saveBtn} disabled={loading} onClick={saveProfile}>
                    {loading ? "Saving Profile..." : "Complete Profile"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isProfileComplete && <BottomNav />}

      {/* --- MODALS --- */}
      {showVerifyModal && (
        <div style={s.modalOverlay}>
            <div style={s.modalCard}>
                <div style={s.modalHead}>
                    <h3>Get Verified</h3>
                    <button onClick={() => setShowVerifyModal(false)} style={s.iconBtn}><Icons.Close /></button>
                </div>
                <p style={{color: '#888', fontSize: '13px', marginBottom: '20px', lineHeight: '1.4'}}>
                    Upload a School ID or Selfie. It will be deleted after review.
                </p>
                <label style={s.uploadArea}>
                    {proofImage ? <span style={{color: '#00E5FF'}}>{proofImage.name}</span> : <div style={{textAlign: 'center'}}><Icons.Upload /><div style={{fontSize: 12, marginTop: 5}}>Tap to Upload</div></div>}
                    <input type="file" accept="image/*" onChange={(e) => setProofImage(e.target.files[0])} style={{display: 'none'}} />
                </label>
                <button style={s.primaryBtn} disabled={!proofImage || uploadingProof} onClick={handleVerifySubmit}>
                    {uploadingProof ? "Uploading..." : "Submit Proof"}
                </button>
            </div>
        </div>
      )}

      {showSettings && (
        <div style={s.modalOverlay}>
            <div style={s.modalCard}>
                <div style={s.modalHead}>
                    <h3>Settings</h3>
                    <button onClick={() => setShowSettings(false)} style={s.iconBtn}><Icons.Close /></button>
                </div>
                <div style={s.settingRow}>
                    <span>Theme</span>
                    <div style={s.themeSwitch}>
                        <button style={theme === 'light' ? s.themeOptActive : s.themeOpt} onClick={() => toggleTheme('light')}><Icons.Sun /></button>
                        <button style={theme === 'dark' ? s.themeOptActive : s.themeOpt} onClick={() => toggleTheme('dark')}><Icons.Moon /></button>
                    </div>
                </div>
                 <button style={s.logoutBtn} onClick={() => auth.signOut()}>Log Out</button>
            </div>
        </div>
      )}
    </div>
    </>
  );
}

// --- STYLING SYSTEM ---
const getStyles = (theme) => {
    const isDark = theme === 'dark';
    const bg = isDark ? "#000" : "#fff";
    const text = isDark ? "#fff" : "#000";
    const glass = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
    const border = isDark ? "#222" : "#eee";
    const accent = "#e91e63"; // Pink accent

    return {
        container: { background: bg, color: text, height: "100vh", display: "flex", flexDirection: "column" },
        header: { display: "flex", justifyContent: "space-between", padding: "15px 20px", alignItems: "center", background: bg, position: 'sticky', top: 0, zIndex: 50 },
        logoText: { fontSize: "24px", fontWeight: "800", background: "linear-gradient(to right, #ff0080, #ff8c00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
        headerIcons: { display: "flex", gap: "10px" },
        iconBtn: { background: "none", border: "none", color: text, cursor: "pointer", padding: "5px" },
        
        // Layout
        scrollArea: { flex: 1, overflowY: "auto", position: 'relative' },
        contentWrapper: { padding: "0 20px 100px 20px" }, // Padding bottom prevents white space
        
        // Hero Section
        heroSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' },
        avatarContainer: { position: 'relative', width: 110, height: 110 },
        avatarRing: { width: '100%', height: '100%', borderRadius: '50%', padding: '3px', background: "linear-gradient(45deg, #ff0080, #ff8c00)" },
        avatarImg: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${bg}` },
        editFab: { position: 'absolute', bottom: 0, right: 0, background: text, color: bg, border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', cursor: 'pointer' },
        
        nameTitle: { fontSize: "22px", fontWeight: "700", marginTop: "12px", display: 'flex', alignItems: 'center', gap: 6 },
        badgeBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex' },
        bioText: { fontSize: "14px", color: "#888", textAlign: "center", margin: "5px 0 15px 0", maxWidth: "85%", lineHeight: "1.4" },
        
        statsRow: { display: 'flex', alignItems: 'center', background: glass, padding: "12px 20px", borderRadius: "16px", gap: 20, marginTop: 5 },
        statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        statNum: { fontWeight: "bold", fontSize: "16px" },
        statLabel: { fontSize: "11px", color: "#888", textTransform: 'uppercase' },
        statDivider: { width: 1, height: 20, background: border },
        
        // Promo
        promoCard: { background: "linear-gradient(135deg, #1a1a1a 0%, #000 100%)", border: "1px solid #333", borderRadius: "16px", padding: "15px 20px", marginTop: "25px", display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
        promoContent: { display: 'flex', flexDirection: 'column' },
        promoTitle: { fontWeight: "bold", fontSize: "16px", color: "#fff" },
        promoDesc: { fontSize: "12px", color: "#888" },
        promoBtn: { background: "#fff", color: "#000", border: "none", padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" },

        // Sections
        sectionHeader: { fontSize: "18px", fontWeight: "bold", marginTop: "30px", marginBottom: "15px" },
        detailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: "10px" },
        gridItem: { background: glass, padding: "12px", borderRadius: "12px", display: 'flex', alignItems: 'center', gap: "10px" },
        gridIcon: { color: "#888" },
        gridLabel: { fontSize: "10px", color: "#888", textTransform: "uppercase" },
        gridValue: { fontSize: "13px", fontWeight: "600" },
        
        tagsContainer: { display: 'flex', flexWrap: 'wrap', gap: "8px" },
        tag: { fontSize: "12px", background: glass, padding: "8px 14px", borderRadius: "20px", color: "#ccc" },

        // Edit Mode
        editContainer: { padding: "0 20px 100px 20px" },
        editHeader: { display: 'flex', alignItems: 'center', marginBottom: "20px", gap: "15px" },
        backBtn: { background: 'none', border: 'none', color: text, fontSize: "20px", cursor: "pointer" },
        editTitle: { fontSize: "20px", fontWeight: "bold" },
        formSection: { display: 'flex', flexDirection: 'column', gap: "15px" },
        label: { fontSize: "13px", fontWeight: "bold", color: "#666", marginBottom: "5px", display: 'block' },
        input: { width: "100%", background: glass, border: `1px solid ${border}`, color: text, padding: "14px", borderRadius: "12px", fontSize: "15px", outline: "none" },
        textarea: { width: "100%", background: glass, border: `1px solid ${border}`, color: text, padding: "14px", borderRadius: "12px", fontSize: "15px", outline: "none", minHeight: "100px", resize: "none" },
        
        // Photo Grid
        photoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: "10px", marginBottom: 20 },
        photoSlot: { position: 'relative', aspectRatio: '1', borderRadius: "12px", overflow: "hidden", background: glass },
        photoPreview: { width: '100%', height: '100%', objectFit: 'cover' },
        addPhotoBtn: { aspectRatio: '1', borderRadius: "12px", border: `2px dashed ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: "#666" },
        removeBtn: { position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        starBtn: { position: 'absolute', bottom: 5, left: 5, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        starBtnActive: { position: 'absolute', bottom: 5, left: 5, background: '#FFD700', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        
        // Buttons
        nextBtn: { background: accent, color: '#fff', border: 'none', padding: "15px", borderRadius: "30px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: 10 },
        saveBtn: { background: "#4CAF50", color: '#fff', border: 'none', padding: "15px", borderRadius: "30px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: 10 },
        optionList: { display: 'flex', flexDirection: 'column', gap: "8px" },
        optionBtn: { padding: "15px", borderRadius: "12px", background: glass, border: `1px solid ${border}`, color: text, textAlign: "left", cursor: "pointer" },
        optionBtnActive: { padding: "15px", borderRadius: "12px", background: glass, border: `1px solid ${accent}`, color: accent, textAlign: "left", cursor: "pointer", fontWeight: "bold" },
        chipGrid: { display: 'flex', flexWrap: 'wrap', gap: "10px" },
        chip: { padding: "10px 18px", borderRadius: "20px", background: glass, border: `1px solid ${border}`, color: text, cursor: "pointer", fontSize: "13px" },
        chipActive: { padding: "10px 18px", borderRadius: "20px", background: "rgba(233, 30, 99, 0.1)", border: `1px solid ${accent}`, color: accent, cursor: "pointer", fontSize: "13px", fontWeight: "bold" },

        // Modals
        modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
        modalCard: { background: isDark ? "#121212" : "#fff", width: "100%", maxWidth: "350px", borderRadius: "20px", padding: "25px", border: `1px solid ${border}` },
        modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
        uploadArea: { border: `2px dashed ${border}`, padding: "30px", borderRadius: "15px", display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', background: glass, marginBottom: 20, color: '#666' },
        primaryBtn: { width: '100%', padding: "14px", background: accent, color: '#fff', border: 'none', borderRadius: "12px", fontWeight: "bold", cursor: "pointer" },
        settingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottom: `1px solid ${border}` },
        themeSwitch: { display: 'flex', background: glass, padding: 3, borderRadius: 20 },
        themeOpt: { padding: "8px 15px", borderRadius: 18, border: 'none', background: 'transparent', color: text, cursor: 'pointer' },
        themeOptActive: { padding: "8px 15px", borderRadius: 18, border: 'none', background: border, color: text, cursor: 'pointer' },
        logoutBtn: { width: '100%', padding: "14px", background: '#333', color: '#fff', border: 'none', borderRadius: "12px", fontWeight: "bold", cursor: 'pointer' }
    };
};
