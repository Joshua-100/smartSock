import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';

import BLEConnection from './components/BLEConnection';
import useAlarm from './hooks/useAlarm';
import { sendNotification } from './utils/notifications';

import { decode as atob } from 'base-64';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc'; // replace with your ESP32 BLE service UUID
const PRESSURE_CHAR_UUID = 'abcd1234-5678-90ab-cdef-1234567890ab'; // replace with pressure characteristic UUID

const App = () => {
  const [gaitStatus, setGaitStatus] = useState("Unknown");
  const [threshold, setThreshold] = useState(1015);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [device, setDevice] = useState(null);

  const intervalRef = useRef(null);
  const { soundRef, loadAlarm, playAlarm, stopAlarm } = useAlarm();

  useEffect(() => {
    loadAlarm();
    return () => {
      stopAlarm();
      clearInterval(intervalRef.current);
    };
  }, []);

  // Reads pressure from BLE characteristic (assumes value is float encoded as string)
const readPressureBLE = async () => {
  if (!device) return;

  try {
    const characteristic = await device.readCharacteristicForService(SERVICE_UUID, PRESSURE_CHAR_UUID);
    const rawValue = characteristic.value;
    const decodedValue = atob(rawValue); // e.g., "HEEL_STRIKE"

    setGaitStatus(decodedValue);
    setLastUpdated(new Date().toLocaleTimeString());

    if (decodedValue === "WALKING") {
      playAlarm();
      sendNotification(decodedValue);
      Alert.alert(
        "Sleepwalking Alert!",
        `Motion detected: ${decodedValue}`,
        [
          { text: "Silence Alarm", onPress: stopAlarm, style: "destructive" },
          { text: "OK", style: "cancel" }
        ]
      );
    }

  } catch (error) {
    console.error("BLE Read Error:", error);

    // 🛑 Check if error is due to disconnection
    if (error.message?.includes('disconnected')) {
      Alert.alert("Disconnected", "The BLE device was disconnected.");
      setIsConnected(false);
      stopMonitoring(); // stop interval + alarm
    }
  }
};



  const startMonitoring = () => {
    if (!isConnected) {
      Alert.alert("Not Connected", "Please connect to the BLE device first");
      return;
    }
    readPressureBLE(); // immediate read
    intervalRef.current = setInterval(readPressureBLE, 3000);
    setIsMonitoring(true);
  };

  const stopMonitoring = () => {
    clearInterval(intervalRef.current);
    setIsMonitoring(false);
    stopAlarm();
  };

  const toggleMonitoring = () => {
    if (isMonitoring) stopMonitoring();
    else startMonitoring();
  };

  return (
    <LinearGradient colors={['#f5f7fa', '#c3cfe2']} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Smart Sock</Text>
        <Text style={styles.subtitle}>SleepWalking Accident Prevention System</Text>

        <BLEConnection
          serviceUUID={SERVICE_UUID}
          pressureCharUUID={PRESSURE_CHAR_UUID}
          device={device}
          setDevice={setDevice}
          isConnected={isConnected}
          setIsConnected={setIsConnected}
          onDisconnect={() => {
            setIsMonitoring(false);
            clearInterval(intervalRef.current);
            setCurrentPressure(0);
            setLastUpdated('');
          }}
        />

        <View style={styles.pressureContainer}>
  <Text style={styles.pressureValue}>{gaitStatus}</Text>
  <Text style={styles.pressureLabel}>GAIT STATUS</Text>
</View>


<View style={styles.soundTestContainer}>
  <Text style={styles.soundTestText}>🔔 Test Alarm Sound</Text>
  <TouchableOpacity style={styles.testButton} onPress={playAlarm}>
    <Text style={styles.testButtonText}>Play Alarm</Text>
  </TouchableOpacity>
</View>


        <Text style={styles.statusText}>Last update: {lastUpdated || 'Never'}</Text>

        <TouchableOpacity
          style={[styles.button, isMonitoring ? styles.stopButton : styles.startButton]}
          onPress={toggleMonitoring}
          disabled={!isConnected}
        >
          <Ionicons
            name={isMonitoring ? 'stop-circle' : 'play-circle'}
            size={24}
            color="white"
          />
          <Text style={styles.buttonText}>{isMonitoring ? 'STOP MONITORING' : 'START MONITORING'}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 25, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#2c3e50', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#7f8c8d', textAlign: 'center', marginBottom: 40 },
  pressureContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    marginBottom: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
soundTestContainer: {
  alignItems: 'center',
  marginBottom: 20,
},
soundTestText: {
  fontSize: 14,
  color: '#2c3e50',
  marginBottom: 10,
},
testButton: {
  backgroundColor: '#2ecc71',
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 10,
},
testButtonText: {
  color: 'white',
  fontWeight: 'bold',
},
  
  pressureValue: { fontSize: 48, fontWeight: '700', color: '#2c3e50' },
  pressureLabel: { fontSize: 14, color: '#7f8c8d', marginTop: 5, letterSpacing: 1 },
  unit: { fontSize: 24, color: '#95a5a6' },
  thresholdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  thresholdLabel: { flex: 1, fontSize: 16, color: '#7f8c8d' },
  thresholdInput: {
    width: 80,
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'right',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#bdc3c7',
  },
  statusText: { fontSize: 14, color: '#7f8c8d', marginBottom: 20 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  startButton: { backgroundColor: '#2ecc71' },
  stopButton: { backgroundColor: '#e74c3c' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 10 },
});

export default App;6