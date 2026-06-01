/**
 * firebase.js
 * Inicialización de Firebase y exportación de utilidades de autenticación.
 * Las credenciales se leen exclusivamente de variables de entorno (VITE_*).
 * Nunca hardcodees una API key aquí.
 */

import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

// Configuración inyectada por Vite desde el archivo .env (nunca en el repo)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar instancias reutilizables
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Inicia sesión con Google mediante popup.
 * @returns {Promise<import("firebase/auth").UserCredential>}
 */
export async function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

/**
 * Cierra la sesión del usuario actual.
 * @returns {Promise<void>}
 */
export async function logout() {
  return signOut(auth);
}

/**
 * Suscribe un callback a cambios en el estado de autenticación.
 * @param {function} callback - Se llama con el usuario o null.
 * @returns {function} Función de limpieza para cancelar la suscripción.
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Obtiene el ID Token del usuario actual (necesario para llamar la Cloud Function).
 * @returns {Promise<string|null>} Token o null si no hay sesión.
 */
export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
