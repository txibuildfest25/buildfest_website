// serial.js - Handles USB Serial Connection to DataFeel Dots
let port;
let writer;
let connected = false;

async function connectToSerial() {
    try {
        // Request serial port from user
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 }); // Adjust baud rate if needed

        // Create a writer to send data
        writer = port.writable.getWriter();
        connected = true;
        console.log("Connected to DataFeel device via USB.");
        alert("Connected to DataFeel via USB!");
        return true;
    } catch (error) {
        console.error("Serial connection failed:", error);
        alert("Error: Ensure DataFeel is connected via USB and try again.");
        return false;
    }
}

async function sendHapticCommand(hapticData) {
    if (!connected || !writer) {
        console.error("No Serial connection found!");
        return;
    }

    try {
        let jsonString = JSON.stringify(hapticData);
        let encoder = new TextEncoder();
        let encodedData = encoder.encode(jsonString + "\n"); // Add newline for easier parsing

        await writer.write(encodedData);
        console.log("Haptic command sent:", jsonString);
    } catch (error) {
        console.error("Error sending haptic command:", error);
        alert("Failed to send haptic feedback.");
    }
}

// Export functions for use in app.js
export { connectToSerial, sendHapticCommand };
