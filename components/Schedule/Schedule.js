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
import { format, addDays, startOfMonth, endOfMonth, isBefore, isAfter, parseISO, isValid, isToday, add } from 'date-fns';

const { width, height } = Dimensions.get('window');

const safeParseDateString = (dateString) => {
  try {
    if (!dateString || typeof dateString !== 'string' || dateString.trim() === '' || dateString === 'undefined') {
      console.warn('Invalid date string provided:', dateString);
      return null;
    }
    
    const cleanedDateString = dateString.trim();
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanedDateString)) {
      console.warn('Invalid date format. Expected YYYY-MM-DD:', cleanedDateString);
      return null;
    }
    
    const date = parseISO(cleanedDateString);
    if (isValid(date)) {
      return date;
    }
    
    console.warn('Could not parse date string:', cleanedDateString);
    return null;
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return null;
  }
};

const convertFirestoreTimestamp = (timestamp) => {
  if (!timestamp) return null;
  
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  
  if (typeof timestamp === 'string') {
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
  const [allMissedEventsCount, setAllMissedEventsCount] = useState(0);

  useEffect(() => {
    initializeSchedule();
  }, [currentDate]);

  useEffect(() => {
    if (userRole && tuitionsData.length > 0) {
      console.log('User role changed, regenerating events with role:', userRole);
      generateAndFetchEvents();
    }
  }, [userRole]);

  useEffect(() => {
    console.log('Current userRole state:', userRole);
  }, [userRole]);

  useEffect(() => {
    console.log('Resolved tuitionsData:', tuitionsData.map(t => ({
      id: t.id,
      studentName: t.studentName,
      teacherName: t.teacherName
    })));
  }, [tuitionsData]);

  const initializeSchedule = async () => {
    try {
      setLoading(true);
      
      const role = await fetchUserRole();
      setUserRole(role);
      
      await fetchTuitionsData();
      
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
          const userType = userDoc.data().type;
          setUserRole(userType);
          return userType;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  const fetchTuitionsData = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'Users', user.uid));
      const userType = userDoc.exists() ? userDoc.data().type : null;
      setUserRole(userType);

      const tuitionsRef = collection(db, 'Users', user.uid, 'tuitions');
      const tuitionsSnapshot = await getDocs(tuitionsRef);
      
      const tuitions = [];
      for (const docSnapshot of tuitionsSnapshot.docs) {
        const data = docSnapshot.data();
        
        console.log('Processing tuition document:', docSnapshot.id, data);
        
        // Use the names directly from the tuition document
        const studentName = data.studentName || 'Student';
        const teacherName = data.teacherName || 'Teacher';
        
        console.log(`Tuition ${docSnapshot.id}: studentName="${studentName}", teacherName="${teacherName}"`);

        tuitions.push({
          id: docSnapshot.id,
          studentName: studentName,
          teacherName: teacherName,
          counterpartyUid: userType === 'Teacher' ? data.studentId : data.teacherId,
          subjects: data.subjects || [],
          scheduleDays: data.scheduleDays || [],
          classesPerPayday: data.classesPerPayday || 0,
          classesSincePayday: data.classesSincePayday || 0,
          salary: data.salary || 0,
          lastPayday: data.lastPayday
        });
      }
      
      console.log('Final tuitions array:', tuitions);
      setTuitionsData(tuitions);
    } catch (error) {
      console.error('Error in fetchTuitionsData:', error);
      setTuitionsData([]);
    }
  };

  const generateEventsForMonth = (date, tuitions = tuitionsData, currentUserRole = userRole) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const generatedEvents = {};
    const today = new Date();
    
    console.log('generateEventsForMonth called with userRole:', currentUserRole);
    console.log('Tuitions data:', tuitions.length);

    if (!tuitions || !Array.isArray(tuitions)) {
      console.warn('Invalid tuitions array provided');
      return generatedEvents;
    }

    tuitions.forEach((tuition, index) => {
      if (!tuition || typeof tuition !== 'object') {
        console.warn('Skipping invalid tuition object:', tuition);
        return;
      }

      const { 
        scheduleDays = [], 
        classesPerPayday = 0, 
        classesSincePayday = 0,
        lastPayday,
        salary = 0,
        studentName,
        teacherName,
        counterpartyUid,
        subjects = []
      } = tuition;

      // Fix: Determine the display name based on user role
      let displayName;
      if (currentUserRole === 'Teacher') {
        displayName = studentName || 'Student';
      } else if (currentUserRole === 'Student') {
        displayName = teacherName || 'Teacher';
      } else {
        displayName = 'Unknown';
      }

      console.log(`Processing tuition ${tuition.id}: userRole=${currentUserRole}, displayName=${displayName}`);

      // Generate class events
      scheduleDays.forEach(dayIndex => {
        let currentDay = new Date(monthStart);
        
        while (currentDay.getDay() !== dayIndex && currentDay <= monthEnd) {
          currentDay = addDays(currentDay, 1);
        }
        
        while (currentDay <= monthEnd) {
          try {
            const dateKey = format(currentDay, 'yyyy-MM-dd');
            const eventDate = safeParseDateString(dateKey);
            
            if (!eventDate) {
              currentDay = addDays(currentDay, 7);
              continue;
            }
            
            if (!generatedEvents[dateKey]) {
              generatedEvents[dateKey] = [];
            }

            const isFuture = isAfter(eventDate, today);
            const isTodayEvent = isToday(eventDate);
            
            let eventType;
            if (isTodayEvent || isFuture) {
              eventType = 'class';
            } else {
              eventType = 'missed-class';
            }
            
            generatedEvents[dateKey].push({
              id: `${tuition.id}-class-${dateKey}`,
              type: eventType,
              tuitionId: tuition.id,
              name: displayName,
              subject: subjects[0] || 'General',
              completed: false,
              time: 'All Day',
              counterpartyUid: counterpartyUid
            });

            currentDay = addDays(currentDay, 7);
          } catch (error) {
            console.error('Error generating event for date:', currentDay, error);
            break;
          }
        }
      });

      // Generate payday events
      if (classesPerPayday > 0) {
        const remainingClasses = classesPerPayday - classesSincePayday;
        let classCount = 0;
        let currentDay = new Date(monthStart);

        while (currentDay <= monthEnd && classCount < remainingClasses) {
          if (scheduleDays.includes(currentDay.getDay())) {
            classCount++;
            if (classCount === remainingClasses) {
              const dateKey = format(currentDay, 'yyyy-MM-dd');
              const eventDate = safeParseDateString(dateKey);
              
              if (!eventDate) {
                currentDay = addDays(currentDay, 1);
                continue;
              }
              
              if (!generatedEvents[dateKey]) {
                generatedEvents[dateKey] = [];
              }

              const isFuture = isAfter(eventDate, today);
              const isTodayEvent = isToday(eventDate);
              
              let eventType;
              if (isTodayEvent || isFuture) {
                eventType = 'payday';
              } else {
                eventType = 'missed-payday';
              }
              
              generatedEvents[dateKey].push({
                id: `${tuition.id}-payday-${dateKey}`,
                type: eventType,
                tuitionId: tuition.id,
                name: displayName,
                amount: salary,
                completed: false,
                time: 'All Day',
                counterpartyUid: counterpartyUid
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

      let currentTuitions = [...tuitionsData];
      if (currentTuitions.length === 0) {
        try {
          const tuitionsRef = collection(db, 'Users', user.uid, 'tuitions');
          const tuitionsSnapshot = await getDocs(tuitionsRef);
          tuitionsSnapshot.forEach(doc => {
            currentTuitions.push({ id: doc.id, ...doc.data() });
          });
        } catch (firebaseError) {
          console.warn('Using tuitionsData state as fallback');
        }
      }

      console.log('Using tuitions for generation:', currentTuitions.length);

      const today = new Date();
      let combinedEvents = {};

      try {
        const scheduleDocRef = doc(db, 'Users', user.uid, 'Schedule', monthKey);
        const scheduleDoc = await getDoc(scheduleDocRef);
        if (scheduleDoc.exists()) {
          const firebaseEvents = scheduleDoc.data();
          Object.entries(firebaseEvents).forEach(([dateKey, dayEvents]) => {
            const eventDate = safeParseDateString(dateKey);
            if (eventDate && isBefore(eventDate, today)) {
              combinedEvents[dateKey] = dayEvents;
            }
          });
          console.log('Loaded past events from Firebase:', Object.keys(combinedEvents).length);
        }
      } catch (firebaseError) {
        console.warn('Could not fetch past events from Firebase:', firebaseError.message);
      }

      const generatedEvents = generateEventsForMonth(currentDate, currentTuitions, userRole);

      Object.entries(generatedEvents).forEach(([dateKey, dayEvents]) => {
        const eventDate = safeParseDateString(dateKey);
        if (eventDate && (isAfter(eventDate, today) || isToday(eventDate))) {
          if (combinedEvents[dateKey]) {
            const eventMap = new Map();
            combinedEvents[dateKey].forEach(event => eventMap.set(event.id, event));
            dayEvents.forEach(event => eventMap.set(event.id, event));
            combinedEvents[dateKey] = Array.from(eventMap.values());
          } else {
            combinedEvents[dateKey] = dayEvents;
          }
        }
      });

      console.log('Combined events (past + future):', Object.keys(combinedEvents).length);

      if (Object.keys(combinedEvents).length > 0) {
        try {
          const scheduleDocRef = doc(db, 'Users', user.uid, 'Schedule', monthKey);
          await setDoc(scheduleDocRef, combinedEvents, { merge: true });
          console.log('Combined events saved to Firebase');
        } catch (firebaseError) {
          console.warn('Could not save combined events to Firebase:', firebaseError.message);
        }

        setEvents(combinedEvents);
        processEventsForCalendar(combinedEvents);
        categorizeEvents(combinedEvents);

        try {
          await AsyncStorage.setItem(`schedule_${monthKey}`, JSON.stringify(combinedEvents));
          console.log('Events cached locally');
        } catch (cacheError) {
          console.warn('Could not cache events locally:', cacheError);
        }
      } else {
        console.log('No events for this month');
        setEvents({});
        setMarkedDates({});
        setUpcomingEvents([]);
        setMissedEvents([]);
      }

    } catch (error) {
      console.error('Error in generateAndFetchEvents:', error);

      try {
        const monthKey = format(currentDate, 'MMMM yyyy');
        const cachedEvents = await AsyncStorage.getItem(`schedule_${monthKey}`);
        if (cachedEvents) {
          const parsedEvents = JSON.parse(cachedEvents);
          setEvents(parsedEvents);
          processEventsForCalendar(parsedEvents);
          categorizeEvents(parsedEvents);
          console.log('Loaded events from cache');
        }
      } catch (cacheError) {
        console.error('Fallback cache load failed:', cacheError);
        setEvents({});
        setMarkedDates({});
        setUpcomingEvents([]);
        setMissedEvents([]);
      }
    }
  };

  const processEventsForCalendar = (monthEvents) => {
    const marked = {};

    if (!monthEvents || typeof monthEvents !== 'object') {
      setMarkedDates({});
      return;
    }

    Object.entries(monthEvents).forEach(([date, dayEvents]) => {
      if (!date || !Array.isArray(dayEvents) || dayEvents.length === 0) {
        return;
      }

      const colors = dayEvents
        .filter(event => event && event.type)
        .map(event => getEventColor(event.type, event.completed));
      
      if (colors.length > 0) {
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

    if (!monthEvents || typeof monthEvents !== 'object') {
      console.warn('Invalid monthEvents provided:', monthEvents);
      setUpcomingEvents([]);
      setMissedEvents([]);
      setAllMissedEventsCount(0);
      return;
    }

    Object.entries(monthEvents).forEach(([date, dayEvents]) => {
      if (!date || !Array.isArray(dayEvents)) {
        console.warn('Skipping invalid date or dayEvents:', date, dayEvents);
        return;
      }

      const eventDate = safeParseDateString(date);
      
      if (!eventDate) {
        console.warn(`Skipping invalid date: ${date}`);
        return;
      }
      
      dayEvents.forEach(event => {
        if (!event || typeof event !== 'object') {
          console.warn('Skipping invalid event:', event);
          return;
        }

        const eventWithDate = { ...event, date, eventDate };
        
        const isTodayOrFuture = eventDate >= today;
        
        if (event.type && event.type.includes('missed') && !isTodayOrFuture) {
          missed.push(eventWithDate);
        } else if (isTodayOrFuture && eventDate <= nextWeek) {
          upcoming.push(eventWithDate);
        } else if (event.type && event.type.includes('missed')) {
          missed.push(eventWithDate);
        }
      });
    });

    upcoming.sort((a, b) => {
      if (!a.eventDate || !b.eventDate) return 0;
      return a.eventDate.getTime() - b.eventDate.getTime();
    });
    
    missed.sort((a, b) => {
      if (!a.eventDate || !b.eventDate) return 0;
      return b.eventDate.getTime() - a.eventDate.getTime();
    });

    setUpcomingEvents(upcoming);
    setMissedEvents(missed.slice(0, 5));
    setAllMissedEventsCount(missed.length);
  };

  const prioritizeColors = (colors) => {
    const priority = ['#FF4444', '#FFD700', '#4CAF50'];
    return colors.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
  };

  const getEventColor = (type, completed = false) => {
    if (completed) {
      return '#4CAF50'; 
    }

    switch (type) {
      case 'missed-class':
      case 'missed-payday':
        return '#FF4444';
      case 'payday':
        return '#FFD700';
      case 'class':
        return '#2196F3';
      default:
        return '#2196F3';
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
    const newLimit = missedEvents.length + 5;
    
    setTimeout(() => {
      const allMissedEvents = [];
      const today = new Date();

      Object.entries(events).forEach(([date, dayEvents]) => {
        if (dayEvents && dayEvents.length > 0) {
          const eventDate = safeParseDateString(date);
          
          if (!eventDate) return;
          
          dayEvents.forEach(event => {
            if (event.type && event.type.includes('missed')) {
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
      <View style={[styles.eventIcon, { backgroundColor: getEventColor(event.type, event.completed) }]}>
        <Ionicons 
          name={getEventIcon(event.type)} 
          size={20} 
          color="#fff" 
        />
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventName}>{event.name || 'Unknown'}</Text>
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
      <TouchableOpacity 
        style={styles.eventArrow}
        onPress={() => {
          setSelectedEvents([event]);
          setCurrentEventIndex(0);
          setSelectedDate(event.date);
          setModalVisible(true);
        }}
      >
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const renderEventModal = () => {
    const currentEvent = selectedEvents[currentEventIndex];
    const eventDate = safeParseDateString(currentEvent?.date);
    const todayEvent = eventDate && isToday(eventDate);
    const isTodayClass = todayEvent && currentEvent?.type === 'class'; // Fix: Only for today's classes, not missed ones
    const isMissedClass = currentEvent?.type === 'missed-class';

    return (
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
            
            {currentEvent && (
              <View style={[
                styles.modalEventCard,
                { borderLeftColor: getEventColor(currentEvent.type, currentEvent.completed) }
              ]}>
                <Text style={styles.modalEventName}>{currentEvent.name}</Text>
                <Text style={styles.modalEventType}>
                  {currentEvent.type.includes('class') ? 'Class' : 'Payday'}
                </Text>
                {currentEvent.subject && (
                  <Text style={styles.modalEventDetail}>
                    Subject: {currentEvent.subject}
                  </Text>
                )}
                {currentEvent.amount && (
                  <Text style={styles.modalEventDetail}>
                    Amount: Tk. {currentEvent.amount}
                  </Text>
                )}
                <Text style={styles.modalEventDetail}>
                  Time: {currentEvent.time}
                </Text>
                <Text style={styles.modalEventDetail}>
                  Status: {currentEvent.completed ? 'Completed' : 'Pending'}
                </Text>
                
                {/* Action Buttons Container */}
                <View style={styles.modalActionsContainer}>
                  {/* Start Class button for today's classes only */}
                  {isTodayClass && (
                    <TouchableOpacity 
                      style={styles.startClassButton}
                      onPress={() => {
                        setModalVisible(false);
                        console.log('Navigate to start class page for:', currentEvent.id);
                        // navigation.navigate('StartClass', { event: currentEvent });
                      }}
                    >
                      <Text style={styles.startClassButtonText}>Start Class</Text>
                    </TouchableOpacity>
                  )}
                  
                  {/* Make Up button for missed classes */}
                  {isMissedClass && (
                    <TouchableOpacity 
                      style={styles.makeUpButton}
                      onPress={() => {
                        setModalVisible(false);
                        console.log('Navigate to make up page for:', currentEvent.id);
                        // navigation.navigate('MakeUp', { event: currentEvent });
                      }}
                    >
                      <Text style={styles.makeUpButtonText}>Make Up</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

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
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#C1FF72" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Schedule</Text>
        </View>

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
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
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
  modalActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  startClassButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startClassButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  makeUpButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  makeUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});