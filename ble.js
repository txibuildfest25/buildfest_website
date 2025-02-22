// ble.js - Handles Web Bluetooth connection to DataFeel Dots
let dotDevice;
let primaryService;
let hapticCharacteristic;

// UUIDs (Replace with actual UUIDs after scanning)
const SERVICE_UUID = "0000xxxx-0000-1000-8000-00805f9b34fb";
const CHARACTERISTIC_UUID = "0000xxxx-0000-1000-8000-00805f9b34fb";

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
        alert("Error: Please ensure Bluetooth is on and try again.");
        return false;
    }
}

// Function to send JSON commands over BLE
async function sendHapticCommand(hapticData) {
    if (!hapticCharacteristic) {
        console.error("No BLE connection found!");
        return;
    }

    let jsonString = JSON.stringify(hapticData);
    let encoder = new TextEncoder();
    let encodedData = encoder.encode(jsonString);

    try {
        await hapticCharacteristic.writeValue(encodedData);
        console.log("Haptic command sent:", jsonString);
    } catch (error) {
        console.error("Error sending haptic command:", error);
        alert("Failed to send haptic feedback.");
    }
}

export { connectToDot, sendHapticCommand };
