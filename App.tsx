// App.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

import ShippingCalculator from './ShippingCalculator';
import ShippingResults from './ShippingResults';
import ShippingHistory from './ShippingHistory';
import ApiManager from './ApiManager';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const CalculatorStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Calculator"
      component={ShippingCalculator}
      options={{ title: 'Calculadora de Frete', headerShown: false}}
    />
    <Stack.Screen
      name="Results"
      component={ShippingResults}
      options={{ title: 'Resultados' , headerShown: false}}
    />
  </Stack.Navigator>
);

const App = () => {
  return (
    <NavigationContainer>
      <Drawer.Navigator initialRouteName="Calculadora">
        <Drawer.Screen name="Calculadora" component={CalculatorStack} />
        <Drawer.Screen name="Histórico" component={ShippingHistory} />
        <Drawer.Screen name="Gerenciador de API" component={ApiManager} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
};

export default App;
