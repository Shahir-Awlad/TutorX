import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform
} from 'react-native';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  getDoc 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';

const UserSearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const searchUsers = async () => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // Search by email or display name
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '>=', searchQuery.toLowerCase()),
        where('email', '<=', searchQuery.toLowerCase() + '\uf8ff')
      );
      
      const nameQuery = query(
        collection(db, 'users'),
        where('displayName', '>=', searchQuery),
        where('displayName', '<=', searchQuery + '\uf8ff')
      );

      const [emailResults, nameResults] = await Promise.all([
        getDocs(emailQuery),
        getDocs(nameQuery)
      ]);

      const users = new Map();
      
      emailResults.forEach(doc => {
        if (doc.id !== user.uid) {
          users.set(doc.id, { id: doc.id, ...doc.data() });
        }
      });
      
      nameResults.forEach(doc => {
        if (doc.id !== user.uid) {
          users.set(doc.id, { id: doc.id, ...doc.data() });
        }
      });

      setSearchResults(Array.from(users.values()));
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    }
    setLoading(false);
  };

  const startConversation = async (selectedUser) => {
    try {
      // Create conversation ID (consistent regardless of who creates it)
      const conversationId = [user.uid, selectedUser.id].sort().join('_');
      
      // Check if conversation already exists
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (!conversationSnap.exists()) {
        // Create new conversation with current timestamp
        const currentTime = new Date();
        await setDoc(conversationRef, {
          participants: [user.uid, selectedUser.id],
          participantDetails: {
            [user.uid]: {
              displayName: user.displayName || user.email,
              email: user.email
            },
            [selectedUser.id]: {
              displayName: selectedUser.displayName,
              email: selectedUser.email
            }
          },
          createdAt: currentTime,
          lastMessage: '',
          lastMessageTime: currentTime,
        });
      }

      // Navigate to chat with this user
      navigation.navigate('DirectChat', {
        conversationId,
        otherUser: selectedUser
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      console.error('Error details:', error.code, error.message);
      Alert.alert('Error', `Failed to start conversation: ${error.message}`);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const renderUser = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => startConversation(item)}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {item.displayName?.charAt(0).toUpperCase() || item.email?.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#007bff" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Users</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <Text>Searching...</Text>
        </View>
      )}

      <FlatList
        data={searchResults}
        renderItem={renderUser}
        keyExtractor={item => item.id}
        style={styles.usersList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          searchQuery && !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#007bff',
  },
  backButton: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 50,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  usersList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userAvatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default UserSearchScreen;