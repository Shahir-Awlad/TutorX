// App.js
import 'react-native-gesture-handler'; // must be first
import 'react-native-reanimated';

import React from 'react';
import { Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

import { AuthProvider } from './contexts/AuthContext';

import Login from './components/Login/Login';
import Signup from './components/Signup/Signup';
import Mainpage from './components/Main Page/Mainpage';
import Profile from './components/Profile Page/Profile';
import ConversationsScreen from './components/screens/ConversationsScreen';
import DirectChatScreen from './components/screens/DirectChatScreen';
import UserSearchScreen from './components/screens/UserSearchScreen';
import TuitionsScreen from './components/screens/TuitionsScreen';
import TuitionDetailScreen from './components/screens/TuitionDetailScreen';
import AddTuitionScreen from './components/screens/AddTuitionScreen';

import SignoutDrawer from './components/Drawer/SignoutDrawer';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const DRAWER_WIDTH = Math.round(Dimensions.get('window').width * 0.4); // 40%

function TuitionStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TuitionsHome" component={TuitionsScreen} />
      <Stack.Screen name="TuitionDetail" component={TuitionDetailScreen} />
      <Stack.Screen name="AddTuition" component={AddTuitionScreen} />
    </Stack.Navigator>
  )
}

function ConversationStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConversationsHome" component={ConversationsScreen} />
      <Drawer.Screen name="DirectChat" component={DirectChatScreen} />
      <Drawer.Screen name="UserSearch" component={UserSearchScreen} />
    </Stack.Navigator>
  )
}

function AppDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: 'front',               // slides over content
        overlayColor: 'rgba(0,0,0,0.35)',  // dim the rest of the screen
        drawerStyle: {
          width: DRAWER_WIDTH,
          backgroundColor: '#222',
        },
        sceneContainerStyle: { backgroundColor: '#111' },
      }}
      // Custom drawer that ONLY shows the sign-out button
      drawerContent={({ navigation }) => <SignoutDrawer navigation={navigation} />}
    >
      {/* Your app screens (TabBar handles navigation between these) */}
      <Drawer.Screen name="Mainpage" component={Mainpage} />
      <Drawer.Screen name="Conversations" component={ConversationStack} />
      <Drawer.Screen name="Tuition" component={TuitionStack} />
      <Drawer.Screen name="Profile" component={Profile} />
      <Drawer.Screen name="DirectChat" component={DirectChatScreen} />
      <Drawer.Screen name="UserSearch" component={UserSearchScreen} />
    </Drawer.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {/* Auth (outside the drawer) */}
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Signup" component={Signup} />

            {/* App shell with 40% side drawer */}
            <Stack.Screen name="App" component={AppDrawer} />

            {/* Detail screens that are not part of the drawer menu */}
            
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
