import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import ShippingCalculator from './ShippingCalculator';
import ShippingResults from './ShippingResults';
import ShippingHistory from './ShippingHistory';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Calculator">
        <Stack.Screen name="Calculator" component={ShippingCalculator} />
        <Stack.Screen name="Results" component={ShippingResults} />
        <Stack.Screen name="History" component={ShippingHistory} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
