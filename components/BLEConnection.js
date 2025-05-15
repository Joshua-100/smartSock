import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Platform, PermissionsAndroid, Alert } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { Ionicons } from '@expo/vector-icons';

const manager = new BleManager();

const BLEConnection = ({ serviceUUID, pressureCharUUID, device, setDevice, isConnected, setIsConnected, onDisconnect }) => {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    // Request permissions on Android
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }

    return () => {
      manager.destroy();
    };
  }, []);

  const scanAndConnect = () => {
    setDevices([]);
    setScanning(true);
    manager.startDeviceScan(null, null, (error, scannedDevice) => {
      if (error) {
        Alert.alert('Error', error.message);
        setScanning(false);
        return;
      }
      if (scannedDevice && scannedDevice.name) {
        if (!devices.find(d => d.id === scannedDevice.id)) {
          setDevices(prev => [...prev, scannedDevice]);
        }
      }
    });

    // Stop scanning after 10 seconds
    setTimeout(() => {
      manager.stopDeviceScan();
      setScanning(false);
    }, 10000);
  };

  const connectToDevice = async (selectedDevice) => {
    try {
      manager.stopDeviceScan();
      setScanning(false);
      const connectedDevice = await selectedDevice.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();
      setDevice(connectedDevice);
      setIsConnected(true);
      Alert.alert('Connected', `Connected to ${connectedDevice.name}`);

      // Subscribe to disconnection
      connectedDevice.onDisconnected((error, device) => {
        setIsConnected(false);
        setDevice(null);
        onDisconnect();
        Alert.alert('Disconnected', 'Device disconnected');
      });
    } catch (error) {
      Alert.alert('Connection Error', error.message);
    }
  };

  const disconnectDevice = async () => {
    if (!device) return;
    try {
      await device.cancelConnection();
      setIsConnected(false);
      setDevice(null);
      onDisconnect();
    } catch (error) {
      Alert.alert('Disconnection Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {isConnected ? (
        <TouchableOpacity style={[styles.button, styles.disconnectButton]} onPress={disconnectDevice}>
          <Ionicons name="bluetooth" size={20} color="white" />
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.button, scanning ? styles.scanningButton : styles.scanButton]}
            onPress={scanAndConnect}
            disabled={scanning}
          >
            <Ionicons name="bluetooth-searching" size={20} color="white" />
            <Text style={styles.buttonText}>{scanning ? 'Scanning...' : 'Scan BLE Devices'}</Text>
          </TouchableOpacity>

          <FlatList
            data={devices}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.deviceItem} onPress={() => connectToDevice(item)}>
                <Text style={styles.deviceName}>{item.name}</Text>
                <Text style={styles.deviceId}>{item.id}</Text>
              </TouchableOpacity>
            )}
            style={{ maxHeight: 200, marginTop: 10 }}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  scanButton: { backgroundColor: '#2196F3' },
  scanningButton: { backgroundColor: '#1976D2' },
  disconnectButton: { backgroundColor: '#f44336' },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  deviceItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  deviceId: {
    fontSize: 12,
    color: '#888',
  },
});

export default BLEConnection;