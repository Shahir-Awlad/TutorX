import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#C1FF72';

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
}
function weekdayName(n) { return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][n] ?? '?'; }

const TuitionDetailScreen = ({ route, navigation }) => {
  const { tuitionId, ownerUid } = route.params;
  const { user } = useAuth();
  const [tuition, setTuition] = useState(null);
  const [counterparty, setCounterparty] = useState(null);

    useEffect(() => {
    if (!tuitionId || !ownerUid) return;
    const ref = doc(db, 'Users', ownerUid, 'tuitions', tuitionId);
    const unsub = onSnapshot(ref, async (snap) => {
      const data = { id: snap.id, ...snap.data() };
      setTuition(data);

      // Figure out who the "other" person is:
      let cpUid = data?.counterpartyUid;
      if (!cpUid) {
        // Fallback: compute from teacherId/studentId relative to current viewer
        cpUid = (data.teacherId === user?.uid) ? data.studentId : data.teacherId;
      }

      if (cpUid) {
        const prof = await getDoc(doc(db, 'Users', cpUid));
        if (prof.exists()) setCounterparty({ uid: prof.id, ...prof.data() });
        else setCounterparty(null);
      } else {
        setCounterparty(null);
      }
    });
    return unsub;
  }, [tuitionId, ownerUid, user?.uid]);


  const computed = useMemo(() => {
    if (!tuition) return {};
    const subjects = Array.isArray(tuition.subjects) ? tuition.subjects.join(', ') : tuition.subjects || '';
    const scheduleStr = Array.isArray(tuition.scheduleDays) && tuition.scheduleDays.length
      ? tuition.scheduleDays.map(weekdayName).join(', ') : '';
    const iAmTeacher = tuition.teacherId === user?.uid;
    const counterpartyLabel = iAmTeacher ? 'Student' : 'Teacher';
    const counterpartyName = iAmTeacher ? (tuition.studentName || '') : (tuition.teacherName || '');
    return { subjects, scheduleStr, counterpartyLabel, counterpartyName };
  }, [tuition, user?.uid]);

  const Row = ({ label, value }) => (value ? (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  ) : null);

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
        {/* Card 1: Tuition details */}
        <View style={styles.card}>
          <Row label={computed.counterpartyLabel} value={computed.counterpartyName} />
          <Row label="Subjects" value={computed.subjects} />
          <Row label="Scheduled Days" value={computed.scheduleStr} />
          <Row label="Classes since payday" value={String(tuition.classesSincePayday ?? '')} />
          <Row label="Classes / payday" value={String(tuition.classesPerPayday ?? '')} />
          <Row label="Salary" value={tuition.salary ? String(tuition.salary) : ''} />
          <Row label="Last payday" value={tuition.lastPayday ? formatDate((tuition.lastPayday.toDate ? tuition.lastPayday.toDate() : tuition.lastPayday)) : ''} />
        </View>

        {/* Card 2: Connected user details (only non-null fields) */}
        {counterparty && (
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Connected {computed.counterpartyLabel}</Text>
            <Row label="Name" value={counterparty.name} />
            <Row label="Username" value={counterparty.username} />
            <Row label="Email" value={counterparty.email} />
            <Row label="Institute" value={counterparty.institute} />
            <Row label="Class" value={counterparty.class} />
            <Row label="Phone" value={counterparty.phoneNumber} />
            <Row label="Nationality" value={counterparty.nationality} />
            <Row label="Gender" value={counterparty.gender} />
            <Row label="Date of Birth" value={counterparty.dateOfBirth ? formatDate(counterparty.dateOfBirth.toDate ? counterparty.dateOfBirth.toDate() : counterparty.dateOfBirth) : ''} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#2e2e2e', borderRadius: 12 },
  backTxt: { color: '#fff', fontWeight: '600' },
  headerTitle: { color: ACCENT, fontSize: 18, fontWeight: 'bold' },

  sectionTitle: { color: ACCENT, fontWeight: '800' },

  card: { backgroundColor: '#2e2e2e', borderRadius: 16, padding: 14 },
  row: { flexDirection: 'row', marginTop: 10 },
  label: { color: '#bbb', width: 160 },
  value: { color: '#fff', flex: 1 },
});

export default TuitionDetailScreen;
