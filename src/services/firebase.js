import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

// Configuración de Firebase (Se pueden actualizar con tus claves reales)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "TU_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "TU_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "TU_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "TU_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "TU_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "TU_APP_ID"
};

// Verifica si la configuración contiene claves reales o valores por defecto
export const isFirebaseConfigured = () => {
  return (
    Boolean(firebaseConfig.apiKey) &&
    firebaseConfig.apiKey !== 'TU_API_KEY' &&
    Boolean(firebaseConfig.projectId) &&
    firebaseConfig.projectId !== 'TU_PROJECT_ID'
  );
};

let app = null;
let auth = null;
let db = null;
let storage = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (err) {
    console.warn('Advertencia al inicializar Firebase:', err);
  }
}

// ==========================================
// AUTENTICACIÓN
// ==========================================

export async function loginUser(email, password) {
  if (isFirebaseConfigured() && auth) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      isAnonymous: false,
    };
  }

  // Fallback Local / Modo Demo si aún no se configuraron claves
  const localUser = {
    uid: `user_${btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12)}`,
    email: email,
    isAnonymous: false,
  };
  localStorage.setItem('lector_current_user', JSON.stringify(localUser));
  return localUser;
}

export async function registerUser(email, password) {
  if (isFirebaseConfigured() && auth) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      isAnonymous: false,
    };
  }

  // Fallback Local
  const localUser = {
    uid: `user_${btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12)}`,
    email: email,
    isAnonymous: false,
  };
  localStorage.setItem('lector_current_user', JSON.stringify(localUser));
  return localUser;
}

export async function logoutUser() {
  if (isFirebaseConfigured() && auth) {
    await firebaseSignOut(auth);
  }
  localStorage.removeItem('lector_current_user');
}

export function subscribeAuth(callback) {
  if (isFirebaseConfigured() && auth) {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        callback({
          uid: user.uid,
          email: user.email,
          isAnonymous: user.isAnonymous,
        });
      } else {
        const saved = localStorage.getItem('lector_current_user');
        callback(saved ? JSON.parse(saved) : null);
      }
    });
  }

  // Si no hay Firebase activo, verificar localStorage
  const saved = localStorage.getItem('lector_current_user');
  callback(saved ? JSON.parse(saved) : null);
  return () => {};
}

// ==========================================
// ALMACENAMIENTO Y LIBROS EN LA NUBE (STORAGE + FIRESTORE)
// ==========================================

export async function uploadBookToCloud(fileBlob, metadata, userId) {
  if (!isFirebaseConfigured() || !db || !storage || !userId) {
    // Si no hay Firebase activo, el almacenamiento ya se guarda localmente en IndexedDB
    return null;
  }

  try {
    const cleanFileName = (metadata.title || 'libro')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 40);
    const fileRef = ref(storage, `books/${userId}/${Date.now()}_${cleanFileName}`);

    await uploadBytes(fileRef, fileBlob);
    const downloadUrl = await getDownloadURL(fileRef);

    const docRef = await addDoc(collection(db, 'books'), {
      userId,
      name: metadata.title || 'Libro sin título',
      author: metadata.author || 'Autor desconocido',
      format: metadata.format || 'epub',
      url: downloadUrl,
      progress: metadata.progress || 0,
      totalPages: metadata.totalPages || 0,
      createdAt: serverTimestamp(),
    });

    return { id: docRef.id, url: downloadUrl };
  } catch (err) {
    console.error('Error al subir libro a Firebase:', err);
    throw err;
  }
}

export async function fetchUserCloudBooks(userId) {
  if (!isFirebaseConfigured() || !db || !userId) {
    return [];
  }

  try {
    const q = query(
      collection(db, 'books'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('Error al obtener libros de Firestore:', err);
    return [];
  }
}

export { auth, db, storage };
