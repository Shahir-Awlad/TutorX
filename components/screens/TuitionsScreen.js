import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  SafeAreaView, StatusBar, Platform,
} from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
}
function nextClassDateFromDays(scheduleDays) {
  if (!Array.isArray(scheduleDays) || scheduleDays.length === 0) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let add = 0; add < 14; add++) {
    const d = new Date(start);
    d.setDate(start.getDate() + add);
    if (scheduleDays.includes(d.getDay())) return d;
  }
  return null;
}
function countScheduledSince(lastPayday, scheduleDays) {
  if (!lastPayday || !Array.isArray(scheduleDays) || scheduleDays.length === 0) return 0;
  const start = new Date(lastPayday.toDate ? lastPayday.toDate() : lastPayday);
  const today = new Date();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let count = 0;
  const cursor = new Date(s);
  cursor.setDate(s.getDate() + 1);
  while (cursor <= t) {
    if (scheduleDays.includes(cursor.getDay())) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

const TuitionsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [tuitions, setTuitions] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    const colRef = collection(db, 'Users', user.uid, 'tuitions');
    const unsub = onSnapshot(colRef, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setTuitions(list);
    }, (e) => console.log('tuitions listener error', e));
    return unsub;
  }, [user?.uid]);

  const renderItem = ({ item }) => {
    const iAmTeacher = item.teacherId === user?.uid;
    const name = iAmTeacher ? (item.studentName || 'Unnamed student')
                            : (item.teacherName || 'Unnamed teacher');
    const subjects = Array.isArray(item.subjects) ? item.subjects.join(', ') : item.subjects || '—';
    const nextDate = nextClassDateFromDays(item.scheduleDays || []);
    const classesSince = countScheduledSince(item.lastPayday, item.scheduleDays || []);
    const totalForPayday = item.classesPerPayday ?? 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('TuitionDetail', { tuitionId: item.id, ownerUid: user.uid })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.counter}>{classesSince}/{totalForPayday}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Subjects:</Text>
          <Text style={styles.value} numberOfLines={1}>{subjects}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Next class:</Text>
          <Text style={styles.value}>{nextDate ? formatDate(nextDate) : '—'}</Text>
        </View>

        {!!item.salary && (
          <View style={styles.row}>
            <Text style={styles.label}>Salary:</Text>
            <Text style={styles.value}>{String(item.salary)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tuitions</Text>
      </View>

      <FlatList
        data={tuitions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No tuitions yet</Text>
            <Text style={styles.emptyText}>Tap the + button to add a tuition</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTuition')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabPlus}>＋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const ACCENT = '#C1FF72';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: ACCENT, fontSize: 18, fontWeight: 'bold' },

  card: { backgroundColor: '#2e2e2e', borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  name: { color: '#fff', fontSize: 16, fontWeight: '700' },
  counter: { color: '#000', backgroundColor: ACCENT, borderRadius: 16, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 4, fontWeight: '700' },

  row: { flexDirection: 'row', marginTop: 6 },
  label: { color: '#bbb', width: 110 },
  value: { color: '#fff', flex: 1 },

  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  emptyText: { color: '#bbb', fontSize: 14, textAlign: 'center' },

  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  fabPlus: { color: '#000', fontSize: 28, fontWeight: '900', marginTop: -2 },
});

export default TuitionsScreen;
