import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Login from './components/Login/Login';
import Mainpage from './components/Main Page/Mainpage';
import Signup from './components/Signup/Signup';
import Profile from './components/Profile Page/Profile';
import Chat from './components/Chat/Chat';
import Tuition from './components/Tuition/Tuition';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Signup" component={Signup} />
        <Stack.Screen name="Mainpage" component={Mainpage} />
        <Stack.Screen name="Chat" component={Chat} />
        <Stack.Screen name="Tuition" component={Tuition} />
        <Stack.Screen name="Profile" component={Profile} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

