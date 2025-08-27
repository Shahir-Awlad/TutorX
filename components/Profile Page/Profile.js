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
import DropDownPicker from 'react-native-dropdown-picker';
import { getAuth } from 'firebase/auth';

import TabBar from '../Navigation/TabBar';

const { width, height } = Dimensions.get('window');

export default function Profile() {
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    nationality: '',
    imageUrl: null,
    gender: '',
    type: '',
    name: '',
    institute: '',
    class: '',
  });

  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');

  // Gender
  const [openGender, setOpenGender] = useState(false);
  const [selectedGender, setSelectedGender] = useState(userData.gender || '');

  // Class
  const [openClass, setOpenClass] = useState(false);
  const [selectedClass, setSelectedClass] = useState(userData.class || '');

  // Items
  const genderItems = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' }
  ];

  const classItems = [
    { label: 'Play Group', value: 'Play Group' },
    { label: 'Nursery', value: 'Nursery' },
    { label: 'KG', value: 'KG' },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: `${i + 1}`,
      value: `${i + 1}`
    }))
  ];


  const [phoneError, setPhoneError] = useState('');
  const [nationalityError, setNationalityError] = useState('');
  const [instituteError, setInstituteError] = useState('');
  const [classError, setClassError] = useState('');
  const [genderError, setGenderError] = useState('');
   const [nameError, setnameError] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [birthDate, setBirthDate] = useState(null);
  const [editingBirthDate, setEditingBirthDate] = useState(false);
  const [tempBirthDate, setTempBirthDate] = useState(null);

  const navigation = useNavigation();

  const loadUserData = async () => {
    try {

      const auth = getAuth();
      const user = auth.currentUser; // get logged-in user
      if (!user) {
        Alert.alert('Error', 'No logged-in user found');
        return;
      }

      const userDocRef = doc(db, 'Users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData({
          username: data.username || '',
          email: data.email || '',
          name: data.name || '',
          phoneNumber: data.phoneNumber || null,
          nationality: data.nationality || null,
          imageUrl: data.imageUrl || null,
          gender: data.gender || null,
          type: data.type || '',
          institute: data.institute || '',
          class: data.class !== undefined ? String(data.class) : '',
          birthDate: data.birthDate ? data.birthDate.toDate() : null,
          userId: user.uid,
        });
        if (data.birthDate) setBirthDate(data.birthDate.toDate());
      } else {
        Alert.alert('Error', 'User data not found');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    }
  };


  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTempBirthDate(selectedDate); 
      setEditingBirthDate(true); 
    }
  };

  const handleSaveBirthDate = async (date) => {
    try {
      if (!tempBirthDate) {
        throw new Error("No date selected");
      }
      
      Alert.alert(
        'Confirm Changes',
        'Are you sure you want to update your birth date to ' + tempBirthDate.toLocaleDateString() + '?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                if (userData.userId) {
                  await updateDoc(doc(db, 'Users', userData.userId), {
                    birthDate: Timestamp.fromDate(tempBirthDate)
                  });

                  setBirthDate(tempBirthDate);
                  setEditingBirthDate(false);
                  //setTempBirthDate(null);
                  Alert.alert('Success', 'Birth date updated successfully!');
                }
              } catch (error) {
                console.error('Error updating birth date:', error);
                Alert.alert('Error', 'Failed to update birth date');
              }
            },
          },
        ]
      )
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
      if (editingField === 'gender') setGenderError('Gender cannot be empty');
      if (editingField === 'institute') setInstituteError('Institute cannot be empty');
      if (editingField === 'class') setClassError('Class cannot be empty');
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
                  [editingField]: editingField === 'class' ? parseInt(tempValue.trim(), 10) : tempValue.trim()
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
    setTempBirthDate(birthDate || new Date()); 
    setShowDatePicker(true);
  }
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

  const handleCancelEditing = () => {
    setEditingField(null);
    setTempValue('');
    setPhoneError('');
    setNationalityError('');
    setSelectedGender(userData.gender || '');
    setGenderError('');
    setInstituteError('');
    setClassError();
    setSelectedClass(userData.class || '');
  };

  useEffect(() => {
    loadUserData();
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 20}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 90, backgroundColor: '#000' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}

      >
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          
          <View style={styles.headerContainer}>
            <View style={styles.decorativeCircleLarge} />
            <View style={styles.decorativeCircleSmall} />
            {/* <View style={styles.decorativeCircleSmallRed} /> */}
            
            {/* Profile Image */}
            <View style={styles.profileImageContainer}>
              <Image
                source={
                  userData.imageUrl
                    ? { uri: userData.imageUrl }
                    : require('../../assets/default_user.jpg') 
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
                
            {/* Name Field */}
            <Text style={styles.fieldLabel}>Name</Text>

            <View style={styles.fieldContainer}>
              
              {editingField === 'name' ? (
                <View style={styles.editContainer}>
                  <Ionicons name="person-circle-outline" size={18} color="#C1FF72" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Enter your name"
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
                  <Ionicons name="person-circle-outline" size={18} color="#C1FF72" style={styles.inputIcon} />
                  <Text style={styles.fieldText}>
                    {userData.name || 'Add your name'}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => handleStartEditing('name', userData.name)}
                    style={styles.editButton}
                  >
                    {/* <Ionicons name="create-outline" size={22} color="#C1FF72" /> */}
                    <Feather name="edit-2" size={22} color="#C1FF72" />
                  </TouchableOpacity>
                </View>
              )}
              {nameError && <Text style={styles.errorText}>{nameError}</Text>}
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
                  <Text style={styles.editInput}>{selectedGender}</Text>
                  <View style={styles.editActions}>
                    <TouchableOpacity onPress={handleSaveChanges}>
                      <Ionicons name="checkmark-circle" size={22} color="#5ce747ff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress= {handleCancelEditing}
                    >
                      <Ionicons name="close-circle" size={22} color="#F54D4D" />
                    </TouchableOpacity>
                  </View>
                </View>
            ) : (
              <View style={styles.fieldValueContainer}>
                <Fontisto name="transgender" size={18} color="#C1FF72" style={styles.inputIcon} />
                <DropDownPicker
                  open={openGender}
                  value={selectedGender}
                  items={genderItems}
                  setOpen={setOpenGender}
                  setValue={(callback) => {
                    const newValue = callback(selectedGender);
                    setSelectedGender(newValue);
                    setEditingField('gender'); 
                    return newValue;
                  }}
                  // setValue={setSelectedGender}
                  placeholder= {userData.gender || "Add Gender"}
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownContainer}
                  listMode="SCROLLVIEW"
                  textStyle={styles.dropdownText}
                  ArrowDownIconComponent={({ style }) => (
                    <Ionicons name="chevron-down" size={24} color="#C1FF72" style={style} />
                  )}
                  ArrowUpIconComponent={({ style }) => (
                    <Ionicons name="chevron-up" size={22} color="#C1FF72" style={style} />
                  )}
                  onSelectItem={(item) => {
                    setSelectedGender(item.value);
                    setTempValue(item.value);
                    setOpenGender(false);
                    setEditingField('gender');
                  }}
                />
              </View>
            )}
            {genderError && <Text style={styles.errorText}>{genderError}</Text>}
          </View>


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
                    onPress={handleEditBirthDate}  
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

            {userData.type === 'Student' && (
            <>
              <Text style={styles.fieldLabel}>Institute</Text>
              <View style={styles.fieldContainer}>
                {editingField === 'institute' ? (
                  <View style={styles.editContainer}>
                    <Ionicons name="school" size={18} color="#C1FF72" style={styles.inputIcon} />
                    <TextInput
                      placeholder="Enter institute name"
                      value={tempValue}
                      onChangeText={setTempValue}
                      style={styles.editInput}
                      placeholderTextColor="#e8e8e8ff"
                      autoFocus
                    />
                    <View style={styles.editActions}>
                      <TouchableOpacity onPress={handleSaveChanges}>
                        <Ionicons name="checkmark-circle" size={22} color="#5ce747ff" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleCancelEditing}>
                        <Ionicons name="close-circle" size={22} color="#F54D4D" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.fieldValueContainer}>
                    <Ionicons name="school" size={18} color="#C1FF72" style={styles.inputIcon} />
                    <Text style={styles.fieldText}>
                      {userData.institute || 'Add institute'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleStartEditing('institute', userData.institute)}
                      style={styles.editButton}
                    >
                      <Feather name="edit-2" size={22} color="#C1FF72" />
                    </TouchableOpacity>
                  </View>
                )}
                 {instituteError && <Text style={styles.errorText}>{instituteError}</Text>}
              </View>

              <Text style={styles.fieldLabel}>Class</Text>
               <View style={styles.fieldContainer}>
            {editingField === 'class' ? (
                <View style={styles.editContainer}>
                  <Ionicons name="book" size={18} color="#C1FF72" style={styles.inputIcon} />
                  <Text style={styles.editInput}>{selectedClass}</Text>
                  <View style={styles.editActions}>
                    <TouchableOpacity onPress={handleSaveChanges}>
                      <Ionicons name="checkmark-circle" size={22} color="#5ce747ff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress= {handleCancelEditing}
                    >
                      <Ionicons name="close-circle" size={22} color="#F54D4D" />
                    </TouchableOpacity>
                  </View>
                </View>
            ) : (
              <View style={styles.fieldValueContainer}>
                <Ionicons name="book" size={18} color="#C1FF72" style={styles.inputIcon} />
                <DropDownPicker
                  open={openClass}
                  value={selectedClass}
                  items={classItems}
                  setOpen={setOpenClass}
                  setValue={(callback) => {
                    const newValue = callback(selectedClass);
                    setSelectedClass(newValue);
                    setEditingField('class'); 
                    return newValue;
                  }}
                  placeholder={userData.class || "Enter Class"}
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownContainer}
                  listMode="SCROLLVIEW"
                  textStyle={styles.dropdownText}
                  ArrowDownIconComponent={({ style }) => (
                    <Ionicons name="chevron-down" size={24} color="#C1FF72" style={style} />
                  )}
                  ArrowUpIconComponent={({ style }) => (
                    <Ionicons name="chevron-up" size={22} color="#C1FF72" style={style} />
                  )}
                  onSelectItem={(item) => {
                    setSelectedClass(item.value);
                    setTempValue(item.value);
                    setOpenClass(false);
                    setEditingField('class');
                  }}
                />
              </View>
            )}
            {classError && <Text style={styles.errorText}>{classError}</Text>}
          </View>
            </>
          )}


          </View>
          
        </SafeAreaView>
      </ScrollView>
      <TabBar />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
    paddingBottom: 55,
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
  dropdown: {
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#000', 
    borderRadius: 10,
    width: '94%',
    height: 30,
  },
   dropdownContainer: {
    borderWidth: 1,
    borderColor: '#8a8a8aff',
    borderRadius: 10,
    backgroundColor: '#333', 
    width: '92%',
    maxHeight: 180, 
  },
  dropdownText: {
    color: '#fff',
    fontSize: 16,
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
    marginLeft: 8,
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