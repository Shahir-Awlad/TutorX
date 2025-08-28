
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import TabBar from '../Navigation/TabBar';
import { Ionicons } from '@expo/vector-icons';

const ACCENT = '#C1FF72';

export default function Mainpage() {
  const navigation = useNavigation();
  const [userData, setUserData] = useState({
    name: "Loading...",
    username: "Loading...",
    role: "Loading...",
    profileImage: null
  });

  // Static data
  const [runningTuitions, setRunningTuitions] = useState(2);
  const [scheduleData, setScheduleData] = useState([
    {
      id: 1,
      name: "Mirza Amir",
      subject: "Physics",
      date: "03/26",
      profileImage: null
    },
    {
      id: 2,
      name: "Asif Shah",
      subject: "Home Edu",
      date: "03/31",
      profileImage: null
    }
  ]);

  const [paydayData, setPaydayData] = useState([
    {
      id: 1,
      name: "Mirza Amir",
      amount: "Tk. 9000",
      date: "03/24",
      status: "overdue", 
      profileImage: null
    },
    {
      id: 2,
      name: "Asif Shah",
      amount: "Tk. 8000",
      date: "04/08",
      status: "upcoming",
      profileImage: null
    }
  ]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get the currently logged-in user
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          const userDocRef = doc(db, 'Users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserData({
              name: userData.name || "No Name",
              username: userData.username || "No Username",
              role: userData.type || "No Role",
            });
          } else {
            console.log('No user document found!');
            setUserData({
              name: "User Not Found",
              username: "Unknown",
              role: "Unknown",
              profileImage: null
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserData({
          name: "Error Loading",
          username: "Error",
          role: "Error",
          profileImage: null
        });
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
      {userData.profileImage ? (
        <Image source={{ uri: userData.profileImage }} style={styles.profileImage} />
      ) : (
        <View style={styles.profileImagePlaceholder} />
      )}
    </View>
  );

  const renderListItem = (item, isPayday = false) => (
    <View key={item.id} style={styles.listItem}>
      <View style={styles.listItemLeft}>
        <View style={styles.listProfileImageContainer}>
          {item.profileImage ? (
            <Image source={{ uri: item.profileImage }} style={styles.listProfileImage} />
          ) : (
            <View style={styles.listProfileImagePlaceholder} />
          )}
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

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
          
          {/* <View style={styles.logoContainer}>
            <Text style={styles.logo}>TUTORX</Text>
            <Text style={styles.logoSubtext}>TUTORING APP</Text>
          </View> */}

          <Image source={require('../../assets/Logo cropped.png')} style={styles.logo} resizeMode="contain" />


          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

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
              <Text style={styles.tuitionCount}>{runningTuitions.toString().padStart(2, '0')}</Text>
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
            {scheduleData.map(item => renderListItem(item, false))}
          </View>
        </View>

        {/* Payday Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payday</Text>
            <TouchableOpacity onPress={handleViewAllPayday}>
              <Text style={styles.viewAllButton}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.listContainer}>
            {paydayData.map(item => renderListItem(item, true))}
          </View>
        </View>
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
    paddingBottom: 30,
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
    borderRadius: 15,
    padding: 15,
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
});

