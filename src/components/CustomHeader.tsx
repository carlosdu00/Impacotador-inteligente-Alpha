// src/components/CustomHeader.tsx

import React, { useContext } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { AuthContext } from "../context/auth";

type CustomHeaderProps = {
  marginTop?: number;
};

export default function CustomHeader({ marginTop = 40 }: CustomHeaderProps) {
  const { signOut } = useContext(AuthContext);

  return (
    <View style={{ ...styles.container, marginTop }}>
      <Text style={styles.text}>Projeto</Text>
      <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1b2838",
    height: 120,
    paddingHorizontal: 20,
    alignSelf: "stretch", // Garante que ocupe toda a largura da tela
  },
  text: {
    color: "white",
    fontSize: 18,
    marginBottom: 10,
  },
  logoutButton: {
    backgroundColor: "#ff4d4d",
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 5,
    width: "100%",
  },
  logoutText: {
    color: "white",
    fontWeight: "bold",
  },
});
