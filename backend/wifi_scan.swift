import CoreWLAN
import Foundation

let client = CWWiFiClient.shared()
guard let interface = client.interface() else {
    print("[]")
    exit(1)
}

do {
    let networks = try interface.scanForNetworks(withName: nil)
    var results: [[String: Any]] = []
    for network in networks {
        results.append([
            "ssid": network.ssid ?? "<redacted>",
            "bssid": network.bssid ?? "",
            "rssi": network.rssiValue()
        ])
    }
    
    if let jsonData = try? JSONSerialization.data(withJSONObject: results, options: .prettyPrinted),
       let jsonString = String(data: jsonData, encoding: .utf8) {
        print(jsonString)
    }
} catch {
    print("[]")
}
