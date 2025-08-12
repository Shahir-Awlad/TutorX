import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#C1FF72';

const DirectChatScreen = ({ route, navigation }) => {
  const { conversationId, otherUser } = route.params;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const { user } = useAuth();
  const flatListRef = useRef();

  useEffect(() => {
    if (!user?.uid) return;

    navigation.setOptions({
      title: otherUser.displayName || otherUser.username || otherUser.email,
    });

    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const messagesData = [];
        querySnapshot.forEach((d) => {
          messagesData.push({ id: d.id, ...d.data() });
        });
        setMessages(messagesData);
      },
      (error) => console.error('Error fetching messages:', error)
    );

    return unsubscribe;
  }, [conversationId, otherUser, user?.uid, navigation]);

  const sendMessage = async () => {
    if (message.trim() === '' || !user?.uid) return;

    const messageText = message.trim();
    setMessage('');

    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      await addDoc(messagesRef, {
        text: messageText,
        createdAt: serverTimestamp(),
        senderId: user.uid,
        senderName: user.displayName || user.email,
      });

      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setMessage(messageText);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const renderDateSeparator = (timestamp) => (
    <View style={styles.dateSeparator}>
      <Text style={styles.dateText}>{formatDate(timestamp)}</Text>
    </View>
  );

  const renderMessage = ({ item, index }) => {
    if (!user?.uid) return null;

    const isMyMessage = item.senderId === user.uid;
    const nextMessage = messages[index - 1];
    const showDate =
      !nextMessage || formatDate(item.createdAt) !== formatDate(nextMessage.createdAt);

    return (
      <View>
        {showDate && renderDateSeparator(item.createdAt)}
        <View style={[styles.bubble, isMyMessage ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.msgText, isMyMessage ? styles.myText : styles.otherText]}>
            {item.text}
          </Text>
          <Text style={[styles.timeText, isMyMessage ? styles.myTime : styles.otherTime]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#111" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(otherUser.displayName || otherUser.username || otherUser.email)
                ?.charAt(0)
                .toUpperCase()}
            </Text>
          </View>
          <Text style={styles.headerTitle}>
            {otherUser.displayName || otherUser.username || otherUser.email}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Chat card */}
      <View style={styles.card}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
        />

        {/* Input */}
        <KeyboardAvoidingView behavior='padding' keyboardVerticalOffset={100}> 
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message..."
              placeholderTextColor="#555"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!message.trim()}
            >
              <Text style={styles.sendTxt}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: 
  { flex: 1, 
    backgroundColor: '#111',
    paddingBottom: 10
   },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 8, backgroundColor: '#2e2e2e', borderRadius: 12 },
  backTxt: { color: '#fff', fontWeight: '600' },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { color: '#000', fontWeight: 'bold' },
  headerTitle: { color: ACCENT, fontSize: 16, fontWeight: 'bold' },

  card: {
    flex: 1,
    backgroundColor: '#2e2e2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },

  dateSeparator: { alignItems: 'center', marginVertical: 10 },
  dateText: {
    backgroundColor: '#1e1e1e',
    color: '#bbb',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },

  bubble: {
    marginVertical: 3,
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: ACCENT,
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#3b3b3b',
    borderBottomLeftRadius: 6,
  },
  msgText: { fontSize: 16, lineHeight: 20 },
  myText: { color: '#000' },
  otherText: { color: '#fff' },
  timeText: { fontSize: 11, marginTop: 4 },
  myTime: { color: '#111', textAlign: 'right' },
  otherTime: { color: '#ccc' },

  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    color: '#000',
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: ACCENT,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendTxt: { color: '#000', fontWeight: '700' },
});

export default DirectChatScreen;
