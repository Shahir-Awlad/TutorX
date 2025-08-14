
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Login from './components/Login/Login';
import Mainpage from './components/Main Page/Mainpage';
import Signup from './components/Signup/Signup';
import Profile from './components/Profile Page/Profile';
import Tuition from './components/Tuition/Tuition';
import ConversationsScreen from './components/screens/ConversationsScreen';
import DirectChatScreen from './components/screens/DirectChatScreen';
import UserSearchScreen from './components/screens/UserSearchScreen';

import { AuthProvider } from './contexts/AuthContext'; 

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider> 
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Signup" component={Signup} />
          <Stack.Screen name="Mainpage" component={Mainpage} />
          <Stack.Screen name="Profile" component={Profile} />
          <Stack.Screen name="Conversations" component={ConversationsScreen} />
          <Stack.Screen name="DirectChat" component={DirectChatScreen} />
          <Stack.Screen name="UserSearch" component={UserSearchScreen} />
          <Stack.Screen name="Tuition" component={Tuition} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}

