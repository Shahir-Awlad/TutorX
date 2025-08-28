import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
} from 'react-native';

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, query, getDocs, where, collection } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';    
import DropDownPicker from 'react-native-dropdown-picker';

import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function Signup() {
  const [accountType, setAccountType] = useState('Teacher');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [institute, setInstitute] = useState('');
  const [studentClass, setStudentClass] = useState('');

  const [openClass, setOpenClass] = useState(false);
  const [classItems, setClassItems] = useState([
    { label: 'Play Group', value: 'Play Group' },
    { label: 'Nursery', value: 'Nursery' },
    { label: 'KG', value: 'KG' },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: `${i + 1}`,
      value: `${i + 1}`
    }))
  ]);


  const [usernameError, setUsernameError] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [instituteError, setInstituteError] = useState('');
  const [classError, setClassError] = useState('');


  const navigation = useNavigation();

  const handleToggle = () => {
    setAccountType(prev => (prev === 'Teacher' ? 'Student' : 'Teacher'));
  };

  const handleSignup = async () => {
    setPasswordError('');
    setUsernameError('');
    setEmailError('');

    if (!username || !name || !email || !password || !confirmPass || (accountType === 'Student' && (!institute || !studentClass))) {
      if(!username) setUsernameError('Username is required');
      if(!name) setNameError('Name is required');
      if(!email) setEmailError('Email is required');
      if(!password || !confirmPass) setPasswordError('Password is required');
      if(!institute && accountType === 'Student') setInstituteError('Institute is required');
      if(!studentClass && accountType === 'Student') setClassError('Class is required');
      return;
    }
    if (accountType === 'Student') {
      if (!institute || !studentClass) {
        Alert.alert('Error', 'Please fill institute and class for Student account.');
        return;
      }
    }


    if (password !== confirmPass) {
      setPasswordError('Passwords do not match');
      //Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
        const q = query(collection(db, 'Users'), where('username', '==', username));
        const querySnapshot = await getDocs(q);
        if(!querySnapshot.empty) {
          setUsernameError('Username already exists');
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log('User created:', user.email);
        console.log('User ID:', user.uid);

        await setDoc(doc(db, 'Users', user.uid), {
            email: email,
            username: username,
            type: accountType,
            name: name,
            //uid: user.uid,
            phoneNumber: null,
            gender: null,
            imageUrl: null,
            nationality: null,
            dateOfBirth: null,
            ...(accountType === 'Student' ? { 
              institute: institute || null, 
              class: studentClass || null
            } : {})
        });
        
        Alert.alert('Success', 'Account created! Please log in.');
        navigation.navigate('Login');

    } catch (error) {
      if(error.code == 'auth/email-already-in-use') {
        setEmailError('Email is already in use');
       // Alert.alert('Signup Failed', error.message);
      } else if (error.code === 'auth/invalid-email') {
        setEmailError('Invalid email address');
      } else if (error.code === 'auth/weak-password') {
        setPasswordError('Password should be at least 6 characters');
      } else {
        setEmailError(error.message);
      }
    };
  }

  return (
    <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#000' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} // Adjust as needed
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={styles.container}>
        <Image source={require('../../assets/Logo cropped.png')} style={styles.logo} resizeMode="contain" />

        <Text style={styles.registerTitle}>Register</Text>
        <Text style={styles.questionText}>Are you a teacher or a student?</Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, accountType === 'Teacher' && styles.selectedToggle]}
            onPress={handleToggle}
          >
            <Text style={[styles.toggleText, accountType === 'Teacher' && styles.selectedText]}>Teacher</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, accountType === 'Student' && styles.selectedToggle]}
            onPress={handleToggle}
          >
            <Text style={[styles.toggleText, accountType === 'Student' && styles.selectedText]}>Student</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputBox}>
          <Ionicons name="person" size={18} color="black" style={styles.icon} />
          <TextInput
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            placeholderTextColor="#333"
          />
        
        </View>

         {usernameError ? <View>
          <Text style={styles.errorText}>{usernameError}</Text>
         </View> : null}

        <View style={styles.inputBox}>
          <Ionicons name="mail" size={18} color="black" style={styles.icon} />
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#333"
          />
        </View>

        {emailError ? <View>
          <Text style={styles.errorText}>{emailError}</Text>
        </View> : null}

        <View style={styles.inputBox}>
          <Ionicons name="person-circle" size={18} color="black" style={styles.icon} />
          <TextInput
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholderTextColor="#333"
          />
        </View>

         {nameError ? <View>
          <Text style={styles.errorText}>{nameError}</Text>
         </View> : null}

        <View style={styles.inputBox}>
          <Ionicons name="lock-closed" size={18} color="black" style={styles.icon} />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
            placeholderTextColor="#333"
          />

          <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="black" style={styles.icon} />
          </TouchableOpacity>
        </View>

         {passwordError ? <View> 
          <Text style={styles.errorText}>{passwordError}</Text>
         </View> : null}

        <View style={styles.inputBox}>
          <Ionicons name="lock-closed" size={18} color="black" style={styles.icon} />
          <TextInput
            placeholder="Confirm password"
            value={confirmPass}
            onChangeText={setConfirmPass}
            secureTextEntry={!showConfirmPassword}
            style={styles.input}
            placeholderTextColor="#333"
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(prev => !prev)}>
            <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color="black" style={styles.icon} />
          </TouchableOpacity>
        </View>

        {accountType === 'Student' && (
        <>
          <View style={styles.inputBox}>
            <Ionicons name="school" size={18} color="black" style={styles.icon} />
            <TextInput
              placeholder="Institute"
              value={institute}
              onChangeText={setInstitute}
              style={styles.input}
              placeholderTextColor="#333"
            />
          </View>
          
          {instituteError ? <View>
          <Text style={styles.errorText}>{instituteError}</Text>
         </View> : null}

          <View style={styles.inputBox}>
            <Ionicons name="book" size={18} color="black" style={styles.icon} />
            <DropDownPicker
              open={openClass}
              value={studentClass}
              items={classItems}
              setOpen={setOpenClass}
              setValue={setStudentClass}
              setItems={setClassItems}
              placeholder="Select Class"
              style={{
                borderColor: '#ccc',
                borderWidth: 1,
                borderRadius: 8,
                //paddingHorizontal: 10,
                backgroundColor: '#ccc',
                width: '92%',
                height: 28,
              }}
              dropDownContainerStyle={{
                borderWidth: 1,
                borderColor: '#111',
                borderRadius: 10,
                backgroundColor: '#ccc', 
                width: '92%',
                maxHeight: 180, 
              }}
              listMode="SCROLLVIEW"
              scrollViewProps={{
                nestedScrollEnabled: true
              }}
            />
          </View>

          {classError ? <View>
          <Text style={styles.errorText}>{classError}</Text>
         </View> : null}
        </>
      )}


        <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
          <Text style={styles.signupText}>Sign Up</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
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
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 40,
    marginBottom: 10,
    marginTop: 8,
  },
  registerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#C1FF72',
    marginBottom: 10,
    marginTop: 10,
  },
  questionText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
    marginTop: 15,
  },
  errorText: {
    color: 'red',
    fontStyle: 'bold',
    alignSelf: 'flex-start',
    marginLeft: 10,
    //marginBottom: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 40,
    marginBottom: 30,
    width: '80%',
    padding: 5,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 40,
  },
  selectedToggle: {
    backgroundColor: '#C1FF72',
  },
  toggleText: {
    color: '#fff',
    fontWeight: '600',
  },
  selectedText: {
    color: '#000',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ccc',
    borderRadius: 40,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 9,
    marginTop: 9,
    paddingTop: 15,
    paddingBottom: 15,
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
  signupButton: {
    backgroundColor: '#C1FF72',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 40,
    marginTop: 100,
  },
  signupText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#000',
  },
});
