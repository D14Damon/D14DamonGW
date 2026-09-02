import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  deleteUser,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  Firestore,
  deleteField,
} from 'firebase/firestore';
import { FirebaseConfig, LeaderboardEntry, UserProfile, PlayerActivity } from '../types';
import appletConfig from '../../firebase-applet-config.json';

const STORAGE_KEY_FIREBASE = 'guess_what_firebase_config';

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: ReturnType<typeof getAuth> | null = null;
let firestoreDb: Firestore | null = null;

// Read config from auto-provisioned firebase-applet-config.json, localStorage, or env
export function getSavedFirebaseConfig(): FirebaseConfig | null {
  // 1. Check auto-provisioned firebase-applet-config.json first
  if (appletConfig && appletConfig.apiKey && appletConfig.projectId) {
    return {
      apiKey: appletConfig.apiKey,
      authDomain: appletConfig.authDomain || `${appletConfig.projectId}.firebaseapp.com`,
      projectId: appletConfig.projectId,
      storageBucket: appletConfig.storageBucket || `${appletConfig.projectId}.firebasestorage.app`,
      messagingSenderId: appletConfig.messagingSenderId || '',
      appId: appletConfig.appId || '',
      databaseURL: '',
    };
  }

  // 2. Local storage override
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FIREBASE);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to parse saved firebase config from localStorage', e);
  }

  // 3. Fallback to env if provided
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  const envApiKey = metaEnv.VITE_FIREBASE_API_KEY;
  if (envApiKey) {
    return {
      apiKey: envApiKey,
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: metaEnv.VITE_FIREBASE_APP_ID || '',
      databaseURL: metaEnv.VITE_FIREBASE_DATABASE_URL || '',
    };
  }

  return null;
}

export function isFirebaseConfigured(): boolean {
  const config = getSavedFirebaseConfig();
  return Boolean(config && config.apiKey && config.projectId);
}

export function initFirebaseService(customConfig?: FirebaseConfig): boolean {
  try {
    const config = customConfig || getSavedFirebaseConfig();
    if (!config || !config.apiKey || !config.projectId) {
      return false;
    }

    if (customConfig) {
      localStorage.setItem(STORAGE_KEY_FIREBASE, JSON.stringify(customConfig));
    }

    const apps = getApps();
    if (apps.length > 0) {
      firebaseApp = apps[0];
    } else {
      firebaseApp = initializeApp(config);
    }

    firebaseAuth = getAuth(firebaseApp);
    const dbId = (appletConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
    firestoreDb = dbId ? getFirestore(firebaseApp, dbId) : getFirestore(firebaseApp);
    console.log('🔥 Firebase initialized with Project:', config.projectId, 'DB:', dbId || 'default');
    return true;
  } catch (err) {
    console.warn('⚠️ Firebase init skipped or failed:', err);
    return false;
  }
}

// Initial initialization
initFirebaseService();

export function getFirebaseAuth() {
  if (!firebaseAuth) initFirebaseService();
  return firebaseAuth;
}

export function getFirestoreDb() {
  if (!firestoreDb) initFirebaseService();
  return firestoreDb;
}

export async function ensureAnonymousAuth(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  try {
    const res = await signInAnonymously(auth);
    return res.user;
  } catch (err) {
    console.warn('Anonymous auth failed or disabled, continuing without auth:', err);
    return null;
  }
}

export function formatFirebaseAuthError(error: unknown): string {
  if (!error) return 'An unknown error occurred.';
  const code = (error as { code?: string })?.code || '';
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Unauthorized Domain: This domain is not in your Firebase Authorized Domains list. Please add your Railway/deployed domain in Firebase Console > Authentication > Settings > Authorized domains, or use Email / Guest sign-in.';
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in or use another email.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please check your credentials.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled on this Firebase project yet.';
    default:
      return (error as Error)?.message || 'Authentication failed. Please try again.';
  }
}

export async function loginWithGoogle(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase is not configured.');
  }

  try {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    return res.user;
  } catch (err) {
    throw new Error(formatFirebaseAuthError(err));
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase is not configured.');
  }

  try {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    return res.user;
  } catch (err) {
    throw new Error(formatFirebaseAuthError(err));
  }
}

export async function registerWithEmail(email: string, pass: string): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase is not configured.');
  }

  try {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    return res.user;
  } catch (err) {
    throw new Error(formatFirebaseAuthError(err));
  }
}

export async function logoutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth);
  }
}

/**
 * Recursively removes all undefined values from an object or array so that
 * Firestore setDoc/updateDoc/addDoc does not reject the operation.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

async function writeWithFirestoreFallback<T>(
  callback: (db: Firestore) => Promise<T>,
  fallbackDb?: Firestore | null
): Promise<T> {
  const primaryDb = getFirestoreDb();
  if (!primaryDb) {
    throw new Error('Firestore is not initialized.');
  }

  try {
    return await callback(primaryDb);
  } catch (error) {
    if (fallbackDb && fallbackDb !== primaryDb) {
      return await callback(fallbackDb);
    }
    throw error;
  }
}

function buildStatsOnlyUserRecord(profile: UserProfile): Partial<UserProfile> {
  const {
    wallet,
    lastNgipSalaryClaim,
    ...rest
  } = profile;

  return sanitizeForFirestore({
    ...rest,
    unlockedBadges: profile.unlockedBadges || ['Newbie Artist'],
    stats: profile.stats,
    level: profile.level ?? 1,
    xp: profile.xp ?? 0,
    darkMode: typeof profile.darkMode === 'boolean' ? profile.darkMode : true,
  }) as Partial<UserProfile>;
}

export async function saveProfileToFirestore(profile: UserProfile): Promise<void> {
  const db = getFirestoreDb();
  const fallbackDb = firebaseApp ? getFirestore(firebaseApp) : null;
  if (!db || !profile || !profile.id) return;
  try {
    const userPayload = buildStatsOnlyUserRecord(profile);
    const userRef = doc(db, 'users', profile.id);
    await writeWithFirestoreFallback(async (activeDb) => {
      await setDoc(doc(activeDb, 'users', profile.id), userPayload, { merge: true });
    }, fallbackDb);

    const gamesPlayed = profile.stats?.gamesPlayed || 0;
    const wins = profile.stats?.wins || 0;
    const losses = Math.max(0, gamesPlayed - wins);
    const winRate = gamesPlayed > 0
      ? Math.round((wins / gamesPlayed) * 100)
      : (wins > 0 ? 100 : 0);

    const leaderData: Partial<LeaderboardEntry> & { updatedAt: string; isNgip?: boolean; isAdmin?: boolean; color?: string; drawingsCompleted?: number; losses: number } = {
      userId: profile.id,
      username: profile.username || 'Player',
      avatar: profile.avatar || 'cat',
      color: profile.color || '#3B82F6',
      score: profile.stats?.totalScore || 0,
      wins,
      losses,
      gamesPlayed,
      wordsGuessed: profile.stats?.wordsGuessed || 0,
      drawingsCompleted: profile.stats?.drawingsCompleted || 0,
      winRate,
      level: profile.level || 1,
      isNgip: Boolean(profile.isNgip),
      isAdmin: Boolean(profile.isAdmin),
      lastActive: 'Active now',
      updatedAt: new Date().toISOString(),
    };

    await writeWithFirestoreFallback(async (activeDb) => {
      await setDoc(doc(activeDb, 'leaderboard', profile.id), sanitizeForFirestore(leaderData), { merge: true });
    }, fallbackDb);

    console.log('✅ Firestore profile & Hall of Fame entry successfully saved for:', profile.username);
  } catch (err) {
    console.error('Failed to sync profile to Firestore:', err);
  }
}

export async function fetchProfileFromFirestore(userId: string): Promise<UserProfile | null> {
  const db = getFirestoreDb();
  if (!db || !userId) return null;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch (err) {
    console.warn('Failed to fetch user profile from Firestore:', err);
  }
  return null;
}

export function subscribeToUserProfile(userId: string, callback: (profile: UserProfile | null) => void): () => void {
  const db = getFirestoreDb();
  if (!db || !userId) return () => {};
  try {
    const userRef = doc(db, 'users', userId);
    return onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as UserProfile);
        }
      },
      (err) => {
        console.warn('User profile realtime sync warning:', err);
      }
    );
  } catch (err) {
    console.warn('User profile subscribe error:', err);
    return () => {};
  }
}

export async function fetchFirestoreLeaderboard(): Promise<LeaderboardEntry[] | null> {
  const db = getFirestoreDb();
  const fallbackDb = firebaseApp ? getFirestore(firebaseApp) : null;
  if (!db) return null;
  try {
    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    const results: LeaderboardEntry[] = [];
    let rank = 1;
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as LeaderboardEntry;
      results.push({ ...data, rank: rank++, losses: data.losses ?? Math.max(0, (data.gamesPlayed || 0) - (data.wins || 0)) });
    });
    return results;
  } catch (err) {
    if (fallbackDb && fallbackDb !== db) {
      try {
        const q = query(collection(fallbackDb, 'leaderboard'), orderBy('score', 'desc'), limit(100));
        const querySnapshot = await getDocs(q);
        const results: LeaderboardEntry[] = [];
        let rank = 1;
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as LeaderboardEntry;
          results.push({ ...data, rank: rank++, losses: data.losses ?? Math.max(0, (data.gamesPlayed || 0) - (data.wins || 0)) });
        });
        return results;
      } catch (fallbackErr) {
        console.warn('Firestore leaderboard query fallback failed:', fallbackErr);
      }
    }
    console.warn('Firestore leaderboard query fallback:', err);
    return null;
  }
}

export function subscribeToFirestoreLeaderboard(callback: (entries: LeaderboardEntry[]) => void): () => void {
  const db = getFirestoreDb();
  if (!db) return () => {};
  try {
    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const results: LeaderboardEntry[] = [];
        let rank = 1;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as LeaderboardEntry;
          results.push({ ...data, rank: rank++ });
        });
        callback(results);
      },
      (err) => {
        console.warn('Leaderboard subscription error:', err);
      }
    );
  } catch (err) {
    console.warn('Leaderboard subscription error:', err);
    return () => {};
  }
}

export async function logActivityToFirestore(activity: PlayerActivity): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !activity || !activity.id) return;
  try {
    const actRef = doc(db, 'activities', activity.id);
    await setDoc(actRef, sanitizeForFirestore(activity));
    console.log('✅ Activity logged to Firestore:', activity.title);
  } catch (err) {
    console.warn('Failed to log activity to Firestore:', err);
  }
}

export async function fetchFirestoreActivities(limitCount: number = 30): Promise<PlayerActivity[]> {
  const db = getFirestoreDb();
  if (!db) return [];
  try {
    const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    const results: PlayerActivity[] = [];
    snap.forEach((docSnap) => {
      results.push(docSnap.data() as PlayerActivity);
    });
    return results;
  } catch (err) {
    console.warn('Failed to fetch activities from Firestore:', err);
    return [];
  }
}

export function subscribeToFirestoreActivities(callback: (activities: PlayerActivity[]) => void): () => void {
  const db = getFirestoreDb();
  if (!db) return () => {};
  try {
    const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(40));
    return onSnapshot(
      q,
      (snapshot) => {
        const results: PlayerActivity[] = [];
        snapshot.forEach((docSnap) => {
          results.push(docSnap.data() as PlayerActivity);
        });
        callback(results);
      },
      (err) => {
        console.warn('Activities subscription note:', err);
      }
    );
  } catch (err) {
    console.warn('Activities subscription error:', err);
    return () => {};
  }
}

// Fetch all registered/active user accounts for Admin Panel
export async function fetchAllUsersFromFirestore(): Promise<UserProfile[]> {
  const db = getFirestoreDb();
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'users'));
    const results: UserProfile[] = [];
    snap.forEach((docSnap) => {
      results.push(docSnap.data() as UserProfile);
    });
    return results;
  } catch (err) {
    console.warn('Failed to fetch all users from Firestore:', err);
    return [];
  }
}

// Real-time subscription to all user accounts for Admin Panel
export function subscribeToAllUsersFromFirestore(callback: (users: UserProfile[]) => void): () => void {
  const db = getFirestoreDb();
  if (!db) return () => {};
  try {
    const q = collection(db, 'users');
    return onSnapshot(
      q,
      (snapshot) => {
        const results: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          results.push(docSnap.data() as UserProfile);
        });
        callback(results);
      },
      (err) => {
        console.warn('Users collection subscription error:', err);
      }
    );
  } catch (err) {
    console.warn('Users subscription error:', err);
    return () => {};
  }
}

// Admin update user document in Firestore (e.g. grant/revoke งip, modify level, stats)
export async function adminUpdateUserProfileInFirestore(userId: string, updates: Partial<UserProfile>): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !userId) return;
  try {
    const { wallet, lastNgipSalaryClaim, unlockedBadges, ...safeUpdates } = updates;
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, sanitizeForFirestore(safeUpdates), { merge: true });

    // Keep Firestore limited to player records + leaderboard stats only.
    const leaderRef = doc(db, 'leaderboard', userId);
    const leaderUpdates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (safeUpdates.username !== undefined) leaderUpdates.username = safeUpdates.username;
    if (safeUpdates.avatar !== undefined) leaderUpdates.avatar = safeUpdates.avatar;
    if (safeUpdates.level !== undefined) leaderUpdates.level = safeUpdates.level;
    if (safeUpdates.isNgip !== undefined) leaderUpdates.isNgip = safeUpdates.isNgip;
    if (safeUpdates.stats?.totalScore !== undefined) leaderUpdates.score = safeUpdates.stats.totalScore;
    if (safeUpdates.stats?.wins !== undefined) leaderUpdates.wins = safeUpdates.stats.wins;

    await setDoc(leaderRef, sanitizeForFirestore(leaderUpdates), { merge: true });
    console.log(`✅ Admin updated Firestore user [${userId}] successfully.`);
  } catch (err) {
    console.error('Failed to admin update profile in Firestore:', err);
    throw err;
  }
}

// Master Admin: Reset all users' career stats (Wins, Losses, Matches, Points, Winrate) & Purge all legacy currencies/wallets
export async function adminResetAllUsersStatsInFirestore(): Promise<number> {
  const db = getFirestoreDb();
  if (!db) return 0;
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    let count = 0;

    const zeroStats = {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      totalScore: 0,
      wordsGuessed: 0,
      drawingsCompleted: 0,
      highestRoundScore: 0,
      unoWins: 0,
      unoCardsPlayed: 0,
      bombsDefused: 0,
      pixelsGuessed: 0,
      blindfoldScores: 0,
      currentStreak: 0,
      bestStreak: 0,
    };

    const updatePromises: Promise<void>[] = [];

    usersSnap.forEach((userDoc) => {
      const uId = userDoc.id;
      const data = userDoc.data() as Partial<UserProfile>;
      count++;

      // User document reset
      const userRef = doc(db, 'users', uId);
      const userResetPromise = setDoc(
        userRef,
        {
          stats: zeroStats,
          level: 1,
          xp: 0,
          wallet: deleteField(),
          lastNgipSalaryClaim: deleteField(),
          totalBetsWon: deleteField(),
          totalBetsPlaced: deleteField(),
        },
        { merge: true }
      );
      updatePromises.push(userResetPromise);

      // Leaderboard document reset
      const leaderRef = doc(db, 'leaderboard', uId);
      const leaderResetPromise = setDoc(
        leaderRef,
        {
          score: 0,
          wins: 0,
          losses: 0,
          gamesPlayed: 0,
          winRate: 0,
          drawingsCompleted: 0,
          level: 1,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      updatePromises.push(leaderResetPromise);
    });

    await Promise.all(updatePromises);
    console.log(`✅ Master Admin reset career stats for ${count} users in Firestore.`);
    return count;
  } catch (err) {
    console.error('Failed to reset all users stats in Firestore:', err);
    throw err;
  }
}

/**
 * Permanently delete a user account from Firestore (users collection and leaderboard collection)
 * and attempt deletion of Firebase Auth credentials if active.
 */
export async function deleteUserAccountFromFirestore(userId: string): Promise<void> {
  const db = getFirestoreDb();
  const fallbackDb = firebaseApp ? getFirestore(firebaseApp) : null;
  const auth = getFirebaseAuth();

  console.log(`🗑️ Deleting user account [${userId}] from Firebase...`);

  // 1. Delete from Firestore 'users' collection
  if (db && userId) {
    try {
      await writeWithFirestoreFallback(async (activeDb) => {
        await deleteDoc(doc(activeDb, 'users', userId));
      }, fallbackDb);
      console.log(`✅ User document deleted from Firestore users/${userId}`);
    } catch (err) {
      console.warn(`Firestore user document deletion warning:`, err);
    }
  }

  // 2. Delete from Firestore 'leaderboard' collection
  if (db && userId) {
    try {
      await writeWithFirestoreFallback(async (activeDb) => {
        await deleteDoc(doc(activeDb, 'leaderboard', userId));
      }, fallbackDb);
      console.log(`✅ User entry deleted from Firestore leaderboard/${userId}`);
    } catch (err) {
      console.warn(`Firestore leaderboard document deletion warning:`, err);
    }
  }

  // 3. Delete Firebase Auth user if currently logged in with matching uid
  if (auth && auth.currentUser && auth.currentUser.uid === userId) {
    try {
      await deleteUser(auth.currentUser);
      console.log(`✅ Firebase Auth user credentials deleted for uid [${userId}]`);
    } catch (authErr) {
      console.warn(`Firebase Auth deleteUser warning:`, authErr);
      try {
        await signOut(auth);
      } catch (signOutErr) {
        console.warn(`Firebase Auth signOut warning:`, signOutErr);
      }
    }
  }

  // 4. Remove cached credentials from localStorage
  try {
    localStorage.removeItem('guess_what_current_user');
  } catch (storageErr) {
    console.warn('LocalStorage cleanup error:', storageErr);
  }
}

/**
 * Admin action: delete any user record from Firestore users and leaderboard collections.
 */
export async function adminDeleteUserFromFirestore(userId: string): Promise<void> {
  const db = getFirestoreDb();
  const fallbackDb = firebaseApp ? getFirestore(firebaseApp) : null;
  if (!db || !userId) return;

  try {
    // Delete from users
    await writeWithFirestoreFallback(async (activeDb) => {
      await deleteDoc(doc(activeDb, 'users', userId));
    }, fallbackDb);

    // Delete from leaderboard
    await writeWithFirestoreFallback(async (activeDb) => {
      await deleteDoc(doc(activeDb, 'leaderboard', userId));
    }, fallbackDb);

    console.log(`✅ Admin deleted user [${userId}] from Firestore users and leaderboard.`);
  } catch (err) {
    console.error(`Failed to admin delete user [${userId}] from Firestore:`, err);
    throw err;
  }
}

/**
 * Check whether a requested username is already taken by any other player across Firestore users and leaderboard.
 */
export async function checkUsernameAvailability(
  username: string,
  excludeUserId?: string
): Promise<{ available: boolean; reason?: string }> {
  const clean = username.trim();
  if (!clean) {
    return { available: false, reason: 'Username cannot be empty.' };
  }
  if (clean.length < 2) {
    return { available: false, reason: 'Username must be at least 2 characters.' };
  }
  if (clean.length > 20) {
    return { available: false, reason: 'Username cannot exceed 20 characters.' };
  }

  const db = getFirestoreDb();
  if (!db) {
    return { available: true };
  }

  try {
    const targetLower = clean.toLowerCase();

    // 1. Check users collection
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const docSnap of usersSnap.docs) {
      if (excludeUserId && docSnap.id === excludeUserId) continue;
      const data = docSnap.data();
      const existingName = (data.username || '').toString().trim().toLowerCase();
      if (existingName === targetLower) {
        return {
          available: false,
          reason: `The username "${clean}" is already taken by another player. Please choose a different unique username.`,
        };
      }
    }

    // 2. Check leaderboard collection
    const leaderSnap = await getDocs(collection(db, 'leaderboard'));
    for (const docSnap of leaderSnap.docs) {
      if (excludeUserId && docSnap.id === excludeUserId) continue;
      const data = docSnap.data();
      const existingName = (data.username || '').toString().trim().toLowerCase();
      if (existingName === targetLower) {
        return {
          available: false,
          reason: `The username "${clean}" is already taken by another player on the leaderboard. Please choose a different unique username.`,
        };
      }
    }
  } catch (err) {
    console.warn('Username uniqueness check against Firestore warning:', err);
  }

  return { available: true };
}




