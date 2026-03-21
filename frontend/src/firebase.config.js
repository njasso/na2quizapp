// src/services/firebase.config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfFdt9gkQHjqRxAhTBu0CTbDdBQ3jKtTE",
  authDomain: "na2quizapp-6b74a.firebaseapp.com",
  projectId: "na2quizapp-6b74a",
  storageBucket: "na2quizapp-6b74a.firebasestorage.app",
  messagingSenderId: "110588338490",
  appId: "1:110588338490:web:3c5ea1e99dbe00e647b003"

};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db }; // Exporter seulement ce qui est utilisé
