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
          id: w.bssid || w.ssid || Math.random().toString(),
          mac: w.bssid || 'WIFI-AP',
          ssid: w.ssid,
          rssi: w.rssi || -95,
          source: 'WIFI',
          type: 'WiFi Access Point',
          lastSeen: Date.now(),
          name: (w.ssid === '<redacted>' || !w.ssid || w.ssid === '<hidden>') 
                ? (w.bssid || `HIDDEN AP`) 
                : w.ssid
        }));
      } else if (platform === 'ios') {
        const info = await CapacitorWifi.getWifiInfo();
        if (info.ssid) {
          results.push({
            id: info.bssid || info.ssid || 'IOS-WIFI',
            mac: info.bssid || 'CONNECTED',
            ssid: info.ssid,
            rssi: info.signalStrength ? (info.signalStrength - 100) : -50,
            source: 'WIFI',
            type: 'WiFi Access Point',
            lastSeen: Date.now(),
            name: info.ssid || info.bssid || 'WIFI NETWORK'
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
      const seenDevices = new Set();

      await BleClient.requestLEScan(
        { services: [] },
        (result) => {
          if (result.device && !seenDevices.has(result.device.deviceId)) {
            const deviceId = result.device.deviceId;
            const rawName = result.device.name || result.localName;
            
            // Format a better fallback name: Device Name OR "BT: [Last 4 chars of ID]"
            const displayName = rawName && rawName !== 'Unknown' 
              ? rawName 
              : `BT:${deviceId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()}`;

            bleDevices.push({
              id: deviceId,
              mac: deviceId,
              ssid: displayName,
              rssi: result.rssi || -95,
              source: 'BLUETOOTH',
              type: 'Bluetooth Device',
              lastSeen: Date.now(),
              name: displayName
            });
            
            seenDevices.add(deviceId);
          }
        }
      );

      // Wait for results - Increased to 3s for better "Scan Response" packet capture
      await new Promise(r => setTimeout(r, 3000));
      await BleClient.stopLEScan();

      results = [...results, ...bleDevices];
    } catch (err) {
      console.error('Native BLE Scan Failed:', err);
    }

    return results;
  }
};
