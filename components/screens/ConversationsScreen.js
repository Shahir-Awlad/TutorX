import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import TabBar from '../Navigation/TabBar';

const ConversationsScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [user, navigation]);

  useEffect(() => {
    if (!user?.uid) {
      setConversations([]);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const conversationsData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const otherParticipantId = data.participants.find((id) => id !== user.uid);
          const otherParticipant = data.participantDetails?.[otherParticipantId];

          if (otherParticipant) {
            conversationsData.push({
              id: doc.id,
              ...data,
              otherParticipant: {
                id: otherParticipantId,
                ...otherParticipant,
              },
            });
          }
        });

        conversationsData.sort((a, b) => {
          const aTime = a.lastMessageTime?.seconds || 0;
          const bTime = b.lastMessageTime?.seconds || 0;
          return bTime - aTime;
        });

        setConversations(conversationsData);
      },
      (error) => console.error('Error fetching conversations:', error)
    );

    return unsubscribe;
  }, [user?.uid]);

  const handleLogout = async () => {
    try {
      setConversations([]);
      await signOut(auth);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() =>
        navigation.navigate('DirectChat', {
          conversationId: item.id,
          otherUser: item.otherParticipant,
        })
      }
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.otherParticipant.displayName ||
            item.otherParticipant.username ||
            item.otherParticipant.email)
            ?.charAt(0)
            .toUpperCase()}
        </Text>
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <Text style={styles.name}>
            {item.otherParticipant.displayName ||
              item.otherParticipant.username ||
              item.otherParticipant.email}
          </Text>
          <Text style={styles.time}>{formatTime(item.lastMessageTime)}</Text>
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {item.lastMessage || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => navigation.navigate('UserSearch')}
          >
            <Text style={styles.circleBtnText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleLogout}>
            <Text style={styles.secondaryBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>Tap + to start a new chat</Text>
            </View>
          }
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      </View>
      <TabBar/>
    </SafeAreaView>
  );
};

const ACCENT = '#C1FF72';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: ACCENT, fontSize: 18, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  circleBtnText: { color: '#000', fontSize: 20, fontWeight: 'bold' },
  secondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#2e2e2e',
  },
  secondaryBtnText: { color: '#fff', fontWeight: '600' },

  card: {
    flex: 1,
    backgroundColor: '#2e2e2e',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  separator: { height: 1, backgroundColor: '#444', marginHorizontal: 8 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  rowContent: { flex: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  time: { color: '#bbb', fontSize: 12 },
  preview: { color: '#ccc', fontSize: 14 },
  empty: { paddingVertical: 32, alignItems: 'center' },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  emptySubtitle: { color: '#bbb', fontSize: 14 },
});

export default ConversationsScreen;
