import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';

export default function Mainpage() {
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

  const handleProfilePress = () => {
    navigation.navigate('Profile', { userData });
  };

  return (
    <View style={styles.mainContainer}>
      <Text style={styles.mainText}>Login successful! This is the main page.</Text>
      
      {userData && (
        <View style={styles.userInfo}>
          <Text style={styles.userText}>Logged in as: {userData.email}</Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.profileButton}
        onPress={handleProfilePress}
      >
        <Text style={styles.buttonText}>Go to Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#111',
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