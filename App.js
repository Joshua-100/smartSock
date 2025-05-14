import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity, Platform, Modal } from 'react-native';
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ESP32 Connection Component
const ESP32Connection = ({ 
  ipAddress, 
  setIpAddress, 
  isConnected, 
  setIsConnected,
  onConnect,
  onDisconnect
}) => {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const configureESP32 = async () => {
    try {
      setConnectionStatus('configuring');
      const response = await axios.post(`http://${ipAddress}/configure`, {
        ssid,
        password
      }, { timeout: 5000 });
      
      if (response.data.success) {
        Alert.alert("Success", "ESP32 configured successfully!");
        setIsConnected(true);
        onConnect();
        setConnectionStatus('connected');
      } else {
        throw new Error(response.data.message || "Configuration failed");
      }
    } catch (error) {
      Alert.alert("Error", `Failed to configure ESP32: ${error.message}`);
      setConnectionStatus('error');
      onDisconnect();
    } finally {
      setIsConfiguring(false);
    }
  };

  const testConnection = async () => {
    try {
      setConnectionStatus('testing');
      const response = await axios.get(`http://${ipAddress}/ping`, { timeout: 3000 });
      if (response.data === "pong") {
        setIsConnected(true);
        onConnect();
        setConnectionStatus('connected');
        Alert.alert("Success", "ESP32 connection successful!");
      } else {
        throw new Error("Invalid response from ESP32");
      }
    } catch (error) {
      setIsConnected(false);
      onDisconnect();
      setConnectionStatus('error');
      Alert.alert("Error", `Connection test failed: ${error.message}`);
    }
  };

  return (
    <View style={connectionStyles.container}>
      <TouchableOpacity 
        style={connectionStyles.connectionButton}
        onPress={() => setIsConfiguring(true)}
      >
        <Ionicons 
          name={isConnected ? 'wifi' : 'wifi-off'} 
          size={24} 
          color={isConnected ? '#4CAF50' : '#F44336'} 
        />
        <Text style={connectionStyles.connectionText}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isConfiguring}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsConfiguring(false)}
      >
        <View style={connectionStyles.modalContainer}>
          <View style={connectionStyles.modalContent}>
            <Text style={connectionStyles.modalTitle}>ESP32 Configuration</Text>
            
            <TextInput
              style={connectionStyles.input}
              placeholder="ESP32 IP Address"
              value={ipAddress}
              onChangeText={setIpAddress}
              keyboardType="numeric"
            />
            
            <TextInput
              style={connectionStyles.input}
              placeholder="WiFi SSID"
              value={ssid}
              onChangeText={setSsid}
            />
            
            <TextInput
              style={connectionStyles.input}
              placeholder="WiFi Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <View style={connectionStyles.buttonRow}>
              <TouchableOpacity 
                style={[connectionStyles.button, connectionStyles.testButton]}
                onPress={testConnection}
              >
                <Text style={connectionStyles.buttonText}>Test Connection</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[connectionStyles.button, connectionStyles.configButton]}
                onPress={configureESP32}
              >
                <Text style={connectionStyles.buttonText}>Configure WiFi</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={connectionStyles.closeButton}
              onPress={() => setIsConfiguring(false)}
            >
              <Text style={connectionStyles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            
            <Text style={connectionStyles.statusText}>
              Status: {connectionStatus.toUpperCase()}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const connectionStyles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  connectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  connectionText: {
    marginLeft: 8,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  button: {
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  testButton: {
    backgroundColor: '#2196F3',
  },
  configButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f44336',
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  statusText: {
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

const SmartSockApp = () => {
  // State management
  const [ipAddress, setIpAddress] = useState('192.168.1.100');
  const [currentPressure, setCurrentPressure] = useState(0);
  const [threshold, setThreshold] = useState(1015);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const soundRef = useRef(null);
  const intervalRef = useRef(null);

  // Load alarm sound
  useEffect(() => {
    const loadResources = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('./assets/alarm1.wav')
        );
        soundRef.current = sound;
      } catch (error) {
        console.error('Error loading sound:', error);
      }
    };

    loadResources();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      stopMonitoring();
    };
  }, []);

  // Alarm functions
  const playAlarm = async () => {
    try {
      await soundRef.current.replayAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const stopAlarm = async () => {
    try {
      await soundRef.current.stopAsync();
    } catch (error) {
      console.error('Error stopping sound:', error);
    }
  };

  // Notification functions
  const sendNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ Sleepwalking Alert!",
        body: `Pressure detected! Your child may be sleepwalking (${currentPressure.toFixed(2)} hPa)`,
        sound: true,
        vibrate: [0, 250, 250, 250],
      },
      trigger: null,
    });
  };

  // Pressure monitoring
  const checkPressure = async () => {
    try {
      const response = await axios.get(`http://${ipAddress}/pressure`, { timeout: 3000 });
      const pressure = parseFloat(response.data);
      setCurrentPressure(pressure);
      setIsConnected(true);
      setLastUpdated(new Date().toLocaleTimeString());

      if (pressure > threshold) {
        playAlarm();
        sendNotification();
        Alert.alert(
          "Sleepwalking Alert!",
          `Pressure detected! Your child may be sleepwalking (${pressure.toFixed(2)} hPa)`,
          [
            {
              text: "Silence Alarm",
              onPress: stopAlarm,
              style: "destructive"
            },
            {
              text: "OK",
              style: "cancel"
            }
          ]
        );
      }
    } catch (error) {
      setIsConnected(false);
      console.error("Connection error:", error);
    }
  };

  // Control functions
  const startMonitoring = () => {
    if (!isConnected) {
      Alert.alert("Not Connected", "Please connect to the ESP32 first");
      return;
    }
    checkPressure(); // Immediate check
    intervalRef.current = setInterval(checkPressure, 3000);
    setIsMonitoring(true);
  };

  const stopMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);
  };

  const toggleMonitoring = () => {
    isMonitoring ? stopMonitoring() : startMonitoring();
  };

  return (
    <LinearGradient
      colors={['#f5f7fa', '#c3cfe2']}
      style={styles.container}
    >
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
            stopMonitoring();
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

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Last update: {lastUpdated || 'Never'}
          </Text>
        </View>

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