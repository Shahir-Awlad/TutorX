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
  Platform,
} from 'react-native';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#C1FF72';

const UserSearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const searchUsers = async () => {
    if (!user?.uid) {
      setSearchResults([]);
      return;
    }
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // Simple all-users fetch + client-side filter to keep it robust
      const usersCol = collection(db, 'Users');
      const snap = await getDocs(usersCol);

      const term = searchQuery.toLowerCase();
      const map = new Map();

      snap.forEach((d) => {
        const data = d.data() || {};
        const uid = data.uid || d.id;
        if (uid === user.uid) return;

        const email = (data.email || '').toLowerCase();
        const username = (data.username || '').toLowerCase();

        if (email.includes(term) || username.includes(term)) {
          map.set(uid, {
            id: uid,
            ...data,
            displayName: data.displayName || data.username || data.email || 'Unknown',
            email: data.email || null,
            username: data.username || null,
          });
        }
      });

      setSearchResults(Array.from(map.values()));
    } catch (err) {
      console.error('Error searching users:', err);
      Alert.alert('Error', 'Failed to search users.');
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

      await setDoc(
        conversationRef,
        {
          participants: [myUid, otherUid],
          participantDetails: {
            [myUid]: {
              displayName:
                user.displayName || (user.email ? user.email.split('@')[0] : 'You'),
              email: user.email ?? null,
              username: user.displayName || (user.email ? user.email.split('@')[0] : null),
            },
            [otherUid]: {
              displayName:
                selectedUser.displayName || selectedUser.username || selectedUser.email,
              email: selectedUser.email ?? null,
              username: selectedUser.username ?? null,
            },
          },
          createdAt: serverTimestamp(),
          lastMessage: '',
          lastMessageTime: serverTimestamp(),
        },
        { merge: true }
      );

      navigation.navigate('DirectChat', {
        conversationId,
        otherUser: {
          id: otherUid,
          displayName:
            selectedUser.displayName || selectedUser.username || selectedUser.email,
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
    const t = setTimeout(searchUsers, 400);
    return () => clearTimeout(t);
  }, [searchQuery, user?.uid]);

  const renderUser = ({ item }) => (
    <TouchableOpacity style={styles.userRow} onPress={() => startConversation(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.displayName || item.username || item.email)?.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>
          {item.displayName || item.username || item.email}
        </Text>
        {item.email ? <Text style={styles.userEmail}>{item.email}</Text> : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#111" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Users</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Card */}
      <View style={styles.card}>
        {/* Search box */}
        <View style={styles.searchBox}>
          <TextInput
            style={styles.input}
            placeholder="Search by username or email..."
            placeholderTextColor="#555"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={searchUsers}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.loading}>
            <Text style={{ color: '#ccc' }}>Searching...</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              searchQuery ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              ) : null
            }
            contentContainerStyle={{ paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#2e2e2e', borderRadius: 12 },
  backTxt: { color: '#fff', fontWeight: '600' },
  headerTitle: { color: ACCENT, fontSize: 18, fontWeight: 'bold' },

  card: {
    flex: 1,
    backgroundColor: '#2e2e2e',
    borderRadius: 20,
    padding: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#000',
    marginRight: 8,
  },
  searchBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  searchBtnText: { color: '#000', fontWeight: '700' },

  separator: { height: 1, backgroundColor: '#444' },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#000', fontWeight: 'bold' },
  userName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  userEmail: { color: '#bbb', fontSize: 13, marginTop: 2 },

  loading: { paddingVertical: 20, alignItems: 'center' },
  empty: { paddingVertical: 28, alignItems: 'center' },
  emptyText: { color: '#bbb', fontSize: 14 },
});

export default UserSearchScreen;
