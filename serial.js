// serial.js - JavaScript Web Serial API with Full Modbus RTU Support for DataFeel Dots
let port;
let writer;
let reader;
let connected = false;
let pollingInterval = null;

// Modbus RTU Function Codes
const MODBUS_FUNCTION_CODES = {
    READ_HOLDING_REGISTERS: 0x03,
    WRITE_SINGLE_REGISTER: 0x06,
    WRITE_MULTIPLE_REGISTERS: 0x10
};

// DataFeel Modbus Register Addresses (as per documentation)
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

// 🔌 Connect to Serial Port with Modbus RTU support
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

// 🌐 Continuous Polling for Real-Time Data
function startContinuousPolling() {
    if (pollingInterval) clearInterval(pollingInterval);

    pollingInterval = setInterval(async () => {
        if (!connected) return;
        try {
            let thermalIntensity = await readModbusRegister(REGISTER_ADDRESSES.THERMAL_INTENSITY, 2);
            console.log("🌡️ Thermal Intensity:", thermalIntensity);

            let vibrationIntensity = await readModbusRegister(REGISTER_ADDRESSES.VIBRATION_INTENSITY, 2);
            console.log("🔄 Vibration Intensity:", vibrationIntensity);

        } catch (error) {
            console.error("❌ Polling error:", error);
        }
    }, 1000);
}

// 📖 Read DataFeel Registers using Modbus RTU
async function readModbusRegister(register, length) {
    try {
        let modbusRequest = buildModbusRTURequest(1, MODBUS_FUNCTION_CODES.READ_HOLDING_REGISTERS, register, length);
        await writer.write(modbusRequest);

        const { value } = await reader.read();
        return parseModbusRTUResponse(value, length);
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

                await writeModbusRegister(REGISTER_ADDRESSES.VIBRATION_MODE, 1); // Ensure MANUAL mode
                await new Promise(resolve => setTimeout(resolve, 100));

                if (command.vibration) {
                    await writeModbusRegister(REGISTER_ADDRESSES.VIBRATION_INTENSITY, floatToModbus(command.vibration.intensity));
                    await writeModbusRegister(REGISTER_ADDRESSES.VIBRATION_FREQUENCY, command.vibration.frequency);
                }

                if (command.thermal) {
                    await writeModbusRegister(REGISTER_ADDRESSES.THERMAL_INTENSITY, floatToModbus(command.thermal.intensity));
                }

                if (command.light) {
                    await writeModbusRegister(REGISTER_ADDRESSES.GLOBAL_MANUAL, rgbToHex(command.light.rgb));
                }

                // Ensure VIBRATION_GO is triggered **after settings**
                await writeModbusRegister(REGISTER_ADDRESSES.VIBRATION_GO, 1);
                await new Promise(resolve => setTimeout(resolve, 500)); // Prevent overload
            }
        }
    } catch (error) {
        console.error("❌ Error sending haptic command:", error);
        alert("Failed to send haptic feedback.");
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
    return frame;
}

// 🎨 Convert RGB to Hex
function rgbToHex(rgb) {
    let [r, g, b] = rgb;
    return (b << 16) | (r << 8) | g;
}

// 🔢 Convert Float to 16-bit Modbus
function floatToModbus(floatValue) {
    return Math.round(floatValue * 32767);
}

// Export functions for app.js
export { connectToSerial, sendHapticCommand };
