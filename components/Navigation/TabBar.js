import React from 'react';
import { View, TouchableOpacity, SafeAreaView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

export default function TabBar() {
    const navigation = useNavigation();
    const route = useRoute();

    const isActive = (routeName) => route.name === routeName;

    return(
         <SafeAreaView edges={['bottom']} style={styles.safeArea}>
            <View style={styles.container}>
        
            <TouchableOpacity 
                style={styles.tabItem}
                onPress={() => navigation.navigate('Mainpage')}
            >
                <Ionicons name={isActive('Mainpage') ? 'home' : 'home-outline'} 
                size={28} 
                color={isActive('Mainpage') ? '#C1FF72' : '#acacacff'} 
                />    
            </TouchableOpacity>    

            <TouchableOpacity 
                style={styles.tabItem}
                onPress={() => navigation.navigate('Chat')}
            >
                <Ionicons name={isActive('Chat') ? 'chatbubble' : 'chatbubble-outline'}  size={28} color={isActive('Chat') ? '#C1FF72' : '#acacacff'}  />    
            </TouchableOpacity> 

            <TouchableOpacity 
                style={styles.tabItem}
                onPress={() => navigation.navigate('Tuition')}
            >
                <Ionicons name={isActive('Tuition') ? 'school' : 'school-outline'}  size={28} color={isActive('Tuition') ? '#C1FF72' : '#acacacff'}  />    
            </TouchableOpacity> 

            <TouchableOpacity 
                style={styles.tabItem}
                onPress={() => navigation.navigate('Profile')}
            >
                <Ionicons name={isActive('Profile') ? 'person' : 'person-outline'}  size={28} color={isActive('Profile') ? '#C1FF72' : '#acacacff'}  />    
            </TouchableOpacity> 

        </View>
    </SafeAreaView>
    )

}

const styles = StyleSheet.create({
//   container: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     alignItems: 'center',
//     backgroundColor: '#000',
//     height: Platform.select({
//       ios: 70,
//       android: 60 
//     }),
//     borderTopWidth: 1,
//     borderTopColor: '#333',
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     paddingBottom: Platform.select({
//         ios: 10, 
//         android: 0
//     })
//   },

  safeArea: {
    backgroundColor: '#000',
    position: 'absolute',
    bottom: -11,
    left: 0,
    right: 0,
  },
  container: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#404040ff',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  
});