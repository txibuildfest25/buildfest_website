// serial.js - Handles USB Serial Connection to DataFeel Dots
let port;
let writer;
let reader;
let connected = false;

/**
 * Request and open a serial connection to the DataFeel device.
 */
async function connectToSerial() {
    try {
        console.log("🔌 Requesting USB connection...");
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });

        // Create writer & reader for communication
        writer = port.writable.getWriter();
        reader = port.readable.getReader();
        connected = true;
        console.log("✅ Connected to DataFeel via USB.");

        // Initialize the DataFeel device
        await initializeDevice();

        // Start listening for responses from the DataFeel device
        readSerialData();

        return true;
    } catch (error) {
        console.error("❌ Serial connection failed:", error);
        alert("Error: Ensure DataFeel is connected via USB and try again.");
        return false;
    }
}

/**
 * Initialize DataFeel by setting it to manual mode.
 */
async function initializeDevice() {
    console.log("🛠 Initializing DataFeel device...");

    let initCommands = [
        { "set_vibration_mode": "MANUAL" },
        { "set_led_mode": "MANUAL" },
        { "set_thermal_mode": "MANUAL" }
    ];

    for (let cmd of initCommands) {
        let jsonString = JSON.stringify(cmd) + "\n";
        let encoder = new TextEncoder();
        let encodedData = encoder.encode(jsonString);

        try {
            await writer.write(encodedData);
            console.log("✅ Sent Init Command:", jsonString);
            await new Promise(resolve => setTimeout(resolve, 200)); // Small delay to prevent overload
        } catch (error) {
            console.error("❌ Error initializing DataFeel:", error);
        }
    }
}

/**
 * Listen for responses from the DataFeel device.
 */
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

/**
 * Send haptic commands to the DataFeel device.
 * @param {Array} hapticData - Array of haptic commands per address.
 */
async function sendHapticCommand(hapticData) {
    if (!connected || !writer) {
        console.error("❌ No Serial connection found!");
        return;
    }

    try {
        for (let device of hapticData) {
            console.log(`🎯 Sending to DataFeel Address ${device.address}`);

            for (let command of device.commands) {
                // Fix waveform naming issue: Remove "_P100"
                if (command.vibration && command.vibration.waveform) {
                    command.vibration.waveform = command.vibration.waveform.replace("_P100", "");
                }

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

                await new Promise(resolve => setTimeout(resolve, 500)); // Prevent buffer overload
            }
        }
    } catch (error) {
        console.error("❌ Error sending haptic command:", error);
        alert("Failed to send haptic feedback.");
    }
}

// Export functions for use in app.js
export { connectToSerial, sendHapticCommand };
