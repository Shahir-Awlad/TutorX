// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDoMTpgDicU48qssErrN4P77_mCp__VW4Q",
  authDomain: "tutorx-aa879.firebaseapp.com",
  projectId: "tutorx-aa879",
  storageBucket: "tutorx-aa879.firebasestorage.app",
  messagingSenderId: "896218248502",
  appId: "1:896218248502:web:faa67fb7ba230e980e2f97"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);

export { auth, db };
