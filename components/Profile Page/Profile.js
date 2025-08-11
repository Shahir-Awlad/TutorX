import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { getDoc, doc } from 'firebase/firestore';
import { auth, firestore } from '../../firebaseConfig';
import { Feather } from '@expo/vector-icons';

export default function Profile() {
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    nationality: '',
    profileImage: null,
  });

  const [editMode, setEditMode] = useState({
    phoneNumber: false,
    nationality: false,
  });

  useEffect(() => {
    const fetchUserData = async () => {
      const uid = auth.currentUser.uid;
      const docRef = doc(firestore, 'Users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData({
          username: data.username,
          email: data.email,
          phoneNumber: data.phoneNumber || '',
          nationality: data.nationality || '',
          profileImage: data.profileImageUrl || null,
        });
      }
    };

    fetchUserData();
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Decorative Circles */}
        <View style={styles.backgroundCircleLarge} />
        <View style={styles.backgroundCircleSmall} />

        {/* Profile Image */}
        <View style={styles.profileImageContainer}>
          <Image
            source={
              userData.profileImage
                ? { uri: userData.profileImage }
                : require('../../assets/default_user.jpg')
            }
            style={styles.profileImage}
          />
          <Text style={styles.username}>{userData.username}</Text>
        </View>

        {/* Profile Details */}
        <View style={styles.detailsContainer}>

          {/* Email (non-editable) */}
          <View style={styles.detailRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.detailValue}>{userData.email}</Text>
            <Feather name="edit-2" size={16} color="#ccc" style={styles.editIcon} />
          </View>

          {/* Phone Number */}
          <View style={styles.detailRow}>
            <Text style={styles.label}>Phone Number</Text>
            {editMode.phoneNumber ? (
              <TextInput
                style={styles.input}
                value={userData.phoneNumber}
                onChangeText={(text) =>
                  setUserData((prev) => ({ ...prev, phoneNumber: text }))
                }
              />
            ) : (
              <Text style={styles.detailValue}>{userData.phoneNumber}</Text>
            )}
            <TouchableOpacity
              onPress={() =>
                setEditMode((prev) => ({
                  ...prev,
                  phoneNumber: !prev.phoneNumber,
                }))
              }
            >
              <Feather name="edit-2" size={16} color="white" style={styles.editIcon} />
            </TouchableOpacity>
          </View>

          {/* Nationality */}
          <View style={styles.detailRow}>
            <Text style={styles.label}>Nationality</Text>
            {editMode.nationality ? (
              <TextInput
                style={styles.input}
                value={userData.nationality}
                onChangeText={(text) =>
                  setUserData((prev) => ({ ...prev, nationality: text }))
                }
              />
            ) : (
              <Text style={styles.detailValue}>{userData.nationality}</Text>
            )}
            <TouchableOpacity
              onPress={() =>
                setEditMode((prev) => ({
                  ...prev,
                  nationality: !prev.nationality,
                }))
              }
            >
              <Feather name="edit-2" size={16} color="white" style={styles.editIcon} />
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#0A0E2F',
    paddingTop: 80,
    paddingBottom: 40,
  },
  backgroundCircleLarge: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#C1FF72',
    top: -100,
    left: -100,
    opacity: 0.3,
  },
  backgroundCircleSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#C1FF72',
    top: 0,
    right: -50,
    opacity: 0.2,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#C1FF72',
  },
  username: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  detailsContainer: {
    width: '85%',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    flex: 1.2,
    color: '#ccc',
    fontSize: 16,
  },
  detailValue: {
    flex: 2,
    color: 'white',
    fontSize: 16,
  },
  input: {
    flex: 2,
    color: 'white',
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#C1FF72',
  },
  editIcon: {
    marginLeft: 10,
  },
});
