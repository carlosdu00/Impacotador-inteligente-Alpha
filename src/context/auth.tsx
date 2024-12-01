// src/context/auth.tsx
import React, { createContext, useState, useEffect, ReactNode } from "react";
import { Alert } from "react-native";
import api from "../services/api";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Ajuste na interface User para refletir todos os campos
interface User {
  email: string;
  name: string;
  login: string;
  city: string;
}

interface AuthContextData {
  signed: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  signUp: (
    email: string,
    password: string,
    name: string,
    city: string
  ) => Promise<void>;
  loadingAuth: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation<NavigationProp<any>>();

  useEffect(() => {
    async function loadStorage() {
      const storageUser = await AsyncStorage.getItem("@authToken");
      const storedUserString = await AsyncStorage.getItem("@user");

      if (storageUser && storedUserString) {
        setUser(JSON.parse(storedUserString));
        setLoading(false);
      } else {
        setLoading(false);
      }
    }

    setLoading(true);
    loadStorage();
  }, []);

  async function signIn(email: string, password: string) {
    setLoadingAuth(true);
    try {
      const response = await api.post("auth/login", { email, password });
      const { token, name, login, city } = response.data; // Inclui login
      const user = { email, name, login, city };

      await AsyncStorage.setItem("@authToken", token);
      await AsyncStorage.setItem("@user", JSON.stringify(user));
      setUser(user);

      api.defaults.headers["Authorization"] = `Bearer ${token}`;
      setLoadingAuth(false);
    } catch (err) {
      Alert.alert("E-mail ou senha incorretos!");
      setLoadingAuth(false);
    }
  }

  async function signUp(
    email: string,
    password: string,
    name: string,
    city: string
  ) {
    setLoadingAuth(true);
    try {
      await api.post("auth/signup", { email, password, name, city });
      Alert.alert("Usuário registrado com sucesso!");
      setLoadingAuth(false);
      navigation.navigate("SignIn");
    } catch (err) {
      Alert.alert("Erro ao registrar o usuário!");
      setLoadingAuth(false);
    }
  }

  async function signOut() {
    await AsyncStorage.clear().then(() => {
      setUser(null);
      navigation.navigate("SignIn");
    });
  }

  return (
    <AuthContext.Provider
      value={{
        signed: !!user,
        user,
        signIn,
        signOut,
        signUp,
        loadingAuth,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
