import { CapacitorWifi } from '@capgo/capacitor-wifi';
import { Capacitor } from '@capacitor/core';

/**
 * NativeScanner provides a bridge to native WiFi scanning APIs on mobile devices.
 */
export const NativeScanner = {
  isSupported: () => {
    return Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios';
  },

  scan: async () => {
    if (!NativeScanner.isSupported()) return [];

    try {
      // 1. Request Permissions
      // On Android, we need ACCESS_FINE_LOCATION. 
      // The plugin handles the low-level scan, but we need the permission.
      
      const { wifi } = await CapacitorWifi.scan();
      
      // 2. Map to existing emitter model
      // WiFi { ssid, bssid, rssi, capabilities, level, frequency }
      return wifi.map(w => ({
        id: w.bssid || w.ssid,
        mac: w.bssid,
        ssid: w.ssid,
        rssi: w.level || w.rssi || -95,
        source: 'WIFI',
        type: 'WiFi Access Point',
        lastSeen: Date.now(),
        name: (w.ssid === '<redacted>' || !w.ssid || w.ssid === '<hidden>') 
              ? `MOBILE SOURCE` 
              : w.ssid
      }));
    } catch (err) {
      console.error('Native Scan Failed:', err);
      return [];
    }
  }
};
