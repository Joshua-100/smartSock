import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

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
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.connectionButton}
        onPress={() => setIsConfiguring(true)}
      >
        <Ionicons 
          name={isConnected ? 'wifi' : 'wifi-off'} 
          size={24} 
          color={isConnected ? '#4CAF50' : '#F44336'} 
        />
        <Text style={styles.connectionText}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isConfiguring}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsConfiguring(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ESP32 Configuration</Text>

            <TextInput
              style={styles.input}
              placeholder="ESP32 IP Address"
              value={ipAddress}
              onChangeText={setIpAddress}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="WiFi SSID"
              value={ssid}
              onChangeText={setSsid}
            />
            <TextInput
              style={styles.input}
              placeholder="WiFi Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.testButton]}
                onPress={testConnection}
              >
                <Text style={styles.buttonText}>Test Connection</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.configButton]}
                onPress={configureESP32}
              >
                <Text style={styles.buttonText}>Configure WiFi</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setIsConfiguring(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>

            <Text style={styles.statusText}>Status: {connectionStatus.toUpperCase()}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
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

export default ESP32Connection;