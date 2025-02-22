// serial.js - JavaScript Web Serial API for DataFeel Dots with Modbus RTU Support

let port;
let writer;
let reader;
let connected = false;

// Modbus Register Addresses
const REGISTER_ADDRESSES = {
    DEVICE_NAME: 0, // Used for handshake
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

// CRC Calculation for Modbus RTU
function calculateCRC(buffer) {
    let crc = 0xFFFF;
    for (let i = 0; i < buffer.length; i++) {
        crc ^= buffer[i];
        for (let j = 0; j < 8; j++) {
            if (crc & 1) {
                crc = (crc >> 1) ^ 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }
    return [(crc & 0xFF), (crc >> 8) & 0xFF];
}

// Parses incoming Modbus RTU response
function parseModbusRTUResponse(response) {
    if (!response || response.length < 5) {
        console.error("❌ Invalid Modbus response: Too short.");
        return null;
    }

    let address = response[0];
    let functionCode = response[1];
    let byteCount = response[2];

    if (functionCode !== 3) {
        console.error(`❌ Unexpected Modbus function code: ${functionCode}`);
        return null;
    }

    let data = response.slice(3, 3 + byteCount);
    let receivedCRC = response.slice(-2);
    let calculatedCRC = calculateCRC(response.slice(0, -2));

    if (receivedCRC[0] !== calculatedCRC[0] || receivedCRC[1] !== calculatedCRC[1]) {
        console.error("❌ CRC Mismatch - Data may be corrupted.");
        return null;
    }

    // Convert raw bytes into register values
    let registerValues = [];
    for (let i = 0; i < byteCount; i += 2) {
        registerValues.push((data[i] << 8) | data[i + 1]);
    }

    console.log(`📥 Read Register ${REGISTER_ADDRESSES.DEVICE_NAME}: ${registerValues}`);
    return registerValues;
}

// Function to connect to DataFeel device via Serial API
async function connectToSerial() {
    try {
        console.log("🔌 Requesting USB connection...");
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });

        writer = port.writable.getWriter();
        reader = port.readable.getReader();
        connected = true;

        console.log("✅ Connected to DataFeel via USB.");

        // Send handshake and start continuous polling
        await sendHandshake();
        startContinuousPolling();

        return true;
    } catch (error) {
        console.error("❌ Serial connection failed:", error);
        alert("Ensure DataFeel is connected via USB and try again.");
        return false;
    }
}

// Handshake: Read DEVICE_NAME register
async function sendHandshake() {
    try {
        console.log("🖐️ Sending handshake...");
        let deviceName = await readModbusRegister(REGISTER_ADDRESSES.DEVICE_NAME, 2);
        if (deviceName) {
            console.log(`✅ Handshake successful: Device Name - ${deviceName}`);
        } else {
            console.error("❌ Handshake failed - No response from DataFeel.");
        }
    } catch (error) {
        console.error("❌ Handshake error:", error);
    }
}

// Read data from Modbus register
async function readModbusRegister(register, numRegisters) {
    if (!connected || !reader) {
        console.error("❌ No Serial connection found!");
        return null;
    }

    let request = new Uint8Array([1, 3, (register >> 8) & 0xFF, register & 0xFF, 0, numRegisters, 0, 0]);
    let crc = calculateCRC(request.slice(0, -2));
    request[request.length - 2] = crc[0];
    request[request.length - 1] = crc[1];

    try {
        let encoder = new TextEncoder();
        await writer.write(encoder.encode(request));
        console.log(`📤 Requested Register ${register} (${numRegisters} words)`);

        const { value, done } = await reader.read();
        if (done) {
            console.warn("📴 Serial connection closed.");
            return null;
        }

        return parseModbusRTUResponse(new Uint8Array(value));
    } catch (error) {
        console.error(`❌ Error reading Register ${register}:`, error);
        return null;
    }
}

// Start polling registers continuously
function startContinuousPolling() {
    setInterval(async () => {
        let thermalIntensity = await readModbusRegister(REGISTER_ADDRESSES.THERMAL_INTENSITY, 2);
        console.log(`🌡️ Thermal Intensity: ${thermalIntensity}`);

        let vibrationIntensity = await readModbusRegister(REGISTER_ADDRESSES.VIBRATION_INTENSITY, 2);
        console.log(`🔄 Vibration Intensity: ${vibrationIntensity}`);
    }, 2000);
}

// Convert RGB values to a hex integer (for LED commands)
function rgbToHex(rgb) {
    let [r, g, b] = rgb;
    return (b << 16) | (r << 8) | g;
}

// Send haptic command (Vibration, LED, Thermal)
async function sendHapticCommand(hapticData) {
    if (!connected || !writer) {
        console.error("❌ No Serial connection found!");
        return;
    }

    try {
        console.log("🔵 Sending Wake-Up Signal...");
        await writeModbusRegister(REGISTER_ADDRESSES.VIBRATION_GO, 1);

        for (let device of hapticData) {
            console.log(`🎯 Sending to DataFeel Address ${device.address}`);

            for (let command of device.commands) {
                console.log(`➡️ Sending Command: ${JSON.stringify(command)}`);

                if (command.vibration) {
                    await writeModbusRegister(REGISTER_ADDRESSES.VIBRATION_INTENSITY, command.vibration.intensity);
                    await writeModbusRegister(REGISTER_ADDRESSES.VIBRATION_FREQUENCY, command.vibration.frequency);
                }

                if (command.thermal) {
                    await writeModbusRegister(REGISTER_ADDRESSES.THERMAL_INTENSITY, command.thermal.intensity);
                }

                if (command.light) {
                    await writeModbusRegister(REGISTER_ADDRESSES.GLOBAL_MANUAL, rgbToHex(command.light.rgb));
                }

                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    } catch (error) {
        console.error("❌ Error sending haptic command:", error);
    }
}

// Write to Modbus Register
async function writeModbusRegister(register, value) {
    try {
        let request = new Uint8Array([1, 6, (register >> 8) & 0xFF, register & 0xFF, (value >> 8) & 0xFF, value & 0xFF, 0, 0]);
        let crc = calculateCRC(request.slice(0, -2));
        request[request.length - 2] = crc[0];
        request[request.length - 1] = crc[1];

        let encoder = new TextEncoder();
        await writer.write(encoder.encode(request));
        console.log(`✅ Wrote Register ${register}: ${value}`);
    } catch (error) {
        console.error(`❌ Error writing to Register ${register}:`, error);
    }
}

// Export functions for app.js
export { connectToSerial, sendHapticCommand };
