import { CapacitorWifi } from '@capgo/capacitor-wifi';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

let bleInitialized = false;

/**
 * NativeScanner provides a bridge to native WiFi scanning APIs on mobile devices.
 */
export const NativeScanner = {
  isSupported: () => {
    return Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios';
  },

  scan: async () => {
    if (!NativeScanner.isSupported()) return [];

    let results = [];

    // --- WIFI SCAN ---
    try {
      const status = await CapacitorWifi.checkPermissions();
      if (status.location !== 'granted') {
        const req = await CapacitorWifi.requestPermissions();
        if (req.location !== 'granted') return [];
      }
      
      const platform = Capacitor.getPlatform();

      if (platform === 'android') {
        await CapacitorWifi.startScan();
        const { networks } = await CapacitorWifi.getAvailableNetworks();
        
        results = networks.map(w => ({
          id: w.ssid || Math.random().toString(),
          mac: 'WIFI-AP',
          ssid: w.ssid,
          rssi: w.rssi || -95,
          source: 'WIFI',
          type: 'WiFi Access Point',
          lastSeen: Date.now(),
          name: (w.ssid === '<redacted>' || !w.ssid || w.ssid === '<hidden>') 
                ? `NATIVE SOURCE` 
                : w.ssid
        }));
      } else if (platform === 'ios') {
        const info = await CapacitorWifi.getWifiInfo();
        if (info.ssid) {
          results.push({
            id: info.ssid,
            mac: info.bssid || 'CONNECTED',
            ssid: info.ssid,
            rssi: info.signalStrength ? (info.signalStrength - 100) : -50,
            source: 'WIFI',
            type: 'WiFi Access Point',
            lastSeen: Date.now(),
            name: info.ssid
          });
        }
      }
    } catch (err) {
      console.error('Native WiFi Scan Failed:', err);
    }

    // --- BLUETOOTH LE SCAN ---
    try {
      if (!bleInitialized) {
        await BleClient.initialize();
        bleInitialized = true;
      }
      
      const bleDevices = [];
      await BleClient.requestLEScan(
        { services: [] },
        (result) => {
          if (result.device) {
            bleDevices.push({
              id: result.device.deviceId,
              mac: result.device.deviceId,
              ssid: result.device.name || 'Bluetooth LE Device',
              rssi: result.rssi || -95,
              source: 'BLUETOOTH',
              type: 'Bluetooth Device',
              lastSeen: Date.now(),
              name: result.device.name || 'UNKNOWN BT'
            });
          }
        }
      );

      // Wait for results
      await new Promise(r => setTimeout(r, 1500));
      await BleClient.stopLEScan();

      results = [...results, ...bleDevices];
    } catch (err) {
      console.error('Native BLE Scan Failed:', err);
    }

    return results;
  }
};
