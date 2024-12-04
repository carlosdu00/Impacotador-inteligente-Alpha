// firebaseConfig.ts

import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// Substitua pelos valores do seu objeto firebaseConfig
const firebaseConfig = {
  apiKey: "AIzaSyBpYdH3aL353T4zutMaSA6wUMTniTwbii4",
  authDomain: "empacotador-inteligente.firebaseapp.com",
  databaseURL: "https://empacotador-inteligente-default-rtdb.firebaseio.com",
  projectId: "empacotador-inteligente",
  storageBucket: "empacotador-inteligente.firebasestorage.app",
  messagingSenderId: "1094951758398",
  appId: "1:1094951758398:web:d755ef4477415c07697f6f"
};

// Inicializa o Firebase apenas se ainda não houver uma instância inicializada
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export default firebase;
