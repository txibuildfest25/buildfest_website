// serial.js - Handles USB Serial Connection to DataFeel Dots
let port;
let writer;
let reader;
let connected = false;

async function connectToSerial() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });

        writer = port.writable.getWriter();
        reader = port.readable.getReader();
        connected = true;
        console.log("Connected to DataFeel device via USB.");
        alert("Connected to DataFeel via USB!");

        readSerialData(); // Start listening for device responses

        return true;
    } catch (error) {
        console.error("Serial connection failed:", error);
        alert("Error: Ensure DataFeel is connected via USB and try again.");
        return false;
    }
}

// Function to read incoming data from DataFeel device (for debugging)
async function readSerialData() {
    const decoder = new TextDecoder();
    while (connected) {
        try {
            const { value, done } = await reader.read();
            if (done) {
                console.log("Reader closed.");
                break;
            }
            console.log("Received from DataFeel:", decoder.decode(value));
        } catch (error) {
            console.error("Error reading from serial:", error);
            break;
        }
    }
}

// Function to send haptic command to DataFeel
async function sendHapticCommand(hapticData) {
    if (!connected || !writer) {
        console.error("No Serial connection found!");
        return;
    }

    try {
        let jsonString = JSON.stringify(hapticData) + "\n"; // Ensure newline termination
        let encoder = new TextEncoder();
        let encodedData = encoder.encode(jsonString);

        await writer.write(encodedData);
        console.log("Sent to DataFeel:", jsonString);

        await writer.ready; // Ensure writer finishes sending data
    } catch (error) {
        console.error("Error sending haptic command:", error);
        alert("Failed to send haptic feedback.");
    }
}

// Export functions for use in app.js
export { connectToSerial, sendHapticCommand };
