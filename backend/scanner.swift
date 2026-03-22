import CoreWLAN
import CoreBluetooth
import Foundation

class Scanner: NSObject, CBCentralManagerDelegate {
    var centralManager: CBCentralManager!
    var btResults: [[String: Any]] = []
    var wifiResults: [[String: Any]] = []
    
    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }
    
    func scanWifi() {
        let client = CWWiFiClient.shared()
        if let interface = client.interface(),
           let networks = try? interface.scanForNetworks(withName: nil) {
            for network in networks {
                wifiResults.append([
                    "ssid": network.ssid ?? "<redacted>",
                    "bssid": network.bssid ?? "",
                    "rssi": network.rssiValue
                ])
            }
        }
    }
    
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn {
            centralManager.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        }
    }
    
    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        let id = peripheral.identifier.uuidString
        let name = peripheral.name ?? (advertisementData[CBAdvertisementDataLocalNameKey] as? String) ?? "Unknown BT"
        
        let existingIndex = btResults.firstIndex { ($0["mac"] as? String) == id }
        if let index = existingIndex {
            btResults[index]["rssi"] = RSSI.intValue
        } else {
            btResults.append([
                "name": name,
                "mac": id,
                "rssi": RSSI.intValue,
                "type": "BLUETOOTH"
            ])
        }
    }
    
    func printResults() {
        let output: [String: Any] = [
            "wifi": wifiResults,
            "bluetooth": btResults
        ]
        if let jsonData = try? JSONSerialization.data(withJSONObject: output, options: []),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            print(jsonString)
        }
    }
}

let scanner = Scanner()
scanner.scanWifi()

// Run for 2 seconds to gather BT signals
RunLoop.main.run(until: Date(timeIntervalSinceNow: 2.0))
scanner.printResults()
