const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { exec } = require('child_process');
const cors = require('cors');
const os = require('os');
const path = require('path');

function getUnpackedPath(filename) {
  return path.join(__dirname, filename).replace('app.asar', 'app.asar.unpacked');
}

const isWin = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;

let lastWifiData = { current: null, nearby: [] };
let lastNetworkDevices = [];
let lastBluetoothDevices = [];
let localSubnet = '192.168.1'; // Default, will detect

function detectSubnet() {
  const cmd = isWin ? 'ipconfig' : (isMac ? 'ifconfig' : 'ip addr');
  exec(cmd, (err, stdout) => {
    if (err) return;
    const match = isWin 
      ? stdout.match(/IPv4 Address[ .]*: (\d+\.\d+\.\d+)\.\d+/)
      : stdout.match(/inet (\d+\.\d+\.\d+)\.\d+/);
    if (match) localSubnet = match[1];
  });
}

function pingSweep() {
  const pingCmd = isWin 
    ? (ip) => `ping -n 1 -w 500 ${ip} > NUL`
    : (ip) => `ping -c 1 -W 500 ${ip} > /dev/null 2>&1`;
  
  for (let i = 1; i < 255; i++) {
    exec(pingCmd(`${localSubnet}.${i}`), () => {});
  }
}

detectSubnet();
setInterval(pingSweep, 30000);

function getScannerData() {
  return new Promise((resolve) => {
    if (isMac) {
      const scriptPath = getUnpackedPath('scanner.swift');
      exec(`swift "${scriptPath}"`, (error, stdout) => {
        if (error) return resolve({ wifi: [], bluetooth: [] });
        try { resolve(JSON.parse(stdout)); } catch (e) { resolve({ wifi: [], bluetooth: [] }); }
      });
    } else if (isWin) {
      // Run both netsh for WiFi and powershell for BT
      const wifiPromise = new Promise((res) => {
        exec('netsh wlan show networks mode=bssid', (error, stdout) => {
          if (error) return res([]);
          const wifi = [];
          const lines = stdout.split('\n');
          let currentSSID = '';
          lines.forEach(line => {
            const ssidMatch = line.match(/SSID \d+ : (.*)/);
            if (ssidMatch) currentSSID = ssidMatch[1].trim();
            const bssidMatch = line.match(/BSSID \d+ : (.*)/);
            if (bssidMatch) {
              const bssid = bssidMatch[1].trim();
              const signalLine = lines[lines.indexOf(line) + 1] || '';
              const signalMatch = signalLine.match(/Signal\s+:\s+(\d+)%/);
              const rssi = signalMatch ? (parseInt(signalMatch[1]) / 2) - 100 : -95;
              wifi.push({ ssid: currentSSID, bssid, rssi });
            }
          });
          res(wifi);
        });
      });

      const btPromise = new Promise((res) => {
        const scriptPath = getUnpackedPath('scanner.ps1');
        exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, (error, stdout) => {
          if (error) return res([]);
          try {
            const data = JSON.parse(stdout);
            res(data.bluetooth || []);
          } catch (e) { res([]); }
        });
      });

      Promise.all([wifiPromise, btPromise]).then(([wifi, bluetooth]) => {
        resolve({ wifi, bluetooth });
      });
    } else if (isLinux) {
      exec('nmcli -t -f BSSID,SIGNAL,SSID dev wifi', (error, stdout) => {
        if (error) return resolve({ wifi: [], bluetooth: [] });
        const wifi = stdout.split('\n').filter(Boolean).map(line => {
          const [bssid, signal, ssid] = line.split(':');
          return { ssid, bssid, rssi: (parseInt(signal) / 2) - 100 };
        });
        resolve({ wifi, bluetooth: [] });
      });
    } else {
      resolve({ wifi: [], bluetooth: [] });
    }
  });
}

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

// Removed getBluetoothInfo as it's merged into Scanner

function getConnectedDevices() {
  return new Promise((resolve, reject) => {
    exec('arp -a', (error, stdout) => {
      if (error) return resolve([]);
      
      const devices = [];
      const lines = stdout.split('\n');
      
      lines.forEach(line => {
        let match;
        if (isWin) {
          match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F:-]+)\s+/);
          if (match) {
            const ip = match[1];
            const mac = match[2].replace(/-/g, ':').toLowerCase();
            if (mac !== 'ff:ff:ff:ff:ff:ff' && !ip.startsWith('224.') && !ip.startsWith('239.')) {
              devices.push({ ip, mac, type: classifyDevice(mac) });
            }
          }
        } else {
          match = line.match(/\((.*?)\) at (.*?) on/);
          if (match) {
            const ip = match[1];
            const mac = match[2].toLowerCase();
            if (mac !== 'ff:ff:ff:ff:ff:ff' && !ip.startsWith('224.') && !ip.startsWith('239.')) {
              devices.push({ ip, mac, type: classifyDevice(mac) });
            }
          }
        }
      });
      resolve(devices);
    });
  });
}

io.on('connection', (socket) => {
  console.log('Client connected');
  socket.emit('platform', os.platform());
  
  const emitterMap = new Map();
  const AGING_TIMEOUT = 15000;

  const interval = setInterval(async () => {
    try {
      const scannerData = await getScannerData();
      const network = await getConnectedDevices();
      const now = Date.now();

      // 1. Unified Deduplication Logic with Aging
      // Priority: WiFi (SSID match) > Network (MAC match) > BT (MAC match)

      // a. Start with WiFi APs
      scannerData.wifi.forEach(w => {
        const key = w.ssid || w.bssid;
        const { vendor, type } = classifyDevice(w.bssid);
        emitterMap.set(key, {
          id: key,
          mac: w.bssid,
          ssid: w.ssid,
          rssi: w.rssi,
          source: 'WIFI',
          type: type,
          lastSeen: now,
          name: (w.ssid === '<redacted>' || !w.ssid || w.ssid === '<hidden>') 
                ? `${vendor} (Hidden Device)` 
                : w.ssid
        });
      });

      // b. Overlay Network Devices
      network.forEach(d => {
        const key = d.mac.toLowerCase();
        if (!emitterMap.has(key)) {
          const { type } = classifyDevice(d.mac);
          emitterMap.set(key, {
            ...d,
            id: key,
            source: 'NETWORK',
            lastSeen: now,
            type: type || 'CONNECTED NODE'
          });
        } else {
          // If already exists, just update lastSeen
          const existing = emitterMap.get(key);
          emitterMap.set(key, { ...existing, lastSeen: now });
        }
      });

      // c. Overlay Bluetooth
      scannerData.bluetooth.forEach(b => {
        const key = b.mac.toLowerCase();
        if (!emitterMap.has(key)) {
          const { type } = classifyDevice(b.mac);
          emitterMap.set(key, {
            ...b,
            id: key,
            source: 'BLUETOOTH',
            lastSeen: now,
            type: type || 'BLUETOOTH'
          });
        } else {
          const existing = emitterMap.get(key);
          emitterMap.set(key, { ...existing, lastSeen: now });
        }
      });

      // 2. Prune invisible emitters
      for (const [key, emitter] of emitterMap.entries()) {
        if (now - emitter.lastSeen > AGING_TIMEOUT) {
          emitterMap.delete(key);
        }
      }

      const allEmitters = Array.from(emitterMap.values());
      const currentWifi = scannerData.wifi.sort((a,b) => b.rssi - a.rssi)[0] || null;
      
      if (currentWifi) socket.emit('wifi-signal', currentWifi);
      socket.emit('emitters', allEmitters);

      console.log(`Tracking ${allEmitters.length} Unified Emitters (Aged Filter)`);
    } catch (err) {
      console.error('Error in collection:', err);
    }
  }, 3000);
 // 3s for a clean loop with the 2s scan

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });
});

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
