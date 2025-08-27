import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const BAR_HEIGHT = 56; // visual height of the bar (not counting bottom inset)

export default function TabBar() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const isActive = (routeName) => route.name === routeName;

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[
        styles.safeArea,
        { paddingBottom: insets.bottom }, // ensures seamless bottom with home indicator
      ]}
    >
      <View style={[styles.container, { height: BAR_HEIGHT }]}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('Mainpage')}
        >
          <Ionicons
            name={isActive('Mainpage') ? 'home' : 'home-outline'}
            size={28}
            color={isActive('Mainpage') ? '#C1FF72' : '#acacacff'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('Conversations')}
        >
          {/* Fix active route name to match your screen: 'Conversations' */}
          <Ionicons
            name={isActive('Conversations') || isActive('DirectChat') || isActive('UserSearch') ? 'chatbubble' : 'chatbubble-outline'}
            size={28}
            color={isActive('Conversations') || isActive('DirectChat') || isActive('UserSearch')? '#C1FF72' : '#acacacff'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('Tuition')}
        >
          <Ionicons
            name={isActive('Tuition') || isActive('TuitionDetail') || isActive('AddTuition') ? 'school' : 'school-outline'}
            size={28}
            color={isActive('Tuition') || isActive('TuitionDetail') || isActive('AddTuition') ? '#C1FF72' : '#acacacff'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons
            name={isActive('Profile') ? 'person' : 'person-outline'}
            size={28}
            color={isActive('Profile') ? '#C1FF72' : '#acacacff'}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.select({
      ios: -54,
      android: -35,
      web: 22, 
    }),          // <- pin to the bottom, no magic numbers
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#404040ff',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
});
