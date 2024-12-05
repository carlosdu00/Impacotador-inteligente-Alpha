// App.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import ApiManager from './ApiManager';
import ShippingCalculator from './ShippingCalculator';
import ShippingResults from './ShippingResults';
import ShippingHistory from './ShippingHistory';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Calculator">
        <Stack.Screen name="ApiManager" component={ApiManager} options={{ title: 'Gerenciador de API' }} />
        <Stack.Screen name="Calculator" component={ShippingCalculator} options={{ title: 'Calculadora de Frete' }} />
        <Stack.Screen name="Results" component={ShippingResults} options={{ title: 'Resultados' }} />
        <Stack.Screen name="History" component={ShippingHistory} options={{ title: 'Histórico' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
