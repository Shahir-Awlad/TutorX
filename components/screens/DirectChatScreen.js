// DirectChatScreen.jsx
// ...imports unchanged...
const ACCENT = '#C1FF72';
const HEADER_OFFSET = Platform.OS === 'ios' ? 90 : 0;

const DirectChatScreen = ({ route, navigation }) => {
  // ...state/effects unchanged...

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
              {(otherUser.displayName || otherUser.username || otherUser.email)?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.headerTitle}>
            {otherUser.displayName || otherUser.username || otherUser.email}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Chat + Input above a LAYOUT TabBar */}
      
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
          <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={HEADER_OFFSET} // no tabbar height here anymore
      >
        
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
      

      {/* TabBar now participates in layout (always visible) */}
      <TabBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
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
    width: 34, height: 34, borderRadius: 17, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
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
  dateText: { backgroundColor: '#1e1e1e', color: '#bbb', fontSize: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },

  bubble: { marginVertical: 3, maxWidth: '80%', padding: 12, borderRadius: 16 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: ACCENT, borderBottomRightRadius: 6 },
  otherBubble: { alignSelf: 'flex-start', backgroundColor: '#3b3b3b', borderBottomLeftRadius: 6 },
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
  sendBtn: { backgroundColor: ACCENT, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  sendBtnDisabled: { opacity: 0.5 },
  sendTxt: { color: '#000', fontWeight: '700' },
});

export default DirectChatScreen;
