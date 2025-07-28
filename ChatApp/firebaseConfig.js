// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyByR4YAYtirlUU6e9cdCcAbLQ08Pzx_FYE",
  authDomain: "tutorx-f42dc.firebaseapp.com",
  projectId: "tutorx-f42dc",
  storageBucket: "tutorx-f42dc.firebasestorage.app",
  messagingSenderId: "157138184811",
  appId: "1:157138184811:web:7fd8d9600c59e69ffc5f2e",
  measurementId: "G-SND24PRNWX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db= getFirestore(app);

export default app;