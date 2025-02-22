let port;
let writer;
let reader;
let connected = false;

async function connectToSerial() {
    try {
        console.log("🔌 Requesting USB connection...");
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 128000, bufferSize: 64 }); // Ensure baud rate matches DataFeel

        writer = port.writable.getWriter();
        reader = port.readable.getReader();
        connected = true;

        console.log("✅ Connected to DataFeel via USB.");

        // ✅ Now initialize DataFeel properly
        await sendInitializationCommands();

        // ✅ Start listening for responses from DataFeel
        readSerialData();

        return true;
    } catch (error) {
        console.error("❌ Serial connection failed:", error);
        alert("Error: Ensure DataFeel is connected via USB and try again.");
        return false;
    }
}

// ✅ Add missing function to initialize DataFeel
async function sendInitializationCommands() {
    if (!writer) return;

    try {
        console.log("🛠 Initializing DataFeel device...");

        const initCommands = [
            { "set_vibration_mode": "MANUAL" },
            { "set_led_mode": "MANUAL" },
            { "set_thermal_mode": "MANUAL" }
        ];

        for (let cmd of initCommands) {
            let jsonString = JSON.stringify(cmd) + "\n";
            let encoder = new TextEncoder();
            await writer.write(encoder.encode(jsonString));
            await new Promise(resolve => setTimeout(resolve, 300)); // Small delay between commands

            console.log(`✅ Sent Init Command: ${jsonString}`);
        }
    } catch (error) {
        console.error("❌ Error sending initialization commands:", error);
    }
}

// ✅ Function to read responses from DataFeel
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

// ✅ Function to send haptic commands
async function sendHapticCommand(hapticData) {
    if (!connected || !writer) {
        console.error("❌ No Serial connection found!");
        return;
    }

    try {
        console.log("🔵 Sending Wake-Up Signal to DataFeel...");
        let activateSignal = JSON.stringify({ "activate": true }) + "\n";
        let encoder = new TextEncoder();
        await writer.write(encoder.encode(activateSignal));
        await new Promise(resolve => setTimeout(resolve, 300)); // Small delay

        for (let device of hapticData) {
            console.log(`🎯 Sending to DataFeel Address ${device.address}`);

            for (let command of device.commands) {
                console.log(`➡️ Sending Command: ${JSON.stringify(command)}`);

                let jsonString = JSON.stringify([{ 
                    address: device.address,
                    commands: [command]
                }]) + "\n"; // Append newline

                await writer.write(encoder.encode(jsonString));
                await writer.ready;
                console.log("✅ Successfully sent command:", jsonString);

                await new Promise(resolve => setTimeout(resolve, 500)); // Prevent overload
            }
        }
    } catch (error) {
        console.error("❌ Error sending haptic command:", error);
        alert("Failed to send haptic feedback.");
    }
}

// ✅ Export functions for use in app.js
export { connectToSerial, sendHapticCommand };
