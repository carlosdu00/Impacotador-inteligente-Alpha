//SRC/PAGES/SIGNIN/INDEX.TSX

import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { AuthContext } from "../../context/auth";

type RootStackParamList = {
  SignUp: undefined;
  // Adicione outras rotas aqui se houver
};

export default function SignIn() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { signIn, loadingAuth } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin() {
    if (email && password) {
      signIn(email, password);
    } else {
      Alert.alert("Erro", "Preencha todos os campos");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Seu email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Sua senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        {loadingAuth ? (
          <ActivityIndicator size={20} color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: { fontSize: 24, marginBottom: 20 },
  input: {
    width: "100%",
    padding: 10,
    marginBottom: 10,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
  },
  button: {
    backgroundColor: "#3b3dbf",
    padding: 15,
    width: "100%",
    alignItems: "center",
    borderRadius: 8,
  },
  buttonText: { color: "#FFF", fontWeight: "bold" },
  linkText: { marginTop: 15, color: "#3b3dbf" },
});
