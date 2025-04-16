import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  User,
  onAuthStateChanged,
  updateProfile as updateAuthProfile, // Alias auth updateProfile
  browserPopupRedirectResolver
} from "firebase/auth";
import { 
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc, // Ensure updateDoc is imported
  collection,
  query,
  where,
  Timestamp, // Import Timestamp
  addDoc, // Import addDoc
  serverTimestamp, // Import serverTimestamp
  arrayUnion, // Import arrayUnion
  arrayRemove, // Import arrayRemove if needed, but overwriting is simpler here
  orderBy, // Import orderBy
  onSnapshot, // Ensure onSnapshot is imported
  limit, // Optional: for limiting initial message load
  writeBatch, // For atomic updates
  getDocs // <<< Add getDocs here
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
interface ParticipantDetails {
  uid: string;
  displayName: string;
  photoURL: string;
}

// Google Sign In
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    console.log("Starting Google sign-in process...");
    // Use explicit browserPopupRedirectResolver to ensure proper popup handling
    const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
    
    // Get credential from result
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential) {
      console.error("No credential received from Google sign-in");
      throw new Error("Authentication failed - no credentials received");
    }
    
    const token = credential.accessToken;
    console.log("Google sign-in successful, got access token:", token ? "Yes" : "No");
    
    // Return the user
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    // Log detailed error information
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
    return null;
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
};

// Check if user profile is complete
export const isUserProfileComplete = async (userId: string): Promise<boolean> => {
  try {
    console.log(`Checking profile completion for user: ${userId}`);
    
    if (!userId) {
      console.error("Invalid user ID provided to isUserProfileComplete");
      return false;
    }
    
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log(`User document found, profile status: ${data.isProfileComplete}`);
      return data.isProfileComplete === true;
    }
    
    // If user document doesn't exist, profile is not complete
    console.log("No user document found, profile is not complete");
    return false;
  } catch (error) {
    console.error("Error checking user profile:", error);
    return false;
  }
}

// Check if username is already taken
export const isUsernameTaken = async (username: string): Promise<boolean> => {
  const trimmedUsername = username.trim();
  // Basic validation
  if (!trimmedUsername) {
    console.warn("Attempted to check an empty username.");
    // Let form validation handle required fields, return false here
    return false;
  }

  if (/\s/.test(username)) { // Check original value for spaces feedback
    console.error("Username check failed: contains spaces.");
    throw new Error("Username cannot contain spaces");
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
     console.error("Username check failed: invalid characters.");
     throw new Error("Username can only contain letters, numbers, and underscores");
  }


  // Create a query against the users collection
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", trimmedUsername));

  try {
    console.log(`Executing username query for: ${trimmedUsername}`);
    const querySnapshot = await getDocs(q);
    console.log(`Query successful. Found ${querySnapshot.size} documents.`);
    // If the query returns any documents, the username is taken
    return !querySnapshot.empty;
  } catch (queryError: any) {
    console.error("Database query error during username check:", queryError);

    // Log specific error details
    if (queryError.code) {
      console.error("Firestore error code:", queryError.code);
    }
    if (queryError.message) {
      console.error("Firestore error message:", queryError.message);
    }

    // Handle permission denied specifically
    if (queryError.code === 'permission-denied') {
      console.warn("PERMISSION_DENIED: Cannot query users collection. Check Firestore rules.");
      // Throw a specific error to be caught in the component.
      throw new Error("Permission denied while checking username. Please check configuration.");
    }

    // For other errors, rethrow a generic error
    throw new Error("Failed to check username availability due to a database error.");
  }
};

// Find users by username (for search functionality)
export const findUsersByUsername = async (usernameQuery: string): Promise<any[]> => {
  const currentUser = getCurrentUser();
  if (!currentUser) return []; // Don't search if not logged in

  try {
    // Basic validation
    if (!usernameQuery || /\s/.test(usernameQuery)) {
      return [];
    }
    
    const usersRef = collection(db, "users");
    // Create a query to find usernames that start with the query string
    const q = query(usersRef, where("username", ">=", usernameQuery), 
                           where("username", "<=", usernameQuery + '\uf8ff'));
    
    const querySnapshot = await getDocs(q);
    const users: any[] = [];
    
    querySnapshot.forEach((doc) => {
      // Exclude the current user from search results
      if (doc.id !== currentUser.uid) {
        const userData = doc.data();
        users.push({
          uid: doc.id,
          username: userData.username,
          displayName: userData.displayName,
          photoURL: userData.photoURL
        });
      }
    });
    
    return users;
  } catch (error) {
    console.error("Error searching users:", error);
    // Rethrow or return specific error state if needed
    throw new Error("Failed to search users."); 
  }
};

// Create a chat between two users
export const createChat = async (currentUserId: string, otherUserId: string): Promise<string | null> => {
  // --- Add Logging Here ---
  console.log(`[firebase] createChat called with:`);
  console.log(`[firebase] currentUserId: ${currentUserId}`);
  console.log(`[firebase] otherUserId: ${otherUserId}`);
  // --- End Logging ---

  if (!currentUserId || !otherUserId) {
    console.error("[firebase] createChat Error: One or both user IDs are missing.");
    return null; // Or throw an error
  }

  if (currentUserId === otherUserId) {
    console.error("Cannot create chat with oneself.");
    return null;
  }

  // Generate a unique chat ID based on sorted user IDs
  const chatDocId = [currentUserId, otherUserId].sort().join('_');
  const chatDocRef = doc(db, "chats", chatDocId);

  try {
    const chatDocSnap = await getDoc(chatDocRef);

    if (chatDocSnap.exists()) {
      // Chat already exists
      console.log("[firebase] Chat already exists:", chatDocId);
      return chatDocId;
    } else {
      // Chat doesn't exist, create it
      console.log("[firebase] Creating new chat:", chatDocId);
      
      // --- Add More Detailed Logging Here ---
      const participants = [currentUserId, otherUserId];
      console.log(`[firebase] Preparing participantIds: [${participants[0]}, ${participants[1]}] (Type: ${typeof participants[0]}, ${typeof participants[1]}) (Length: ${participants.length})`);
      if (!participants[0] || !participants[1] || typeof participants[0] !== 'string' || typeof participants[1] !== 'string') {
          console.error("[firebase] CRITICAL: Invalid participant UIDs detected just before setDoc!", participants);
          throw new Error("Invalid participant UIDs provided for chat creation.");
      }
      // --- End Logging ---

      const chatDataToSet = {
        participantIds: participants, // Use the validated array
        createdAt: serverTimestamp(),
        lastMessage: null,
        lastMessageTimestamp: null,
      };
      console.log("[firebase] Data for setDoc:", JSON.stringify(chatDataToSet, null, 2)); 
      
      // This is line 294 where the error occurs
      await setDoc(chatDocRef, chatDataToSet); 

      // Optionally add participant subcollection docs (if needed for complex queries later)
      // await setDoc(doc(db, "chats", chatDocId, "participants", currentUserId), { joinedAt: serverTimestamp() });
      // await setDoc(doc(db, "chats", chatDocId, "participants", otherUserId), { joinedAt: serverTimestamp() });

      console.log("New chat created successfully:", chatDocId);
      return chatDocId;
    }
  } catch (error) {
    console.error("Error creating or checking chat:", error);
    throw new Error("Failed to create chat.");
  }
};

// Get pending chats for a user
export const getPendingChats = async (userId: string): Promise<ParticipantDetails[]> => {
  if (!userId) return [];
  try {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      // Return the pendingChats array, or an empty array if it doesn't exist
      return data.pendingChats || []; 
    }
    return [];
  } catch (error) {
    console.error("Error fetching pending chats:", error);
    // Return empty array on error, or rethrow if needed
    return []; 
  }
};

// Update pending chats for a user (overwrites the existing array)
export const updatePendingChats = async (userId: string, usersToAdd: ParticipantDetails[]): Promise<void> => {
  if (!userId) return;
  try {
    const userDocRef = doc(db, "users", userId);
    // Use updateDoc to only modify the pendingChats field
    // This assumes the user document already exists (which it should if they are logged in)
    await updateDoc(userDocRef, {
      pendingChats: usersToAdd 
    });
    console.log(`Pending chats updated for user ${userId}`);
  } catch (error) {
    console.error("Error updating pending chats:", error);
    // Handle error appropriately, maybe rethrow
    throw new Error("Failed to update pending chats list.");
  }
};

// Update user profile (used by KYC)
export const updateUserProfile = async (userId: string, profileData: any): Promise<void> => {
  try {
    const cleanUsername = profileData.username ? profileData.username.trim() : '';

    // Validate username format (no spaces allowed, valid characters)
    if (!cleanUsername) {
       throw new Error("Username is required.");
    }
    if (/\s/.test(profileData.username)) { // Check original for feedback consistency
      throw new Error("Username cannot contain spaces.");
    }
     if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      throw new Error("Username can only contain letters, numbers, and underscores.");
    }

    // Check if username is already taken (and not by the current user)
    // This check is crucial before updating/setting the document
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      const existingUsername = userDoc.exists() ? userDoc.data().username : null;

      // Only perform the check if the username is actually changing
      if (existingUsername !== cleanUsername) {
        const taken = await isUsernameTaken(cleanUsername);
        if (taken) {
          throw new Error("Username is already taken. Please choose another one.");
        }
      }
    } catch (usernameError: any) {
      // Re-throw specific validation/permission errors from isUsernameTaken
      console.error("Error during pre-update username check:", usernameError);
      throw usernameError; // Let the calling function handle it
    }

    // Prepare data, ensuring isProfileComplete is set
    const dataToUpdate = {
      displayName: profileData.displayName.trim(),
      username: cleanUsername,
      dateOfBirth: profileData.dateOfBirth,
      gender: profileData.gender,
      photoURL: profileData.photoURL || '', // Ensure photoURL is always a string
      isProfileComplete: true,
      updatedAt: Timestamp.now() // Add an updated timestamp
    };

    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef); // Use different variable name

    if (userDocSnap.exists()) {
      // Update existing document
      await updateDoc(userDocRef, dataToUpdate);
      console.log("User profile updated successfully.");
    } else {
      // Create new document
      await setDoc(userDocRef, {
        ...dataToUpdate,
        createdAt: Timestamp.now(), // Add createdAt only for new users
        pendingChats: [] // Initialize pendingChats for new users
      });
      console.log("User profile created successfully.");
    }

    // If profile includes display name or photo URL, update auth profile too
    const currentUser = auth.currentUser;
    if (currentUser && (dataToUpdate.displayName || dataToUpdate.photoURL)) {
      try {
        await updateAuthProfile(currentUser, {
          displayName: dataToUpdate.displayName || currentUser.displayName,
          photoURL: dataToUpdate.photoURL || currentUser.photoURL
        });
         console.log("Firebase Auth profile updated.");
      } catch (authUpdateError) {
         console.error("Failed to update Firebase Auth profile:", authUpdateError);
         // Non-critical, maybe log or notify user separately
      }
    }
  } catch (error) {
    console.error("Error in updateUserProfile function:", error);
    // Rethrow the error to be handled by the calling component (e.g., KYC form)
    throw error;
  }
}

// NEW FUNCTION: Update only the user's photo URL
export const updateUserPhotoURL = async (userId: string, photoURL: string): Promise<void> => {
  if (!userId || !photoURL) {
    throw new Error("User ID and Photo URL are required.");
  }

  try {
    const userDocRef = doc(db, "users", userId);
    const dataToUpdate = {
      photoURL: photoURL,
      updatedAt: Timestamp.now()
    };

    // Update Firestore document
    await updateDoc(userDocRef, dataToUpdate);
    console.log("User photoURL updated in Firestore.");

    // Update Firebase Auth profile as well
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === userId) {
      try {
        await updateAuthProfile(currentUser, { photoURL: photoURL });
        console.log("Firebase Auth profile photoURL updated.");
      } catch (authUpdateError) {
        console.error("Failed to update Firebase Auth profile photoURL:", authUpdateError);
        // Non-critical, maybe log or notify user separately
      }
    }
  } catch (error) {
    console.error("Error in updateUserPhotoURL function:", error);
    throw error; // Rethrow the error
  }
};

// --- Chat Messages ---

// Interface for a chat message
export interface Message {
  id: string; // Document ID
  text: string;
  senderId: string;
  createdAt: Timestamp; // Use Timestamp for serverTimestamp resolution
  // Optional: Add photoURL if you want sender's avatar next to message
  // senderPhotoURL?: string; 
}

// Function to listen for messages in a chat
export const getMessagesListener = (
  chatId: string, 
  callback: (messages: Message[]) => void, 
  onError: (error: Error) => void
): (() => void) => { // Returns an unsubscribe function
  
  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc")); // Order by creation time

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Ensure createdAt is a Timestamp, handle potential null from serverTimestamp briefly
      createdAt: doc.data().createdAt || Timestamp.now() 
    } as Message));
    callback(messages);
  }, (error) => {
    console.error("Error listening to messages:", error);
    onError(error);
  });

  return unsubscribe; // Return the unsubscribe function for cleanup
};


// Function to send a message
export const sendMessage = async (
  chatId: string, 
  senderId: string, 
  text: string
): Promise<void> => {
  if (!chatId || !senderId || !text.trim()) {
    throw new Error("Chat ID, Sender ID, and message text are required.");
  }

  try {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const chatDocRef = doc(db, "chats", chatId);

    // Use a batch write for atomicity
    const batch = writeBatch(db);

    // 1. Add the new message document
    const newMessageRef = doc(collection(db, "chats", chatId, "messages")); // Generate ref beforehand
    batch.set(newMessageRef, {
      text: text.trim(),
      senderId: senderId,
      createdAt: serverTimestamp() // Use server timestamp
    });

    // 2. Update the parent chat document
    batch.update(chatDocRef, {
      lastMessage: text.trim(),
      lastMessageTimestamp: serverTimestamp()
      // Optional: Update unread counts here if implementing
    });

    // Commit the batch
    await batch.commit();
    console.log("Message sent and chat updated.");

  } catch (error) {
    console.error("Error sending message:", error);
    throw error; // Rethrow the error
  }
};

export { auth, app, analytics, db };
