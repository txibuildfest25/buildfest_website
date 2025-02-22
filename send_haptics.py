# send_haptics.py

import json
from time import sleep
from datafeel.device import discover_devices, VibrationMode, LedMode, ThermalMode, VibrationWaveforms

def load_haptic_json(story_id):
    file_path = f"haptics/{story_id}_haptic_output.json"
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

_haptic_data = None

def set_story(story_id):
    global _haptic_data
    _haptic_data = load_haptic_json(story_id)
    print(f"Haptic data loaded for story: {story_id}")

# Discover connected DataFeel devices (assumes up to 4 devices)
max_address = 4
devices = []
print("Scanning for devices...")
all_devices = discover_devices(max_address)
for address in range(1, max_address + 1):
    try:
        device = all_devices[address - 1]
        if device:
            print(f"Found device at address {address}")
            devices.append(device)
        else:
            print(f"No device at address {address}")
    except Exception as e:
        print(f"Error discovering device at address {address}: {e}")
if not devices:
    print("No DataFeel devices found.")
    raise Exception("No DataFeel devices found.")
print(f"Found {len(devices)} devices.")

def send_haptic_commands(device, commands):
    for command in commands:
        # Configure vibration
        vibration = command.get("vibration", {})
        if vibration:
            device.registers.set_vibration_mode(VibrationMode.MANUAL)
            device.registers.set_vibration_intensity(vibration["intensity"])
            device.registers.set_vibration_frequency(vibration["frequency"])
        # Configure thermal settings
        thermal = command.get("thermal", {})
        if thermal:
            device.activate_thermal_intensity_control(thermal["intensity"])
        # Configure LED settings
        light = command.get("light", {})
        if light:
            r, g, b = light["rgb"]
            brightness = int(light["intensity"] * 255)
            device.set_led(r, g, b, brightness)
        sleep(0.5)

def send_haptic_for_sentence(index, pace):
    if _haptic_data is None:
        print("No haptic data loaded. Call set_story() first.")
        return
    try:
        sentence_data = _haptic_data[index]
    except IndexError:
        print("No haptic data for sentence index:", index)
        return
    print("Sending haptic data for sentence {}:".format(index + 1))
    print(json.dumps(sentence_data, indent=2))
    for command_set in sentence_data["haptic_commands"]:
        address = command_set["address"]
        try:
            device = devices[address - 1]
        except IndexError:
            print(f"Device with address {address} not found.")
            continue
        print(f"Sending commands to device at address {address}.")
        send_haptic_commands(device, command_set["commands"])
    sleep(pace)
