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
import { format, addDays, startOfMonth, endOfMonth, isBefore, isAfter, parseISO, isValid, isToday } from 'date-fns';

const { width, height } = Dimensions.get('window');

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
  const [missedEventsLimit, setMissedEventsLimit] = useState(5);
  const [notuitions, setNoTuitions] = useState(0);

  useEffect(() => {
    initializeSchedule();
  }, [currentDate]);

  // useEffect(() => {
  //   const genEvents = async () => {
  //     if (userRole && tuitionsData.length === notuitions) {
  //       await generateAndFetchEvents();
  //       setLoading(false);
  //     }
  //   };

  //   genEvents();
  // }, [loading]); 

  // const initializeSchedule = async () => {
  //   try {
  //     setLoading(true);
  //     await fetchUserRole();
  //     await fetchTuitionsData();
  //     //await generateAndFetchEvents();
  //     //setLoading(false);
  //     //console.log('TuitionsData state after setting:', JSON.stringify(tuitionsData, null, 2));
  //   } catch (error) {
  //     console.error('Error initializing schedule:', error);
  //     setLoading(false);
  //     Alert.alert('Error', 'Failed to load schedule data');
  //   }
  // };

  const initializeSchedule = async () => {
  try {
    setLoading(true);

    // const role = await fetchUserRole(); // Get fresh role
    // const tuitions = await fetchTuitionsData(); // Get fresh tuitions

    await generateAndFetchEvents(); // Pass them directly
    setLoading(false);

  } catch (error) {
    console.error('Error initializing schedule:', error);
    setLoading(false);
    Alert.alert('Error', 'Failed to load schedule data');
  }
};

const generateTodayEvents = async (user, monthKey, existingEvents, tuitions, userRole) => {
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const todayDayIndex = today.getDay();
  
  console.log(`Checking today (${todayKey}) - day index: ${todayDayIndex}`);
  
  // Check if today already has events in database
  let existingTodayEvents = [];
  if (existingEvents[todayKey]) {
    existingTodayEvents = existingEvents[todayKey];
    console.log(`Found ${existingTodayEvents.length} existing events for today`);
  }
  
  // Get tuition IDs that already have events today
  const existingTuitionIds = existingTodayEvents.map(event => event.tuitionId);
  
  // Check each tuition to see if it should have a class today
  const newTodayEvents = [];
  
  tuitions.forEach(tuition => {
    const { scheduleDays = [], studentName, teacherName, subjects = [] } = tuition;
    
    // Skip if this tuition already has an event today
    if (existingTuitionIds.includes(tuition.id)) {
      console.log(`Tuition ${tuition.id} already has event for today, skipping`);
      return;
    }
    
    // Check if today is a scheduled day for this tuition
    if (scheduleDays.includes(todayDayIndex)) {
      console.log(`Tuition ${tuition.id} should have class today, generating event`);
      
      const displayName = userRole === 'Teacher' ? studentName : teacherName;
      
      newTodayEvents.push({
        id: `${tuition.id}-class-${todayKey}`,
        type: 'class',
        tuitionId: tuition.id,
        name: displayName,
        subject: subjects[0] || 'General',
        completed: false,
        time: 'All Day'
      });
    }
  });
  
  // Combine existing and new events for today
  const allTodayEvents = [...existingTodayEvents, ...newTodayEvents];
  
  if (allTodayEvents.length > 0) {
    return { [todayKey]: allTodayEvents };
  }
  
  return {};
};

const generateFutureEventsForMonth = (date, tuitions, role) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const generatedEvents = {};
  const today = new Date();
  
  console.log('generateFutureEventsForMonth called with tuitions:', tuitions.length);

  tuitions.forEach((tuition) => {
    const { 
      scheduleDays = [], 
      classesPerPayday = 0, 
      classesSincePayday = 0,
      salary = 0,
      studentName,
      teacherName,
      subjects = []
    } = tuition;

    // Generate class events for future dates only (skip today)
    scheduleDays.forEach(dayIndex => {
      let currentDay = addDays(today, 1); // Start from tomorrow
      
      // Find first occurrence of the scheduled day after today
      while (currentDay.getDay() !== dayIndex && currentDay <= monthEnd) {
        currentDay = addDays(currentDay, 1);
      }

      while (currentDay <= monthEnd) {
        if (currentDay.getDay() === dayIndex) {
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

            const displayName = role === 'Teacher' ? studentName : teacherName;

            generatedEvents[dateKey].push({
              id: `${tuition.id}-class-${dateKey}`,
              type: 'class',
              tuitionId: tuition.id,
              name: displayName,
              subject: subjects[0] || 'General',
              completed: false,
              time: 'All Day'
            });

          } catch (error) {
            console.error('Error generating class event for date:', currentDay, error);
          }
        }
        currentDay = addDays(currentDay, 7);
      }
    });

    // Generate payday events for future (same logic as before)
    if (classesPerPayday > 0) {
      const remainingClasses = classesPerPayday - classesSincePayday;
      let classCount = 0;
      let currentDay = new Date(monthStart);

      while (currentDay <= monthEnd && classCount < remainingClasses) {
        if (scheduleDays.includes(currentDay.getDay()) && !isToday(currentDay)) {
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

            const displayName = role === 'Teacher' ? studentName : teacherName;

            generatedEvents[dateKey].push({
              id: `${tuition.id}-payday-${dateKey}`,
              type: 'payday',
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

// const generateEventsForMonth = (date, tuitions, role) => {
//   const monthStart = startOfMonth(date);
//   const monthEnd = endOfMonth(date);
//   const generatedEvents = {};
//   const today = new Date();

//   console.log('generateEventsForMonth called with tuitions:', tuitions.length);

//   tuitions.forEach((tuition) => {
//     const { 
//       scheduleDays = [], 
//       classesPerPayday = 0, 
//       classesSincePayday = 0,
//       lastPayday,
//       salary = 0,
//       studentName,
//       teacherName,
//       subjects = []
//     } = tuition;

//     // Generate class events
//     scheduleDays.forEach(dayIndex => {
//       let currentDay = new Date(monthStart);
      
//       // Find first occurrence of the scheduled day in the month
//       while (currentDay.getDay() !== dayIndex && currentDay <= monthEnd) {
//         currentDay = addDays(currentDay, 1);
//       }

//       while (currentDay <= monthEnd ) {
//         try {
//           const dateKey = format(currentDay, 'yyyy-MM-dd');
//           const eventDate = safeParseDateString(dateKey);

//           if (!eventDate) {
//             currentDay = addDays(currentDay, 7);
//             continue;
//           }

//           if (!generatedEvents[dateKey]) {
//             generatedEvents[dateKey] = [];
//           }

//           const displayName = role === 'Teacher' ? studentName : teacherName;

//           // Correct type: missed if in the past, class otherwise (including today)
//          const eventType = isToday(eventDate)
//           ? 'class'
//           : isBefore(eventDate, today)
//             ? 'missed-class'
//             : 'class';

//           const completed = false; // all classes incomplete initially

//           generatedEvents[dateKey].push({
//             id: `${tuition.id}-class-${dateKey}`,
//             type: eventType,
//             tuitionId: tuition.id,
//             name: displayName,
//             subject: subjects[0] || 'General',
//             completed,
//             time: 'All Day'
//           });

//           currentDay = addDays(currentDay, 7);
//         } catch (error) {
//           console.error('Error generating class event for date:', currentDay, error);
//           break;
//         }
//       }
//     });

//     // Generate payday events
//     if (classesPerPayday > 0) {
//       const remainingClasses = classesPerPayday - classesSincePayday;
//       let classCount = 0;
//       let currentDay = new Date(monthStart);

//       while (currentDay <= monthEnd && classCount < remainingClasses) {
//         if (scheduleDays.includes(currentDay.getDay())) {
//           classCount++;
//           if (classCount === remainingClasses) {
//             const dateKey = format(currentDay, 'yyyy-MM-dd');
//             const eventDate = safeParseDateString(dateKey);
            
//             if (!eventDate) {
//               currentDay = addDays(currentDay, 1);
//               continue;
//             }

//             if (!generatedEvents[dateKey]) {
//               generatedEvents[dateKey] = [];
//             }

//             const displayName = role === 'Teacher' ? studentName : teacherName;

//             // Correct type: missed if in the past, payday otherwise (including today)
//             const eventType = isToday(eventDate)
//               ? 'payday'
//               : isBefore(eventDate, today)
//                 ? 'missed-payday'
//                 : 'payday';

//             const completed = false;

//             generatedEvents[dateKey].push({
//               id: `${tuition.id}-payday-${dateKey}`,
//               type: eventType,
//               tuitionId: tuition.id,
//               name: displayName,
//               amount: salary,
//               completed,
//               time: 'All Day'
//             });
//           }
//         }
//         currentDay = addDays(currentDay, 1);
//       }
//     }
//   });

//   return generatedEvents;
// };

const updatePastIncompletedClasses = async (events, userUid, monthKey) => {
  const today = new Date();
  let needsUpdate = false;
  const updatedEvents = { ...events };

  Object.entries(events).forEach(([dateKey, dayEvents]) => {
    const eventDate = safeParseDateString(dateKey);
    if (eventDate && isBefore(eventDate, today)) {
      dayEvents.forEach((event, index) => {
        if (event.type === 'class' && !event.completed) {
          updatedEvents[dateKey][index] = {
            ...event,
            type: 'missed-class'
          };
          needsUpdate = true;
        }
      });
    }
  });

  if (needsUpdate) {
    try {
      const scheduleDocRef = doc(db, 'Users', userUid, 'Schedule', monthKey);
      await setDoc(scheduleDocRef, updatedEvents, { merge: true });
      console.log('Updated past incomplete classes to missed-class');
    } catch (error) {
      console.error('Error updating past classes:', error);
    }
  }

  return updatedEvents;
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

    // Fetch user role (teacher or student)
    let userRole = null;
    try {
      const userDoc = await getDoc(doc(db, 'Users', user.uid));
      if (userDoc.exists()) {
        userRole = userDoc.data().type;
        console.log('User role:', userRole);
      }
    } catch (roleError) {
      console.error('Error fetching user role:', roleError);
    }

    // Fetch tuitions for user
    let fetchedTuitions = [];
    try {
      const tuitionsRef = collection(db, 'Users', user.uid, 'tuitions');
      const tuitionsSnapshot = await getDocs(tuitionsRef);

      tuitionsSnapshot.forEach(docSnap => {
        fetchedTuitions.push({
          id: docSnap.id,
          ...docSnap.data(),
        });
      });
    } catch (error) {
      console.error('Error fetching tuitions:', error);
    }

    console.log('Using tuitions for generation:', fetchedTuitions.length);

    const today = new Date();
    let combinedEvents = {};

    // 1. Fetch past events from Firebase
    try {
      const scheduleDocRef = doc(db, 'Users', user.uid, 'Schedule', monthKey);
      const scheduleDoc = await getDoc(scheduleDocRef);

      if (scheduleDoc.exists()) {
        let firebaseEvents = scheduleDoc.data();

        firebaseEvents = await updatePastIncompletedClasses(firebaseEvents, user.uid, monthKey);
        Object.entries(firebaseEvents).forEach(([dateKey, dayEvents]) => {
          const eventDate = safeParseDateString(dateKey);
          if (eventDate && isBefore(eventDate, today)) {
            combinedEvents[dateKey] = dayEvents;
          }
        });
        console.log('Loaded past events from Firebase:', Object.keys(combinedEvents).length);
      }
    } catch (firebaseError) {
      console.warn('Could not fetch from Firebase, will generate all events:', firebaseError.message);
    }

    // 2. Handle today's events specially
const todayEvents = await generateTodayEvents(user, monthKey, combinedEvents, fetchedTuitions, userRole);
Object.assign(combinedEvents, todayEvents);

// 3. Generate future events (excluding today)
const futureEvents = generateFutureEventsForMonth(currentDate, fetchedTuitions, userRole);

    // Merge: past from Firebase, today & future from generated
    // Object.entries(futureEvents).forEach(([dateKey, dayEvents]) => {
    //   const eventDate = safeParseDateString(dateKey);
    //   if (!eventDate) return;

    //   if (isBefore(eventDate, today)) {
    //     // Keep past events from Firebase if any, else use generated
    //     if (!combinedEvents[dateKey]) combinedEvents[dateKey] = dayEvents;
    //   } else {
    //     // Today and future: always use generated events
    //     combinedEvents[dateKey] = dayEvents;
    //   }
    // });
    Object.entries(futureEvents).forEach(([dateKey, dayEvents]) => {
  if (!combinedEvents[dateKey]) {
    combinedEvents[dateKey] = dayEvents;
  }
});

    console.log('Combined events (past + today/future generated):', Object.keys(combinedEvents).length);

    if (Object.keys(combinedEvents).length > 0) {
      // Save combined events back to Firebase
      try {
        const scheduleDocRef = doc(db, 'Users', user.uid, 'Schedule', monthKey);
        await setDoc(scheduleDocRef, combinedEvents, { merge: true });
        console.log('Combined events saved to Firebase');
      } catch (firebaseError) {
        console.warn('Could not save combined events to Firebase:', firebaseError.message);
      }

      // Update state
      setEvents(combinedEvents);
      processEventsForCalendar(combinedEvents);
      categorizeEvents(combinedEvents);

      // Cache for offline use
      try {
        await AsyncStorage.setItem(`schedule_${monthKey}`, JSON.stringify(combinedEvents));
        console.log('Events cached locally');
      } catch (cacheError) {
        console.warn('Could not cache events:', cacheError);
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

    // Fallback to cache
    try {
      const monthKey = format(currentDate, 'MMMM yyyy');
      const cachedEvents = await AsyncStorage.getItem(`schedule_${monthKey}`);
      if (cachedEvents) {
        const parsedEvents = JSON.parse(cachedEvents);
        setEvents(parsedEvents);
        processEventsForCalendar(parsedEvents);
        categorizeEvents(parsedEvents);
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

    Object.entries(monthEvents).forEach(([date, dayEvents]) => {
      if (dayEvents && dayEvents.length > 0) {
        const colors = dayEvents.map(event => getEventColor(event.type, event.completed));
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

          if (isToday(eventDate)) {
            // Today's events are never missed
            upcoming.push(eventWithDate);
          } else if (isBefore(eventDate, today)) {
            if (!event.completed) {
              missed.push(eventWithDate);
            }
          } else if (isAfter(eventDate, today) && isBefore(eventDate, addDays(today, 7))) {
            upcoming.push(eventWithDate);
          }
        });

      }
    });


    upcoming.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
    missed.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());
    
    setUpcomingEvents(upcoming.slice(0, 6));
    setMissedEvents(missed.slice(0, missedEventsLimit));
  };

  const prioritizeColors = (colors) => {
    const priority = ['#FF4444', '#FFD700', '#4CAF50']; // Red, Yellow, Green
    return colors.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
  };

  const getEventColor = (type, completed = false) => {
     if (completed) {
      return '#2196F3'; // Blue for completed events
    }

    switch (type) {
      case 'missed-class':
      case 'missed-payday':
        return '#FF4444';
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

  // const loadMoreMissedEvents = () => {
  //     setLoadingMore(true);
  //     const newLimit = missedEventsLimit + 20;
  //     setMissedEventsLimit(newLimit);
      
  //     setTimeout(() => {
  //       const allMissedEvents = [];
  //       const today = new Date();

  //       Object.entries(events).forEach(([date, dayEvents]) => {
  //         if (dayEvents && dayEvents.length > 0) {
  //           const eventDate = parseISO(date);
            
  //           dayEvents.forEach(event => {
  //             if (event.type.includes('missed')) {
  //               allMissedEvents.push({ ...event, date, eventDate });
  //             }
  //           });
  //         }
  //       });

  //           allMissedEvents.sort((a, b) => {
  //             if (!a.eventDate || !b.eventDate || !isValid(a.eventDate) || !isValid(b.eventDate)) return 0;
  //             return b.eventDate.getTime() - a.eventDate.getTime();
  //           });
  //       setMissedEvents(allMissedEvents.slice(0, newLimit));
  //       setLoadingMore(false);
  //     }, 500);
  //   };

  const loadMoreMissedEvents = () => {
  setLoadingMore(true);
  const newLimit = missedEventsLimit + 20;
  
  setTimeout(() => {
    // Re-categorize all events to get accurate missed events
    const allMissed = [];
    const today = new Date();

    Object.entries(events).forEach(([date, dayEvents]) => {
      if (dayEvents && dayEvents.length > 0) {
        const eventDate = safeParseDateString(date);
        
        if (eventDate && isBefore(eventDate, today)) {
          dayEvents.forEach(event => {
            if (event.type && event.type.includes('missed') && !event.completed) {
              allMissed.push({ ...event, date, eventDate });
            }
          });
        }
      }
    });

    allMissed.sort((a, b) => {
      if (!a.eventDate || !b.eventDate) return 0;
      return b.eventDate.getTime() - a.eventDate.getTime();
    });
    
    setMissedEventsLimit(newLimit);
    setMissedEvents(allMissed.slice(0, newLimit));
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
    const isTodayEvent = eventDate && isToday(eventDate);
    const isTodayClass = isTodayEvent && currentEvent?.type === 'class';
    const isMissedClass = !isTodayEvent && currentEvent?.type === 'missed-class';



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
                
                
                <View style={styles.modalActionsContainer}>
                {/* Start Class button for today's class only */}
                {isTodayClass && (
                  <TouchableOpacity
                    style={styles.startClassButton}
                    onPress={() => {
                      setModalVisible(false);
                      console.log('Start Class button pressed for:', currentEvent.id);
                      navigation.navigate('Class', {
                        studentName: currentEvent.name,
                        subject: currentEvent.subject,
                        tuitionId: currentEvent.tuitionId,
                        eventId: currentEvent.id,
                        date: selectedDate,
                        eventType: currentEvent.type,
                      });
                    }}
                  >
                    <Text style={styles.startClassButtonText}>Start Class</Text>
                  </TouchableOpacity>
                )}

                {/* Make Up button for past missed classes only */}
                {/* {isMissedClass && (
                  <TouchableOpacity
                    style={styles.makeUpButton}
                    onPress={() => {
                      setModalVisible(false);
                      console.log('Make Up button pressed for:', currentEvent.id);
                    }}
                  >
                    <Text style={styles.makeUpButtonText}>Make Up</Text>
                  </TouchableOpacity>
                )} */}
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
                {/*{missedEvents.map(event => renderEventItem(event))} */}
                {missedEvents.slice(0, missedEventsLimit).map(event => renderEventItem(event))}
                
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
    borderRadius: 30,
    paddingLeft: 15,
    paddingRight: 5,
    paddingVertical: 5,
    paddingBottom: 5,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 0,
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
  makeUpButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: -5,
    marginLeft: 140,
    alignItems: 'center',
  },
  modalActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  makeUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startClassButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: -5,
    marginLeft: 130,
    alignItems: 'center',
  },
  startClassButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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