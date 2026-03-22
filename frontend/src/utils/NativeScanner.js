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
      // WiFi operations require location permissions.
      const status = await CapacitorWifi.checkPermissions();
      if (status.location !== 'granted') {
        const req = await CapacitorWifi.requestPermissions();
        if (req.location !== 'granted') return [];
      }
      
      const platform = Capacitor.getPlatform();

      if (platform === 'android') {
        // Android specific: actual scanning
        // Note: startScan triggers an event, we can wait or just pull available ones
        await CapacitorWifi.startScan();
        const { networks } = await CapacitorWifi.getAvailableNetworks();
        
        return networks.map(w => ({
          id: w.ssid || Math.random().toString(),
          mac: '00:00:00:00:00:00', // Plugin doesn't always provide BSSID in basic network list
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
        // iOS specific: can only get current connection info
        const info = await CapacitorWifi.getWifiInfo();
        if (!info.ssid) return [];
        return [{
          id: info.ssid,
          mac: info.bssid || 'CONNECTED',
          ssid: info.ssid,
          rssi: info.signalStrength ? (info.signalStrength - 100) : -50,
          source: 'WIFI',
          type: 'WiFi Access Point',
          lastSeen: Date.now(),
          name: info.ssid
        }];
      }

      return [];
    } catch (err) {
      console.error('Native Scan Failed:', err);
      return [];
    }
  }
};
