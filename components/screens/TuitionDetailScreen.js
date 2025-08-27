import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#C1FF72';

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
}
function weekdayName(n) { return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][n] ?? '?'; }
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

const TuitionDetailScreen = ({ route, navigation }) => {
  const { tuitionId, ownerUid } = route.params; // <- owner uid passed from list
  const { user } = useAuth();
  const [tuition, setTuition] = useState(null);

  useEffect(() => {
    if (!tuitionId || !ownerUid) return;
    const ref = doc(db, 'Users', ownerUid, 'tuitions', tuitionId);
    const unsub = onSnapshot(ref, (snap) => setTuition({ id: snap.id, ...snap.data() }));
    return unsub;
  }, [tuitionId, ownerUid]);

  const computed = useMemo(() => {
    if (!tuition) return {};
    const subjects = Array.isArray(tuition.subjects) ? tuition.subjects.join(', ') : tuition.subjects || '—';
    const scheduleStr = Array.isArray(tuition.scheduleDays) && tuition.scheduleDays.length
      ? tuition.scheduleDays.map(weekdayName).join(', ')
      : '—';
    const nextDate = nextClassDateFromDays(tuition.scheduleDays || []);
    const since = countScheduledSince(tuition.lastPayday, tuition.scheduleDays || []);
    const iAmTeacher = tuition.teacherId === user?.uid;
    const counterpartyLabel = iAmTeacher ? 'Student' : 'Teacher';
    const counterpartyName = iAmTeacher ? (tuition.studentName || '—') : (tuition.teacherName || '—');
    return { subjects, scheduleStr, nextDate, since, counterpartyLabel, counterpartyName };
  }, [tuition, user?.uid]);

  if (!tuition) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#111" />
        <View style={{ padding: 16 }}><Text style={{ color: '#fff' }}>Loading...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tuition Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.card}>
          <Row label={computed.counterpartyLabel} value={computed.counterpartyName} bold />
          <Row label="Address" value={tuition.address || '—'} />
          <Row label="Subjects" value={computed.subjects} />
          <Row label="Scheduled Days" value={computed.scheduleStr} />
          <Row label="Next Class" value={computed.nextDate ? formatDate(computed.nextDate) : '—'} />
          <Row label="Classes Since Payday" value={`${computed.since}`} />
          <Row label="Classes / Payday" value={`${tuition.classesPerPayday ?? 0}`} />
          <Row label="Last Payday" value={tuition.lastPayday ? formatDate(tuition.lastPayday.toDate ? tuition.lastPayday.toDate() : tuition.lastPayday) : '—'} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const Row = ({ label, value, bold }) => (
  <View style={styles.row}>
    <Text style={[styles.label, bold && { fontWeight: '800', color: '#fff' }]}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#2e2e2e', borderRadius: 12 },
  backTxt: { color: '#fff', fontWeight: '600' },
  headerTitle: { color: ACCENT, fontSize: 18, fontWeight: 'bold' },

  card: { backgroundColor: '#2e2e2e', borderRadius: 16, padding: 14 },
  row: { flexDirection: 'row', marginTop: 10 },
  label: { color: '#bbb', width: 150 },
  value: { color: '#fff', flex: 1 },
});

export default TuitionDetailScreen;
