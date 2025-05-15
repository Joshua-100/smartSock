import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, PermissionsAndroid } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import base64 from 'react-native-base64';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';

const manager = new BleManager();

export default function SmartSockApp() {
  const [device, setDevice] = useState(null);
  const [pressure, setPressure] = useState('--');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [threshold, setThreshold] = useState(100);
  const soundRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }

    const loadAlarm = async () => {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/alarm1.wav')
      );
      soundRef.current = sound;
    };

    loadAlarm();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const scanAndConnect = () => {
    manager.startDeviceScan(null, null, async (error, scannedDevice) => {
      if (error) {
        Alert.alert('Scan Error', error.message);
        return;
      }

      if (scannedDevice.name?.includes("ESP32")) {
        manager.stopDeviceScan();
        try {
          const connectedDevice = await scannedDevice.connect();
          await connectedDevice.discoverAllServicesAndCharacteristics();
          setDevice(connectedDevice);
          Alert.alert("Connected", `Connected to ${connectedDevice.name}`);
        } catch (err) {
          Alert.alert("Connection Failed", err.message);
        }
      }
    });
  };

  const readPressure = async () => {
    try {
      const services = await device.services();
      const serviceUUID = services[0].uuid;

      const characteristics = await device.characteristicsForService(serviceUUID);
      const characteristic = characteristics.find(c => c.isReadable);

      const response = await device.readCharacteristicForService(serviceUUID, characteristic.uuid);
      const decoded = base64.decode(response.value);
      const pressureValue = parseFloat(decoded);
      setPressure(pressureValue.toFixed(2));

      if (pressureValue > threshold) {
        triggerAlert(pressureValue);
      }
    } catch (error) {
      console.error("Read error:", error);
    }
  };

  const triggerAlert = async (value) => {
    if (soundRef.current) await soundRef.current.replayAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Sleepwalking Alert!",
        body: `Detected Pressure: ${value}`,
        sound: true,
        vibrate: [0, 250, 250, 250],
      },
      trigger: null,
    });

    Alert.alert("ALERT!", `Detected pressure: ${value}`);
  };

  const startMonitoring = () => {
    if (!device) {
      Alert.alert("No device connected");
      return;
    }

    intervalRef.current = setInterval(() => {
      readPressure();
    }, 3000);

    setIsMonitoring(true);
  };

  const stopMonitoring = () => {
    clearInterval(intervalRef.current);
    setIsMonitoring(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Sock BLE</Text>
      <Text style={styles.subtitle}>Pressure: {pressure}</Text>

      <TouchableOpacity style={styles.button} onPress={scanAndConnect}>
        <Text style={styles.buttonText}>Connect to ESP32</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, isMonitoring ? styles.stopButton : styles.startButton]}
        onPress={isMonitoring ? stopMonitoring : startMonitoring}
        disabled={!device}
      >
        <Ionicons name={isMonitoring ? 'stop-circle' : 'play-circle'} size={20} color="white" />
        <Text style={styles.buttonText}>
          {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eef' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 18, marginBottom: 30 },
  button: {
    backgroundColor: '#3498db',
    padding: 14,
    marginVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  startButton: { backgroundColor: '#2ecc71' },
  stopButton: { backgroundColor: '#e74c3c' },
  buttonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 }
});