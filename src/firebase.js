import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBDWQVihQ8IwPaUvSIFOK4xhpuD8N5xkGo",
  authDomain: "examen-react-2026.firebaseapp.com",
  projectId: "examen-react-2026",
  storageBucket: "examen-react-2026.firebasestorage.app",
  messagingSenderId: "1034837524422",
  appId: "1:1034837524422:web:30cebed3f5e241fc77fcc7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);