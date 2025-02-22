import json
from time import sleep
from datafeel.device import discover_devices, VibrationMode, LedMode, ThermalMode, VibrationWaveforms

# Define file path for the JSON data
file_path = r"C:\Users\Alienware Edu\Desktop\Buildfest\txibuildfest2025\haptics\giver_haptic_output.json"

# Discover connected Datafeel devices
max_address = 4  # Adjust this based on the number of devices
devices = []

print("Scanning for devices...")
for address in range(1, max_address + 1):
    try:
        device = discover_devices(max_address)[address - 1]  # Adjust for 1-based addresses
        if device:
            print(f"Found device at address {address}")
            devices.append(device)
        else:
            print(f"No device at address {address}")
    except Exception as e:
        print(f"Error discovering device at address {address}: {e}")

if not devices:
    print("No Datafeel devices found.")
    exit()

print(f"Found {len(devices)} devices.")

# Load the JSON file
with open(file_path, 'r') as f:
    haptic_data = json.load(f)

# Helper function to send haptic commands to a device
def send_haptic_commands(device, commands):
    for command in commands:
        # Configure vibration settings
        vibration = command.get("vibration", {})
        if vibration:
            device.registers.set_vibration_mode(VibrationMode.MANUAL)
            device.registers.set_vibration_intensity(vibration["intensity"])
            device.registers.set_vibration_frequency(vibration["frequency"])

        # Configure thermal (temperature) settings
        thermal = command.get("thermal", {})
        if thermal:
            device.activate_thermal_intensity_control(thermal["intensity"])

        # Configure lighting (LED) settings
        light = command.get("light", {})
        if light:
            r, g, b = light["rgb"]
            brightness = int(light["intensity"] * 255)  # Scale intensity to brightness value
            device.set_led(r, g, b, brightness)

        sleep(0.5)  # Delay to allow the effect to be perceived

# Iterate over sentences and their haptic commands
for sentence in haptic_data:
    print(f"Processing sentence {sentence['sentence_number']}: {sentence['sentence']}")
    for command_set in sentence["haptic_commands"]:
        address = command_set["address"]
        device = next((d for d in devices if d == devices[address - 1]), None)
        if not device:
            print(f"Device with address {address} not found.")
            continue

        print(f"Sending commands to device {address}.")
        send_haptic_commands(device, command_set["commands"])

print("All haptic commands have been sent.")
