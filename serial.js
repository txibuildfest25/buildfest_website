// serial.js - JavaScript Web Serial API with Full Modbus RTU Support for DataFeel Dots
let port;
let writer;
let reader;
let connected = false;
let pollingInterval = null;

// Modbus RTU Function Codes (As per DataFeel documentation)
const MODBUS_FUNCTION_CODES = {
    READ_HOLDING_REGISTERS: 0x03,
    WRITE_SINGLE_REGISTER: 0x06,
    WRITE_MULTIPLE_REGISTERS: 0x10
};

// DataFeel Modbus Register Addresses (As per documentation)
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

// Connect to Serial Port with Modbus RTU support
async function connectToSerial() {
    try {
        console.log("🔌 Requesting USB connection...");
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200, dataBits: 8, stopBits: 1, parity: "none", flowControl: "none" });

        writer = port.writable.getWriter();
        reader = port.readable.getReader();
        connected = true;

        console.log("✅ Connected to DataFeel via USB.");

        // Perform a handshake with the device
        await sendHandshake();
        
        // Start continuous polling for real-time data updates
        startContinuousPolling();

        return true;
    } catch (error) {
        console.error("❌ Serial connection failed:", error);
        alert("Ensure DataFeel is connected via USB and try again.");
        return false;
    }
}

// 🖐️ Send Modbus Handshake - Verify connection with DataFeel
async function sendHandshake() {
    try {
        console.log("🖐️ Sending handshake...");

        // Read Device Name to verify connection
        let deviceName = await readModbusRegister(REGISTER_ADDRESSES.DEVICE_NAME, 2);
        if (deviceName) {
            console.log(`✅ Handshake successful: Device Name - ${deviceName}`);
        } else {
            console.error("❌ Handshake failed - No response from DataFeel.");
        }
    } catch (error) {
        console.error("❌ Error during handshake:", error);
    }
}

// 🌐 Continuous Polling Loop for Real-Time Data
function startContinuousPolling() {
    if (pollingInterval) clearInterval(pollingInterval);

    pollingInterval = setInterval(async () => {
        if (!connected) return;
        
        try {
            // Read critical values from the device every second
            let thermalIntensity = await readModbusRegister(REGISTER_ADDRESSES.THERMAL_INTENSITY, 2);
            console.log("🌡️ Thermal Intensity:", thermalIntensity);

            let vibrationIntensity = await readModbusRegister(REGISTER_ADDRESSES.VIBRATION_INTENSITY, 2);
            console.log("🔄 Vibration Intensity:", vibrationIntensity);
            
        } catch (error) {
            console.error("❌ Polling error:", error);
        }
    }, 1000); // Poll every second
}

// 📖 Read DataFeel Registers using Modbus RTU
async function readModbusRegister(register, length) {
    try {
        let modbusRequest = buildModbusRTURequest(1, MODBUS_FUNCTION_CODES.READ_HOLDING_REGISTERS, register, length);
        await writer.write(modbusRequest);

        const { value } = await reader.read();
        let response = parseModbusRTUResponse(value);
        console.log(`📥 Read Register ${register}:`, response);
        return response;
    } catch (error) {
        console.error(`❌ Error reading Register ${register}:`, error);
        return null;
    }
}

// 🚀 Convert JSON haptic command into Modbus RTU writes
async function sendHapticCommand(hapticData) {
    if (!connected || !writer) {
        console.error("❌ No Serial connection found!");
        return;
    }

    try {
        console.log("🔵 Sending Wake-Up Signal...");
        await writeModbusRegister(REGISTER_ADDRESSES.VIBRATION_GO, 1);
        await new Promise(resolve => setTimeout(resolve, 300));

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

                await new Promise(resolve => setTimeout(resolve, 500)); // Prevent overload
            }
        }
    } catch (error) {
        console.error("❌ Error sending haptic command:", error);
        alert("Failed to send haptic feedback.");
    }
}

// 🔧 Function to write to a Modbus register
async function writeModbusRegister(register, value) {
    try {
        let modbusRequest = buildModbusRTURequest(1, MODBUS_FUNCTION_CODES.WRITE_SINGLE_REGISTER, register, value);
        await writer.write(modbusRequest);
        console.log(`✅ Wrote Register ${register}: ${value}`);
    } catch (error) {
        console.error("❌ Error writing to Modbus register:", error);
    }
}

// 🏗️ Build a Modbus RTU request frame
function buildModbusRTURequest(slaveID, functionCode, register, value) {
    let frame = new Uint8Array(8);
    frame[0] = slaveID;
    frame[1] = functionCode;
    frame[2] = (register >> 8) & 0xFF;
    frame[3] = register & 0xFF;
    frame[4] = (value >> 8) & 0xFF;
    frame[5] = value & 0xFF;

    let crc = calculateCRC(frame.subarray(0, 6));
    frame[6] = crc & 0xFF;
    frame[7] = (crc >> 8) & 0xFF;
    return frame;
}

// 🧮 CRC Calculation for Modbus RTU
function calculateCRC(buffer) {
    let crc = 0xFFFF;
    for (let i = 0; i < buffer.length; i++) {
        crc ^= buffer[i];
        for (let j = 0; j < 8; j++) {
            if (crc & 0x0001) {
                crc >>= 1;
                crc ^= 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }
    return crc;
}

// 🎨 Convert RGB values to a hex integer (used for LED commands)
function rgbToHex(rgb) {
    let [r, g, b] = rgb;
    return (b << 16) | (r << 8) | g;
}

// Export functions for app.js
export { connectToSerial, sendHapticCommand };
