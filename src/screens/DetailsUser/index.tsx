import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { StackNavigationRoutes } from "../../../App";
import { Text, Button, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { UserOutput } from "../../types/user";
import React, { useEffect, useState } from "react";
import ScreenBase from "../../components/ScreenBase";
import Service from "../../services/usersApi";

type DetailsUserScreenRouteProp = RouteProp<
  StackNavigationRoutes,
  "DetailsUser"
>;

type DetailsUserScreenProps = {
  route: DetailsUserScreenRouteProp;
};

type DetailsUserNavigationProp = StackNavigationProp<
  StackNavigationRoutes,
  "DetailsUser"
>;

export const DetailsUser: React.FC<DetailsUserScreenProps> = ({ route }) => {
  const [user, setUser] = useState<UserOutput | null>(null);
  const navigation = useNavigation<DetailsUserNavigationProp>(); // Aqui tipamos a navegação corretamente

  useEffect(() => {
    const fetchUser = async () => {
      await Service.GetUser(route.params.id).then((user) => {
        setUser(user);
      });
    };
    fetchUser();
  }, []);

  if (route.params.id === 0 || !user) {
    return (
      <ScreenBase>
        <Text>Usuário não encontrado</Text>
      </ScreenBase>
    );
  }

  return (
    <ScreenBase marginTop={0}>
      <View
        style={{ flex: 1, justifyContent: "center", width: 200, height: 200 }}
      >
        <Text>Id: {user.id}</Text>
        <Text>Nome: {user.name}</Text>
        <Text>Email: {user.email}</Text>
        <Text>Login: {user.login}</Text>
        <Text>Senha: {user.password}</Text>
        <Text>Cidade: {user.city}</Text>
        <Button
          title="Editar"
          onPress={() => navigation.navigate("EditUser", { id: user.id })}
        />
      </View>
    </ScreenBase>
  );
};
