import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addDays, startOfMonth, endOfMonth, isBefore, isAfter, parseISO, isValid } from 'date-fns';

const { width, height } = Dimensions.get('window');

// Add this helper function after your imports and before the component
const safeParseDateString = (dateString) => {
  try {
    if (!dateString || typeof dateString !== 'string') {
      console.warn('Invalid date string provided:', dateString);
      return null;
    }
    
    const date = parseISO(dateString);
    if (isValid(date)) {
      return date;
    }
    
    console.warn('Could not parse date string:', dateString);
    return null;
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return null;
  }
};

const convertFirestoreTimestamp = (timestamp) => {
  if (!timestamp) return null;
  
  if (timestamp.seconds) {
    // Firestore timestamp object
    return new Date(timestamp.seconds * 1000);
  }
  
  if (typeof timestamp === 'string') {
    // Regular date string
    return safeParseDateString(timestamp);
  }
  
  return new Date(timestamp);
};

export default function Schedule() {
  const navigation = useNavigation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [events, setEvents] = useState({});
  const [markedDates, setMarkedDates] = useState({});
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [missedEvents, setMissedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [missedEventsLimit, setMissedEventsLimit] = useState(20);
  const [tuitionsData, setTuitionsData] = useState([]);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    initializeSchedule();
  }, [currentDate]);;

  const initializeSchedule = async () => {
    try {
      setLoading(true);
      await fetchUserRole();
      await fetchTuitionsData();
      //await generateAndFetchEvents();
      //setLoading(false);
      //console.log('TuitionsData state after setting:', JSON.stringify(tuitionsData, null, 2));
      setTimeout(async () => {
        await generateAndFetchEvents();
        setLoading(false);
      }, 100);
    } catch (error) {
      console.error('Error initializing schedule:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load schedule data');
    }
  };

  const fetchUserRole = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'Users', user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().type);
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchTuitionsData = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user');
        return;
      }

      console.log('Fetching tuitions for user:', user.uid);

      try {
        const tuitionsRef = collection(db, 'Users', user.uid, 'tuitions');
        const tuitionsSnapshot = await getDocs(tuitionsRef);
        
        const tuitions = [];
        tuitionsSnapshot.forEach(doc => {
          tuitions.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('Fetched tuitions:', tuitions.length);
        setTuitionsData(tuitions);

        console.log('TuitionsData state after setting:', JSON.stringify(tuitions, null, 2));
        
      } catch (firebaseError) {
        console.warn('Firebase permissions issue, using demo data:', firebaseError.message);
        
        const demoTuitions = [
          {
            id: 'demo1',
            studentName: 'John Doe',
            teacherName: 'Jane Smith',
            subjects: ['Math', 'Physics'],
            scheduleDays: [1, 3, 5],
            classesPerPayday: 12,
            classesSincePayday: 3,
            salary: 5000,
            lastPayday: '2025-08-01'
          },
          {
            id: 'demo2',
            studentName: 'Alice Johnson',
            teacherName: 'Bob Wilson',
            subjects: ['Chemistry'],
            scheduleDays: [2, 4], 
            classesPerPayday: 8,
            classesSincePayday: 6,
            salary: 4000,
            lastPayday: '2025-08-15'
          }
        ];
        
        setTuitionsData(demoTuitions);
      }
      
    } catch (error) {
      console.error('Error in fetchTuitionsData:', error);
      setTuitionsData([]);
    }
  };

  const generateEventsForMonth = (date, tuitions = tuitionsData) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const generatedEvents = {};
  const today = new Date();
  
  console.log('generateEventsForMonth called with tuitions:', tuitions.length);

  tuitions.forEach((tuition, index) => {
    console.log(`Tuition ${index}:`, {
      scheduleDays: tuition.scheduleDays,
      classesPerPayday: tuition.classesPerPayday,
      classesSincePayday: tuition.classesSincePayday,
      lastPayday: tuition.lastPayday
    });
    
    const { 
      scheduleDays = [], 
      classesPerPayday = 0, 
      classesSincePayday = 0,
      lastPayday,
      salary = 0,
      studentName,
      teacherName,
      subjects = []
    } = tuition;

    // Generate class events
    scheduleDays.forEach(dayIndex => {
      let currentDay = new Date(monthStart);
      
      // Find the first occurrence of the scheduled day in the month
      while (currentDay.getDay() !== dayIndex && currentDay <= monthEnd) {
        currentDay = addDays(currentDay, 1);
      }
      while (currentDay <= monthEnd) {
        try {
          const dateKey = format(currentDay, 'yyyy-MM-dd');
          
          if (!generatedEvents[dateKey]) {
            generatedEvents[dateKey] = [];
          }

          const displayName = userRole === 'Teacher' ? studentName : teacherName;
          const eventType = isBefore(currentDay, today) ? 'missed-class' : 'class';
          
          generatedEvents[dateKey].push({
            id: `${tuition.id}-class-${dateKey}`,
            type: eventType,
            tuitionId: tuition.id,
            name: displayName,
            subject: subjects[0] || 'General',
            completed: false,
            time: 'All Day'
          });

          currentDay = addDays(currentDay, 7); // Next week
        } catch (error) {
          console.error('Error generating event for date:', currentDay, error);
          break; // Exit loop if date operations fail
        }
      }
    });

    // Calculate and generate payday events
    if (classesPerPayday > 0) {
      const remainingClasses = classesPerPayday - classesSincePayday;
      let classCount = 0;
      let currentDay = new Date(monthStart);

      let lastPaydayDate = null;
      if (lastPayday) {
        lastPaydayDate = convertFirestoreTimestamp(lastPayday);
        console.log('Converted lastPayday:', lastPaydayDate);
      }

      while (currentDay <= monthEnd && classCount < remainingClasses) {
        if (scheduleDays.includes(currentDay.getDay())) {
          classCount++;
          if (classCount === remainingClasses) {
            const dateKey = format(currentDay, 'yyyy-MM-dd');
            
            if (!generatedEvents[dateKey]) {
              generatedEvents[dateKey] = [];
            }

            const displayName = userRole === 'Teacher' ? studentName : teacherName;
            const eventType = isBefore(currentDay, today) ? 'missed-payday' : 'payday';
            
            generatedEvents[dateKey].push({
              id: `${tuition.id}-payday-${dateKey}`,
              type: eventType,
              tuitionId: tuition.id,
              name: displayName,
              amount: salary,
              completed: false,
              time: 'All Day'
            });
          }
        }
        currentDay = addDays(currentDay, 1);
      }
    }
  });

  return generatedEvents;
};

  const generateAndFetchEvents = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      console.log('No authenticated user found');
      return;
    }

    const monthKey = format(currentDate, 'MMMM yyyy');
    console.log('Fetching/generating events for:', monthKey);
    
    // Get fresh tuitions data directly for event generation
    let currentTuitions = tuitionsData;
    if(currentTuitions.length === 0) {
      try {
        const tuitionsRef = collection(db, 'Users', user.uid, 'tuitions');
        const tuitionsSnapshot = await getDocs(tuitionsRef);
        tuitionsSnapshot.forEach(doc => {
          currentTuitions.push({ id: doc.id, ...doc.data() });
        });
      } catch (firebaseError) {
        console.warn('Using tuitionsData state as fallback');
        currentTuitions = tuitionsData;
      }
    }

    console.log('Using tuitions for generation:', currentTuitions.length);
    
    // First, try to load from cache for immediate display
    try {
      const cachedEvents = await AsyncStorage.getItem(`schedule_${monthKey}`);
      if (cachedEvents) {
        const parsedEvents = JSON.parse(cachedEvents);
        setEvents(parsedEvents);
        processEventsForCalendar(parsedEvents);
        categorizeEvents(parsedEvents);
        console.log('Loaded events from cache');
      }
    } catch (cacheError) {
      console.log('No cache found, will generate new events');
    }

    // Generate events based on tuitions data
    const monthEvents = generateEventsForMonth(currentDate, currentTuitions);
    console.log('Generated events:', Object.keys(monthEvents).length);

    if (Object.keys(monthEvents).length > 0) {
      // Try to save to Firebase (but don't fail if permissions are insufficient)
      try {
        const scheduleDocRef = doc(db, 'Users', user.uid, 'Schedule', monthKey);
        await setDoc(scheduleDocRef, monthEvents);
        console.log('Events saved to Firebase');
      } catch (firebaseError) {
        console.warn('Could not save to Firebase, continuing with local data:', firebaseError.message);
      }

      // Update state and cache
      setEvents(monthEvents);
      processEventsForCalendar(monthEvents);
      categorizeEvents(monthEvents);
      
      // Cache for offline use
      try {
        await AsyncStorage.setItem(`schedule_${monthKey}`, JSON.stringify(monthEvents));
        console.log('Events cached locally');
      } catch (cacheError) {
        console.warn('Could not cache events:', cacheError);
      }
    } else {
      console.log('No events generated for this month');
      setEvents({});
      setMarkedDates({});
      setUpcomingEvents([]);
      setMissedEvents([]);
    }
    
  } catch (error) {
    console.error('Error in generateAndFetchEvents:', error);
    
    // Fallback: try to load from cache
    try {
      const monthKey = format(currentDate, 'MMMM yyyy');
      const cachedEvents = await AsyncStorage.getItem(`schedule_${monthKey}`);
      if (cachedEvents) {
        const parsedEvents = JSON.parse(cachedEvents);
        setEvents(parsedEvents);
        processEventsForCalendar(parsedEvents);
        categorizeEvents(parsedEvents);
        console.log('Fallback: loaded from cache');
      }
    } catch (cacheError) {
      console.error('Fallback cache load failed:', cacheError);
      // Set empty state
      setEvents({});
      setMarkedDates({});
      setUpcomingEvents([]);
      setMissedEvents([]);
    }
  }
};


  const processEventsForCalendar = (monthEvents) => {
    const marked = {};

    Object.entries(monthEvents).forEach(([date, dayEvents]) => {
      if (dayEvents && dayEvents.length > 0) {
        const colors = dayEvents.map(event => getEventColor(event.type));
        const prioritizedColors = prioritizeColors(colors);
        
        marked[date] = {
          marked: true,
          dots: prioritizedColors.slice(0, 3).map(color => ({ color })),
          selectedColor: prioritizedColors[0]
        };
      }
    });

    setMarkedDates(marked);
  };

  const categorizeEvents = (monthEvents) => {
    const upcoming = [];
    const missed = [];
    const today = new Date();
    const nextWeek = addDays(today, 7);

    Object.entries(monthEvents).forEach(([date, dayEvents]) => {
      if (dayEvents && dayEvents.length > 0) {
        const eventDate = safeParseDateString(date);
        
        // Skip if date is invalid
        if (!eventDate) {
          console.warn(`Skipping invalid date: ${date}`);
          return;
        }
        
        dayEvents.forEach(event => {
          const eventWithDate = { ...event, date, eventDate };
          
          if (event.type && event.type.includes('missed')) {
            missed.push(eventWithDate);
          } else if (eventDate >= today && eventDate <= nextWeek) {
            upcoming.push(eventWithDate);
          }
        });
      }
    });

    // Sort with safe date comparison
    upcoming.sort((a, b) => {
      if (!a.eventDate || !b.eventDate) return 0;
      return a.eventDate.getTime() - b.eventDate.getTime();
    });
    
    missed.sort((a, b) => {
      if (!a.eventDate || !b.eventDate) return 0;
      return b.eventDate.getTime() - a.eventDate.getTime();
    });

    setUpcomingEvents(upcoming);
    setMissedEvents(missed.slice(0, missedEventsLimit));
  };

  const prioritizeColors = (colors) => {
    const priority = ['#FF4444', '#FFD700', '#4CAF50']; // Red, Yellow, Green
    return colors.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'missed-class':
      case 'missed-payday':
        return '#FF4444'; // Red
      case 'payday':
        return '#FFD700'; // Yellow
      case 'class':
        return '#4CAF50'; // Green
      default:
        return '#4CAF50';
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'class':
      case 'missed-class':
        return 'book';
      case 'payday':
      case 'missed-payday':
        return 'cash';
      default:
        return 'calendar';
    }
  };

  const handleDatePress = (date) => {
    const dateKey = date.dateString;
    const dayEvents = events[dateKey] || [];
    
    if (dayEvents.length > 0) {
      setSelectedEvents(dayEvents);
      setCurrentEventIndex(0);
      setSelectedDate(dateKey);
      setModalVisible(true);
    }
  };

  const handleMonthChange = (month) => {
    const newDate = new Date(month.year, month.month - 1, 1);
    setCurrentDate(newDate);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initializeSchedule();
    setRefreshing(false);
  }, [currentDate]);

  const loadMoreMissedEvents = () => {
    setLoadingMore(true);
    const newLimit = missedEventsLimit + 20;
    setMissedEventsLimit(newLimit);
    
    setTimeout(() => {
      const allMissedEvents = [];
      const today = new Date();

      Object.entries(events).forEach(([date, dayEvents]) => {
        if (dayEvents && dayEvents.length > 0) {
          const eventDate = parseISO(date);
          
          dayEvents.forEach(event => {
            if (event.type.includes('missed')) {
              allMissedEvents.push({ ...event, date, eventDate });
            }
          });
        }
      });

          allMissedEvents.sort((a, b) => {
            if (!a.eventDate || !b.eventDate || !isValid(a.eventDate) || !isValid(b.eventDate)) return 0;
            return b.eventDate.getTime() - a.eventDate.getTime();
          });
      setMissedEvents(allMissedEvents.slice(0, newLimit));
      setLoadingMore(false);
    }, 500);
  };

  const renderEventItem = (event, showDate = true) => (
    <View key={`${event.id}-${event.date}`} style={styles.eventItem}>
      <View style={[styles.eventIcon, { backgroundColor: getEventColor(event.type) }]}>
        <Ionicons 
          name={getEventIcon(event.type)} 
          size={20} 
          color="#fff" 
        />
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventName}>{event.name}</Text>
        <Text style={styles.eventType}>
          {event.type && event.type.includes('class') ? 'Class' : 'Payday'}
          {showDate && event.date && ` • ${format(safeParseDateString(event.date) || new Date(), 'MM/dd')}`}
        </Text>
        {event.subject && (
          <Text style={styles.eventSubject}>{event.subject}</Text>
        )}
        {event.amount && (
          <Text style={styles.eventAmount}>Tk. {event.amount}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.eventArrow}>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const renderEventModal = () => (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Events for {format(safeParseDateString(selectedDate) || new Date(), 'MMMM dd, yyyy')}
            </Text>
            <TouchableOpacity 
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {selectedEvents.length > 1 && (
            <View style={styles.eventNavigation}>
              <TouchableOpacity
                onPress={() => setCurrentEventIndex(Math.max(0, currentEventIndex - 1))}
                disabled={currentEventIndex === 0}
                style={[styles.navButton, currentEventIndex === 0 && styles.navButtonDisabled]}
              >
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
              
              <Text style={styles.eventCounter}>
                {currentEventIndex + 1} of {selectedEvents.length}
              </Text>
              
              <TouchableOpacity
                onPress={() => setCurrentEventIndex(Math.min(selectedEvents.length - 1, currentEventIndex + 1))}
                disabled={currentEventIndex === selectedEvents.length - 1}
                style={[styles.navButton, currentEventIndex === selectedEvents.length - 1 && styles.navButtonDisabled]}
              >
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          
          {selectedEvents[currentEventIndex] && (
            <View style={[
              styles.modalEventCard,
              { borderLeftColor: getEventColor(selectedEvents[currentEventIndex].type) }
            ]}>
              <Text style={styles.modalEventName}>{selectedEvents[currentEventIndex].name}</Text>
              <Text style={styles.modalEventType}>
                {selectedEvents[currentEventIndex].type.includes('class') ? 'Class' : 'Payday'}
              </Text>
              {selectedEvents[currentEventIndex].subject && (
                <Text style={styles.modalEventDetail}>
                  Subject: {selectedEvents[currentEventIndex].subject}
                </Text>
              )}
              {selectedEvents[currentEventIndex].amount && (
                <Text style={styles.modalEventDetail}>
                  Amount: Tk. {selectedEvents[currentEventIndex].amount}
                </Text>
              )}
              <Text style={styles.modalEventDetail}>
                Time: {selectedEvents[currentEventIndex].time}
              </Text>
              <Text style={styles.modalEventDetail}>
                Status: {selectedEvents[currentEventIndex].completed ? 'Completed' : 'Pending'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C1FF72" />
        <Text style={styles.loadingText}>Loading Schedule...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#C1FF72" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Schedule</Text>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={format(currentDate, 'yyyy-MM-dd')}
            onDayPress={handleDatePress}
            onMonthChange={handleMonthChange}
            markingType="multi-dot"
            markedDates={markedDates}
            theme={{
              backgroundColor: '#1a1a1a',
              calendarBackground: '#1a1a1a',
              textSectionTitleColor: '#C1FF72',
              selectedDayBackgroundColor: '#C1FF72',
              selectedDayTextColor: '#000',
              todayTextColor: '#C1FF72',
              dayTextColor: '#ffffff',
              textDisabledColor: '#666',
              dotColor: '#C1FF72',
              selectedDotColor: '#000',
              arrowColor: '#C1FF72',
              monthTextColor: '#ffffff',
              indicatorColor: '#C1FF72',
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14
            }}
          />
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          {upcomingEvents.length > 0 ? (
            <View style={styles.eventsContainer}>
              {upcomingEvents.map(event => renderEventItem(event))}
            </View>
          ) : (
            <View style={styles.noEventsContainer}>
              <Ionicons name="calendar-outline" size={48} color="#666" />
              <Text style={styles.noEventsText}>No upcoming events</Text>
            </View>
          )}
        </View>

        {/* Missed Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Missed Events</Text>
          {missedEvents.length > 0 ? (
            <View style={styles.eventsContainer}>
              {missedEvents.map(event => renderEventItem(event))}
              
              {missedEvents.length >= missedEventsLimit && (
                <TouchableOpacity 
                  style={styles.loadMoreButton}
                  onPress={loadMoreMissedEvents}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#C1FF72" />
                  ) : (
                    <Text style={styles.loadMoreText}>Load More</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noEventsContainer}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#666" />
              <Text style={styles.noEventsText}>No missed events</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {renderEventModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    color: '#C1FF72',
    fontSize: 24,
    fontWeight: 'bold',
  },
  calendarContainer: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 15,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  eventsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 15,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  eventType: {
    color: '#888',
    fontSize: 14,
    marginBottom: 2,
  },
  eventSubject: {
    color: '#C1FF72',
    fontSize: 12,
  },
  eventAmount: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  eventArrow: {
    padding: 10,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noEventsText: {
    color: '#666',
    fontSize: 16,
    marginTop: 10,
  },
  loadMoreButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  loadMoreText: {
    color: '#C1FF72',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  modalCloseButton: {
    padding: 5,
  },
  eventNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  navButton: {
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 20,
  },
  navButtonDisabled: {
    backgroundColor: '#222',
    opacity: 0.5,
  },
  eventCounter: {
    color: '#fff',
    fontSize: 16,
  },
  modalEventCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 20,
    borderLeftWidth: 5,
  },
  modalEventName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalEventType: {
    color: '#C1FF72',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  modalEventDetail: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
});