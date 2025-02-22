// serial.js - JavaScript Web Serial API for DataFeel Dots
let port;
let writer;
let reader;
let connected = false;

// Define the DataFeel Modbus Register Addresses
const REGISTER_ADDRESSES = {
    DEVICE_NAME: 0, // Readable register for handshake
    VIBRATION_MODE: 1036,
    VIBRATION_FREQUENCY: 1038,
    VIBRATION_INTENSITY: 1040,
    VIBRATION_GO: 1042,
    LED_MODE: 1010,
    GLOBAL_MANUAL: 1012,
    THERMAL_MODE: 1030,
    THERMAL_INTENSITY: 1032,
    THERMAL_SKIN_TEMP_TARGET: 1034
};

// Connect to Serial Port
async function connectToSerial() {
    try {
        console.log("🔌 Requesting USB connection...");
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });

        writer = port.writable.getWriter();
        reader = port.readable.getReader();
        connected = true;

        console.log("✅ Connected to DataFeel via USB.");

        // Send Handshake and Initialization
        await sendHandshake();
        await sendInitializationCommands();

        // Start listening for responses
        readSerialData();

        return true;
    } catch (error) {
        console.error("❌ Serial connection failed:", error);
        alert("Ensure DataFeel is connected via USB and try again.");
        return false;
    }
}

// 🖐️ Send Handshake - Wake up and verify connection
async function sendHandshake() {
    try {
        console.log("🖐️ Sending handshake...");

        // Wake-up signal (Tell Dot to start listening)
        await sendCommand(REGISTER_ADDRESSES.VIBRATION_GO, 1);
        await new Promise(resolve => setTimeout(resolve, 300)); // Small delay

        // Read Device Name to confirm handshake
        let deviceName = await readRegister(REGISTER_ADDRESSES.DEVICE_NAME);
        if (deviceName) {
            console.log(`✅ Handshake successful: Device Name - ${deviceName}`);
        } else {
            console.error("❌ Handshake failed - No response from DataFeel.");
        }
    } catch (error) {
        console.error("❌ Error during handshake:", error);
    }
}

// 📖 Read Serial Data (For debugging and checking responses)
async function readSerialData() {
    const decoder = new TextDecoder();
    while (connected) {
        try {
            const { value, done } = await reader.read();
            if (done) {
                console.log("📴 Serial connection closed.");
                break;
            }
            let response = decoder.decode(value);
            console.log("📥 Received from DataFeel:", response);
        } catch (error) {
            console.error("❌ Error reading serial:", error);
            break;
        }
    }
}

// 🔧 Send initialization commands to DataFeel
async function sendInitializationCommands() {
    if (!writer) return;

    try {
        console.log("🛠 Initializing DataFeel device...");

        const initCommands = [
            { register: REGISTER_ADDRESSES.VIBRATION_MODE, value: 1 }, // MANUAL Mode
            { register: REGISTER_ADDRESSES.LED_MODE, value: 1 }, // MANUAL LED Mode
            { register: REGISTER_ADDRESSES.THERMAL_MODE, value: 1 } // MANUAL Thermal Mode
        ];

        for (let cmd of initCommands) {
            await sendCommand(cmd.register, cmd.value);
            await new Promise(resolve => setTimeout(resolve, 300)); // Delay between commands
        }

        console.log("✅ Initialization Complete.");
    } catch (error) {
        console.error("❌ Error initializing DataFeel:", error);
    }
}

// 🚀 Convert JSON haptic command into DataFeel commands
async function sendHapticCommand(hapticData) {
    if (!connected || !writer) {
        console.error("❌ No Serial connection found!");
        return;
    }

    try {
        console.log("🔵 Sending Wake-Up Signal...");
        await sendCommand(REGISTER_ADDRESSES.VIBRATION_GO, 1);
        await new Promise(resolve => setTimeout(resolve, 300));

        for (let device of hapticData) {
            console.log(`🎯 Sending to DataFeel Address ${device.address}`);

            for (let command of device.commands) {
                console.log(`➡️ Sending Command: ${JSON.stringify(command)}`);

                // Send vibration settings
                if (command.vibration) {
                    await sendCommand(REGISTER_ADDRESSES.VIBRATION_INTENSITY, command.vibration.intensity);
                    await sendCommand(REGISTER_ADDRESSES.VIBRATION_FREQUENCY, command.vibration.frequency);
                }

                // Send thermal settings
                if (command.thermal) {
                    await sendCommand(REGISTER_ADDRESSES.THERMAL_INTENSITY, command.thermal.intensity);
                }

                // Send LED settings
                if (command.light) {
                    await sendCommand(REGISTER_ADDRESSES.GLOBAL_MANUAL, rgbToHex(command.light.rgb));
                }

                await new Promise(resolve => setTimeout(resolve, 500)); // Prevent overload
            }
        }
    } catch (error) {
        console.error("❌ Error sending haptic command:", error);
        alert("Failed to send haptic feedback.");
    }
}

// 🔄 Function to send register commands via Web Serial API
async function sendCommand(register, value) {
    try {
        let jsonString = JSON.stringify({ register: register, value: value }) + "\n";
        let encoder = new TextEncoder();
        await writer.write(encoder.encode(jsonString));
        console.log(`✅ Sent Register ${register}: ${value}`);
    } catch (error) {
        console.error("❌ Error writing to serial:", error);
    }
}

// 🔍 Function to read a register from DataFeel
async function readRegister(register) {
    try {
        let jsonString = JSON.stringify({ register: register, read: true }) + "\n";
        let encoder = new TextEncoder();
        await writer.write(encoder.encode(jsonString));

        const decoder = new TextDecoder();
        let { value } = await reader.read();
        let response = decoder.decode(value);
        console.log(`🔎 Read Register ${register}: ${response}`);
        return response;
    } catch (error) {
        console.error(`❌ Error reading Register ${register}:`, error);
        return null;
    }
}

// 🎨 Convert RGB values to a hex integer (used for LED commands)
function rgbToHex(rgb) {
    let [r, g, b] = rgb;
    return (b << 16) | (r << 8) | g;
}

// Export functions for app.js
export { connectToSerial, sendHapticCommand };
