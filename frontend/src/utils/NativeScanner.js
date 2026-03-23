import { CapacitorWifi } from '@capgo/capacitor-wifi';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

const vendors = {
  'APPLE': ['000393', '000502', '000a27', '000d93', '0010fa', '0016cb', '0017f2', '0019e3', '001b63', '0a60c0', '80b989', '747786', 'bcd1d3', 'f8e9af', 'ac293a'],
  'GOOGLE': ['001a11', '3c5ab4', 'da03a3', 'daa119', '94ebcd'],
  'SAMSUNG': ['0000f0', '000278', '0007ab', 'dc0b34', '18227e'],
  'TP_LINK': ['50c7bf', 'e8de27', '001478', 'b0be76', '14cc20', 'e894f6'],
  'XIAOMI': ['04cf8c', '286c07', '640980'],
  'AMAZON': ['00bb3a', 'ac63be', 'fc65de'],
  'SONY': ['00014a', '00041f'],
  'NEST': ['18b430', '641666'],
  'ESPRESSIF': ['240ac4', '30aea4', 'a020a6', '4022d8', 'bcddc2', 'cc50e3', 'a4cf12', '10061c', '6cb456', '70041d', 'e89f6d', '70b8f6', '744dbd', '2462ab', '24d7eb'],
  'TUYA_SMART': ['00337a', '105a17', '10d561', '1869d8', '18de50', '1c90ff', '20f1b2', '381f8d', '382ce5', '30487d', '3c0b59', 'fc3cd7', 'fc671f', 'cc8cbf', '4ca919', '80647c', '7cf666', '84e342', 'd8d668', 'd8fc92', 'e4aee4', 'bc351e'],
  'HIKVISION': ['e4d58b', 'c8a702', '085411', '08a118', '00403d', '001006'],
  'DAHUA': ['d4430e', '08eded', '14a78b', '38af29', '3ce36b', '3cef8c', 'bc3253'],
  'WYZE': ['2caa8e', '7c78b2', '80482c', 'a4da22', 'd03f27', 'f0c88b'],
  'ARLO': ['486264', 'a41162', 'fc9c98'],
  'XIONGMAI': ['001215'],
  'RING': ['040df2', 'b0c554', 'de2d64'],
  'FOSCAM': ['00626e', 'b0d59d']
};

function classifyDevice(mac) {
  if (!mac) return { vendor: 'UNKNOWN', type: 'UNKNOWN' };
  const cleanMac = mac.toLowerCase().replace(/[^a-f0-9]/g, '');
  const oui = cleanMac.substring(0, 6);
  
  for (const [vendor, ids] of Object.entries(vendors)) {
    if (ids.some(id => oui.startsWith(id))) {
      let type = vendor === 'TUYA_SMART' || vendor === 'XIONGMAI' ? 'POTENTIAL SPY CAMERA' : 
                 ['HIKVISION', 'DAHUA', 'WYZE', 'ARLO', 'NEST', 'RING', 'FOSCAM'].includes(vendor) ? 'IP CAMERA' :
                 vendor === 'ESPRESSIF' ? 'IOT MODULE' : 'SMART DEVICE';
      return { vendor, type: type === 'SMART DEVICE' ? vendor : type };
    }
  }
  
  return { vendor: 'UNKNOWN', type: 'UNKNOWN NODE' };
}

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
        
        results = networks.map(w => {
          const { vendor, type } = classifyDevice(w.bssid);
          return {
            id: w.bssid || w.ssid || Math.random().toString(),
            mac: w.bssid || 'WIFI-AP',
            ssid: w.ssid,
            rssi: w.rssi || -95,
            source: 'WIFI',
            type: type,
            lastSeen: Date.now(),
            name: (w.ssid === '<redacted>' || !w.ssid || w.ssid === '<hidden>') 
                  ? `${vendor} (Hidden Device)` 
                  : w.ssid
          };
        });
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
            const { type } = classifyDevice(deviceId);
            
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
              type: type || 'Bluetooth Device',
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
