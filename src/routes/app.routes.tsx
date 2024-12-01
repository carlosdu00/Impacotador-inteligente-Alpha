// SRC/ROUTES/APP.ROUTES.TSX

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { Home } from "../screens/Home";
import { DetailsUser } from "../screens/DetailsUser";
import { EditUser } from "../screens/EditUser";
import { AddUser } from "../screens/AddUser";

export type StackNavigationRoutes = {
  Home: undefined;
  AddUser: undefined;
  EditUser: { id: number };
  DetailsUser: { id: number };
};

const AppStack = createNativeStackNavigator<StackNavigationRoutes>();

function AppRoutes() {
  return (
    <AppStack.Navigator initialRouteName="Home">
      <AppStack.Screen
        name="Home"
        component={Home}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="AddUser"
        component={AddUser}
        options={{ title: "Criar usuário" }}
      />
      <AppStack.Screen
        name="EditUser"
        component={EditUser}
        options={{ title: "Editar usuário" }}
      />
      <AppStack.Screen
        name="DetailsUser"
        component={DetailsUser}
        options={{ title: "Usuário" }}
      />
    </AppStack.Navigator>
  );
}

export default AppRoutes;
