// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAKCcte2Jd6Ckw2FJTIQy5uqskpE35YtvA", // Tes clés
  authDomain: "suivi-investissements-9e9ea.firebaseapp.com",
  projectId: "suivi-investissements-9e9ea",
  storageBucket: "suivi-investissements-9e9ea.appspot.com",
  messagingSenderId: "951926367732",
  appId: "1:951926367732:web:7f6a707173663748281f6c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);