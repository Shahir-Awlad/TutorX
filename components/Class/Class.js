import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { format } from 'date-fns';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function Class() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Timer states
  const [time, setTime] = useState(0); // Time in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Class info states
  const [studentName, setStudentName] = useState('');
  const [subject, setSubject] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  
  const intervalRef = useRef(null);

  useEffect(() => {
    initializeClass();
    
    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const initializeClass = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        navigation.goBack();
        return;
      }

      // Fetch user role
      const userDoc = await getDoc(doc(db, 'Users', user.uid));
      if (userDoc.exists()) {
        const role = userDoc.data().type;
        setUserRole(role);
      }

      // Set current date
      const today = format(new Date(), 'MM/dd/yyyy');
      setCurrentDate(today);

      // Get class info from route params if available
      if (route.params) {
        setStudentName(route.params.studentName || 'Student');
        setSubject(route.params.subject || 'Subject');
      } else {
        // Fallback values
        setStudentName('Asif Shah');
        setSubject('Math');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error initializing class:', error);
      Alert.alert('Error', 'Failed to initialize class');
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (userRole === 'Student') {
      Alert.alert('Class Started', 'Class has started');
      return;
    }
    
    setIsRunning(!isRunning);
  };

  const handleStop = () => {
    if (userRole === 'Teacher') {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    if (userRole === 'Teacher') {
      setIsRunning(false);
      setTime(0);
    }
  };

  const handlePost = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Get current month key for Firebase document
      const monthKey = format(new Date(), 'MMMM yyyy');
      const dateKey = format(new Date(), 'yyyy-MM-dd');
      
      // Reference to the schedule document
      const scheduleDocRef = doc(db, 'Users', user.uid, 'Schedule', monthKey);
      
      // Get existing schedule data
      const scheduleDoc = await getDoc(scheduleDocRef);
      let scheduleData = {};
      
      if (scheduleDoc.exists()) {
        scheduleData = scheduleDoc.data();
      }
      
      // Find and update today's class event
      if (scheduleData[dateKey]) {
        const updatedEvents = scheduleData[dateKey].map(event => {
          // Update class events for today
          if (event.type === 'class' && !event.completed) {
            return {
              ...event,
              completed: true,
              classTime: time, // Store the timer duration in seconds
              classTimeFormatted: formatTime(time) // Store formatted time for easy display
            };
          }
          return event;
        });
        
        scheduleData[dateKey] = updatedEvents;
        
        // Update the document in Firebase
        await setDoc(scheduleDocRef, scheduleData, { merge: true });
        
        Alert.alert(
          'Class Posted', 
          `Class completed successfully!\nDuration: ${formatTime(time)}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        // If no events exist for today, create a new completed class event
        const newEvent = {
          id: `class-${dateKey}-${Date.now()}`,
          type: 'class',
          name: studentName,
          subject: subject,
          completed: true,
          classTime: time,
          classTimeFormatted: formatTime(time),
          time: 'All Day'
        };
        
        scheduleData[dateKey] = [newEvent];
        
        await setDoc(scheduleDocRef, scheduleData, { merge: true });
        
        Alert.alert(
          'Class Posted', 
          `Class completed successfully!\nDuration: ${formatTime(time)}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('Error posting class:', error);
      Alert.alert('Error', 'Failed to post class. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C1FF72" />
        <Text style={styles.loadingText}>Loading Class...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header with Logo */}
      <View style={styles.header}>
        <Image 
          source={require('../../assets/Logo cropped.png')} // Adjust path as needed
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* Class Time Section */}
      <View style={styles.timerSection}>
        <View style={styles.timerHeader}>
          <View style={styles.timerIndicator} />
          <Text style={styles.timerLabel}>Class Time</Text>
        </View>

        {/* Timer Circle */}
        <View style={styles.timerContainer}>
          <View style={styles.timerCircle}>
            <Text style={styles.timerText}>{formatTime(time)}</Text>
            <Text style={styles.totalTimeText}>Total Time</Text>
          </View>
        </View>
      </View>

      {/* Class Info */}
      <View style={styles.classInfo}>
        <Text style={styles.studentName}>{studentName}</Text>
        <Text style={styles.subject}>{subject}</Text>
        <Text style={styles.date}>{currentDate}</Text>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlButtons}>
        <TouchableOpacity 
          style={[styles.controlButton, styles.startButton]} 
          onPress={handleStart}
        >
          <Text style={styles.buttonText}>
            {userRole === 'Teacher' ? (isRunning ? 'Pause' : 'Start') : 'Start'}
          </Text>
        </TouchableOpacity>

        {userRole === 'Teacher' && (
          <>
            <TouchableOpacity 
              style={[styles.controlButton, styles.stopButton]} 
              onPress={handleStop}
            >
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, styles.resetButton]} 
              onPress={handleReset}
            >
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Post Button */}
      <TouchableOpacity style={styles.postButton} onPress={handlePost}>
        <Text style={styles.postButtonText}>Post</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  logoImage: {
    width: 150,
    height: 60,
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  timerIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C1FF72',
    marginRight: 10,
  },
  timerLabel: {
    color: '#fff',
    fontSize: 18,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: '#333',
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timerText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  totalTimeText: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 5,
  },
  classInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  studentName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subject: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 5,
  },
  date: {
    color: '#aaa',
    fontSize: 14,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#C1FF72',
  },
  stopButton: {
    backgroundColor: '#FF575F',
  },
  resetButton: {
    backgroundColor: '#FFC542',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  postButton: {
    backgroundColor: '#C1FF72',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 30,
    width: '35%',
    marginLeft: 130,
  },
  postButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});