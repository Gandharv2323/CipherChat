// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "studio-7492326193-49158",
  "appId": "1:356996875902:web:4baed8a05bd08533cc3a2f",
  "apiKey": "AIzaSyArt_8wyO1ZTcDnL2forODvY21rm8Cefc0",
  "authDomain": "studio-7492326193-49158.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "356996875902"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { db };
