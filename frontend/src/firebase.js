import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyCfFdt9gkQHjqRxAhTBu0CTbDdBQ3jKtTE",
  authDomain: "na2quizapp-6b74a.firebaseapp.com",
  projectId: "na2quizapp-6b74a",
  storageBucket: "na2quizapp-6b74a.firebasestorage.app",
  messagingSenderId: "110588338490",
  appId: "1:110588338490:web:3c5ea1e99dbe00e647b003"

};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export default app;