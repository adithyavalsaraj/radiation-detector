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
      // 1. Check & Request Permissions
      // WiFi scanning requires location permissions on Android.
      if (Capacitor.getPlatform() === 'android') {
        const permStatus = await CapacitorWifi.checkPermissions();
        if (permStatus.location !== 'granted') {
          const reqStatus = await CapacitorWifi.requestPermissions();
          if (reqStatus.location !== 'granted') return [];
        }
      }
      
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
