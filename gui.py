import sys
import os
import json
import pyttsx3
from PyQt6.QtWidgets import (
    QApplication, QWidget, QLabel, QPushButton, QVBoxLayout, QComboBox, 
    QSlider, QTextBrowser, QCheckBox, QHBoxLayout, QFileDialog
)
from PyQt6.QtCore import Qt
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
        self.story_select.addItems(["The Giver", "Example Text", "Example Text 2", "James' Giant Peach", "Perks of Being a Wallflower", "The Great Gatsby"])
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
        self.datafeel_device = None
        self.tts_engine = pyttsx3.init()

    def connect_to_datafeel(self):
        print("🔍 Scanning for DataFeel Devices...")
        devices = discover_devices(4)  # Adjust max address if needed
        if devices:
            self.datafeel_device = devices[0]
            print(f"✅ Connected to DataFeel Device: {self.datafeel_device}")
        else:
            print("❌ No DataFeel device found.")

    BASE_DIR = "C:/Users/Alienware Edu/Desktop/Buildfest/buildfest_website"
    TEXT_DIR = os.path.join(BASE_DIR, "texts")
    HAPTIC_DIR = os.path.join(BASE_DIR, "haptics")

    def load_story(self):
        story_id = self.story_select.currentText().replace(" ", "_").lower()
        
        text_file = os.path.join(TEXT_DIR, f"{story_id}.txt")
        json_file = os.path.join(HAPTIC_DIR, f"{story_id}_haptic_output.json")

        # Check if the text file exists
        if not os.path.exists(text_file):
            print(f"❌ Error: Story text file not found: {text_file}")
        else:
            try:
                with open(text_file, "r") as file:
                    text = file.read()
                    self.sentences = text.split(". ")
                    self.book_text.setText(text)
                print(f"✅ Loaded story text: {text_file}")
            except Exception as e:
                print(f"❌ Error reading story file: {e}")

        # Check if the haptic file exists
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
        if not self.sentences:
            print("❌ No story loaded.")
            return

        self.current_sentence_index = 0
        self.speak_sentence()

    def speak_sentence(self):
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
        if not self.datafeel_device:
            print("❌ No DataFeel device connected.")
            return

        sentence_data = next((h for h in self.haptic_data if h["sentence_number"] == self.current_sentence_index + 1), None)
        if not sentence_data:
            print("⚠️ No haptic data for this sentence.")
            return

        for command_set in sentence_data["haptic_commands"]:
            commands = command_set["commands"]
            for command in commands:
                if "vibration" in command:
                    vib = command["vibration"]
                    self.datafeel_device.registers.set_vibration_mode(1)  # MANUAL mode
                    self.datafeel_device.registers.set_vibration_intensity(vib["intensity"])
                    self.datafeel_device.registers.set_vibration_frequency(vib["frequency"])

                if "thermal" in command:
                    therm = command["thermal"]
                    self.datafeel_device.activate_thermal_intensity_control(therm["intensity"])

                if "light" in command:
                    light = command["light"]
                    r, g, b = light["rgb"]
                    brightness = int(light["intensity"] * 255)
                    self.datafeel_device.set_led(r, g, b, brightness)

        print("✅ Haptic feedback sent.")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = DataFeelApp()
    window.show()
    sys.exit(app.exec())
