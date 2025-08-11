import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Mainpage() {
  return (
    <View style={styles.mainContainer}>
      <Text style={styles.mainText}>Login successful! This is the main page.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainText: {
    color: '#C1FF72',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
