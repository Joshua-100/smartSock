import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { Ionicons } from '@expo/vector-icons';

const manager = new BleManager();

const BLEConnection = ({
  serviceUUID,
  pressureCharUUID,
  device,
  setDevice,
  isConnected,
  setIsConnected,
  onDisconnect,
}) => {
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    return () => {
      manager.destroy();
    };
  }, []);

  const startScan = () => {
    setDevices([]);
    setScanning(true);
    manager.startDeviceScan(null, null, (error, scannedDevice) => {
      if (error) {
        Alert.alert('Scan Error', error.message);
        setScanning(false);
        return;
      }

      if (scannedDevice && scannedDevice.name && scannedDevice.name.includes('ESP32')) {
        setDevices((prev) => {
          const exists = prev.some((d) => d.id === scannedDevice.id);
          return exists ? prev : [...prev, scannedDevice];
        });
      }
    });

    setTimeout(() => {
      manager.stopDeviceScan();
      setScanning(false);
    }, 10000); // stop scan after 10 seconds
  };

  const connectToDevice = async (selectedDevice) => {
    try {
      const connectedDevice = await manager.connectToDevice(selectedDevice.id);
      await connectedDevice.discoverAllServicesAndCharacteristics();
      setDevice(connectedDevice);
      setIsConnected(true);
      Alert.alert('Connected', `Connected to ${selectedDevice.name}`);
    } catch (err) {
      Alert.alert('Connection Error', err.message);
    }
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      key={item.id || `${item.name}-${index}`}
      style={styles.deviceButton}
      onPress={() => connectToDevice(item)}
    >
      <Ionicons name="bluetooth" size={20} color="#3498db" />
      <Text style={styles.deviceText}>{item.name || 'Unnamed Device'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.scanButton} onPress={startScan} disabled={scanning}>
        <Text style={styles.scanButtonText}>
          {scanning ? 'Scanning...' : 'Scan for ESP32 Devices'}
        </Text>
        {scanning && <ActivityIndicator style={{ marginLeft: 10 }} />}
      </TouchableOpacity>

      <FlatList
        data={devices}
        keyExtractor={(item, index) => item.id || `${item.name}-${index}`}
        renderItem={renderItem}
        ListEmptyComponent={!scanning ? <Text style={styles.emptyText}>No devices found</Text> : null}
        style={{ marginTop: 10 }}
      />

      {isConnected && (
        <Text style={styles.statusText}>
          ✅ Connected to {device?.name}
        </Text>
      )}
    </View>
  );
};

export default BLEConnection;

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  scanButton: {
    flexDirection: 'row',
    backgroundColor: '#2ecc71',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  deviceButton: {
    padding: 12,
    marginVertical: 6,
    backgroundColor: '#ecf0f1',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceText: {
    marginLeft: 10,
    color: '#2c3e50',
    fontWeight: '600',
  },
  statusText: {
    marginTop: 10,
    color: '#27ae60',
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#7f8c8d',
    marginTop: 20,
  },
});
