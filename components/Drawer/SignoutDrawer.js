// components/Drawer/SignoutDrawer.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

export default function SignoutDrawer({ navigation }) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.closeDrawer();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (e) {
      console.error('Logout error:', e);
      Alert.alert('Logout failed', 'Please try again.');
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.bottom}>
        <TouchableOpacity style={styles.btn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.btnTxt}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#222', padding: 12 },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  btn: { backgroundColor: '#C1FF72', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnTxt: { color: '#000', fontWeight: 'bold' },
});
