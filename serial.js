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
                console.log("📴 Reader closed.");
                break;
            }
            let receivedData = decoder.decode(value);
            console.log("📥 Received from DataFeel:", receivedData);
        } catch (error) {
            console.error("❌ Error reading from serial:", error);
            break;
        }
    }
}


// Function to send haptic command to DataFeel
async function sendHapticCommand(hapticData) {
    if (!connected || !writer) {
        console.error("❌ No Serial connection found!");
        return;
    }

    try {
        for (let device of hapticData) {
            console.log(`🎯 Sending to DataFeel Address ${device.address}`);

            for (let command of device.commands) {
                console.log(`➡️ Sending Command: ${JSON.stringify(command)}`);

                let jsonString = JSON.stringify([{
                    address: device.address,
                    commands: [command]
                }]) + "\n";

                let encoder = new TextEncoder();
                let encodedData = encoder.encode(jsonString);

                await writer.write(encodedData);
                await writer.ready;
                console.log("✅ Successfully sent command:", jsonString);

                await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to prevent buffer issues
            }
        }
    } catch (error) {
        console.error("❌ Error sending haptic command:", error);
        alert("Failed to send haptic feedback.");
    }
}



// Export functions for use in app.js
export { connectToSerial, sendHapticCommand };
