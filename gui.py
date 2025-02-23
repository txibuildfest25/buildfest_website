import sys
import os
import json
import pyttsx3
from PyQt6.QtWidgets import (
    QApplication, QWidget, QLabel, QPushButton, QVBoxLayout, QComboBox, 
    QSlider, QTextBrowser, QCheckBox, QHBoxLayout
)
from PyQt6.QtCore import Qt, QTimer
from datafeel.device import discover_devices, Dot

class DataFeelApp(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Banned Books Immersive Experience")
        self.setGeometry(200, 200, 600, 500)

        self.layout = QVBoxLayout()

        # Story Selection
        self.story_label = QLabel("Choose a Story:")
        self.story_select = QComboBox()
        self.story_select.addItems([
            "Giver", "Example Text", "Example Text 2", 
            "James Giant Peach", "Perks of Being a Wallflower", "The Great Gatsby"
        ])
        self.story_select.currentIndexChanged.connect(self.load_story)

        # Accessibility Settings
        self.dyslexia_font = QCheckBox("Enable Dyslexia-Friendly Font")
        self.hyperlegible_font = QCheckBox("Enable Atkinson Hyperlegible Font")

        # Pace Control
        self.pace_label = QLabel("Reading Pace (seconds per sentence):")
        self.pace_slider = QSlider(Qt.Orientation.Horizontal)
        self.pace_slider.setMinimum(1)
        self.pace_slider.setMaximum(10)
        self.pace_slider.setValue(2)

        # Book Text Display
        self.book_text = QTextBrowser()

        # TTS Controls
        self.play_button = QPushButton("Play Narration")
        self.play_button.clicked.connect(self.start_narration)

        # Connect to DataFeel
        self.connect_button = QPushButton("Connect to DataFeel")
        self.connect_button.clicked.connect(self.connect_to_datafeel)

        # Add widgets to layout
        self.layout.addWidget(self.story_label)
        self.layout.addWidget(self.story_select)
        self.layout.addWidget(self.dyslexia_font)
        self.layout.addWidget(self.hyperlegible_font)
        self.layout.addWidget(self.pace_label)
        self.layout.addWidget(self.pace_slider)
        self.layout.addWidget(self.book_text)
        self.layout.addWidget(self.play_button)
        self.layout.addWidget(self.connect_button)

        self.setLayout(self.layout)

        # Initialize Variables
        self.sentences = []
        self.current_sentence_index = 0
        self.haptic_data = None
        self.datafeel_devices = []  # Store multiple devices
        self.tts_engine = pyttsx3.init()

    BASE_DIR = "C:/Users/Alienware Edu/Desktop/Buildfest/buildfest_website"
    TEXT_DIR = os.path.join(BASE_DIR, "texts")
    HAPTIC_DIR = os.path.join(BASE_DIR, "haptics")

    def connect_to_datafeel(self):
        """Scan and connect to all available DataFeel devices."""
        print("🔍 Scanning for DataFeel Devices...")
        self.datafeel_devices = discover_devices(4)  # Adjust max address if needed

        if self.datafeel_devices:
            print(f"✅ Connected to {len(self.datafeel_devices)} DataFeel devices.")
            for device in self.datafeel_devices:
                print(f"  ➡️ {device}")
        else:
            print("❌ No DataFeel devices found.")

    def load_story(self):
        """Load the selected story text and haptic data."""
        story_id = self.story_select.currentText().replace(" ", "_").lower()

        text_file = os.path.join(self.TEXT_DIR, f"{story_id}.txt")
        json_file = os.path.join(self.HAPTIC_DIR, f"{story_id}_haptic_output.json")

        # Load text file
        if not os.path.exists(text_file):
            print(f"❌ Error: Story text file not found: {text_file}")
        else:
            try:
                with open(text_file, "r", encoding="utf-8") as f:
                    text = f.read()
                    self.sentences = text.split(". ")
                    self.book_text.setText(text)
                print(f"✅ Loaded story text: {text_file}")
            except Exception as e:
                print(f"❌ Error reading story file: {e}")

        # Load haptic JSON
        if not os.path.exists(json_file):
            print(f"❌ Error: Haptic JSON file not found: {json_file}")
        else:
            try:
                with open(json_file, "r") as file:
                    self.haptic_data = json.load(file)
                print(f"✅ Loaded haptic JSON: {json_file}")
            except Exception as e:
                print(f"❌ Error reading haptic JSON: {e}")

    def start_narration(self):
        """Start narrating the story."""
        if not self.sentences:
            print("❌ No story loaded.")
            return

        self.current_sentence_index = 0
        self.speak_sentence()

    def speak_sentence(self):
        """Speak the current sentence and send haptic feedback."""
        if self.current_sentence_index >= len(self.sentences):
            print("✅ Narration complete.")
            return

        sentence = self.sentences[self.current_sentence_index]
        print(f"🎙️ Narrating: {sentence}")

        self.tts_engine.say(sentence)
        self.tts_engine.runAndWait()

        # Send haptic feedback
        if self.haptic_data:
            self.send_haptic_feedback()

        # Move to next sentence after delay
        self.current_sentence_index += 1
        QTimer.singleShot(self.pace_slider.value() * 1000, self.speak_sentence)

    def send_haptic_feedback(self):
        """Send haptic commands to all connected DataFeel Dots."""
        if not self.datafeel_devices:
            print("❌ No DataFeel devices connected.")
            return

        sentence_data = next(
            (h for h in self.haptic_data if h["sentence_number"] == self.current_sentence_index + 1), 
            None
        )

        if not sentence_data:
            print("⚠️ No haptic data for this sentence.")
            return

        for command_set in sentence_data["haptic_commands"]:
            address = command_set["address"]

            # Find the correct DataFeel device
            device = next((d for d in self.datafeel_devices if d.id == address), None)
            if not device:
                print(f"⚠️ No device found for address {address}, skipping...")
                continue

            print(f"🎯 Sending haptic commands to DataFeel Dot {address}...")

            for command in command_set["commands"]:
                print(f"➡️ Sending Command: {command}")

                # Send Vibration settings
                if "vibration" in command:
                    vib = command["vibration"]
                    device.registers.set_vibration_mode(1)  # MANUAL mode
                    device.registers.set_vibration_intensity(vib["intensity"])
                    device.registers.set_vibration_frequency(vib["frequency"])

                # Send Thermal settings
                if "thermal" in command:
                    therm = command["thermal"]
                    device.activate_thermal_intensity_control(therm["intensity"])

                # Send LED settings
                if "light" in command:
                    light = command["light"]
                    r, g, b = light["rgb"]
                    brightness = int(light["intensity"] * 255)
                    device.set_led(r, g, b, brightness)

            print(f"✅ Haptic feedback sent to Dot {address}.")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = DataFeelApp()
    window.show()
    sys.exit(app.exec())


