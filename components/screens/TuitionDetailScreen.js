import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar, Platform,
  ScrollView, TouchableOpacity, TextInput, Alert
} from 'react-native';
import {
  doc, onSnapshot, getDoc, query, where, getDocs, writeBatch, Timestamp, collection
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import TabBar from '../Navigation/TabBar';

const ACCENT = '#C1FF72';
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
}
function weekdayName(n) { return WEEKDAYS[n] ?? '?'; }
function parseYMD(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s || '').trim());
  if (!m) return null;
  const d = new Date(+m[1], +m[2]-1, +m[3]);
  return isNaN(d) ? null : d;
}

const TuitionDetailScreen = ({ route, navigation }) => {
  const { tuitionId, ownerUid } = route.params;
  const { user } = useAuth();

  // live tuition + counterparty profile
  const [tuition, setTuition] = useState(null);
  const [counterparty, setCounterparty] = useState(null);

  // edit mode + editable clones
  const [editing, setEditing] = useState(false);
  const [subjectsText, setSubjectsText] = useState('');
  const [scheduleDays, setScheduleDays] = useState([]);
  const [classesSincePayday, setClassesSincePayday] = useState('0');
  const [classesPerPayday, setClassesPerPayday] = useState('0');
  const [salary, setSalary] = useState('0');
  const [lastPaydayStr, setLastPaydayStr] = useState('');

  useEffect(() => {
    if (!tuitionId || !ownerUid) return;
    const ref = doc(db, 'Users', ownerUid, 'tuitions', tuitionId);

    const unsub = onSnapshot(ref, async (snap) => {
      if (!snap.exists()) return;
      const data = { id: snap.id, ...snap.data() };
      setTuition(data);

      // hydrate editor fields when data changes and not actively editing
      if (!editing) {
        setSubjectsText(Array.isArray(data.subjects) ? data.subjects.join(', ') : (data.subjects || ''));
        setScheduleDays(Array.isArray(data.scheduleDays) ? data.scheduleDays.slice() : []);
        setClassesSincePayday(String(data.classesSincePayday ?? '0'));
        setClassesPerPayday(String(data.classesPerPayday ?? '0'));
        setSalary(String(data.salary ?? '0'));
        const lp = data.lastPayday
          ? (data.lastPayday.toDate ? data.lastPayday.toDate() : data.lastPayday)
          : null;
        if (lp) {
          const y = lp.getFullYear();
          const m = String(lp.getMonth()+1).padStart(2,'0');
          const d = String(lp.getDate()).padStart(2,'0');
          setLastPaydayStr(`${y}-${m}-${d}`);
        } else {
          setLastPaydayStr('');
        }
      }

      // load counterparty profile for the lower card
      let cpUid = data?.counterpartyUid;
      if (!cpUid) {
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
  }, [tuitionId, ownerUid, user?.uid, editing]);

  const toggleDay = (i) => {
    setScheduleDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i].sort());
  };

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

  const onSave = async () => {
    if (!tuition || !user?.uid) return;

    // validate
    if (!scheduleDays.length) {
      Alert.alert('Missing', 'Select at least one scheduled day.');
      return;
    }
    const lp = parseYMD(lastPaydayStr);
    if (!lp) {
      Alert.alert('Invalid date', 'Enter last payday as YYYY-MM-DD.');
      return;
    }

    // build update
    const update = {
      subjects: subjectsText.split(',').map(s => s.trim()).filter(Boolean),
      scheduleDays,
      classesSincePayday: parseInt(classesSincePayday, 10) || 0,
      classesPerPayday: parseInt(classesPerPayday, 10) || 0,
      salary: parseFloat(salary) || 0,
      lastPayday: Timestamp.fromDate(lp),
      // (optional) updatedAt: serverTimestamp() — if you want a timestamp
    };

    try {
      const batch = writeBatch(db);

      // 1) Update THIS doc
      const mineRef = doc(db, 'Users', ownerUid, 'tuitions', tuition.id);
      batch.update(mineRef, update);

      // 2) Update COUNTERPARTY doc by locating the same sharedKey
      const otherUid = tuition.counterpartyUid || ((tuition.teacherId === ownerUid) ? tuition.studentId : tuition.teacherId);
      if (!otherUid || !tuition.sharedKey) {
        throw new Error('Missing counterpartyUid or sharedKey on tuition document.');
      }

      const theirCol = collection(db, 'Users', otherUid, 'tuitions');
      const snap = await getDocs(query(theirCol, where('sharedKey', '==', tuition.sharedKey)));
      if (snap.empty) {
        throw new Error('Could not locate the counterparty tuition document.');
      }
      const theirDoc = snap.docs[0].ref;
      batch.update(theirDoc, update);

      await batch.commit();
      setEditing(false);
      Alert.alert('Saved', 'Tuition updated for both users.');
    } catch (e) {
      console.error('Save tuition error', e);
      Alert.alert('Error', e.message || 'Failed to save tuition.');
    }
  };

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

      {/* Header with drawer and actions */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Open menu"
          style={styles.drawerButton}
          onPress={() => navigation.openDrawer()}
        >
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Tuition Details</Text>

        {editing ? (
          <TouchableOpacity style={styles.actionBtn} onPress={onSave}>
            <Text style={styles.actionTxt}>Save</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.actionBtn} onPress={() => setEditing(true)}>
            <Text style={styles.actionTxt}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Card 1: Tuition details (view or edit) */}
        <View style={styles.card}>
          {/* Counterparty name (read-only label, not editable here) */}
          <Row label={computed.counterpartyLabel} value={computed.counterpartyName} />

          {/* Subjects */}
          {editing ? (
            <Field label="Subjects (comma separated)">
              <TextInput
                style={styles.input}
                value={subjectsText}
                onChangeText={setSubjectsText}
                placeholder="e.g., Math, Physics"
                placeholderTextColor="#555"
              />
            </Field>
          ) : <Row label="Subjects" value={computed.subjects} />}

          {/* Scheduled Days */}
          {editing ? (
            <Field label="Scheduled Days">
              <View style={styles.daysRow}>
                {WEEKDAYS.map((d, i) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayChip, scheduleDays.includes(i) && styles.dayChipActive]}
                    onPress={() => toggleDay(i)}
                  >
                    <Text style={[styles.dayChipText, scheduleDays.includes(i) && { color: '#000' }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>
          ) : <Row label="Scheduled Days" value={computed.scheduleStr} />}

          {/* Classes since payday */}
          {editing ? (
            <Field label="Classes since payday">
              <TextInput
                style={styles.input}
                value={classesSincePayday}
                onChangeText={setClassesSincePayday}
                keyboardType="number-pad"
                placeholder="e.g., 3"
                placeholderTextColor="#555"
              />
            </Field>
          ) : <Row label="Classes since payday" value={String(tuition.classesSincePayday ?? '')} />}

          {/* Classes per payday */}
          {editing ? (
            <Field label="Classes per payday">
              <TextInput
                style={styles.input}
                value={classesPerPayday}
                onChangeText={setClassesPerPayday}
                keyboardType="number-pad"
                placeholder="e.g., 12"
                placeholderTextColor="#555"
              />
            </Field>
          ) : <Row label="Classes / payday" value={String(tuition.classesPerPayday ?? '')} />}

          {/* Salary */}
          {editing ? (
            <Field label="Salary (per payday)">
              <TextInput
                style={styles.input}
                value={salary}
                onChangeText={setSalary}
                keyboardType="decimal-pad"
                placeholder="e.g., 5000"
                placeholderTextColor="#555"
              />
            </Field>
          ) : <Row label="Salary" value={tuition.salary ? String(tuition.salary) : ''} />}

          {/* Last payday */}
          {editing ? (
            <Field label="Last payday (YYYY-MM-DD)">
              <TextInput
                style={styles.input}
                value={lastPaydayStr}
                onChangeText={setLastPaydayStr}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#555"
                autoCapitalize="none"
              />
            </Field>
          ) : (
            <Row
              label="Last payday"
              value={tuition.lastPayday ? formatDate((tuition.lastPayday.toDate ? tuition.lastPayday.toDate() : tuition.lastPayday)) : ''}
            />
          )}
        </View>

        {/* Card 2: Connected user (always read-only, hide nulls) */}
        {counterparty && (
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>
              Connected {computed.counterpartyLabel}
            </Text>
            <Row label="Name" value={counterparty.name} />
            <Row label="Username" value={counterparty.username} />
            <Row label="Email" value={counterparty.email} />
            <Row label="Institute" value={counterparty.institute} />
            <Row label="Class" value={counterparty.class} />
            <Row label="Phone" value={counterparty.phoneNumber} />
            <Row label="Nationality" value={counterparty.nationality} />
            <Row label="Gender" value={counterparty.gender} />
            <Row
              label="Date of Birth"
              value={
                counterparty.dateOfBirth
                  ? formatDate(counterparty.dateOfBirth.toDate ? counterparty.dateOfBirth.toDate() : counterparty.dateOfBirth)
                  : ''
              }
            />
          </View>
        )}
      </ScrollView>

      <TabBar />
    </SafeAreaView>
  );
};

const Field = ({ label, children }) => (
  <View style={{ marginTop: 14 }}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: ACCENT, fontSize: 18, fontWeight: 'bold' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#2e2e2e', borderRadius: 10 },
  actionTxt: { color: '#fff', fontWeight: '700' },

  sectionTitle: { color: ACCENT, fontWeight: '800' },

  card: { backgroundColor: '#2e2e2e', borderRadius: 16, padding: 14 },
  row: { flexDirection: 'row', marginTop: 10 },
  label: { color: '#bbb', width: 160 },
  value: { color: '#fff', flex: 1 },
  fieldLabel: { color: '#bbb', marginBottom: 8 },
  input: { backgroundColor: '#ccc', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#000' },

  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dayChip: { borderWidth: 1, borderColor: '#666', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  dayChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  dayChipText: { color: '#fff' },

  drawerButton: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  hamburgerLine: { width: 20, height: 2, backgroundColor: ACCENT, marginVertical: 2, borderRadius: 1 },
});

export default TuitionDetailScreen;
