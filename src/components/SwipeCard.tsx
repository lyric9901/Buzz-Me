"use client";

import {useEffect,useState} from "react";
import {motion,AnimatePresence} from "framer-motion";
import {auth,db} from "@/lib/firebase";
import {onAuthStateChanged} from "firebase/auth";
import {
collection,getDocs,doc,getDoc,setDoc,query,where
} from "firebase/firestore";
import {useRouter} from "next/navigation";

/* -------------------- SWIPE CARD -------------------- */

function SwipeCard({profile,onLike,onDislike}){
if(!profile||typeof profile!=="object")return null;

const photoURL=profile.photoURL||null;
const name=profile.name||"User";
const age=profile.age||"";
const city=profile.city||"";

return(
<motion.div
drag="x"
dragConstraints={{left:0,right:0}}
onDragEnd={(_,info)=>{
if(info.offset.x>120)onLike();
else if(info.offset.x<-120)onDislike();
}}
initial={{scale:.9,opacity:0}}
animate={{scale:1,opacity:1}}
exit={{x:400,opacity:0,rotate:15}}
transition={{type:"spring",stiffness:300,damping:25}}
style={{
position:"absolute",
width:"100%",
height:"100%",
background:"#fff",
borderRadius:24,
overflow:"hidden",
boxShadow:"0 10px 25px rgba(0,0,0,.1)"
}}
>
<div style={{height:"75%",background:"#eee",display:"flex",alignItems:"center",justifyContent:"center"}}>
{photoURL?(
<img src={photoURL} style={{width:"100%",height:"100%",objectFit:"cover"}} draggable={false}/>
):(
<span>No Image</span>
)}
</div>
<div style={{padding:20}}>
<h2 style={{margin:0}}>{name}{age&&`, ${age}`}</h2>
<p style={{color:"#666",margin:"5px 0"}}>{city}</p>
</div>
</motion.div>
);
}

/* -------------------- MAIN PAGE -------------------- */

export default function SwipePage(){
const router=useRouter();

const[user,setUser]=useState(null);
const[myProfile,setMyProfile]=useState(null);
const[profiles,setProfiles]=useState([]);
const[index,setIndex]=useState(0);
const[loading,setLoading]=useState(true);
const[showSettings,setShowSettings]=useState(false);

const[minAge,setMinAge]=useState(13);
const[maxAge,setMaxAge]=useState(17);
const[preferredGender,setPreferredGender]=useState("All");
const[preferredCity,setPreferredCity]=useState("");

/* AUTH */
useEffect(()=>{
const unsub=onAuthStateChanged(auth,u=>{
setUser(u);
if(!u)setLoading(false);
});
return()=>unsub();
},[]);

/* LOAD MY PROFILE */
useEffect(()=>{
if(!user)return;
(async()=>{
const snap=await getDoc(doc(db,"users",user.uid));
if(!snap.exists()){setLoading(false);return;}
const data=snap.data();
setMyProfile(data);
if(data.preferences){
setMinAge(data.preferences.minAge||13);
setMaxAge(data.preferences.maxAge||17);
setPreferredGender(data.preferences.preferredGender||"All");
setPreferredCity(data.preferences.preferredCity||"");
}
setLoading(false);
})();
},[user]);

/* LOAD SWIPE PROFILES */
useEffect(()=>{
if(!user||!myProfile)return;
(async()=>{
const q=query(
collection(db,"users"),
where("completed","==",true),
where("age",">=",minAge),
where("age","<=",maxAge)
);
const snap=await getDocs(q);
const list=[];
snap.forEach(d=>{
if(d.id===user.uid)return;
const u=d.data();
if(preferredGender!=="All"&&u.gender!==preferredGender)return;
if(preferredCity&&u.city?.toLowerCase()!==preferredCity.toLowerCase())return;
list.push({uid:d.id,...u});
});
setProfiles(list);
setIndex(0);
})();
},[user,myProfile,minAge,maxAge,preferredGender,preferredCity]);

const currentProfile=profiles[index]||null;

/* ACTIONS */
const likeUser=async()=>{
if(!currentProfile||!user)return;
setIndex(i=>i+1);
await setDoc(doc(db,"likes",user.uid,"liked",currentProfile.uid),{createdAt:new Date()});
const otherLike=await getDoc(doc(db,"likes",currentProfile.uid,"liked",user.uid));
if(otherLike.exists())createMatch(user.uid,currentProfile.uid);
};

const dislikeUser=async()=>{
if(!currentProfile||!user)return;
setIndex(i=>i+1);
await setDoc(doc(db,"likes",user.uid,"disliked",currentProfile.uid),{createdAt:new Date()});
};

const createMatch=async(uid1,uid2)=>{
const matchId=uid1<uid2?`${uid1}_${uid2}`:`${uid2}_${uid1}`;
await setDoc(doc(db,"matches",matchId),{users:[uid1,uid2],createdAt:new Date()});
await setDoc(doc(db,"chats",matchId),{users:[uid1,uid2],createdAt:new Date()});
alert("Match found 🎉");
};

/* RENDER */
if(loading)return<div style={{padding:40}}>Loading…</div>;
if(!user)return<div style={{padding:40}}>Please login</div>;

return(
<div style={{maxWidth:450,margin:"0 auto",padding:20}}>
<div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
<div onClick={()=>router.push("/profile")} style={{cursor:"pointer",display:"flex",gap:10}}>
<div style={{width:40,height:40,borderRadius:"50%",background:"#eee",overflow:"hidden"}}>
{myProfile?.photoURL&&(
<img src={myProfile.photoURL} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
)}
</div>
<span>Buzz Me</span>
</div>
<button onClick={()=>setShowSettings(true)}>⚙️</button>
</div>

<div style={{position:"relative",height:520}}>
<AnimatePresence>
{currentProfile?(
<SwipeCard
key={currentProfile.uid}
profile={currentProfile}
onLike={likeUser}
onDislike={dislikeUser}
/>
):(
<motion.div initial={{opacity:0}} animate={{opacity:1}} style={{textAlign:"center",paddingTop:100}}>
<h3>No more profiles</h3>
<button onClick={()=>setShowSettings(true)}>Change filters</button>
</motion.div>
)}
</AnimatePresence>
</div>

{showSettings&&(
<div style={{position:"fixed",inset:0,background:"#fff",padding:30}}>
<button onClick={()=>setShowSettings(false)}>✕</button>
<button onClick={()=>setShowSettings(false)} style={{marginTop:20}}>Save</button>
</div>
)}
</div>
);
}
