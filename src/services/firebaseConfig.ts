import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import {
  EXPO_FIREBASE_API_KEY,
  EXPO_FIREBASE_AUTH_DOMAIN,
  EXPO_FIREBASE_DATABASE_URL,
  EXPO_FIREBASE_PROJECT_ID,
  EXPO_FIREBASE_STORAGE_BUCKET,
  EXPO_FIREBASE_MESSAGING_SENDER_ID,
  EXPO_FIREBASE_APP_ID
} from '@env';

const firebaseConfig = {
  apiKey: EXPO_FIREBASE_API_KEY,
  authDomain: EXPO_FIREBASE_AUTH_DOMAIN,
  databaseURL: EXPO_FIREBASE_DATABASE_URL,
  projectId: EXPO_FIREBASE_PROJECT_ID,
  storageBucket: EXPO_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: EXPO_FIREBASE_MESSAGING_SENDER_ID,
  appId: EXPO_FIREBASE_APP_ID,
};

// Inicializa o Firebase apenas se ainda não houver uma instância inicializada
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
export default firebase;