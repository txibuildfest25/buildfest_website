import json
from js import hapticCommands

def send_haptic_for_sentence(commands_json):
    """
    Sends haptic feedback from JSON to DataFeel Dots.
    """
    commands = json.loads(commands_json)
    
    for command in commands:
        dot_address = command["address"]
        for c in command["commands"]:
            print(f"Sending to Dot {dot_address}: {c}")

send_haptic_for_sentence(hapticCommands)
