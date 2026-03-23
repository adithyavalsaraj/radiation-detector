# BLE Scanner for Windows
# Outputs JSON list of discovered devices

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "SilentlyContinue"

# Check if WinRT is available
Try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
} Catch {
    Write-Output '{"wifi":[],"bluetooth":[]}'
    Exit
}

$watcher = New-Object Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementWatcher
$watcher.ScanningMode = [Windows.Devices.Bluetooth.Advertisement.BluetoothScanningMode]::Active

$devices = New-Object System.Collections.Generic.Dictionary[string, object]

$handler = {
    param($s, $e)
    $id = $e.BluetoothAddress.ToString("X")
    $rawName = $e.Advertisement.LocalName
    
    # Improved naming logic
    $displayName = if ($rawName -and $rawName -ne "" -and $rawName -ne "Unknown") {
        $rawName
    } else {
        "BT:" + $id.Substring([Math]::Max(0, $id.Length - 4)).ToUpper()
    }

    if (-not $devices.ContainsKey($id)) {
        $devices[$id] = @{
            name = $displayName
            mac = $id
            rssi = $e.RawSignalStrengthInDBm
            type = "BLUETOOTH"
        }
    } else {
        $devices[$id].rssi = $e.RawSignalStrengthInDBm
        # Update name if a proper one is found later
        if ($displayName -notlike "BT:*") {
            $devices[$id].name = $displayName
        }
    }
}

$register = Register-ObjectEvent -InputObject $watcher -EventName Received -Action $handler

$watcher.Start()
Start-Sleep -Seconds 3
$watcher.Stop()

Unregister-Event -SourceIdentifier $register.Name

$outputList = $devices.Values | ForEach-Object { $_ }
$finalOutput = @{
    wifi = @() # Wi-Fi is handled separately via netsh
    bluetooth = $outputList
}

$finalOutput | ConvertTo-Json -Compress
