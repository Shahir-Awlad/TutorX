import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Platform, ScrollView, Alert,
} from 'react-native';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#C1FF72';
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function parseYMD(s) {
  // expects 'YYYY-MM-DD'
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(+m[1], +m[2]-1, +m[3]);
  return isNaN(d) ? null : d;
}

const AddTuitionScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [studentName, setStudentName] = useState('');
  const [address, setAddress] = useState('');
  const [subjectsText, setSubjectsText] = useState('');
  const [scheduleDays, setScheduleDays] = useState([]); // array of 0..6
  const [classesPerPayday, setClassesPerPayday] = useState('12');
  const todayStr = useMemo(() => {
    const d = new Date(); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${da}`;
  }, []);
  const [lastPaydayStr, setLastPaydayStr] = useState(todayStr);
  const [saving, setSaving] = useState(false);

  const toggleDay = (i) => {
    setScheduleDays((prev) => prev.includes(i) ? prev.filter(x => x!==i) : [...prev, i].sort());
  };

  const onSave = async () => {
    if (!user?.uid) return;
    if (!studentName.trim()) { Alert.alert('Missing', 'Please enter a student name.'); return; }
    if (scheduleDays.length === 0) { Alert.alert('Missing', 'Select at least one scheduled day.'); return; }
    const lastPaydayDate = parseYMD(lastPaydayStr);
    if (!lastPaydayDate) { Alert.alert('Invalid date', 'Enter last payday as YYYY-MM-DD.'); return; }
    const subjects = subjectsText.split(',').map(s => s.trim()).filter(Boolean);
    const count = parseInt(classesPerPayday, 10) || 0;

    setSaving(true);
    try {
      await addDoc(collection(db, 'tuitions'), {
        teacherId: user.uid,
        studentName: studentName.trim(),
        address: address.trim(),
        subjects,
        scheduleDays,                 // [0..6]
        classesPerPayday: count,      // integer
        lastPayday: Timestamp.fromDate(lastPaydayDate),
        createdAt: serverTimestamp(),
      });
      navigation.goBack();
    } catch (e) {
      console.error('Add tuition error', e);
      Alert.alert('Error', 'Failed to save tuition.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Tuition</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        <View style={styles.card}>
          <Field label="Student Name">
            <TextInput style={styles.input} value={studentName} onChangeText={setStudentName} placeholder="e.g., Ayaan Rahman" placeholderTextColor="#555" />
          </Field>

          <Field label="Address">
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="e.g., House 12, Road 3, Block A" placeholderTextColor="#555" />
          </Field>

          <Field label="Subjects (comma separated)">
            <TextInput style={styles.input} value={subjectsText} onChangeText={setSubjectsText} placeholder="e.g., Math, Physics" placeholderTextColor="#555" />
          </Field>

          <Field label="Scheduled Class Days">
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

          <Field label="Classes per Payday">
            <TextInput
              style={styles.input}
              value={classesPerPayday}
              onChangeText={setClassesPerPayday}
              keyboardType="number-pad"
              placeholder="e.g., 12"
              placeholderTextColor="#555"
            />
          </Field>

          <Field label="Last Payday (YYYY-MM-DD)">
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
    </SafeAreaView>
  );
};

const Field = ({ label, children }) => (
  <View style={{ marginBottom: 14 }}>
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

  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { borderWidth: 1, borderColor: '#666', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  dayChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  dayChipText: { color: '#fff' },

  saveBtn: { backgroundColor: ACCENT, borderRadius: 18, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  saveTxt: { color: '#000', fontWeight: '800' },
});

export default AddTuitionScreen;
