import { Picker } from "@react-native-picker/picker";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { StackNavigationRoutes } from "../../../App";
import { useNavigation } from "@react-navigation/native";
import { UserOutput } from "../../types/user";
import { View, Text, Button, StyleSheet, TextInput } from "react-native";
import React, { useEffect, useState } from "react";
import ScreenBase from "../../components/ScreenBase";
import Service from "../../services/usersApi";

type EditUserScreenRouteProp = RouteProp<StackNavigationRoutes, "EditUser">;

type EditUserScreenProps = {
  route: EditUserScreenRouteProp;
};

type EditUserNavigationProp = StackNavigationProp<
  StackNavigationRoutes,
  "EditUser"
>;

export const EditUser: React.FC<EditUserScreenProps> = ({ route }) => {
  const [user, setUser] = useState<UserOutput>({
    id: 0,
    name: "",
    email: "",
    login: "",
    password: "",
    city: "",
  });
  const [loading, setLoading] = useState<boolean>(true);
  const navigation = useNavigation<EditUserNavigationProp>();

  useEffect(() => {
    const fetchUser = async () => {
      await Service.GetUser(route.params.id).then((user) => {
        setUser(user);
        setLoading(false);
      });
    };
    fetchUser();
  }, []);

  const updateUser = async () => {
    if (
      user.name === "" ||
      user.email === "" ||
      user.login === "" ||
      user.password === "" ||
      user.city === ""
    )
      return window.alert("Complete todas as informações do usuário.");
    const message = await Service.UpdateUser(user);
    window.alert(message);
    navigation.navigate("DetailsUser", { id: user.id });
  };

  if (loading) {
    return (
      <ScreenBase>
        <Text>Carregando...</Text>
      </ScreenBase>
    );
  }

  return (
    <ScreenBase marginTop={0}>
      <View style={styles.container}>
        <TextInput
          id="name"
          placeholder="Nome"
          value={user.name}
          onChangeText={(e) => setUser({ ...user, name: e })}
          style={styles.input}
        />
        <TextInput
          id="email"
          placeholder="Email"
          value={user.email}
          onChangeText={(e) => setUser({ ...user, email: e })}
          style={styles.input}
        />
        <TextInput
          id="login"
          placeholder="Login"
          value={user.login}
          onChangeText={(e) => setUser({ ...user, login: e })}
          style={styles.input}
        />
        <TextInput
          id="password"
          placeholder="Senha"
          value={user.password}
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
          <Picker.Item
            label="Santa Maria"
            value="Santa Maria"
            style={styles.picker}
          />
          <Picker.Item label="Recanto Maestro" value="Recanto Maestro" />
          <Picker.Item label="Restinga" value="Restinga" />
          <Picker.Item label="Faxinal" value="Faxinal" />
          <Picker.Item label="Nova Palma" value="Nova Palma" />
        </Picker>
        <Button title="Salvar Usuário" onPress={updateUser} />
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
