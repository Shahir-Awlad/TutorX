import React, { useState, useCallback } from 'react';
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function Login() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleLogin = useCallback(() => {
    if (!email || !password) {
      if (!email) setEmailError('Please enter your email');
      if (!password) setPasswordError('Please enter your password');
      return;
    }

    signInWithEmailAndPassword(auth, email.trim(), password)
      .then(({ user }) => {
        Alert.alert('Login Successful', `Welcome back, ${user.email}`);
        setEmail('');
        setPassword('');
        console.log("Login success:", user.email);
        //onLoginSuccess();
        navigation.reset({ index: 0, routes: [{ name: 'App' }] });
      })
      .catch((error) => {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
          setEmailError('Invalid email');
        }
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credentials') {
          setPasswordError('Password doesn’t match');
        }
        if (
          error.code === 'auth/user-not-found' ||
          error.code === 'auth/invalid-email' ||
          error.code === 'auth/wrong-password'
        ) {
          return;
        }
        setPasswordError('Invalid credentials');
        Alert.alert('Login Error', error.message);
        console.log('Login error:', error.message);
      });
  }, [email, password, navigation]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000'}}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#111" />

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/Logo cropped.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Login Box */}
          <View style={styles.loginBox}>
            <Text style={styles.loginText}>Log in to your account</Text>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Icon name="email-outline" size={22} color="#000" style={styles.inputIcon} />
              <TextInput
                placeholder="Email"
                value={email}
                style={styles.input}
                placeholderTextColor="#333"
                onChangeText={(t) => {
                  setEmail(t);
                  setEmailError('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            {emailError ? (
              <View>
                <Text style={styles.errorText}>{emailError}</Text>
              </View>
            ) : null}

            {/* Password */}
            <View style={styles.inputContainer}>
              <Icon name="lock-outline" size={22} color="#000" style={styles.inputIcon} />
              <TextInput
                placeholder="Password"
                value={password}
                secureTextEntry={!showPassword}
                style={styles.input}
                placeholderTextColor="#333"
                onChangeText={(t) => {
                  setPassword(t);
                  setPasswordError('');
                }}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <Icon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#000"
                  style={{ marginLeft: 10 }}
                />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <View>
                <Text style={styles.errorText}>{passwordError}</Text>
              </View>
            ) : null}

            {/* Login Button */}
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>

            {/* Sign Up Message */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don&apos;t have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
  },
  logoContainer: { marginBottom: 60, padding: 0 },
  logo: { width: 200, height: 80, paddingBottom: 0 },
  loginBox: {
    backgroundColor: '#2e2e2e',
    width: '85%',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
  },
  loginText: {
    color: '#C1FF72',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 35,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginLeft: 10,
    marginBottom: 0,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ccc',
    borderRadius: 30,
    paddingHorizontal: 15,
    marginBottom: 9,
    marginTop: 9,
    width: '100%',
  },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, height: 60, fontSize: 15, color: '#000' },
  loginButton: {
    backgroundColor: '#C1FF72',
    borderRadius: 30,
    width: '60%',
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 10,
    marginBottom: 30,
  },
  loginButtonText: { fontWeight: 'bold', color: '#000', fontSize: 16 },
  signupContainer: { flexDirection: 'row', marginTop: 15, justifyContent: 'center' },
  signupText: { color: '#ccc', fontSize: 13 },
  signupLink: { color: '#C1FF72', fontWeight: 'bold' },
});
