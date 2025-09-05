import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Platform, ScrollView, Alert
} from 'react-native';
import {
  collection, serverTimestamp, Timestamp,
  doc, getDoc, query, where, getDocs, writeBatch
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import TabBar from '../Navigation/TabBar';

const ACCENT = '#C1FF72';
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function parseYMD(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s || '').trim());
  if (!m) return null;
  const d = new Date(+m[1], +m[2]-1, +m[3]);
  return isNaN(d) ? null : d;
}

const AddTuitionScreen = ({ navigation }) => {
  const { user } = useAuth();

  // my role & my profile (for reliable name fallbacks)
  const [role, setRole] = useState('Teacher');
  const [me, setMe] = useState({ name: '', username: '', email: '' });

  // search target
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);   // {uid,name,username,email,type}

  // tuition fields
  const [salary, setSalary] = useState('');
  const [subjectsText, setSubjectsText] = useState('');
  const [scheduleDays, setScheduleDays] = useState([]);
  const [classesPerPayday, setClassesPerPayday] = useState('12');
  const [classesSincePayday, setClassesSincePayday] = useState('0');

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), da = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${da}`;
  }, []);
  const [lastPaydayStr, setLastPaydayStr] = useState(todayStr);
  const [saving, setSaving] = useState(false);

  // Load my role + my profile (name/username/email) from Users/{uid}
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!user?.uid) return;
      try {
        const snap = await getDoc(doc(db, 'Users', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          if (!ignore) {
            setRole(d?.type === 'Student' ? 'Student' : 'Teacher');
            setMe({
              name: d?.name || '',
              username: d?.username || '',
              email: d?.email || user.email || '',
            });
          }
        } else {
          if (!ignore) {
            setRole('Teacher');
            setMe({ name: '', username: '', email: user.email || '' });
          }
        }
      } catch {
        if (!ignore) {
          setRole('Teacher');
          setMe({ name: '', username: '', email: user.email || '' });
        }
      }
    })();
    return () => { ignore = true; };
  }, [user?.uid]);

  // Search by exact username OR exact email in Users
  const runSearch = async () => {
    if (!search.trim()) { setResults([]); return; }
    try {
      const term = search.trim();
      const usersCol = collection(db, 'Users');

      const byUsername = await getDocs(query(usersCol, where('username', '==', term)));
      const byEmail    = await getDocs(query(usersCol, where('email', '==', term)));

      const dedup = new Map();
      [...byUsername.docs, ...byEmail.docs].forEach(d => {
        if (d.id === user.uid) return; // exclude self
        const data = d.data();
        dedup.set(d.id, {
          uid: d.id,
          name: data.name || '',
          username: data.username || '',
          email: data.email || '',
          type: data.type || '',
        });
      });

      setResults(Array.from(dedup.values()));
    } catch (e) {
      console.log('Search error:', e);
      Alert.alert('Search Error', 'Could not search users right now.');
    }
  };

  const toggleDay = (i) => {
    setScheduleDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i].sort());
  };

  const onSave = async () => {
    if (!user?.uid) return;

    if (!selected) {
      Alert.alert('Choose user', `Search and select a ${role === 'Teacher' ? 'student' : 'teacher'} first.`);
      return;
    }
    if (scheduleDays.length === 0) {
      Alert.alert('Missing', 'Select at least one scheduled day.');
      return;
    }
    const lastPaydayDate = parseYMD(lastPaydayStr);
    if (!lastPaydayDate) {
      Alert.alert('Invalid date', 'Enter last payday as YYYY-MM-DD.');
      return;
    }

    // Common payload
    const subjects = subjectsText.split(',').map(s => s.trim()).filter(Boolean);
    const base = {
      subjects,
      scheduleDays,
      classesPerPayday: parseInt(classesPerPayday, 10) || 0,
      classesSincePayday: parseInt(classesSincePayday, 10) || 0,
      salary: parseFloat(salary) || 0,
      lastPayday: Timestamp.fromDate(lastPaydayDate),
      createdAt: serverTimestamp(),
    };

    // Solid name fallbacks
    const myName     = me.name || me.username || me.email || user.displayName || user.uid;
    const otherName  = selected.name || selected.username || selected.email || selected.uid;

    const teacherId   = role === 'Teacher' ? user.uid : selected.uid;
    const studentId   = role === 'Teacher' ? selected.uid : user.uid;
    const teacherName = (teacherId === user.uid) ? myName : otherName;
    const studentName = (studentId === user.uid) ? myName : otherName;

    setSaving(true);
    try {
      const batch = writeBatch(db);
      const sharedKey = `${user.uid}_${selected.uid}_${Date.now()}`;

      // Mine → I should see THEM
      const myRef = doc(collection(db, 'Users', user.uid, 'tuitions'));
      batch.set(myRef, {
        ...base,
        sharedKey,
        ownerUid: user.uid,
        counterpartyUid: selected.uid,
        teacherId,
        studentId,
        teacherName,
        studentName,
      });

      // Theirs → they should see ME
      const theirRef = doc(collection(db, 'Users', selected.uid, 'tuitions'));
      batch.set(theirRef, {
        ...base,
        sharedKey,
        ownerUid: selected.uid,
        counterpartyUid: user.uid,
        teacherId,
        studentId,
        teacherName,
        studentName,
      });

      await batch.commit();
      navigation.goBack();
    } catch (e) {
      console.error('Add tuition error', e);
      Alert.alert('Error', 'Failed to save tuition (check Firestore rules).');
    } finally {
      setSaving(false);
    }
  };

  const counterpartLabel = role === 'Student' ? 'Teacher' : 'Student';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* Header */}
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
        <Text style={styles.headerTitle}>New Tuition</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* No FlatList inside this ScrollView */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 70 }}>
        <View style={styles.card}>
          {/* Search & pick user */}
          <Text style={styles.fieldLabel}>Find {counterpartLabel} (username or email)</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={search}
              onChangeText={setSearch}
              placeholder="e.g., aimoon1 or aimaan@gmail.com"
              placeholderTextColor="#555"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={runSearch}>
              <Text style={styles.searchTxt}>Search</Text>
            </TouchableOpacity>
          </View>

          {!!results.length && !selected && (
            <View style={{ marginTop: 8 }}>
              {results.map(item => (
                <TouchableOpacity key={item.uid} style={styles.resultItem} onPress={() => setSelected(item)}>
                  <Text style={styles.resultName}>{item.name || '(no name)'}</Text>
                  <Text style={styles.resultMeta}>@{item.username} • {item.email}</Text>
                  <Text style={styles.resultMeta}>{item.type || ''}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selected && (
            <View style={styles.selBox}>
              <Text style={styles.selTitle}>{counterpartLabel} selected</Text>
              <Text style={styles.selLine}>{selected.name || '(no name)'}</Text>
              <Text style={styles.selLine}>@{selected.username} • {selected.email}</Text>
              <TouchableOpacity style={styles.clearBtn} onPress={() => { setSelected(null); setResults([]); }}>
                <Text style={styles.clearTxt}>Change</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tuition fields */}
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

          <Field label="Subjects (comma separated)">
            <TextInput
              style={styles.input}
              value={subjectsText}
              onChangeText={setSubjectsText}
              placeholder="e.g., Math, Physics"
              placeholderTextColor="#555"
            />
          </Field>

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

          <Field label="Classes since last payday">
            <TextInput
              style={styles.input}
              value={classesSincePayday}
              onChangeText={setClassesSincePayday}
              keyboardType="number-pad"
              placeholder="e.g., 3"
              placeholderTextColor="#555"
            />
          </Field>

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

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
            <Text style={styles.saveTxt}>{saving ? 'Saving...' : 'Save Tuition'}</Text>
          </TouchableOpacity>
        </View>
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
  backBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#2e2e2e', borderRadius: 12 },
  backTxt: { color: '#fff', fontWeight: '600' },
  headerTitle: { color: ACCENT, fontSize: 18, fontWeight: 'bold' },

  card: { backgroundColor: '#2e2e2e', borderRadius: 16, padding: 14 },

  fieldLabel: { color: '#bbb', marginBottom: 8 },
  input: { backgroundColor: '#ccc', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#000' },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  searchTxt: { color: '#000', fontWeight: '800' },
  resultItem: { backgroundColor: '#1e1e1e', borderRadius: 10, padding: 10, marginBottom: 8 },
  resultName: { color: '#fff', fontWeight: '700' },
  resultMeta: { color: '#bbb', marginTop: 2, fontSize: 12 },

  selBox: { backgroundColor: '#1e1e1e', borderRadius: 10, padding: 12, marginTop: 10 },
  selTitle: { color: ACCENT, fontWeight: '800', marginBottom: 4 },
  selLine: { color: '#fff' },
  clearBtn: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: ACCENT, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  clearTxt: { color: '#000', fontWeight: '800' },

  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dayChip: { borderWidth: 1, borderColor: '#666', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  dayChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  dayChipText: { color: '#fff' },

  saveBtn: { backgroundColor: ACCENT, borderRadius: 18, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  saveTxt: { color: '#000', fontWeight: '800' },

  drawerButton: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: ACCENT,
    marginVertical: 2,
    borderRadius: 1,
  },
});

export default AddTuitionScreen;
