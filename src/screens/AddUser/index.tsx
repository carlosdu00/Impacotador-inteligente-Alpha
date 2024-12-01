import { Picker } from "@react-native-picker/picker";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { StackNavigationRoutes } from "../../../App";
import { useNavigation } from "@react-navigation/native";
import { UserInput } from "../../types/user";
import { View, Button, TextInput, StyleSheet } from "react-native";
import React, { useState } from "react";
import ScreenBase from "../../components/ScreenBase";
import Service from "../../services/usersApi";

type AddUserScreenRouteProp = RouteProp<StackNavigationRoutes, "AddUser">;

type AddUserScreenProps = {
  route: AddUserScreenRouteProp;
};

type AddUserNavigationProp = StackNavigationProp<
  StackNavigationRoutes,
  "AddUser"
>;

export const AddUser: React.FC<AddUserScreenProps> = ({ route }) => {
  const [user, setUser] = useState<UserInput>({
    name: "",
    email: "",
    login: "",
    password: "",
    city: "Santa Maria",
  });
  const navigation = useNavigation<AddUserNavigationProp>();

  const saveUser = async () => {
    if (
      user.name === "" ||
      user.email === "" ||
      user.login === "" ||
      user.password === "" ||
      user.city === ""
    )
      return window.alert("Complete todas as informações do usuário.");
    const newUser = await Service.AddUser(user);
    if (newUser.id != 0) {
      window.alert("Usuário criado com sucesso.");
      navigation.navigate("Home");
    }
  };

  return (
    <ScreenBase marginTop={0}>
      <View style={styles.container}>
        <TextInput
          id="name"
          placeholder="Nome"
          onChangeText={(e) => setUser({ ...user, name: e })}
          style={styles.input}
        />
        <TextInput
          id="email"
          placeholder="Email"
          onChangeText={(e) => setUser({ ...user, email: e })}
          style={styles.input}
        />
        <TextInput
          id="login"
          placeholder="Login"
          onChangeText={(e) => setUser({ ...user, login: e })}
          style={styles.input}
        />
        <TextInput
          id="password"
          placeholder="Senha"
          onChangeText={(e) => setUser({ ...user, password: e })}
          style={styles.input}
        />
        <Picker
          onValueChange={(itemValue, _) => {
            setUser({ ...user, city: itemValue });
          }}
          placeholder="Cidade"
          selectedValue={user.city}
          style={styles.picker}
        >
          <Picker.Item label="Santa Maria" value="Santa Maria" />
          <Picker.Item label="Recanto Maestro" value="Recanto Maestro" />
          <Picker.Item label="Restinga" value="Restinga" />
          <Picker.Item label="Faxinal" value="Faxinal" />
          <Picker.Item label="Nova Palma" value="Nova Palma" />
        </Picker>
        <Button title="Salvar Usuário" onPress={saveUser} />
      </View>
    </ScreenBase>
  );
};

const styles = StyleSheet.create({
  picker: {
    width: 250,
  },
  input: {
    width: 100,
    height: 50,
  },
  container: {
    flex: 1,
    gap: 15,
  },
});
