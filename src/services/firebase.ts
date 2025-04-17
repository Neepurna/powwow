import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  User,
  onAuthStateChanged,
  updateProfile as updateAuthProfile,
  browserPopupRedirectResolver
} from "firebase/auth";
import { 
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  Timestamp,
  addDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  orderBy,
  onSnapshot,
  limit,
  writeBatch,
  getDocs
} from "firebase/firestore";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Add scopes and custom parameters for Google provider
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore
const db = getFirestore(app);

// Define ParticipantDetails interface (can be moved to a types file)
export interface ParticipantDetails {
  uid: string;
  displayName: string;
  photoURL: string | null;
  isGroup?: boolean;
  groupName?: string;
}

// Google Sign In - Updated to use redirect with popup fallback
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    console.log("Starting Google sign-in process...");
    
    // Check if we're in a redirect completion state
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        console.log("Redirect sign-in successful");
        return result.user;
      }
    } catch (redirectError) {
      console.error("Error completing redirect sign-in:", redirectError);
    }
    
    // First try redirect (works better across domains)
    try {
      await signInWithRedirect(auth, googleProvider);
      return null;
    } catch (redirectError) {
      console.error("Redirect auth failed, trying popup:", redirectError);
      try {
        const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
        console.log("Popup sign-in successful");
        return result.user;
      } catch (popupError) {
        console.error("Popup auth failed too:", popupError);
        throw popupError;
      }
    }
  } catch (error) {
    console.error("Error signing in with Google:", error);
    if (error.code) {
      console.error("Error code:", error.code);
    }
    if (error.message) {
      console.error("Error message:", error.message);
    }
    if (error.customData) {
      console.error("Email:", error.customData.email);
      console.error("Auth credential:", GoogleAuthProvider.credentialFromError(error));
    }
    throw error;
  }
};

// Sign Out
export const signOut = async (): Promise<void> => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Auth state observer setup
export const observeAuthState = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
      return data.isProfileComplete === true;
    }
    
    console.log("No user document found, profile is not complete");
    return false;
  } catch (error) {
    console.error("Error checking user profile:", error);
    return false;heck if user profile is complete
  }romise<boolean> => {
}
Checking profile completion for user: ${userId}`);
// Check if username is already taken
export const isUsernameTaken = async (username: string): Promise<boolean> => {
  const trimmedUsername = username.trim();or("Invalid user ID provided to isUserProfileComplete");
  if (!trimmedUsername) {   return false;
    console.warn("Attempted to check an empty username.");   }
    return false;    
  }", userId);

  if (/\s/.test(username)) {
    console.error("Username check failed: contains spaces.");s()) {
    throw new Error("Username cannot contain spaces");c.data();
  }data.isProfileComplete}`);
  if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
     console.error("Username check failed: invalid characters.");
     throw new Error("Username can only contain letters, numbers, and underscores"); 
  }    // If user document doesn't exist, profile is not complete

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", trimmedUsername));
 console.error("Error checking user profile:", error);
  try {
    console.log(`Executing username query for: ${trimmedUsername}`);
    const querySnapshot = await getDocs(q);
    console.log(`Query successful. Found ${querySnapshot.size} documents.`);
    return !querySnapshot.empty;// Check if username is already taken
  } catch (queryError: any) {export const isUsernameTaken = async (username: string): Promise<boolean> => {
    console.error("Database query error during username check:", queryError);

    if (queryError.code) {
      console.error("Firestore error code:", queryError.code);    console.warn("Attempted to check an empty username.");
    }Let form validation handle required fields, return false here
    if (queryError.message) {
      console.error("Firestore error message:", queryError.message);
    }
feedback
    if (queryError.code === 'permission-denied') {k failed: contains spaces.");
      console.warn("PERMISSION_DENIED: Cannot query users collection. Check Firestore rules."); cannot contain spaces");
      throw new Error("Permission denied while checking username. Please check configuration.");
    }  if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
k failed: invalid characters.");
    throw new Error("Failed to check username availability due to a database error.");name can only contain letters, numbers, and underscores");
  }
};

// Find users by username (for search functionality)
export const findUsersByUsername = async (usernameQuery: string): Promise<any[]> => {st usersRef = collection(db, "users");
  const currentUser = getCurrentUser();  const q = query(usersRef, where("username", "==", trimmedUsername));
  if (!currentUser) return [];

  try {
    if (!usernameQuery || /\s/.test(usernameQuery)) {
      return [];
    }/ If the query returns any documents, the username is taken
        return !querySnapshot.empty;
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", ">=", usernameQuery), 
                           where("username", "<=", usernameQuery + '\uf8ff'));
      // Log specific error details
    const querySnapshot = await getDocs(q);    if (queryError.code) {
    const users: any[] = [];ror.code);
    
    querySnapshot.forEach((doc) => {
      if (doc.id !== currentUser.uid) {age);
        const userData = doc.data();    }
        users.push({
          uid: doc.id,n denied specifically
          username: userData.username,
          displayName: userData.displayName,rn("PERMISSION_DENIED: Cannot query users collection. Check Firestore rules.");
          photoURL: userData.photoURL // Throw a specific error to be caught in the component.
        });  throw new Error("Permission denied while checking username. Please check configuration.");
      }
    });
    
    return users;rror.");
  } catch (error) {
    console.error("Error searching users:", error);
    throw new Error("Failed to search users."); 
  }ind users by username (for search functionality)
};sync (usernameQuery: string): Promise<any[]> => {

// Create a chat between two users search if not logged in
export const createChat = async (currentUserId: string, otherUserId: string): Promise<string | null> => {
  console.log(`[firebase] createChat called with:`);
  console.log(`[firebase] currentUserId: ${currentUserId}`);n
  console.log(`[firebase] otherUserId: ${otherUserId}`);ernameQuery)) {

  if (!currentUserId || !otherUserId) {
    console.error("[firebase] createChat Error: One or both user IDs are missing.");
    return null;st usersRef = collection(db, "users");
  }Create a query to find usernames that start with the query string
const q = query(usersRef, where("username", ">=", usernameQuery), 
  if (currentUserId === otherUserId) {          where("username", "<=", usernameQuery + '\uf8ff'));
    console.error("Cannot create chat with oneself.");
    return null;
  }

  const chatDocId = [currentUserId, otherUserId].sort().join('_'); querySnapshot.forEach((doc) => {
  const chatDocRef = doc(db, "chats", chatDocId);    // Exclude the current user from search results
      if (doc.id !== currentUser.uid) {
  try {);
    const chatDocSnap = await getDoc(chatDocRef);

    if (chatDocSnap.exists()) {
      console.log("[firebase] Chat already exists:", chatDocId);
      return chatDocId;
    } else {
      console.log("[firebase] Creating new chat:", chatDocId);      }
      
      const participants = [currentUserId, otherUserId];
      console.log(`[firebase] Preparing participantIds: [${participants[0]}, ${participants[1]}] (Type: ${typeof participants[0]}, ${typeof participants[1]}) (Length: ${participants.length})`);
      if (!participants[0] || !participants[1] || typeof participants[0] !== 'string' || typeof participants[1] !== 'string') { catch (error) {
          console.error("[firebase] CRITICAL: Invalid participant UIDs detected just before setDoc!", participants);    console.error("Error searching users:", error);
          throw new Error("Invalid participant UIDs provided for chat creation.");r state if needed
      }

      const chatDataToSet = {
        participantIds: participants,
        createdAt: serverTimestamp(),
        lastMessage: null,d: string): Promise<string | null> => {
        lastMessageTimestamp: null,
        isGroup: false,  console.log(`[firebase] createChat called with:`);
        groupName: null,le.log(`[firebase] currentUserId: ${currentUserId}`);
        createdBy: null,rId}`);
      };  // --- End Logging ---
      
      console.log("[firebase] Data for setDoc (Direct Chat):", JSON.stringify(chatDataToSet, null, 2)); erUserId) {
       IDs are missing.");
      await setDoc(chatDocRef, chatDataToSet); throw an error

      console.log("New chat created successfully:", chatDocId);
      return chatDocId;
    }nsole.error("Cannot create chat with oneself.");
  } catch (error) {
    console.error("Error creating or checking chat:", error);
    throw new Error("Failed to create chat.");
  }
};

// Create Group Chat
export const createGroupChat = async (
  creatorId: string,     const chatDocSnap = await getDoc(chatDocRef);
  groupName: string, 
  participantIds: string[],
  groupPhotoURL?: string | null
): Promise<string | null> => {se] Chat already exists:", chatDocId);
  
  if (!creatorId || !groupName.trim() || participantIds.length < 2) {
    console.error("Invalid data for group chat creation.");
    throw new Error("Group name and at least two participants (including creator) are required."););
  }
// --- Add More Detailed Logging Here ---
  if (!participantIds.includes(creatorId)) {ntUserId, otherUserId];
    participantIds.push(creatorId);${typeof participants[0]}, ${typeof participants[1]}) (Length: ${participants.length})`);
  }if (!participants[0] || !participants[1] || typeof participants[0] !== 'string' || typeof participants[1] !== 'string') {
nvalid participant UIDs detected just before setDoc!", participants);
  const chatCollectionRef = collection(db, "chats");          throw new Error("Invalid participant UIDs provided for chat creation.");
  const newChatDocRef = doc(chatCollectionRef); 

  const groupData = {
    participantIds: participantIds,      const chatDataToSet = {
    createdAt: serverTimestamp(),y
    lastMessage: `${groupName} created`, erTimestamp(),
    lastMessageTimestamp: serverTimestamp(),   lastMessage: null,
    isGroup: true,Timestamp: null,
    groupName: groupName.trim(),r direct chats
    createdBy: creatorId, upName to null
    groupPhotoURL: groupPhotoURL || null,     createdBy: null, // Explicitly set createdBy to null
  };    };
      
  try {
    console.log("[firebase] Creating new group chat with data:", JSON.stringify(groupData, null, 2)); setDoc (Direct Chat):", JSON.stringify(chatDataToSet, null, 2)); 
    await setDoc(newChatDocRef, groupData);
    console.log("New group chat created successfully:", newChatDocRef.id);atDocRef, chatDataToSet); 
    return newChatDocRef.id; 
  } catch (error) { for complex queries later)
    console.error("Error creating group chat:", error);"chats", chatDocId, "participants", currentUserId), { joinedAt: serverTimestamp() });
    throw new Error("Failed to create group chat.");    // await setDoc(doc(db, "chats", chatDocId, "participants", otherUserId), { joinedAt: serverTimestamp() });
  }
};Id);

// Get pending chats for a user }
export const getPendingChats = async (userId: string): Promise<ParticipantDetails[]> => {  } catch (error) {
  if (!userId) return [];hat:", error);
  try {);
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return data.pendingChats || []; 
    }  creatorId: string, 
    return [];
  } catch (error) {ld include creatorId
    console.error("Error fetching pending chats:", error);/ <<< Add optional groupPhotoURL
    return []; 
  }
};| !groupName.trim() || participantIds.length < 2) {
for group chat creation.");
// Update pending chats for a user name and at least two participants (including creator) are required.");
export const updatePendingChats = async (userId: string, usersToAdd: ParticipantDetails[]): Promise<void> => {
  if (!userId) return;
  try {  // Ensure creator is included in participants
    const userDocRef = doc(db, "users", userId);participantIds.includes(creatorId)) {
    await updateDoc(userDocRef, {
      pendingChats: usersToAdd 
    });
    console.log(`Pending chats updated for user ${userId}`);ollection(db, "chats");
  } catch (error) {ef = doc(chatCollectionRef); 
    console.error("Error updating pending chats:", error);
    throw new Error("Failed to update pending chats list.");
  } participantIds: participantIds,
};  createdAt: serverTimestamp(),
    lastMessage: `${groupName} created`, 
// Update user profilerTimestamp(),
export const updateUserProfile = async (userId: string, profileData: any): Promise<void> => {
  try {trim(),
    const cleanUsername = profileData.username ? profileData.username.trim() : '';atedBy: creatorId, 
 Store the group photo URL
    if (!cleanUsername) {
       throw new Error("Username is required.");
    }
    if (/\s/.test(profileData.username)) {fy(groupData, null, 2));
      throw new Error("Username cannot contain spaces.");ata);
    }onsole.log("New group chat created successfully:", newChatDocRef.id);
     if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {ChatDocRef.id; 
      throw new Error("Username can only contain letters, numbers, and underscores.");
    }

    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      const existingUsername = userDoc.exists() ? userDoc.data().username : null;// Get pending chats for a user
ticipantDetails[]> => {
      if (existingUsername !== cleanUsername) {
        const taken = await isUsernameTaken(cleanUsername);
        if (taken) {st userDocRef = doc(db, "users", userId);
          throw new Error("Username is already taken. Please choose another one.");;
        }
      }
    } catch (usernameError: any) {array, or an empty array if it doesn't exist
      console.error("Error during pre-update username check:", usernameError);|| []; 
      throw usernameError;
    }

    const dataToUpdate = {
      displayName: profileData.displayName.trim(),f needed
      username: cleanUsername,
      dateOfBirth: profileData.dateOfBirth,
      gender: profileData.gender,
      photoURL: profileData.photoURL || null,
      isProfileComplete: true,overwrites the existing array)
      updatedAt: Timestamp.now()romise<void> => {
    };userId) return;

    const userDocRef = doc(db, "users", userId);    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
ser document already exists (which it should if they are logged in)
    if (userDocSnap.exists()) {
      await updateDoc(userDocRef, dataToUpdate); pendingChats: usersToAdd 
      console.log("User profile updated successfully.");
    } else {`);
      await setDoc(userDocRef, {atch (error) {
        ...dataToUpdate, error);
        createdAt: Timestamp.now(),
        pendingChats: []hrow new Error("Failed to update pending chats list.");
      });  }
      console.log("User profile created successfully.");
    }
 user profile (used by KYC)
    const currentUser = auth.currentUser;ring, profileData: any): Promise<void> => {
    if (currentUser && (dataToUpdate.displayName || dataToUpdate.photoURL)) {
      try {;
        await updateAuthProfile(currentUser, {
          displayName: dataToUpdate.displayName || currentUser.displayName,)
          photoURL: dataToUpdate.photoURL || currentUser.photoURL
        });
         console.log("Firebase Auth profile updated.");
      } catch (authUpdateError) {cy
         console.error("Failed to update Firebase Auth profile:", authUpdateError);ow new Error("Username cannot contain spaces.");
      }
    }leanUsername)) {
  } catch (error) {scores.");
    console.error("Error in updateUserProfile function:", error);
    throw error;
  }/ Check if username is already taken (and not by the current user)
}    // This check is crucial before updating/setting the document

// Update only the user's photo URLoc(db, "users", userId);
export const updateUserPhotoURL = async (userId: string, photoURL: string | null): Promise<void> => {
  if (!userId) { userDoc.exists() ? userDoc.data().username : null;
    throw new Error("User ID is required.");
  }f the username is actually changing

  try {UsernameTaken(cleanUsername);
    const userDocRef = doc(db, "users", userId);
    const dataToUpdate = {    throw new Error("Username is already taken. Please choose another one.");
      photoURL: photoURL,        }
      updatedAt: Timestamp.now()
    };
      // Re-throw specific validation/permission errors from isUsernameTaken
    await updateDoc(userDocRef, dataToUpdate);ng pre-update username check:", usernameError);
    console.log("User photoURL updated in Firestore."); the calling function handle it

    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === userId) {re data, ensuring isProfileComplete is set
      try {
        await updateAuthProfile(currentUser, { photoURL: photoURL });isplayName.trim(),
        console.log("Firebase Auth profile photoURL updated.");rname,
      } catch (authUpdateError) {
        console.error("Failed to update Firebase Auth profile photoURL:", authUpdateError);
      }toURL: profileData.photoURL || null, // <<< Ensure photoURL is null if empty string or undefined
    }
  } catch (error) { updatedAt: Timestamp.now() // Add an updated timestamp
    console.error("Error in updateUserPhotoURL function:", error);    };
    throw error;
  }serId);
};ame

// Chat Messages

// Interface for a chat message
export interface Message {le.log("User profile updated successfully.");
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp;
  senderPhotoURL?: string | null;  createdAt: Timestamp.now(), // Add createdAt only for new users
  senderDisplayName?: string | null;    pendingChats: [] // Initialize pendingChats for new users
}

// Function to listen for messages in a chat
export const getMessagesListener = (
  chatId: string,  // If profile includes display name or photo URL, update auth profile too
  callback: (messages: Message[]) => void,    const currentUser = auth.currentUser;
  onError: (error: Error) => void    if (currentUser && (dataToUpdate.displayName || dataToUpdate.photoURL)) {
): (() => void) => {
  
  const messagesRef = collection(db, "chats", chatId, "messages");ame || currentUser.displayName,
  const q = query(messagesRef, orderBy("createdAt", "asc")); currentUser.photoURL
     });
  const unsubscribe = onSnapshot(q, (querySnapshot) => {         console.log("Firebase Auth profile updated.");
    const messages = querySnapshot.docs.map(doc => ({ catch (authUpdateError) {
      id: doc.id,e Auth profile:", authUpdateError);
      ...doc.data(),maybe log or notify user separately
      createdAt: doc.data().createdAt || Timestamp.now() 
    } as Message));
    callback(messages);tch (error) {
  }, (error) => {    console.error("Error in updateUserProfile function:", error);
    console.error("Error listening to messages:", error);andled by the calling component (e.g., KYC form)
    onError(error);
  });
}
  return unsubscribe;
};hoto URL
ing, photoURL: string | null): Promise<void> => { // <<< Allow null
// Function to send a messageId) { // photoURL can be null now
export const sendMessage = async (
  chatId: string, 
  senderId: string, 
  text: string,
  senderDisplayName?: string | null, 
  senderPhotoURL?: string | null st dataToUpdate = {
): Promise<void> => { photoURL: photoURL, // Store null if provided
  if (!chatId || !senderId || !text.trim()) {mestamp.now()
    throw new Error("Chat ID, Sender ID, and message text are required.");
  }
 // Update Firestore document
  try {  await updateDoc(userDocRef, dataToUpdate);
    const messagesRef = collection(db, "chats", chatId, "messages");    console.log("User photoURL updated in Firestore.");
    const chatDocRef = doc(db, "chats", chatId);
    // Update Firebase Auth profile as well
    const messageData = {rrentUser;
      text: text.trim(),rentUser.uid === userId) {
      senderId: senderId,
      createdAt: serverTimestamp(),pdateAuthProfile(currentUser, { photoURL: photoURL });
      senderDisplayName: senderDisplayName || null,("Firebase Auth profile photoURL updated.");
      senderPhotoURL: senderPhotoURL || null,
    }; authUpdateError);
 or notify user separately
    const batch = writeBatch(db);
   }
    const newMessageRef = doc(messagesRef);  } catch (error) {
    batch.set(newMessageRef, messageData);RL function:", error);
r
    batch.update(chatDocRef, {
      lastMessage: text.trim(),
      lastMessageTimestamp: serverTimestamp()
    });

    await batch.commit();

    console.log("Message sent and chat updated successfully.");  id: string; // Document ID

  } catch (error) {
    console.error("Error sending message:", error);stamp; // Use Timestamp for serverTimestamp resolution
    throw new Error("Failed to send message.");hotoURL and display name for sender display in groups
  }
};

export { auth, app, analytics, db };
    batch.update(chatDocRef, {
      lastMessage: text.trim(), // Store the latest message text
      lastMessageTimestamp: serverTimestamp() // Update timestamp
    });

    // Commit the batch
    await batch.commit();

    console.log("Message sent and chat updated successfully.");

  } catch (error) {
    console.error("Error sending message:", error);
    throw new Error("Failed to send message.");
  }
};

export { auth, app, analytics, db };
