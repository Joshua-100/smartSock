import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Alert, TextInput, TouchableOpacity, Platform, StyleSheet} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import axios from 'axios';

import ESP32Connection from './components/ESP32Connection';
import useAlarm from './hooks/useAlarm';
import { sendNotification } from './utils/notifications';

const SmartSockApp = () => {
  const [ipAddress, setIpAddress] = useState('192.168.1.100');
  const [currentPressure, setCurrentPressure] = useState(0);
  const [threshold, setThreshold] = useState(1015);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const intervalRef = useRef(null);

  const { soundRef, loadAlarm, playAlarm, stopAlarm } = useAlarm();

  useEffect(() => {
    loadAlarm();
    return () => {
      stopAlarm();
      clearInterval(intervalRef.current);
    };
  }, []);

  const checkPressure = async () => {
    try {
      const response = await axios.get(`http://${ipAddress}/pressure`, { timeout: 3000 });
      const pressure = parseFloat(response.data);
      setCurrentPressure(pressure);
      setIsConnected(true);
      setLastUpdated(new Date().toLocaleTimeString());

      if (pressure > threshold) {
        playAlarm();
        sendNotification(pressure);
        Alert.alert(
          "Sleepwalking Alert!",
          `Pressure detected! Your child may be sleepwalking (${pressure.toFixed(2)} hPa)`,
          [
            { text: "Silence Alarm", onPress: stopAlarm, style: "destructive" },
            { text: "OK", style: "cancel" }
          ]
        );
      }
    } catch (error) {
      setIsConnected(false);
      console.error("Connection error:", error);
    }
  };

  const toggleMonitoring = () => {
    if (!isConnected) {
      Alert.alert("Not Connected", "Please connect to the ESP32 first");
      return;
    }

    if (isMonitoring) {
      clearInterval(intervalRef.current);
      setIsMonitoring(false);
    } else {
      checkPressure();
      intervalRef.current = setInterval(checkPressure, 3000);
      setIsMonitoring(true);
    }
  };

  return (
    <LinearGradient colors={['#f5f7fa', '#c3cfe2']} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Smart Sock</Text>
        <Text style={styles.subtitle}>SleepWalking Accident Prevention System</Text>

        <ESP32Connection
          ipAddress={ipAddress}
          setIpAddress={setIpAddress}
          isConnected={isConnected}
          setIsConnected={setIsConnected}
          onConnect={() => console.log("Connected to ESP32")}
          onDisconnect={() => {
            setIsMonitoring(false);
            clearInterval(intervalRef.current);
            console.log("Disconnected from ESP32");
          }}
        />

        <View style={styles.pressureContainer}>
          <Text style={styles.pressureValue}>
            {currentPressure.toFixed(2)} <Text style={styles.unit}>hPa</Text>
          </Text>
          <Text style={styles.pressureLabel}>FOOT PRESSURE</Text>
        </View>

        <View style={styles.thresholdContainer}>
          <Text style={styles.thresholdLabel}>Alert Threshold:</Text>
          <TextInput
            style={styles.thresholdInput}
            value={threshold.toString()}
            onChangeText={(text) => setThreshold(parseFloat(text) || 0)}
            keyboardType="numeric"
            placeholder="Set threshold"
          />
          <Text style={styles.unit}>hPa</Text>
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
          <Text style={styles.buttonText}>
            {isMonitoring ? 'STOP MONITORING' : 'START MONITORING'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 25,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 40,
  },
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
  pressureValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#2c3e50',
  },
  pressureLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
    letterSpacing: 1,
  },
  unit: {
    fontSize: 24,
    color: '#95a5a6',
  },
  thresholdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  thresholdLabel: {
    flex: 1,
    fontSize: 16,
    color: '#7f8c8d',
  },
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
  input: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
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
  startButton: {
    backgroundColor: '#2ecc71',
  },
  stopButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default SmartSockApp;
