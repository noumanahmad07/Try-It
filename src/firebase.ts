// Import functions you need from SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDGmdEe_2WPnTYjxOCkiY-OrnMcMubO7Dk",
  authDomain: "zephora-virtual-tryon-app.firebaseapp.com",
  projectId: "zephora-virtual-tryon-app",
  storageBucket: "zephora-virtual-tryon-app.firebasestorage.app",
  messagingSenderId: "756760275110",
  appId: "1:756760275110:web:906d2ec2d283002a19ac67",
  measurementId: "G-J3YSWLJC24",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google Provider
googleProvider.setCustomParameters({
  prompt: "select_account",
  access_type: "offline",
});

// Add additional scopes if needed
googleProvider.addScope("email");
googleProvider.addScope("profile");

// Note: auth.settings is read-only in newer Firebase versions

export default app;
