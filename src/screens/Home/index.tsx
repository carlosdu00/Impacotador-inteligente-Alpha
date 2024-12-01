import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { StackNavigationRoutes } from "../../../App";
import { useNavigation } from "@react-navigation/native";
import { UserOutput } from "../../types/user";
import ScreenBase from "../../components/ScreenBase";
import Service from "../../services/usersApi";
import UserCard from "../../components/UserCard";

type HomeScreenRouteProp = RouteProp<StackNavigationRoutes, "Home">;

type HomeScreenProps = {
  route: HomeScreenRouteProp;
};

export type HomeNavigationProp = StackNavigationProp<
  StackNavigationRoutes,
  "Home"
>;

export type UserInfoToDelete = {
  id: number;
  name: string;
};

export const Home: React.FC<HomeScreenProps> = ({ route }) => {
  const [users, setUsers] = useState<UserOutput[]>([]);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [userInfoToDelete, setUserInfoToDelete] =
    useState<UserInfoToDelete | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const navigation = useNavigation<HomeNavigationProp>();

  const fetchUsers = async () => {
    if (!loading) setLoading(true);
    await Service.ListUsers().then((result) => {
      setUsers(result);
    });
    setLoading(false);
  };

  // UseEffect para atualizar a lista ao abrir o modal
  useEffect(() => {
    fetchUsers();
  }, [openModal]);

  // UseFocusEffect para atualizar a lista ao voltar para a tela Home
  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [])
  );

  const deleteUser = async (id: number) => {
    const message = await Service.DeleteUser(id);
    window.alert(message);
    setOpenModal(false);
    await fetchUsers(); // Atualiza a lista após deletar o usuário
  };

  return (
    <ScreenBase>
      <Modal
        visible={openModal}
        animationType="fade"
        transparent
        onRequestClose={() => setOpenModal(false)}
      >
        <View style={styles.modal}>
          <Text>
            Você têm certeza que deseja deletar o usuário{" "}
            {userInfoToDelete?.name ?? "..."}?
          </Text>
          {userInfoToDelete ? (
            <>
              <Button
                title="Sim"
                onPress={() => deleteUser(userInfoToDelete.id)}
              />
              <Button title="Não" onPress={() => setOpenModal(false)} />
            </>
          ) : (
            <></>
          )}
        </View>
      </Modal>
      <ScrollView
        style={styles.users}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchUsers} />
        }
      >
        {users.length > 0 ? (
          users.map((user, i) => (
            <UserCard
              user={user}
              key={i}
              setOpenModal={setOpenModal}
              enableButtons={!openModal}
              setUserInfoToDelete={setUserInfoToDelete}
            />
          ))
        ) : (
          <Text>Nenhum usuário cadastrado</Text>
        )}
      </ScrollView>
      <Button
        title="Criar usuário"
        onPress={() => navigation.navigate("AddUser")}
      />
    </ScreenBase>
  );
};

const styles = StyleSheet.create({
  users: {
    alignSelf: "stretch",
  },
  modal: {
    flex: 0,
    justifyContent: "center",
    alignContent: "center",
    alignSelf: "center",
    gap: 5,
    backgroundColor: "grey",
    width: 200,
    padding: 15,
  },
});
