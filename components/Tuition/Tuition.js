import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';

import TabBar from '../Navigation/TabBar';

export default function Tution() {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Get the currently logged-in user
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user) {
      setUserData({
        email: user.email,
        uid: user.uid
      });
    }
  }, []);

  return (
    <View style={styles.mainContainer}>
      <Text style={styles.mainText}>This is the tution page.</Text>

      <TabBar/>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#000000ff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mainText: {
    color: '#C1FF72',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  userInfo: {
    marginBottom: 30,
  },
  userText: {
    color: '#fff',
    fontSize: 16,
  },
  profileButton: {
    backgroundColor: '#C1FF72',
    padding: 15,
    borderRadius: 30,
    width: '60%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});