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
  orderBy,
  startAt,
  endAt,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';

const UserSearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const searchUsers = async () => {
    // Only search when logged in and have a query
    if (!user?.uid) {
      setSearchResults([]);
      return;
    }
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    const myUid = user?.uid || null;
    
    console.log('=== SEARCH DEBUG ===');
    console.log('Current user UID:', myUid);
    console.log('Search query:', searchQuery);
    console.log('Search query lowercase:', searchQuery.toLowerCase());
    
    try {
      const usersCol = collection(db, 'Users');
      
      // First, let's try to get ALL users to see what's in the database
      console.log('Fetching all users for debugging...');
      const allUsersQuery = query(usersCol);
      const allUsersSnapshot = await getDocs(allUsersQuery);
      
      console.log('Total users in database:', allUsersSnapshot.size);
      allUsersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('User data:', {
          id: doc.id,
          email: data.email,
          username: data.username,
          uid: data.uid
        });
      });
      
      // Try client-side filtering as a fallback
      console.log('Trying client-side filtering...');
      const searchLower = searchQuery.toLowerCase();
      const map = new Map();
      
      allUsersSnapshot.forEach(doc => {
        const data = doc.data() || {};
        const uid = data.uid || doc.id;
        
        if (myUid && uid === myUid) {
          console.log('Skipping self:', uid);
          return;
        }
        
        const email = (data.email || '').toLowerCase();
        const username = (data.username || '').toLowerCase();
        
        // Check if search query matches email or username
        if (email.includes(searchLower) || username.includes(searchLower)) {
          console.log('Match found:', { uid, email: data.email, username: data.username });
          map.set(uid, {
            id: uid,
            ...data,
            displayName: data.displayName || data.username || data.email || 'Unknown',
            email: data.email || null,
            username: data.username || null,
          });
        }
      });

      console.log('Final search results count:', map.size);
      console.log('=== END DEBUG ===');
      
      setSearchResults(Array.from(map.values()));
    } catch (err) {
      console.error('Error searching users:', err);
      console.error('Error details:', err.message);
      Alert.alert('Error', `Failed to search users: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (selectedUser) => {
  try {
    const myUid = user?.uid;
    if (!myUid) throw new Error('Not signed in');

    const otherUid = selectedUser.id;
    const conversationId = [myUid, otherUid].sort().join('_');
    const conversationRef = doc(db, 'conversations', conversationId);

    // Create or update the conversation (allowed by your rules because you're a participant)
    await setDoc(conversationRef, {
      participants: [myUid, otherUid],
      participantDetails: {
        [myUid]: {
          displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'You'),
          email: user.email ?? null,
          username: user.displayName || (user.email ? user.email.split('@')[0] : null),
        },
        [otherUid]: {
          displayName: selectedUser.displayName || selectedUser.username || selectedUser.email,
          email: selectedUser.email ?? null,
          username: selectedUser.username ?? null,
        },
      },
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
    }, { merge: true }); // merge lets this be safe whether the doc exists or not

    navigation.navigate('DirectChat', {
      conversationId,
      otherUser: {
        id: otherUid,
        displayName: selectedUser.displayName || selectedUser.username || selectedUser.email,
        email: selectedUser.email ?? null,
        username: selectedUser.username ?? null,
      },
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    Alert.alert('Error', `Failed to start conversation: ${error.message}`);
  }
};

  useEffect(() => {
    const t = setTimeout(searchUsers, 400); // debounce
    return () => clearTimeout(t);
  }, [searchQuery, user?.uid]);

  const renderUser = ({ item }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => startConversation(item)}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {(item.displayName || item.username || item.email)?.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName || item.username || item.email}</Text>
        {item.email ? <Text style={styles.userEmail}>{item.email}</Text> : null}
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
          placeholder="Search by username or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
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
        keyExtractor={(item) => item.id}
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