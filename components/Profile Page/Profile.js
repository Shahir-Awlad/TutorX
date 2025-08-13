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
import { getDoc, doc, updateDoc, query, collection, where, getDocs, Timestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, Feather, Fontisto, MaterialIcons } from '@expo/vector-icons';
import { db } from '../../firebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width, height } = Dimensions.get('window');

export default function Profile() {
  const [userData, setUserData] = useState({
    username: 'sameen4',
    email: '',
    phoneNumber: '',
    nationality: '',
    imageUrl: null,
    gender: '',
    type: '',
    
  });

  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');

  // Error states
  const [phoneError, setPhoneError] = useState('');
  const [nationalityError, setNationalityError] = useState('');
  const [genderError, setGenderError] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [birthDate, setBirthDate] = useState(null);
  const [editingBirthDate, setEditingBirthDate] = useState(false);
  const [tempBirthDate, setTempBirthDate] = useState(null);

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
          gender: data.gender || null,
          type: data.type || '',
          userId: userDoc.id, 
        });
          if (data.birthDate) {
            setBirthDate(data.birthDate.toDate());
          }
        
      } else {
        Alert.alert('Error', 'User not found');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTempBirthDate(selectedDate); // Store the selected date
      setEditingBirthDate(true); // Show the confirm/cancel UI
    }
  };


    const handleConfirmBirthDate = async () => {
      Alert.alert(
        'Confirm Changes',
        'Are you sure you want to update your birth date?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setEditingBirthDate(false);
              setTempBirthDate(null);
            }
          },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                await updateDoc(doc(db, 'Users', userData.userId), {
                  birthDate: Timestamp.fromDate(tempBirthDate)
                });
                setBirthDate(tempBirthDate);
                setEditingBirthDate(false);
                Alert.alert('Success', 'Birth date updated successfully!');
              } catch (error) {
                console.error('Error updating birth date:', error);
                Alert.alert('Error', 'Failed to update birth date');
              }
            }
          }
        ]
      );
    };

  const handleSaveBirthDate = async (date) => {
    try {
      if (!tempBirthDate) {
        throw new Error("No date selected");
      }
      
      await updateDoc(doc(db, 'Users', userData.userId), {
        birthDate: Timestamp.fromDate(tempBirthDate)
      });
      
      setBirthDate(tempBirthDate); // Update the displayed date
      setEditingBirthDate(false); // Hide the confirm/cancel buttons
      Alert.alert('Success', 'Birth date updated!');
    } catch (error) {
      console.error('Error updating birth date:', error);
      Alert.alert('Error', 'Failed to update birth date');
    }
  };

  const handleSaveChanges = async () => {
    setPhoneError('');
    setNationalityError('');

    if (!tempValue.trim()) {
      if (editingField === 'phoneNumber') setPhoneError('Phone number cannot be empty');
      if (editingField === 'nationality') setNationalityError('Nationality cannot be empty');
      return;
    }

    Alert.alert(
      'Confirm Changes',
      `Are you sure you want to update your ${editingField}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
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
          },
        },
      ],
    );
  };

  const handleEditBirthDate = () => {
    setTempBirthDate(birthDate || new Date()); // Initialize with current date or now
    setShowDatePicker(true); // Show the date picker immediately
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 20}
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
            <View style={styles.decorativeCircleSmallRed} />
            
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

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={styles.fieldValueContainer}>
                <Ionicons name="mail-outline" size={18} color="#C1FF72" style={styles.inputIcon} />
                <Text style={styles.fieldText}>{userData.email || 'No email'}</Text>
              </View>
            </View>

            {/* Phone Number Field */}
            <Text style={styles.fieldLabel}>Phone Number</Text>

            <View style={styles.fieldContainer}>
              
              {editingField === 'phoneNumber' ? (
                <View style={styles.editContainer}>
                  <Ionicons name="call-outline" size={18} color="#C1FF72" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Enter phone number"
                    value={tempValue}
                    onChangeText={setTempValue}
                    style={styles.editInput}
                    keyboardType="phone-pad"
                    placeholderTextColor="#e8e8e8ff"
                    autoFocus
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity onPress={handleSaveChanges}>
                      <Ionicons name="checkmark-circle" size={22} marginRight={8} color="#5ce747ff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleCancelEditing}>
                      <Ionicons name="close-circle" size={22} color="#F54D4D" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.fieldValueContainer}>
                  <Ionicons name="call-outline" size={18} color="#C1FF72" style={styles.inputIcon} />
                  <Text style={styles.fieldText}>
                    {userData.phoneNumber || 'Add phone number'}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => handleStartEditing('phoneNumber', userData.phoneNumber)}
                    style={styles.editButton}
                  >
                    {/* <Ionicons name="create-outline" size={22} color="#C1FF72" /> */}
                    <Feather name="edit-2" size={22} color="#C1FF72" />
                  </TouchableOpacity>
                </View>
              )}
              {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
            </View>

            {/* Nationality Field */}
            <Text style={styles.fieldLabel}>Nationality</Text>
            <View style={styles.fieldContainer}>
              
              {editingField === 'nationality' ? (
                <View style={styles.editContainer}>
                  <Ionicons name="flag-outline" size={18} color="#C1FF72" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Enter nationality"
                    value={tempValue}
                    onChangeText={setTempValue}
                    style={styles.editInput}
                    placeholderTextColor="#fdfdfdff"
                    autoFocus
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity onPress={handleSaveChanges}>
                      <Ionicons name="checkmark-circle" size={22} marginRight={8} color="#5ce747ff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleCancelEditing}>
                      <Ionicons name="close-circle" size={22} color="#F54D4D" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.fieldValueContainer}>
                  <Ionicons name="flag-outline" size={18} color="#C1FF72" style={styles.inputIcon} />
                  <Text style={styles.fieldText}>
                    {userData.nationality || 'Add nationality'}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => handleStartEditing('nationality', userData.nationality)}
                    style={styles.editButton}
                  >
                    {/* <Ionicons name="create-outline" size={22} color="#C1FF72" /> */}
                    <Feather name="edit-2" size={22} color="#C1FF72" />
                  </TouchableOpacity>
                </View>
              )}
              {nationalityError && <Text style={styles.errorText}>{nationalityError}</Text>}
            </View>

            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.fieldContainer}>
              {editingField === 'gender' ? (
                <View style={styles.editContainer}>
                  <Fontisto name="transgender" size={18} color="#C1FF72" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Enter gender"
                    value={tempValue}
                    onChangeText={setTempValue}
                    style={styles.editInput}
                    placeholderTextColor="#e8e8e8ff"
                    autoFocus
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity onPress={handleSaveChanges}>
                      <Ionicons name="checkmark-circle" size={22} marginRight={8} color="#5ce747ff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleCancelEditing}>
                      <Ionicons name="close-circle" size={22} color="#F54D4D" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.fieldValueContainer}>
                  <Fontisto name="transgender" size={18} color="#C1FF72" style={styles.inputIcon} />
                  <Text style={styles.fieldText}>
                    {userData.gender || 'Add gender'}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => handleStartEditing('gender', userData.gender)}
                    style={styles.editButton}
                  >
                    {/* <Ionicons name="create-outline" size={22} color="#C1FF72" /> */}
                    <Feather name="edit-2" size={22} color="#C1FF72"/>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* <Text style={styles.fieldLabel}>Date of Birth</Text>
            <View style={styles.fieldContainer}>
              {editingBirthDate ? (
                <View style={styles.editContainer}>
                  <MaterialIcons name="event" size={18} color="#C1FF72" style={styles.inputIcon} />
                  <Text style={styles.editInput}>
                    {tempBirthDate ? tempBirthDate.toLocaleDateString() : 'Select date'}
                  </Text>
                  <View style={styles.editActions}>
                    <TouchableOpacity onPress={handleConfirmBirthDate}>
                      <Ionicons name="checkmark-circle" size={22} color="#5ce747ff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      setEditingBirthDate(false);
                      setTempBirthDate(null);
                    }}>
                      <Ionicons name="close-circle" size={22} color="#F54D4D" />
                    </TouchableOpacity>
                  </View>
                  {showDatePicker && (
                    <DateTimePicker
                      value={tempBirthDate || new Date()}
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                      themeVariant="dark"
                    />
                  )}
                </View>
              ) : (
                <View style={styles.fieldValueContainer}>
                  <MaterialIcons name="event" size={18} color="#C1FF72" style={styles.inputIcon} />
                  <Text style={styles.fieldText}>
                    {birthDate ? birthDate.toLocaleDateString() : 'Add date of birth'}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setShowDatePicker(true)}
                    style={styles.editButton}
                  >
                    <Feather name="edit-2" size={22} color="#C1FF72" />
                  </TouchableOpacity>
                </View>
              )}
              {showDatePicker && !editingBirthDate && (
                <DateTimePicker
                  value={birthDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  themeVariant="dark"
                />
              )}
            </View> */}

            <Text style={styles.fieldLabel}>Date of Birth</Text>
            <View style={styles.fieldContainer}>
              {editingBirthDate ? (
                <View style={styles.editContainer}>
                  <MaterialIcons name="event" size={18} color="#C1FF72" style={styles.inputIcon} />
                  <Text style={styles.editInput}>
                    {tempBirthDate ? tempBirthDate.toLocaleDateString() : 'Select date'}
                  </Text>
                  <View style={styles.editActions}>
                    <TouchableOpacity onPress={handleSaveBirthDate}>
                      <Ionicons name="checkmark-circle" size={22} color="#5ce747ff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      setEditingBirthDate(false);
                      setTempBirthDate(null);
                    }}>
                      <Ionicons name="close-circle" size={22} color="#F54D4D" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.fieldValueContainer}>
                  <MaterialIcons name="event" size={18} color="#C1FF72" style={styles.inputIcon} />
                  <Text style={styles.fieldText}>
                    {birthDate ? birthDate.toLocaleDateString() : 'Add date of birth'}
                  </Text>
                  <TouchableOpacity 
                    onPress={handleEditBirthDate}  // Changed to use the new handler
                    style={styles.editButton}
                  >
                    <Feather name="edit-2" size={22} color="#C1FF72" />
                  </TouchableOpacity>
                </View>
              )}
              {showDatePicker && (
                <DateTimePicker
                  value={tempBirthDate || birthDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  themeVariant="dark"
                />
              )}
            </View>

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
    height: height * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingTop: 0,
  },
  decorativeCircleLarge: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 240,
    backgroundColor: '#333',
    top: -250,
    right: width * 0.30,
  },
  decorativeCircleSmall: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 55,
    backgroundColor: '#C1FF72',
    top: 2,
    right: width * 0.20,
  },
  decorativeCircleSmallRed: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 55,
    backgroundColor: '#F54D4D',
    top: 70,
    right: width * 0.05,
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
    top: -10,
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
    marginBottom: 0,
  },
  fieldsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  fieldContainer: {
    marginBottom: 15,
  },
  fieldValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ffffffff',
    paddingBottom: 12,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ffffffff',
    paddingBottom: 8,
  },
  inputIcon: {
    marginRight: 15,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 5,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginLeft: 10,
  },
  editButton:{
    marginLeft: 'auto',
  },
  fieldText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },

  fieldLabel: {
    fontSize: 18,
    color: '#C1FF72',
    marginBottom: 10,
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
    color: '#ffffffff',
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