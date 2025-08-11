import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions,
  Alert
} from 'react-native';
import { getDoc, doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../firebaseConfig';

const { width, height } = Dimensions.get('window');

export default function Profile() {
  const [userData, setUserData] = useState({
    username: 'sameen4',
    email: '',
    phoneNumber: '',
    nationality: '',
    imageUrl: null,
    type: '',
  });

  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');

  // Error states
  const [phoneError, setPhoneError] = useState('');
  const [nationalityError, setNationalityError] = useState('');

  const navigation = useNavigation();

  // Load user data from Firestore
  const loadUserData = async () => {
    try {
      const q = query(collection(db, 'Users'), where('username', '==', userData.username));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const data = userDoc.data();
        
        // Set data with appropriate placeholders for null values
        setUserData({
          username: data.username || '',
          email: data.email || '',
          phoneNumber: data.phoneNumber || null,
          nationality: data.nationality || null,
          imageUrl: data.imageUrl || null,
          type: data.type || '',
          userId: userDoc.id, // Store document ID for updates
        });
      } else {
        Alert.alert('Error', 'User not found');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    }
  };

  // Save changes to Firestore
  const handleSaveChanges = async () => {
    setPhoneError('');
    setNationalityError('');

    if (!tempValue.trim()) {
      if (editingField === 'phoneNumber') setPhoneError('Phone number cannot be empty');
      if (editingField === 'nationality') setNationalityError('Nationality cannot be empty');
      return;
    }

    try {
      if (userData.userId) {
        await updateDoc(doc(db, 'Users', userData.userId), {
          [editingField]: tempValue.trim()
        });

        setUserData(prev => ({
          ...prev,
          [editingField]: tempValue.trim()
        }));

        setEditingField(null);
        setTempValue('');
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  // Start editing a field
  const handleStartEditing = (field, currentValue) => {
    if (field === 'email') {
      Alert.alert('Info', 'Email cannot be edited as it\'s used for authentication');
      return;
    }
    setEditingField(field);
    setTempValue(currentValue || '');
    setPhoneError('');
    setNationalityError('');
  };

  // Cancel editing
  const handleCancelEditing = () => {
    setEditingField(null);
    setTempValue('');
    setPhoneError('');
    setNationalityError('');
  };

  useEffect(() => {
    loadUserData();
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          
          {/* Header with decorative elements */}
          <View style={styles.headerContainer}>
            <View style={styles.decorativeCircleLarge} />
            <View style={styles.decorativeCircleSmall} />
            
            {/* Profile Image */}
            <View style={styles.profileImageContainer}>
              <Image
                source={
                  userData.imageUrl
                    ? { uri: userData.imageUrl }
                    : require('../../assets/default_user.jpg') // Add this to your assets
                }
                style={styles.profileImage}
                onError={() => {
                  setUserData(prev => ({ ...prev, imageUrl: null }));
                }}
              />
            </View>
            
            {/* Username */}
            <Text style={styles.username}>{userData.username || 'No Username'}</Text>
            <Text style={styles.userType}>{userData.type || 'User'}</Text>
          </View>

          {/* Profile Fields */}
          <View style={styles.fieldsContainer}>
            
            {/* Email Field */}
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.inputBox}>
              <Ionicons name="mail" size={18} color="#666" style={styles.icon} />
              <Text style={styles.fieldText}>{userData.email || 'No email'}</Text>
              <TouchableOpacity onPress={() => handleStartEditing('email', userData.email)}>
                <Ionicons name="create-outline" size={18} color="#666" style={styles.icon} />
              </TouchableOpacity>
            </View>

            {/* Phone Number Field */}
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {editingField === 'phoneNumber' ? (
              <View>
                <View style={styles.inputBox}>
                  <Ionicons name="call" size={18} color="black" style={styles.icon} />
                  <TextInput
                    placeholder="Enter phone number"
                    value={tempValue}
                    onChangeText={setTempValue}
                    style={styles.input}
                    keyboardType="phone-pad"
                    placeholderTextColor="#333"
                    autoFocus
                  />
                  <TouchableOpacity onPress={handleSaveChanges} style={styles.actionButton}>
                    <Ionicons name="checkmark" size={18} color="#4CAF50" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCancelEditing} style={styles.actionButton}>
                    <Ionicons name="close" size={18} color="#f44336" />
                  </TouchableOpacity>
                </View>
                {phoneError ? (
                  <Text style={styles.errorText}>{phoneError}</Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.inputBox}>
                <Ionicons name="call" size={18} color="#666" style={styles.icon} />
                <Text style={styles.fieldText}>
                  {userData.phoneNumber || 'Add phone number'}
                </Text>
                <TouchableOpacity onPress={() => handleStartEditing('phoneNumber', userData.phoneNumber)}>
                  <Ionicons name="create-outline" size={18} color="#666" style={styles.icon} />
                </TouchableOpacity>
              </View>
            )}

            {/* Nationality Field */}
            <Text style={styles.fieldLabel}>Nationality</Text>
            {editingField === 'nationality' ? (
              <View>
                <View style={styles.inputBox}>
                  <Ionicons name="flag" size={18} color="black" style={styles.icon} />
                  <TextInput
                    placeholder="Enter nationality"
                    value={tempValue}
                    onChangeText={setTempValue}
                    style={styles.input}
                    placeholderTextColor="#333"
                    autoFocus
                  />
                  <TouchableOpacity onPress={handleSaveChanges} style={styles.actionButton}>
                    <Ionicons name="checkmark" size={18} color="#4CAF50" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCancelEditing} style={styles.actionButton}>
                    <Ionicons name="close" size={18} color="#f44336" />
                  </TouchableOpacity>
                </View>
                {nationalityError ? (
                  <Text style={styles.errorText}>{nationalityError}</Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.inputBox}>
                <Ionicons name="flag" size={18} color="#666" style={styles.icon} />
                <Text style={styles.fieldText}>
                  {userData.nationality || 'Add nationality'}
                </Text>
                <TouchableOpacity onPress={() => handleStartEditing('nationality', userData.nationality)}>
                  <Ionicons name="create-outline" size={18} color="#666" style={styles.icon} />
                </TouchableOpacity>
              </View>
            )}

          </View>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerContainer: {
    height: height * 0.45,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingTop: 40,
  },
  decorativeCircleLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#333',
    top: 80,
    left: width * 0.15,
  },
  decorativeCircleSmall: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#C1FF72',
    top: 50,
    right: width * 0.2,
  },
  profileImageContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#ccc',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 15,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  userType: {
    fontSize: 16,
    color: '#C1FF72',
    marginBottom: 20,
  },
  fieldsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  fieldLabel: {
    fontSize: 16,
    color: '#C1FF72',
    marginBottom: 8,
    fontWeight: '600',
    marginTop: 15,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ccc',
    borderRadius: 40,
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 5,
    width: '100%',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  fieldText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  actionButton: {
    marginLeft: 5,
    padding: 5,
  },
  errorText: {
    color: 'red',
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginLeft: 10,
    marginBottom: 5,
  },
});