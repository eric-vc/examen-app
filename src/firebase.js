import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBDWQVihQ8IwPaUvSIFOK4xhpuD8N5xkGo",
  authDomain: "examen-react-2026.firebaseapp.com",
  projectId: "examen-react-2026",
  storageBucket: "examen-react-2026.firebasestorage.app",
  messagingSenderId: "1034837524422",
  appId: "1:1034837524422:web:30cebed3f5e241fc77fcc7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exportar base de datos
export const db = getFirestore(app);

// 2. EXPORTAR LA AUTENTICACIÓN (ESTO ES LO QUE FALTA)
export const auth = getAuth(app);