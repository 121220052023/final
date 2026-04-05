// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAiN1O7vPL9V3IQvL82thHq5xXX7nxXrCw",
  authDomain: "ocean-of-movies.firebaseapp.com",
  projectId: "ocean-of-movies",
  storageBucket: "ocean-of-movies.firebasestorage.app",
  messagingSenderId: "188570633807",
  appId: "1:188570633807:web:25d56a87cdf36a26a80c3a",
  measurementId: "G-JTP5HD72SH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, analytics };
