import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export interface UserProfile {
  displayName: string;
  photoURL?: string;
  highScore: number;
  lastPlayed?: Timestamp;
}

export interface HighScoreEntry {
  userId: string;
  displayName: string;
  score: number;
  stage: number;
  timestamp: Timestamp;
}

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, path);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const syncUserProfile = async (userId: string, data: Partial<UserProfile>) => {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, path);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      await updateDoc(docRef, {
        ...data,
        lastPlayed: serverTimestamp()
      });
    } else {
      await setDoc(docRef, {
        displayName: data.displayName || 'Anonymous',
        photoURL: data.photoURL || '',
        highScore: data.highScore || 0,
        lastPlayed: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const saveHighScore = async (entry: Omit<HighScoreEntry, 'timestamp'>) => {
  const path = 'highScores';
  try {
    await addDoc(collection(db, path), {
      ...entry,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getTopScores = async (count: number = 10): Promise<HighScoreEntry[]> => {
  const path = 'highScores';
  try {
    const q = query(collection(db, path), orderBy('score', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as HighScoreEntry);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};
