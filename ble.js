// ble.js - Handles Web Bluetooth connection to DataFeel Dots
let dotDevice;
let primaryService;
let hapticCharacteristic;

// UUIDs (These should be determined via a BLE scan!)
const SERVICE_UUID = "0000xxxx-0000-1000-8000-00805f9b34fb";  // Replace with actual UUID
const CHARACTERISTIC_UUID = "0000xxxx-0000-1000-8000-00805f9b34fb"; // Replace with actual UUID

async function connectToDot() {
    try {
        console.log("Requesting Bluetooth device...");
        dotDevice = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true, // Change this to filter by name: `filters: [{ namePrefix: 'DataFeel' }]`
            optionalServices: [SERVICE_UUID]
        });

        console.log("Connecting to device...");
        const server = await dotDevice.gatt.connect();
        primaryService = await server.getPrimaryService(SERVICE_UUID);
        hapticCharacteristic = await primaryService.getCharacteristic(CHARACTERISTIC_UUID);

        console.log("Connected to DataFeel Dot.");
        return true;
    } catch (error) {
        console.error("Bluetooth connection failed:", error);
        return false;
    }
}

// Function to send JSON commands over BLE
async function sendHapticCommand(hapticData) {
    if (!hapticCharacteristic) {
        console.error("No BLE connection found!");
        return;
    }

    // Convert JSON to Uint8Array for Bluetooth transmission
    let jsonString = JSON.stringify(hapticData);
    let encoder = new TextEncoder();
    let encodedData = encoder.encode(jsonString);

    try {
        await hapticCharacteristic.writeValue(encodedData);
        console.log("Haptic command sent:", jsonString);
    } catch (error) {
        console.error("Error sending haptic command:", error);
    }
}

// Export functions for use in other scripts
export { connectToDot, sendHapticCommand };
