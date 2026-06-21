import type { Timestamp } from "firebase/firestore";

export type FirestoreTimestamp = Timestamp | { seconds: number; nanoseconds?: number };

export type UserProfile = {
  uid: string;
  buzzId?: string;
  name?: string;
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  photoURL?: string;
  photos?: string[];
  bio?: string;
  age?: number | string;
  gender?: string;
  city?: string;
  studentType?: string;
  instituteName?: string;
  interests?: string[];
  lookingFor?: string;
  relationshipType?: string;
  completed?: boolean;
  verified?: boolean;
  verificationStatus?: string;
  verificationProofUrl?: string | null;
  preferences?: {
    minAge?: number;
    maxAge?: number;
    preferredGender?: string;
    preferredCity?: string;
  };
};

export type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  createdAt?: FirestoreTimestamp | null;
  replyTo?: {
    id: string;
    text: string;
    name?: string;
  } | null;
};

export type Match = {
  id: string;
  users?: string[];
  createdAt?: FirestoreTimestamp | null;
  lastMessage?: {
    text?: string;
    createdAt?: FirestoreTimestamp | null;
    isReply?: boolean;
  };
  otherUser: UserProfile;
};
