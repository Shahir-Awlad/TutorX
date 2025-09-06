import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import TabBar from '../Navigation/TabBar';
import { Ionicons } from '@expo/vector-icons';

const ACCENT = '#C1FF72';

// Avatar mapping
const avatarMap = {
  'sameen4': require('../../assets/Avatars/avatar-6.png'),
  'Sameen Yeaser': require('../../assets/Avatars/avatar-6.png'),
  'aimoon1': require('../../assets/Avatars/avatar-4.png'),
  'Aimaan Ahmed': require('../../assets/Avatars/avatar-4.png'),
  'tausif1': require('../../assets/Avatars/avatar-5.jpg'),
  'default': require('../../assets/default_user.jpg')
};

export default function Mainpage() {
  const navigation = useNavigation();
  const [userData, setUserData] = useState({
    name: "Loading...",
    username: "Loading...",
    role: "Loading...",
    profileImage: null
  });

  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [paydayLoading, setPaydayLoading] = useState(true);

  const [runningTuitions, setRunningTuitions] = useState(0);
  const [scheduleData, setScheduleData] = useState([]);
  const [paydayData, setPaydayData] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAvatarForUsername = (name) => {
    return avatarMap[name] || avatarMap.default;
  };

  const getCurrentMonthYear = () => {
    const now = new Date();
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  };

  const isUpcoming = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today;
  };

  const getUsernameFromStudentName = async (studentName) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if(!user){
        console.log('No authenticated user found.');
        return null;
      }
      const usersCollectionRef = collection(db, 'Users');
      const usersSnapshot = await getDocs(usersCollectionRef);
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (userData.name === studentName) {
          return userData.username;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching username from student name:', error);
      return null;
    }
  };

  const fetchRunningTuitions = async (username) => {
    try {
      const userDocRef = doc(db, 'Users', username);
      const tuitionsCollectionRef = collection(userDocRef, 'tuitions');
      const tuitionsSnapshot = await getDocs(tuitionsCollectionRef);
      setRunningTuitions(tuitionsSnapshot.size);
    } catch (error) {
      console.error('Error fetching running tuitions:', error);
      setRunningTuitions(0);
    }
  };

  const fetchScheduleAndPaydayData = async (username) => {
    try {
      const currentMonthYear = getCurrentMonthYear();
      const userDocRef = doc(db, 'Users', username);
      const scheduleCollectionRef = collection(userDocRef, 'Schedule');
      const monthDocRef = doc(scheduleCollectionRef, currentMonthYear);
      const monthDocSnap = await getDoc(monthDocRef);

      if (monthDocSnap.exists()) {
        const monthData = monthDocSnap.data();
        const upcomingClasses = [];
        const upcomingPaydays = [];
        const today = new Date();

        // Single loop through all data
        Object.keys(monthData).forEach(dateKey => {
          if (dateKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const dateEvents = monthData[dateKey];
            
            if (typeof dateEvents === 'object' && dateEvents !== null) {
              Object.keys(dateEvents).forEach(eventKey => {
                const event = dateEvents[eventKey];
                
                if (event && isUpcoming(dateKey)) {
                  const eventDate = new Date(dateKey);
                  
                  if (event.type === 'payday') {
                    // Handle payday
                    const diffTime = eventDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    upcomingPaydays.push({
                      id: `${dateKey}_${eventKey}`,
                      name: event.name || 'Unknown',
                      amount: `Tk. ${event.amount || '0'}`,
                      date: formatDate(dateKey),
                      status: diffDays < 0 ? 'overdue' : 'upcoming',
                      profileImage: getAvatarForUsername(event.name || 'default'),
                      sortDate: eventDate
                    });
                  } else {
                    // Handle regular class
                    upcomingClasses.push({
                      id: `${dateKey}_${eventKey}`,
                      name: event.name || 'Unknown',
                      subject: event.subject || 'Unknown Subject',
                      date: formatDate(dateKey),
                      profileImage: getAvatarForUsername(event.name || 'default'),
                      sortDate: eventDate
                    });
                  }
                }
              });
            }
          }
        });

        // Sort and limit results
        upcomingClasses.sort((a, b) => a.sortDate - b.sortDate);
        upcomingPaydays.sort((a, b) => a.sortDate - b.sortDate);
        
        setScheduleData(upcomingClasses.slice(0, 2));
        setPaydayData(upcomingPaydays.slice(0, 2));
      } else {
        setScheduleData([]);
        setPaydayData([]);
      }
    } catch (error) {
      console.error('Error fetching schedule and payday data:', error);
      setScheduleData([]);
      setPaydayData([]);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        // Get the currently logged-in user
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          const userDocRef = doc(db, 'Users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const username = userData.username || "Unknown";
            
            setUserData({
              name: userData.name || "No Name",
              username: username,
              role: userData.type || "No Role",
              profileImage: getAvatarForUsername(username)
            });

            // Fetch dynamic data
            await Promise.all([
              fetchRunningTuitions(user.uid),
              fetchScheduleAndPaydayData(user.uid)
            ]);
          } else {
            console.log('No user document found!');
            setUserData({
              name: "User Not Found",
              username: "Unknown",
              role: "Unknown",
              profileImage: avatarMap.default
            });
          }

        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserData({
          name: "Error Loading",
          username: "Error",
          role: "Error",
          profileImage: avatarMap.default
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleProfilePress = () => {
    navigation.navigate('Profile', { userData });
  };

  const handleViewAllSchedule = () => {
    navigation.navigate('Schedule'); 
  };

  const handleViewAllPayday = () => {
    console.log('Navigate to Payday page');
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'overdue':
        return '#FF4444';
      case 'upcoming':
        return '#FFD700';
      default:
        return '#C1FF72';
    }
  };

  const renderProfileImage = () => (
    <View style={styles.profileImageContainer}>
      <Image source={userData.profileImage} style={styles.profileImage} />
    </View>
  );

  const renderListItem = (item, isPayday = false) => (
    <View key={item.id} style={styles.listItem}>
      <View style={styles.listItemLeft}>
        <View style={styles.listProfileImageContainer}>
          <Image source={item.profileImage} style={styles.listProfileImage} />
        </View>
        <View style={styles.listItemInfo}>
          <Text style={styles.listItemName}>{item.name}</Text>
          <Text style={styles.listItemDate}>{item.date}</Text>
        </View>
      </View>
      <View style={styles.listItemRight}>
        {isPayday ? (
          <Text style={[styles.paymentAmount, { color: getPaymentStatusColor(item.status) }]}>
            {item.amount}
          </Text>
        ) : (
          <Text style={styles.subjectText}>{item.subject}</Text>
        )}
      </View>
    </View>
  );

  const renderEmptyState = (message) => (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );

  return (
    <View style={styles.mainContainer}>

    {/* Header Section */}
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

          <Image source={require('../../assets/Logo cropped.png')} style={styles.logo} resizeMode="contain" />

          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false} paddingBottom={100}>
        <View style={{ height: 15 }} />

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.welcomeText}>Welcome {userData.name}!!</Text>
            <Text style={styles.usernameText}>{userData.username}</Text>
            <Text style={styles.roleText}>{userData.role}</Text>
          </View>
          {renderProfileImage()}
        </View>

        {/* Running Tuitions Card */}
        <TouchableOpacity style={styles.runningTuitionsCard}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardTitle}>Running</Text>
            <Text style={styles.cardTitle}>Tuitions</Text>
          </View>
          <View style={styles.cardRight}>
            <View style={styles.tuitionCountBadge}>
              <Text style={styles.tuitionCount}>
                {loading ? '00' : runningTuitions.toString().padStart(2, '0')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Schedule Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <TouchableOpacity onPress={handleViewAllSchedule}>
              <Text style={styles.viewAllButton}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.listContainer}>
            {loading ? (
              renderEmptyState("Loading...")
            ) : scheduleData.length === 0 ? (
              renderEmptyState("No upcoming events")
            ) : (
              scheduleData.map(item => renderListItem(item, false))
            )}
          </View>
        </View>

        {/* Payday Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payday</Text>
            {/* <TouchableOpacity onPress={handleViewAllPayday}>
              <Text style={styles.viewAllButton}>View All</Text>
            </TouchableOpacity> */}
          </View>
          <View style={styles.listContainer}>
            {loading ? (
              renderEmptyState("Loading...")
            ) : paydayData.length === 0 ? (
              renderEmptyState("No upcoming paydays")
            ) : (
              paydayData.map(item => renderListItem(item, true))
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
        
      </ScrollView>
      <TabBar />
    </View>    
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 0,
  },
  menuButton: {
    padding: 10,
  },
  menuLine: {
    width: 25,
    height: 3,
    backgroundColor: '#ffffff',
    marginVertical: 2,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 50,
    marginBottom: 10,
    marginTop: 8,
  },
  logoSubtext: {
    color: '#ffffff',
    fontSize: 10,
    letterSpacing: 1,
  },
  notificationButton: {
    padding: 10,
  },
  notificationIcon: {
    fontSize: 20,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeLeft: {
    flex: 1,
  },
  welcomeText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  usernameText: {
    color: '#C1FF72',
    fontSize: 16,
    marginBottom: 5,
  },
  roleText: {
    color: '#C1FF72',
    fontSize: 16,
  },
  profileImageContainer: {
    marginLeft: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#404040',
  },
  runningTuitionsCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 25,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  cardLeft: {
    flex: 1,
  },
  cardTitle: {
    color: '#C1FF72',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  cardRight: {
    alignItems: 'center',
  },
  tuitionCountBadge: {
    backgroundColor: '#C1FF72',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tuitionCount: {
    color: '#000000',
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionContainer: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewAllButton: {
    color: '#C1FF72',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  listContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    paddingBottom: 15,paddingLeft: 15,paddingRight: 15,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listProfileImageContainer: {
    marginRight: 15,
    //borderRadius: 25,
  },
  listProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  listProfileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#404040',
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  listItemDate: {
    color: '#888888',
    fontSize: 14,
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
  subjectText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
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
  emptyStateContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#888888',
    fontSize: 16,
    fontStyle: 'italic',
  },
});