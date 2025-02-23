# send_haptics.py

import json
from time import sleep
from datafeel.device import discover_devices, VibrationMode, LedMode, ThermalMode, VibrationWaveforms

def load_haptic_json(story_id, haptic_dir):
    file_path = f"{haptic_dir}/{story_id}_haptic_output.json"
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

def discover_datafeel_devices(max_address=4):
    devices = []
    print("Scanning for DataFeel devices...")
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
        raise Exception("No DataFeel devices found.")
    print(f"Found {len(devices)} devices.")
    return devices

def send_haptic_commands(device, commands):
    for command in commands:
        vibration = command.get("vibration", {})
        if vibration:
            device.registers.set_vibration_mode(VibrationMode.MANUAL)
            device.registers.set_vibration_intensity(vibration["intensity"])
            device.registers.set_vibration_frequency(vibration["frequency"])
        thermal = command.get("thermal", {})
        if thermal:
            device.activate_thermal_intensity_control(thermal["intensity"])
        light = command.get("light", {})
        if light:
            r, g, b = light["rgb"]
            brightness = int(light["intensity"] * 255)
            device.set_led(r, g, b, brightness)
        sleep(0.5)

def send_haptic_for_sentence(haptic_data, devices, sentence_index, pace):
    try:
        sentence_data = next((h for h in haptic_data if h["sentence_number"] == sentence_index + 1), None)
    except Exception as e:
        print("Error accessing haptic data for sentence:", e)
        return
    if not sentence_data:
        print("No haptic data for sentence index:", sentence_index)
        return
    print("Sending haptic data for sentence {}:".format(sentence_index + 1))
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
